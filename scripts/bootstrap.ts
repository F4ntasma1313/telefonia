import { createAdminClient } from "../src/services/supabase"
import { createAgent } from "../src/features/Api/Admin/Controller"
import { agentSchema } from "../src/features/Api/Model"

async function main() {
  const db = createAdminClient()
  const { count, error } = await db
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")

  if (error) {
    throw error
  }

  if (count) {
    throw new Error("Já existe um administrador. Crie novos usuários pelo painel.")
  }

  const input = agentSchema.parse({
    name: process.env.BOOTSTRAP_NAME ?? "Administrador",
    email: process.env.BOOTSTRAP_EMAIL,
    password: process.env.BOOTSTRAP_PASSWORD,
    extension: "1000",
    role: "admin",
    queue_ids: []
  })

  await createAgent(db, input)
  console.log("Administrador criado. Remova BOOTSTRAP_PASSWORD do arquivo de ambiente.")
}

main().catch(() => {
  console.error(
    "Falha ao criar administrador. Verifique migração, variáveis e se já existe administrador."
  )
  process.exitCode = 1
})
