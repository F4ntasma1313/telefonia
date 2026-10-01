import { ari, ariAuthorization, ariUrl } from "@/services/asterisk"
import { createAdminClient } from "@/services/supabase"
import { checkDatabase } from "@/services/security"

export async function syncRecordings() {
  const db = createAdminClient()
  const recordings = await ari<{ name: string }[]>("recordings/stored")

  for (const recording of recordings) {
    if (!/^nexuscc-[a-f0-9-]{36}$/.test(recording.name)) {
      continue
    }

    const callId = recording.name.slice("nexuscc-".length)
    const { data: call, error } = await db
      .from("calls")
      .select("id,ended_at,recording_path")
      .eq("id", callId)
      .maybeSingle()
    checkDatabase(error)

    if (!call?.ended_at) {
      continue
    }

    const path = `${callId}.wav`

    if (!call.recording_path) {
      const response = await fetch(
        ariUrl(`recordings/stored/${encodeURIComponent(recording.name)}/file`),
        {
          headers: { Authorization: ariAuthorization() },
          signal: AbortSignal.timeout(60000)
        }
      )

      if (!response.ok) {
        throw new Error("Falha ao obter gravação da central.")
      }

      const audio = await response.arrayBuffer()

      if (audio.byteLength > 104857600) {
        throw new Error(
          "Gravação acima de 100 MB; mantida no Asterisk para recuperação manual."
        )
      }

      const { error: uploadError } = await db.storage
        .from("recordings")
        .upload(path, audio, { contentType: "audio/wav", upsert: true })
      checkDatabase(uploadError)
      const { error: updateError } = await db
        .from("calls")
        .update({ recording_path: path })
        .eq("id", callId)
      checkDatabase(updateError)
    }

    await ari(`recordings/stored/${encodeURIComponent(recording.name)}`, "DELETE")
  }
}
