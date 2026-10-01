import { HttpError } from "@/services/security"

export async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.body) {
    return {}
  }

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ""

  while (true) {
    const chunk = await reader.read()

    if (chunk.done) {
      break
    }

    bytes += chunk.value.byteLength

    if (bytes > 1_000_000) {
      await reader.cancel()
      throw new HttpError(413, "Envie até 1 MB por requisição.")
    }

    text += decoder.decode(chunk.value, { stream: true })
  }

  text += decoder.decode()

  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new HttpError(400, "JSON inválido.")
  }
}
