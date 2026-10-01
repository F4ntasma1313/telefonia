import { createDemoSnapshot } from "../Model"
import { agentSchema, campaignSchema, contactSchema, queueSchema } from "@/features/Api/Model"
import type { AgentStatus, Snapshot } from "@/Typings"

let state: Snapshot | null = null

export async function demoRequest(
  path: string,
  method: string,
  body?: unknown
): Promise<unknown> {
  state ??= createDemoSnapshot()
  const [resource, id] = path.split("/")

  if (resource === "snapshot") {
    return structuredClone(state)
  }

  if (resource === "presence") {
    const input = body as { status?: AgentStatus }

    if (input.status && state.me) {
      state.me.status = input.status
      state.agents = state.agents.map((agent) =>
        agent.id === state!.me!.id ? { ...agent, status: input.status! } : agent
      )
    }

    return { ok: true }
  }

  if (resource === "keys") {
    if (method === "GET") {
      return []
    }

    throw new Error("Conecte o Supabase para emitir tokens reais.")
  }

  if (resource === "agents" && method === "POST") {
    const { password: _password, ...profile } = agentSchema.parse(body)
    void _password

    if (
      state.agents.some(
        (agent) => agent.extension === profile.extension || agent.email === profile.email
      )
    ) {
      throw new Error("Ramal ou e-mail já cadastrado.")
    }

    state.agents.push({
      ...profile,
      id: crypto.randomUUID(),
      active: true,
      status: "offline",
      last_seen: null
    })
  } else if (resource === "agents" && method === "PATCH") {
    const input = body as { queue_ids?: string[]; active?: boolean }
    state.agents = state.agents.map((agent) =>
      agent.id === id ? { ...agent, ...input } : agent
    )
  } else if (resource === "queues" && method === "POST") {
    const input = queueSchema.parse(body)

    if (state.queues.some((queue) => queue.number === input.number)) {
      throw new Error("Número de fila já cadastrado.")
    }

    state.queues.push({ ...input, id: crypto.randomUUID() })
  } else if (resource === "queues" && method === "PATCH") {
    state.queues = state.queues.map((queue) =>
      queue.id === id ? { ...queue, ...queueSchema.partial().parse(body) } : queue
    )
  } else if (resource === "campaigns" && method === "POST") {
    state.campaigns.push({
      ...campaignSchema.parse(body),
      id: crypto.randomUUID(),
      status: "draft"
    })
  } else if (resource === "campaigns" && method === "PATCH") {
    const input = body as { status: "running" | "paused" | "completed" }
    state.campaigns = state.campaigns.map((campaign) =>
      campaign.id === id ? { ...campaign, ...input } : campaign
    )
  } else if (resource === "contacts" && method === "POST") {
    const inputs = Array.isArray(body) ? body : [body]
    const validated = inputs.map((item) => contactSchema.parse(item))
    let imported = 0

    for (const input of validated) {
      if (
        !state.contacts.some(
          (contact) =>
            contact.campaign_id === input.campaign_id && contact.phone === input.phone
        )
      ) {
        state.contacts.push({
          ...input,
          id: crypto.randomUUID(),
          status: "pending",
          attempts: 0
        })
        imported += 1
      }
    }

    return { imported, duplicates: inputs.length - imported }
  } else if (resource === "calls" && method === "PATCH") {
    const input = body as { disposition: string }
    state.calls = state.calls.map((call) =>
      call.id === id ? { ...call, disposition: input.disposition } : call
    )
  } else if (resource === "denylist") {
    const input = body as { phone: string }
    state.contacts = state.contacts.map((contact) =>
      contact.phone === input.phone ? { ...contact, status: "blocked" } : contact
    )
  } else {
    throw new Error(
      "Esta ação exige a central de telefonia configurada. A demonstração não realiza chamadas."
    )
  }

  return { ok: true }
}
