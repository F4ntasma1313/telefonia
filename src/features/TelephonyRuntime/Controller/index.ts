import { randomUUID } from "node:crypto"
import WebSocket from "ws"
import { ari, ariAuthorization, ariUrl, hangupChannel } from "@/services/asterisk"
import { createAdminClient } from "@/services/supabase"
import { checkDatabase } from "@/services/security"
import { provisionEndpoints } from "@/services/provisioning"
import { syncRecordings } from "@/services/recordings"
import {
  assignIncoming,
  finish,
  handleEvent,
  startOutbound
} from "@/features/Telephony/Controller"
import { liveCalls } from "@/features/Telephony/Model"
import type { AriChannel, AriEvent, Call } from "@/Typings"

const db = createAdminClient()
const owner = randomUUID()
const maximum = Math.max(1, Math.min(50, Number(process.env.MAX_CONCURRENT_CALLS) || 5))
let shuttingDown = false
let serial = Promise.resolve()

function enqueue(action: () => Promise<void>) {
  serial = serial.then(action).catch(() => {
    console.error(JSON.stringify({ event: "worker_operation_failed" }))
  })
}

async function recover() {
  const bridges = await ari<{ id: string; channels: string[] }[]>("bridges")

  for (const bridge of bridges.filter((item) => item.id.startsWith("nexuscc-"))) {
    for (const channelId of bridge.channels) {
      await hangupChannel(channelId)
    }

    await ari(`bridges/${bridge.id}`, "DELETE")
  }

  const channels = await ari<AriChannel[]>("channels")

  for (const channel of channels.filter((channel) => channel.id.startsWith("nexuscc-"))) {
    await hangupChannel(channel.id)
  }

  const { data: calls, error } = await db
    .from("calls")
    .select("id")
    .in("status", ["queued", "ringing", "active"])
  checkDatabase(error)

  for (const call of calls ?? []) {
    const { error: finishError } = await db.rpc("finish_call", {
      call_id: call.id,
      final_status: "failed"
    })
    checkDatabase(finishError)
  }

  const { error: presenceError } = await db
    .from("agents")
    .update({ status: "offline" })
    .in("status", ["busy", "ringing"])
  checkDatabase(presenceError)
}

async function tick() {
  if (shuttingDown) {
    return
  }

  for (const live of liveCalls.values()) {
    if (Date.now() > live.deadline) {
      await finish(
        live,
        live.call.status === "active"
          ? "completed"
          : live.call.direction === "inbound"
            ? "abandoned"
            : "failed"
      )
    } else if (live.call.direction === "inbound" && !live.agentStarted) {
      await assignIncoming(live)
    }
  }

  const { error: presenceError } = await db
    .from("agents")
    .update({ status: "offline" })
    .lt("last_seen", new Date(Date.now() - 45000).toISOString())
    .in("status", ["available", "paused"])
  checkDatabase(presenceError)

  if (liveCalls.size >= maximum) {
    return
  }

  const { data: manual, error } = await db.rpc("claim_manual_call")
  checkDatabase(error)

  if (manual?.id) {
    await startOutbound(manual as Call)
    return
  }

  const { data: campaign, error: campaignError } = await db.rpc("claim_campaign_contact")
  checkDatabase(campaignError)

  if (campaign?.id) {
    const { error: updateError } = await db
      .from("calls")
      .update({ status: "ringing" })
      .eq("id", campaign.id)
    checkDatabase(updateError)
    await startOutbound(campaign as Call)
  }
}

export async function runTelephony() {
  await ari("asterisk/info")
  const { data: lease, error } = await db.rpc("acquire_worker_lease", { worker_owner: owner })
  checkDatabase(error)

  if (!lease) {
    throw new Error("Outro serviço de telefonia já está ativo.")
  }

  const url = ariUrl("events", { app: "nexuscc", subscribeAll: "true" })
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  const socket = new WebSocket(url, {
    headers: { Authorization: ariAuthorization() },
    handshakeTimeout: 10000
  })
  let ready = false
  socket.on("message", (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as AriEvent

      if (!ready) {
        if (event.type === "StasisStart" && event.channel) {
          void hangupChannel(event.channel.id)
        }

        return
      }

      enqueue(() => handleEvent(event))
    } catch {
      console.error(JSON.stringify({ event: "invalid_ari_event" }))
    }
  })

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve)
      socket.once("error", reject)
    })
    await recover()
    await provisionEndpoints()

    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error("Conexão ARI encerrada durante a inicialização.")
    }

    ready = true
  } catch (error) {
    socket.terminate()
    await db.from("worker_health").delete().eq("id", "telephony").eq("owner", owner)
    throw error
  }

  console.info(JSON.stringify({ event: "telephony_ready", max_concurrent_calls: maximum }))

  const timer = setInterval(() => enqueue(tick), 2000)
  let heartbeatBusy = false
  const heartbeat = setInterval(async () => {
    if (heartbeatBusy) {
      return
    }

    heartbeatBusy = true

    try {
      const { data, error } = await db.rpc("acquire_worker_lease", { worker_owner: owner })
      checkDatabase(error)

      if (!data) {
        throw new Error("Lease perdido.")
      }
    } catch {
      void shutdown()
    } finally {
      heartbeatBusy = false
    }
  }, 5000)

  let maintenanceBusy = false
  const maintenance = setInterval(async () => {
    if (maintenanceBusy) {
      return
    }

    maintenanceBusy = true

    try {
      await provisionEndpoints()
      await syncRecordings()
    } catch {
      console.error(JSON.stringify({ event: "maintenance_failed_retry_in_30s" }))
    } finally {
      maintenanceBusy = false
    }
  }, 30000)

  async function shutdown() {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    clearInterval(timer)
    clearInterval(heartbeat)
    clearInterval(maintenance)
    socket.close()
    await serial

    for (const live of liveCalls.values()) {
      await finish(live, "failed").catch(() => undefined)
    }

    await db.from("worker_health").delete().eq("id", "telephony").eq("owner", owner)
    console.error(JSON.stringify({ event: "telephony_stopped_restart_required" }))
    process.exitCode = 1
  }

  socket.on("close", () => void shutdown())
  socket.on("error", () => void shutdown())
  process.on("SIGINT", () => void shutdown())
  process.on("SIGTERM", () => void shutdown())
}
