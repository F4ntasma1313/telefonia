export function ariAuthorization(): string {
  const username = process.env.ARI_USERNAME
  const password = process.env.ARI_PASSWORD

  if (!username || !password) {
    throw new Error("ARI_USERNAME e ARI_PASSWORD são obrigatórios.")
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

export function ariUrl(path: string, query: Record<string, string> = {}): URL {
  const base = process.env.ARI_URL

  if (!base) {
    throw new Error("ARI_URL é obrigatório.")
  }

  const url = new URL(`${base.replace(/\/$/, "")}/${path}`)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }

  return url
}

export async function ari<T = undefined>(
  path: string,
  method = "GET",
  query: Record<string, string> = {}
): Promise<T> {
  const response = await fetch(ariUrl(path, query), {
    method,
    headers: { Authorization: ariAuthorization() },
    signal: AbortSignal.timeout(10000)
  })

  if (!response.ok) {
    throw new Error(`ARI ${method} ${path.split("/")[0]}: ${response.status}`)
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T
  }

  const content = await response.text()
  return content ? (JSON.parse(content) as T) : (undefined as T)
}

export async function hangupChannel(id: string) {
  try {
    await ari(`channels/${encodeURIComponent(id)}`, "DELETE")
  } catch {
    console.info(JSON.stringify({ event: "channel_already_closed", channel_id: id }))
  }
}
