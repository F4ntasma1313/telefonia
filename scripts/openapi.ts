import { writeFile } from "node:fs/promises"
import { z } from "zod"
import {
  agentSchema,
  campaignSchema,
  contactSchema,
  dialSchema,
  queueSchema
} from "../src/features/Api/Model"
import { version } from "../src/config"

const phone = z.string().regex(/^(\+[1-9]\d{7,14}|\d{3,6})$/)
const schemas: Record<string, unknown> = {}
const inputs = {
  AgentInput: agentSchema,
  AgentPatch: z.object({
    queue_ids: z.array(z.uuid()).optional(),
    active: z.boolean().optional()
  }),
  QueueInput: queueSchema,
  QueuePatch: queueSchema.partial(),
  CampaignInput: campaignSchema,
  CampaignPatch: z.object({ status: z.enum(["running", "paused", "completed"]) }),
  ContactInput: contactSchema.extend({ phone }),
  DialInput: dialSchema.extend({ phone }),
  Disposition: z.object({ disposition: z.string().min(2).max(500) }),
  Presence: z.object({ status: z.enum(["available", "paused", "offline"]).optional() }),
  KeyInput: z.object({ name: z.string().min(2).max(100) }),
  DenyInput: z.object({ phone, reason: z.string().max(300).optional() }),
  Error: z.object({ error: z.string(), request_id: z.uuid() })
}

for (const [name, schema] of Object.entries(inputs)) {
  schemas[name] = z.toJSONSchema(schema, { target: "openapi-3.0", unrepresentable: "any" })
}

schemas.ContactBatch = {
  oneOf: [
    { $ref: "#/components/schemas/ContactInput" },
    {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      items: { $ref: "#/components/schemas/ContactInput" }
    }
  ]
}

const paths: Record<string, Record<string, unknown>> = {}

function operation(
  path: string,
  method: string,
  summary: string,
  input?: string,
  paginated = false
) {
  const parameters: Record<string, unknown>[] = []

  if (path.includes("{id}")) {
    parameters.push({
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" }
    })
  }

  if (paginated) {
    parameters.push({
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 }
    })
  }

  const responses: Record<string, unknown> = {
    "200": {
      description: paginated ? "Página de até 100 registros" : "Operação concluída",
      content: {
        "application/json": {
          schema: paginated
            ? {
                type: "object",
                properties: {
                  data: { type: "array", items: { type: "object" } },
                  page: { type: "integer" },
                  total: { type: "integer" },
                  page_size: { type: "integer", enum: [100] }
                }
              }
            : { type: "object" }
        }
      }
    }
  }

  for (const code of [400, 401, 403, 404, 405, 409, 413, 422, 429, 503]) {
    responses[String(code)] = {
      description: "Erro de validação, autorização, estado ou serviço",
      content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
    }
  }

  const value: Record<string, unknown> = { summary, parameters, responses }

  if (input) {
    value.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: `#/components/schemas/${input}` } } }
    }
  }

  paths[path] ??= {}
  paths[path][method] = value
}

for (const resource of ["queues", "campaigns", "contacts", "calls", "denylist"]) {
  operation(
    `/${resource}`,
    "get",
    `Listar ${resource}; admin, supervisor ou token de integração`,
    undefined,
    true
  )

  if (resource !== "denylist") {
    operation(`/${resource}/{id}`, "get", `Consultar ${resource} por ID`, undefined, true)
  }
}

operation("/snapshot", "get", "Snapshot autorizado do painel; sessão de usuário")
operation("/agents", "post", "Criar usuário e ramal; admin", "AgentInput")
operation("/agents/{id}", "patch", "Vincular filas ou ativar/desativar; admin", "AgentPatch")
operation("/queues", "post", "Criar fila", "QueueInput")
operation("/queues/{id}", "patch", "Atualizar fila", "QueuePatch")
operation("/campaigns", "post", "Criar campanha progressiva", "CampaignInput")
operation("/campaigns/{id}", "patch", "Iniciar, pausar ou encerrar campanha", "CampaignPatch")
operation(
  "/contacts",
  "post",
  "Importar mailing; retorna imported e duplicates",
  "ContactBatch"
)
operation("/calls", "post", "Discagem manual no próprio ramal; sessão de usuário", "DialInput")
operation(
  "/calls/{id}",
  "patch",
  "Classificar chamada autorizada; sessão de usuário",
  "Disposition"
)
operation("/denylist", "post", "Bloquear número para novas discagens", "DenyInput")
operation(
  "/presence",
  "post",
  "Heartbeat ou alteração de presença do próprio usuário",
  "Presence"
)
operation("/sip", "get", "Credenciais do próprio ramal; sessão de usuário")
operation("/recordings/{id}", "get", "URL assinada por 60 segundos da gravação autorizada")
operation("/keys", "get", "Listar tokens sem o segredo; admin")
operation(
  "/keys",
  "post",
  "Emitir token; admin; segredo retornado somente uma vez",
  "KeyInput"
)
operation("/keys/{id}", "delete", "Revogar token; admin")

const specification = {
  openapi: "3.0.3",
  info: {
    title: "NexusCC API",
    version,
    description:
      "API própria de central de atendimento. Não representa o contrato Vonix. Limite de 180 requisições/minuto por usuário/token. Consulte docs/API.md para permissões e retornos."
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "JWT Supabase ou token nexuscc_ com permissões de integração limitadas."
      }
    },
    schemas
  }
}

async function saveSpecification() {
  await writeFile("public/openapi.json", `${JSON.stringify(specification, null, 2)}\n`)
  console.log("public/openapi.json atualizado.")
}

saveSpecification().catch(() => {
  console.error("Falha ao gerar especificação OpenAPI.")
  process.exitCode = 1
})
