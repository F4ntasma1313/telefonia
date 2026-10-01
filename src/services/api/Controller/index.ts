import { browserAuth } from "@/services/auth"
import { demoRequest } from "@/services/demo"

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  demo = false
): Promise<T> {
  if (demo) {
    return (await demoRequest(path, method, body)) as T
  }

  const session = await browserAuth?.auth.getSession()
  const token = session?.data.session?.access_token

  if (!token) {
    throw new Error("Entre na sua conta para continuar.")
  }

  const response = await fetch(`/api/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir a operação.")
  }

  return data as T
}
