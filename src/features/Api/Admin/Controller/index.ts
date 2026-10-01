import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { checkDatabase, HttpError } from "@/services/security"
import type { CreateAgentDto } from "@/Typings"

export async function createAgent(db: SupabaseClient, input: CreateAgentDto) {
  await validateQueues(db, input.queue_ids)
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true
  })
  checkDatabase(error)

  try {
    const { password: _password, ...profile } = input
    void _password
    const { error: profileError } = await db
      .from("agents")
      .insert({ ...profile, id: data.user!.id })
    checkDatabase(profileError)
    const { error: credentialError } = await db
      .from("sip_credentials")
      .insert({ agent_id: data.user!.id })
    checkDatabase(credentialError)
    return { id: data.user!.id }
  } catch (error) {
    await db.auth.admin.deleteUser(data.user!.id)
    throw error
  }
}

export async function validateQueues(db: SupabaseClient, queueIds: string[]) {
  if (!queueIds.length) {
    return
  }

  const { data, error } = await db.from("queues").select("id").in("id", queueIds)
  checkDatabase(error)

  if (data!.length !== new Set(queueIds).size) {
    throw new HttpError(422, "Uma das filas informadas não existe.")
  }
}

export async function manageKeys(
  db: SupabaseClient,
  id: string | undefined,
  method: string,
  body: unknown
) {
  if (method === "POST") {
    const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(body)
    const token = `nexuscc_${randomBytes(32).toString("hex")}`
    const token_hash = createHash("sha256").update(token).digest("hex")
    const { error } = await db
      .from("api_keys")
      .insert({ name, token_hash, prefix: token.slice(0, 13) })
    checkDatabase(error)
    return { token }
  }

  if (method === "DELETE" && id) {
    const { error } = await db
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", z.uuid().parse(id))
    checkDatabase(error)
    return { ok: true }
  }

  throw new HttpError(405, "Operação não permitida.")
}
