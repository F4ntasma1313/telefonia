import { runTelephony } from "../src/features/TelephonyRuntime/Controller"

runTelephony().catch(() => {
  console.error(
    JSON.stringify({
      event: "telephony_start_failed",
      message: "Verifique Asterisk, Supabase, migrações e variáveis de ambiente."
    })
  )
  process.exitCode = 1
})
