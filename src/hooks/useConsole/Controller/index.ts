"use client"

import { useCallback, useEffect, useState } from "react"
import Papa from "papaparse"
import { api } from "@/services/api"
import { browserAuth } from "@/services/auth"
import { emptySnapshot } from "@/features/Console/Model"
import type { Entity, Section, Snapshot } from "@/Typings"

export function useConsole() {
  const [demo, setDemo] = useState(!browserAuth)
  const [authenticated, setAuthenticated] = useState(false)
  const [ready, setReady] = useState(!browserAuth)
  const [section, setSection] = useState<Section>("dashboard")
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot)
  const [search, setSearch] = useState("")
  const [queueFilter, setQueueFilter] = useState("")
  const [dialog, setDialog] = useState<Entity | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!browserAuth) {
      return
    }

    const { data } = browserAuth.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session))
      setReady(true)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(async () => {
    try {
      const result = await api<Snapshot>("snapshot", "GET", undefined, demo)
      setSnapshot(result)
      setError("")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar.")
    } finally {
      setLoading(false)
    }
  }, [demo])

  useEffect(() => {
    if (!demo && !authenticated) {
      return
    }

    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), 5000)

    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [demo, authenticated, refresh])

  async function mutate(
    path: string,
    method: string,
    body: unknown,
    message = "Alteração salva."
  ) {
    const result = await api<unknown>(path, method, body, demo)
    await refresh()
    setNotice(message)
    return result
  }

  async function save(values: Record<string, string>) {
    if (!dialog) {
      return
    }

    const body =
      dialog === "agents"
        ? { ...values, queue_ids: values.queue_id ? [values.queue_id] : [] }
        : values
    await mutate(
      dialog,
      "POST",
      body,
      demo ? "Salvo na demonstração desta sessão." : "Cadastro criado."
    )
    setDialog(null)
  }

  async function importCsv(file: File, campaignId: string) {
    if (!campaignId) {
      throw new Error("Escolha uma campanha para importar.")
    }

    if (file.size > 1_000_000) {
      throw new Error("O arquivo deve ter até 1 MB.")
    }

    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    })

    if (
      parsed.errors.length ||
      !parsed.meta.fields?.includes("nome") ||
      !parsed.meta.fields.includes("telefone")
    ) {
      throw new Error("CSV inválido. Use as colunas nome,telefone e no máximo 1.000 contatos.")
    }

    if (parsed.data.length > 1000 || parsed.data.length === 0) {
      throw new Error("Importe entre 1 e 1.000 contatos por arquivo.")
    }

    const rows = parsed.data.map((row) => ({
      name: row.nome,
      phone: row.telefone,
      campaign_id: campaignId
    }))
    const result = await api<{ imported: number; duplicates: number }>(
      "contacts",
      "POST",
      rows,
      demo
    )
    await refresh()
    setNotice(
      `${result.imported} contatos importados; ${result.duplicates} duplicados ignorados.`
    )
  }

  async function act(action: () => Promise<unknown>) {
    try {
      setError("")
      await action()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir.")
    }
  }

  async function logout() {
    await browserAuth?.auth.signOut()
    setSnapshot(emptySnapshot)
    setAuthenticated(false)
    setDemo(false)
  }

  function navigate(next: Section) {
    setSection(next)
    setSearch("")
  }

  return {
    demo,
    setDemo,
    authenticated,
    ready,
    section,
    navigate,
    snapshot,
    search,
    setSearch,
    queueFilter,
    setQueueFilter,
    dialog,
    setDialog,
    notice,
    setNotice,
    error,
    setError,
    loading,
    refresh,
    mutate,
    save,
    importCsv,
    act,
    logout
  }
}
