import { useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { api } from "@/services/api"
import type { ApiKey, ConsoleController, FieldDefinition } from "@/Typings"

export function useResources(console: ConsoleController) {
  const { snapshot, search, demo, mutate, act } = console
  const [campaignId, setCampaignId] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [issuedToken, setIssuedToken] = useState("")
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [dispositionId, setDispositionId] = useState<string | null>(null)
  const term = search.toLocaleLowerCase("pt-BR")
  const agents = snapshot.agents.filter((agent) =>
    `${agent.name} ${agent.email} ${agent.extension}`.toLocaleLowerCase("pt-BR").includes(term)
  )
  const contacts = snapshot.contacts.filter(
    (contact) =>
      `${contact.name} ${contact.phone}`.toLocaleLowerCase("pt-BR").includes(term) &&
      (!campaignId || campaignId === contact.campaign_id)
  )
  const calls = snapshot.calls
    .filter((call) => call.phone.includes(term))
    .map((call) => ({
      ...call,
      agentName:
        snapshot.agents.find((agent) => agent.id === call.agent_id)?.name ??
        "Aguardando operador",
      date: new Date(call.created_at).toLocaleString("pt-BR"),
      duration:
        call.answered_at && call.ended_at
          ? `${Math.round((new Date(call.ended_at).getTime() - new Date(call.answered_at).getTime()) / 1000)}s`
          : "—"
    }))
  const campaigns = snapshot.campaigns.map((campaign) => {
    const contacts = snapshot.contacts.filter((contact) => contact.campaign_id === campaign.id)
    const completed = contacts.filter((contact) => contact.status === "completed").length

    return {
      ...campaign,
      queueName: snapshot.queues.find((queue) => queue.id === campaign.queue_id)?.name ?? "—",
      total: contacts.length,
      completed,
      progress: contacts.length ? Math.round((completed / contacts.length) * 100) : 0
    }
  })
  const queues = snapshot.queues.map((queue) => ({
    ...queue,
    members: snapshot.agents.filter((agent) => agent.queue_ids.includes(queue.id)).length
  }))
  const queueOptions = snapshot.queues.map((queue) => ({ value: queue.id, label: queue.name }))
  const campaignOptions = snapshot.campaigns.map((campaign) => ({
    value: campaign.id,
    label: campaign.name
  }))
  const fields: Record<string, FieldDefinition[]> = {
    agents: [
      { name: "name", label: "Nome completo", required: true },
      { name: "email", label: "E-mail", type: "email", required: true },
      {
        name: "password",
        label: "Senha inicial (mínimo 12 caracteres)",
        type: "password",
        required: true
      },
      { name: "extension", label: "Ramal (3 a 6 dígitos)", required: true },
      {
        name: "role",
        label: "Perfil de acesso",
        required: true,
        options: [
          { value: "operator", label: "Operador" },
          { value: "supervisor", label: "Supervisor" },
          { value: "admin", label: "Administrador" }
        ]
      },
      { name: "queue_id", label: "Fila inicial", options: queueOptions }
    ],
    queues: [
      { name: "name", label: "Nome da fila", required: true },
      { name: "number", label: "Número de entrada (3 a 6 dígitos)", required: true },
      {
        name: "timeout",
        label: "Espera máxima em segundos",
        type: "number",
        value: "120",
        required: true
      }
    ],
    campaigns: [
      { name: "name", label: "Nome da campanha", required: true },
      { name: "queue_id", label: "Fila de operadores", required: true, options: queueOptions },
      {
        name: "max_attempts",
        label: "Máximo de tentativas",
        type: "number",
        value: "3",
        required: true
      },
      {
        name: "start_hour",
        label: "Hora inicial (Brasília)",
        type: "number",
        value: "9",
        required: true
      },
      {
        name: "end_hour",
        label: "Hora final (Brasília)",
        type: "number",
        value: "18",
        required: true
      }
    ],
    contacts: [
      { name: "name", label: "Nome", required: true },
      { name: "phone", label: "Telefone com +55 ou ramal", required: true },
      { name: "campaign_id", label: "Campanha", required: true, options: campaignOptions }
    ]
  }

  async function playRecording(id: string) {
    const data = await api<{ url: string }>(`recordings/${id}`, "GET", undefined, demo)
    setAudioUrl(data.url)
  }

  async function loadKeys() {
    setKeys(await api<ApiKey[]>("keys", "GET", undefined, demo))
  }

  async function issueKey(name: string) {
    const data = await api<{ token: string }>("keys", "POST", { name }, demo)
    setIssuedToken(data.token)
    await loadKeys()
  }

  async function revokeKey(id: string) {
    await mutate(`keys/${id}`, "DELETE", undefined, "Token revogado.")
    await loadKeys()
  }

  async function saveMembership(values: Record<string, string>) {
    const queue_ids = values.queue_ids
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (!queue_ids.every((id) => snapshot.queues.some((queue) => queue.id === id))) {
      throw new Error("Selecione somente filas existentes.")
    }

    await mutate(`agents/${editingAgent}`, "PATCH", { queue_ids })
    setEditingAgent(null)
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (file) {
      void act(() => console.importCsv(file, campaignId))
    }

    event.target.value = ""
  }

  function submitKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void act(() => issueKey(String(form.get("name"))))
  }

  async function saveDisposition(values: Record<string, string>) {
    await mutate(`calls/${dispositionId}`, "PATCH", values)
    setDispositionId(null)
  }

  const membershipFields: FieldDefinition[] = [
    {
      name: "queue_ids",
      label: "Filas (Ctrl ou Cmd para selecionar várias)",
      options: queueOptions,
      multiple: true,
      value: snapshot.agents.find((agent) => agent.id === editingAgent)?.queue_ids.join(",")
    }
  ]

  return {
    upload,
    submitKey,
    saveDisposition,
    membershipFields,
    agents,
    contacts,
    calls,
    campaigns,
    queues,
    fields,
    campaignId,
    setCampaignId,
    audioUrl,
    playRecording,
    keys,
    issuedToken,
    loadKeys,
    issueKey,
    revokeKey,
    editingAgent,
    setEditingAgent,
    saveMembership,
    dispositionId,
    setDispositionId,
    act,
    queueOptions,
    campaignOptions
  }
}
