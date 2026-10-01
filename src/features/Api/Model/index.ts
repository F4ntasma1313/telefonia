import { z } from "zod"
import { normalizePhone } from "@/utils/phone"

export const phoneSchema = z.string().transform((value, context) => {
  try {
    return normalizePhone(value)
  } catch {
    context.addIssue({
      code: "custom",
      message: "Telefone inválido. Use +55DDDNUMERO ou ramal."
    })
    return z.NEVER
  }
})

export const agentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(12).max(128),
  extension: z.string().regex(/^\d{3,6}$/),
  role: z.enum(["admin", "supervisor", "operator"]),
  queue_ids: z.array(z.uuid()).max(50).default([])
})

export const queueSchema = z.object({
  name: z.string().trim().min(2).max(100),
  number: z.string().regex(/^\d{3,6}$/),
  timeout: z.coerce.number().int().min(15).max(600).default(120),
  active: z.boolean().default(true)
})

export const campaignSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    queue_id: z.uuid(),
    max_attempts: z.coerce.number().int().min(1).max(10).default(3),
    start_hour: z.coerce.number().int().min(0).max(23).default(9),
    end_hour: z.coerce.number().int().min(1).max(24).default(18)
  })
  .refine(
    (value) => value.end_hour > value.start_hour,
    "Horário final deve ser posterior ao inicial"
  )

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  campaign_id: z.uuid()
})

export const dialSchema = z.object({
  phone: phoneSchema,
  queue_id: z.uuid().optional(),
  idempotency_key: z.uuid()
})
