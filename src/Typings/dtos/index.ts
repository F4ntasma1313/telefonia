import type { Role } from ".."

export interface CreateAgentDto {
  name: string
  email: string
  password: string
  role: Role
  extension: string
  queue_ids: string[]
}

export interface DialDto {
  phone: string
  queue_id?: string
  idempotency_key: string
}
