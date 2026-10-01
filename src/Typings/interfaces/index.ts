import type { AgentStatus, CallStatus, Role } from ".."
import type { ConsoleController } from ".."

export interface ResourcesViewProps {
  app: ConsoleController
  data: ReturnType<typeof import("@/features/Resources/Controller").useResources>
}

export interface Agent {
  id: string
  name: string
  email: string
  role: Role
  extension: string
  status: AgentStatus
  queue_ids: string[]
  last_seen: string | null
  active: boolean
}

export interface Queue {
  id: string
  name: string
  number: string
  timeout: number
  active: boolean
}

export interface Campaign {
  id: string
  name: string
  queue_id: string
  status: "draft" | "running" | "paused" | "completed"
  max_attempts: number
  start_hour: number
  end_hour: number
}

export interface Contact {
  id: string
  name: string
  phone: string
  campaign_id: string
  status: "pending" | "dialing" | "completed" | "failed" | "blocked"
  attempts: number
}

export interface Call {
  id: string
  phone: string
  direction: "inbound" | "outbound"
  status: CallStatus
  agent_id: string | null
  queue_id: string | null
  contact_id: string | null
  created_at: string
  answered_at: string | null
  ended_at: string | null
  recording_path: string | null
  disposition: string | null
}

export interface Snapshot {
  agents: Agent[]
  queues: Queue[]
  campaigns: Campaign[]
  contacts: Contact[]
  calls: Call[]
  me: Agent | null
  worker_online: boolean
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  created_at: string
  revoked_at: string | null
}

export interface FieldDefinition {
  name: string
  label: string
  type?: string
  required?: boolean
  options?: { value: string; label: string }[]
  value?: string
  multiple?: boolean
}

export interface ResourceDialogProps {
  title: string
  fields: FieldDefinition[]
  onClose: () => void
  onSave: (values: Record<string, string>) => Promise<void>
}

export interface SipCredentials {
  server: string
  domain: string
  extension: string
  password: string
}

export interface AriChannel {
  id: string
  state: string
  caller: { number: string }
  dialplan: { exten: string }
}

export interface AriEvent {
  type: string
  args?: string[]
  channel?: AriChannel
  recording?: { name: string }
}

export interface LiveCall {
  call: Call
  channels: Set<string>
  joined: Set<string>
  bridge: string
  deadline: number
  queueTimeout: number
  agentStarted: boolean
  recording: boolean
  destinationAgentId?: string
}
