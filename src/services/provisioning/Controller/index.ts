import { createHash } from "node:crypto"
import { mkdir, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { createAdminClient } from "@/services/supabase"
import { checkDatabase } from "@/services/security"
import { ari } from "@/services/asterisk"

let previousHash = ""

export async function provisionEndpoints() {
  const db = createAdminClient()
  const [{ data: agents, error }, { data: credentials, error: credentialError }] =
    await Promise.all([
      db.from("agents").select("id,extension").eq("active", true),
      db.from("sip_credentials").select("agent_id,password")
    ])
  checkDatabase(error)
  checkDatabase(credentialError)
  const blocks: string[] = []

  for (const agent of agents ?? []) {
    const password = credentials?.find((item) => item.agent_id === agent.id)?.password

    if (!/^\d{3,6}$/.test(agent.extension) || !password || !/^[a-f0-9]{48}$/.test(password)) {
      throw new Error("Credencial SIP inválida.")
    }

    blocks.push(
      `[${agent.extension}](webrtc-endpoint)\nauth=auth-${agent.extension}\naors=${agent.extension}\n\n[auth-${agent.extension}]\ntype=auth\nauth_type=userpass\nusername=${agent.extension}\npassword=${password}\n\n[${agent.extension}]\ntype=aor\nmax_contacts=1\nremove_existing=yes\nqualify_frequency=30\n`
    )
  }

  const content = blocks.join("\n")
  const hash = createHash("sha256").update(content).digest("hex")

  if (hash === previousHash) {
    return
  }

  const path = resolve(
    process.env.ASTERISK_ENDPOINTS_FILE ?? "infra/asterisk/generated/endpoints.conf"
  )
  await mkdir(dirname(path), { recursive: true, mode: 0o750 })
  await writeFile(`${path}.tmp`, content, { mode: 0o640 })
  await rename(`${path}.tmp`, path)
  await ari("asterisk/modules/res_pjsip.so", "PUT")
  previousHash = hash
}
