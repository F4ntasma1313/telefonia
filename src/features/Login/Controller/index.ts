import { useState } from "react"
import type { FormEvent } from "react"
import { browserAuth } from "@/services/auth"

export function useLogin() {
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    setBusy(true)

    try {
      if (!browserAuth) {
        throw new Error("Configure o Supabase para entrar com uma conta real.")
      }

      const { error } = await browserAuth.auth.signInWithPassword({
        email: String(values.get("email")),
        password: String(values.get("password"))
      })

      if (error) {
        throw new Error("E-mail ou senha inválidos.")
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no acesso.")
    } finally {
      setBusy(false)
    }
  }

  return { error, busy, submit }
}
