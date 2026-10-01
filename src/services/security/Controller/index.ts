import { createHash } from "node:crypto"
import { createAdminClient } from "@/services/supabase"
import type { Agent, Role } from "@/Typings"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")

  if (!token) {
    throw new HttpError(401, "Autenticação necessária.")
  }

  const db = createAdminClient()

  if (token.startsWith("nexuscc_")) {
    const hash = createHash("sha256").update(token).digest("hex")
    const { data, error } = await db
      .from("api_keys")
      .select("id")
      .eq("token_hash", hash)
      .is("revoked_at", null)
      .maybeSingle()

    if (error || !data) {
      throw new HttpError(401, "Token inválido ou revogado.")
    }

    return { db, agent: null, actor: `key:${data.id}`, integration: true }
  }

  const { data: user, error } = await db.auth.getUser(token)

  if (error || !user.user) {
    throw new HttpError(401, "Sessão expirada.")
  }

  const { data: agent } = await db
    .from("agents")
    .select("*")
    .eq("id", user.user.id)
    .eq("active", true)
    .single()

  if (!agent) {
    throw new HttpError(403, "Usuário sem acesso à central.")
  }

  return { db, agent: agent as Agent, actor: user.user.id, integration: false }
}

export function requireRole(agent: Agent | null, roles: Role[]) {
  if (!agent || !roles.includes(agent.role)) {
    throw new HttpError(403, "Você não tem permissão para esta ação.")
  }
}

export function checkDatabase(error: { message: string } | null) {
  if (error) {
    throw new HttpError(
      409,
      "Não foi possível salvar. Verifique duplicidades, vínculos e disponibilidade."
    )
  }
}
