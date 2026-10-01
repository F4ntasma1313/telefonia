import { useEffect, useRef, useState } from "react"
import type { SimpleUser } from "sip.js/lib/platform/web"
import { api } from "@/services/api"
import { normalizePhone } from "@/utils/phone"
import type { ConsoleController, SipCredentials } from "@/Typings"

export function useSoftphone(app: ConsoleController) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const userRef = useRef<SimpleUser | null>(null)
  const [open, setOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [incoming, setIncoming] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [held, setHeld] = useState(false)
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!connected) {
      return
    }

    const timer = setInterval(() => {
      void api("presence", "POST", {}).catch(() => {
        setError("Falha ao atualizar presença. Verifique sua conexão.")
      })
    }, 10000)

    return () => clearInterval(timer)
  }, [connected])

  useEffect(
    () => () => {
      void userRef.current?.disconnect()
    },
    []
  )

  async function perform(action: () => Promise<unknown>) {
    setBusy(true)
    setError("")

    try {
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha de telefonia.")
    } finally {
      setBusy(false)
    }
  }

  async function connect() {
    if (app.demo) {
      throw new Error(
        "A demonstração não conecta chamadas. Configure Supabase e Asterisk conforme o guia de instalação."
      )
    }

    const credentials = await api<SipCredentials>("sip")
    const { SimpleUser } = await import("sip.js/lib/platform/web")
    await userRef.current?.disconnect()
    const user = new SimpleUser(credentials.server, {
      aor: `sip:${credentials.extension}@${credentials.domain}`,
      media: {
        constraints: { audio: true, video: false },
        remote: { audio: audioRef.current! }
      },
      userAgentOptions: {
        authorizationUsername: credentials.extension,
        authorizationPassword: credentials.password,
        logLevel: "error"
      },
      delegate: {
        onRegistered: () => {
          setConnected(true)
          void api("presence", "POST", { status: "available" }).catch(() =>
            setError("Falha ao registrar presença.")
          )
        },
        onUnregistered: () => setConnected(false),
        onServerDisconnect: () => {
          setConnected(false)
          void api("presence", "POST", { status: "offline" }).catch(() => undefined)
        },
        onCallReceived: () => {
          setIncoming(true)
          setOpen(true)
        },
        onCallAnswered: () => {
          setIncoming(false)
          setInCall(true)
        },
        onCallHangup: () => {
          setIncoming(false)
          setInCall(false)
          setMuted(false)
          setHeld(false)
          void app.refresh()
        }
      }
    })
    userRef.current = user
    await user.connect()
    await user.register()
  }

  async function dial() {
    const destination = normalizePhone(phone)
    await api("calls", "POST", { phone: destination, idempotency_key: crypto.randomUUID() })
    app.setNotice(
      "Solicitação enviada. Atenda a chamada no seu ramal para conectar o destino."
    )
  }

  async function toggleMute() {
    if (muted) {
      userRef.current?.unmute()
    } else {
      userRef.current?.mute()
    }

    setMuted(!muted)
  }

  async function toggleHold() {
    if (held) {
      await userRef.current?.unhold()
    } else {
      await userRef.current?.hold()
    }

    setHeld(!held)
  }

  async function disconnect() {
    await userRef.current?.disconnect()
    setConnected(false)
    await api("presence", "POST", { status: "offline" })
  }

  async function togglePause() {
    const status = app.snapshot.me?.status === "paused" ? "available" : "paused"
    await api("presence", "POST", { status })
    await app.refresh()
  }

  return {
    togglePause,
    paused: app.snapshot.me?.status === "paused",
    audioRef,
    open,
    setOpen,
    connected,
    busy,
    incoming,
    inCall,
    muted,
    held,
    phone,
    setPhone,
    error,
    perform,
    connect,
    dial,
    toggleMute,
    toggleHold,
    disconnect,
    answer: () => userRef.current!.answer(),
    hangup: () => userRef.current!.hangup(),
    digit: (value: string) =>
      inCall
        ? userRef.current!.sendDTMF(value)
        : Promise.resolve(setPhone((current) => current + value))
  }
}
