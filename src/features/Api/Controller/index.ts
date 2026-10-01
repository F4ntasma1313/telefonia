import { randomUUID } from "node:crypto"
import { ZodError } from "zod"
import { authenticate, checkDatabase, HttpError } from "@/services/security"
import { readResource } from "../Read/Controller"
import { writeResource } from "../Write/Controller"
import { readJsonBody } from "@/services/http"

export async function handleApi(request: Request, segments: string[]): Promise<Response> {
  const requestId = randomUUID()

  try {
    if (segments.length > 2) {
      throw new HttpError(404, "Recurso não encontrado.")
    }

    const context = await authenticate(request)
    const { data: allowed, error: limitError } = await context.db.rpc("consume_rate_limit", {
      actor_id: context.actor
    })
    checkDatabase(limitError)

    if (!allowed) {
      throw new HttpError(429, "Limite de 180 requisições por minuto atingido.")
    }
    const [resource, id] = segments

    if (request.method === "GET") {
      return Response.json(await readResource(context, resource, id, new URL(request.url)), {
        headers: { "Cache-Control": "no-store", "X-Request-Id": requestId }
      })
    }

    const body = await readJsonBody(request)

    const result = await writeResource(context, resource, id, request.method, body)
    await context.db.from("audit_events").insert({
      actor: context.actor,
      action: `${request.method}:${resource}`,
      resource_id: id ?? null
    })

    return Response.json(result, { headers: { "X-Request-Id": requestId } })
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : error instanceof ZodError ? 422 : 503
    const message =
      error instanceof ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : error instanceof HttpError
          ? error.message
          : "Serviço indisponível. Confira a configuração do servidor."

    console.error(JSON.stringify({ requestId, status, event: "api_error" }))

    return Response.json({ error: message, request_id: requestId }, { status })
  }
}
