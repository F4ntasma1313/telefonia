import { z } from "zod"
import { authenticate, checkDatabase, HttpError, requireRole } from "@/services/security"
import {
  agentSchema,
  campaignSchema,
  contactSchema,
  dialSchema,
  phoneSchema,
  queueSchema
} from "../../Model"
import { manageKeys, createAgent, validateQueues } from "../../Admin/Controller"

export async function writeResource(
  context: Awaited<ReturnType<typeof authenticate>>,
  resource: string,
  id: string | undefined,
  method: string,
  body: unknown
) {
  const { db, agent, integration } = context

  if (resource === "presence" && method === "POST") {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const input = z
      .object({ status: z.enum(["available", "paused", "offline"]).optional() })
      .parse(body)
    const values = { last_seen: new Date().toISOString(), ...input }
    let query = db.from("agents").update(values).eq("id", agent!.id)

    if (input.status) {
      query = query.in("status", ["available", "paused", "offline"])
    }

    const { error } = await query
    checkDatabase(error)
    return { ok: true }
  }

  if (resource === "calls" && method === "POST") {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const input = dialSchema.parse(body)

    if (input.phone.startsWith("+") && process.env.ALLOW_EXTERNAL_CALLS !== "true") {
      throw new HttpError(
        409,
        "Ligações externas bloqueadas até configurar uma operadora SIP."
      )
    }

    if (input.queue_id && !agent!.queue_ids.includes(input.queue_id)) {
      throw new HttpError(403, "Operador não pertence à fila.")
    }

    const { data: health } = await db
      .from("worker_health")
      .select("last_seen")
      .eq("id", "telephony")
      .single()

    if (!health || Date.now() - new Date(health.last_seen).getTime() > 15000) {
      throw new HttpError(503, "Central de telefonia desconectada.")
    }

    const { data, error } = await db.rpc("enqueue_call", {
      target_agent: agent!.id,
      destination: input.phone,
      target_queue: input.queue_id ?? null,
      request_key: input.idempotency_key
    })
    checkDatabase(error)
    return data
  }

  if (resource === "calls" && method === "PATCH" && id) {
    requireRole(agent, ["admin", "supervisor", "operator"])
    const input = z.object({ disposition: z.string().trim().min(2).max(500) }).parse(body)
    let query = db.from("calls").update(input).eq("id", z.uuid().parse(id))

    if (agent!.role === "operator") {
      query = query.eq("agent_id", agent!.id)
    }

    const { data, error } = await query.select("id").single()
    checkDatabase(error)
    return data
  }

  if (resource === "keys") {
    requireRole(agent, ["admin"])
    return manageKeys(db, id, method, body)
  }

  if (resource === "agents") {
    requireRole(agent, ["admin"])

    if (method === "POST") {
      return createAgent(db, agentSchema.parse(body))
    }

    if (method === "PATCH" && id) {
      const input = z
        .object({
          queue_ids: z.array(z.uuid()).max(50).optional(),
          active: z.boolean().optional()
        })
        .parse(body)

      if (id === agent!.id && input.active === false) {
        throw new HttpError(409, "Não é possível desativar o próprio usuário.")
      }

      if (input.queue_ids) {
        await validateQueues(db, input.queue_ids)
      }

      const { error } = await db.from("agents").update(input).eq("id", z.uuid().parse(id))
      checkDatabase(error)
      return { ok: true }
    }
  }

  if (!integration) {
    requireRole(agent, ["admin", "supervisor"])
  }

  if (resource === "queues" && method === "POST") {
    const { data, error } = await db
      .from("queues")
      .insert(queueSchema.parse(body))
      .select()
      .single()
    checkDatabase(error)
    return data
  }

  if (resource === "queues" && method === "PATCH" && id) {
    const input = queueSchema.partial().parse(body)
    const { data, error } = await db
      .from("queues")
      .update(input)
      .eq("id", z.uuid().parse(id))
      .select()
      .single()
    checkDatabase(error)
    return data
  }

  if (resource === "campaigns" && method === "POST") {
    const { data, error } = await db
      .from("campaigns")
      .insert(campaignSchema.parse(body))
      .select()
      .single()
    checkDatabase(error)
    return data
  }

  if (resource === "campaigns" && method === "PATCH" && id) {
    const input = z.object({ status: z.enum(["running", "paused", "completed"]) }).parse(body)
    const { data, error } = await db
      .from("campaigns")
      .update(input)
      .eq("id", z.uuid().parse(id))
      .select()
      .single()
    checkDatabase(error)
    return data
  }

  if (resource === "contacts" && method === "POST") {
    const input = z
      .array(contactSchema)
      .min(1)
      .max(1000)
      .parse(Array.isArray(body) ? body : [body])
    const { data, error } = await db
      .from("contacts")
      .upsert(input, { onConflict: "campaign_id,phone", ignoreDuplicates: true })
      .select("id")
    checkDatabase(error)
    return { imported: data!.length, duplicates: input.length - data!.length }
  }

  if (resource === "denylist" && method === "POST") {
    const input = z
      .object({
        phone: phoneSchema,
        reason: z.string().max(300).default("Solicitação de não contato")
      })
      .parse(body)
    const { error } = await db.from("denylist").upsert(input)
    checkDatabase(error)
    const { error: contactError } = await db
      .from("contacts")
      .update({ status: "blocked" })
      .eq("phone", input.phone)
      .in("status", ["pending", "failed"])
    checkDatabase(contactError)
    return { ok: true }
  }

  throw new HttpError(405, "Operação não permitida.")
}
