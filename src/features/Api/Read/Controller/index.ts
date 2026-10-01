import { authenticate, checkDatabase, HttpError, requireRole } from "@/services/security"

export async function readResource(
  context: Awaited<ReturnType<typeof authenticate>>,
  resource: string,
  id: string | undefined,
  url: URL
) {
  const { db, agent, integration } = context

  if (resource === "snapshot") {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const operator = agent!.role === "operator"
    const [agents, queues, campaigns, contacts, calls, health] = await Promise.all([
      operator
        ? db.from("agents").select("*").eq("id", agent!.id)
        : db.from("agents").select("*").order("name"),
      operator
        ? db.from("queues").select("*").in("id", agent!.queue_ids)
        : db.from("queues").select("*").order("name"),
      operator
        ? db.from("campaigns").select("*").in("queue_id", agent!.queue_ids)
        : db.from("campaigns").select("*").order("name"),
      operator
        ? Promise.resolve({ data: [], error: null })
        : db.from("contacts").select("*").order("id").limit(500),
      operator
        ? db
            .from("calls")
            .select("*")
            .or(`agent_id.eq.${agent!.id},destination_agent_id.eq.${agent!.id}`)
            .order("created_at", { ascending: false })
            .limit(500)
        : db.from("calls").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("worker_health").select("last_seen").eq("id", "telephony").maybeSingle()
    ])

    for (const result of [agents, queues, campaigns, contacts, calls, health]) {
      checkDatabase(result.error)
    }

    return {
      agents: agents.data,
      queues: queues.data,
      campaigns: campaigns.data,
      contacts: contacts.data,
      calls: calls.data,
      me: agent,
      worker_online: Boolean(
        health.data && Date.now() - new Date(health.data.last_seen).getTime() < 15000
      )
    }
  }

  if (resource === "sip") {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const { data, error } = await db
      .from("sip_credentials")
      .select("password")
      .eq("agent_id", agent!.id)
      .single()
    checkDatabase(error)

    if (!process.env.SIP_WSS_URL || !process.env.SIP_DOMAIN) {
      throw new HttpError(503, "Configure o servidor SIP.")
    }

    return {
      server: process.env.SIP_WSS_URL,
      domain: process.env.SIP_DOMAIN,
      extension: agent!.extension,
      password: data!.password
    }
  }

  if (resource === "recordings" && id) {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const { data } = await db
      .from("calls")
      .select("agent_id, destination_agent_id, recording_path")
      .eq("id", id)
      .single()

    if (!data?.recording_path) {
      throw new HttpError(404, "Gravação ainda não disponível.")
    }

    if (
      agent!.role === "operator" &&
      data.agent_id !== agent!.id &&
      data.destination_agent_id !== agent!.id
    ) {
      throw new HttpError(403, "Acesso restrito.")
    }

    const { data: signed, error } = await db.storage
      .from("recordings")
      .createSignedUrl(data.recording_path, 60)
    checkDatabase(error)
    return { url: signed!.signedUrl }
  }

  if (resource === "keys") {
    requireRole(agent, ["admin"])
    const { data, error } = await db
      .from("api_keys")
      .select("id,name,prefix,created_at,revoked_at")
      .order("created_at", { ascending: false })
    checkDatabase(error)
    return data
  }

  if (["queues", "campaigns", "contacts", "calls", "denylist"].includes(resource)) {
    if (!integration) {
      requireRole(agent, ["admin", "supervisor"])
    }

    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    let query = db
      .from(resource)
      .select("*", { count: "exact" })
      .order(resource === "denylist" ? "phone" : "id")
      .range((page - 1) * 100, page * 100 - 1)

    if (id) {
      query = query.eq(resource === "denylist" ? "phone" : "id", id)
    }

    const { data, error, count } = await query
    checkDatabase(error)
    return { data, page, total: count, page_size: 100 }
  }

  throw new HttpError(404, "Recurso não encontrado.")
}
