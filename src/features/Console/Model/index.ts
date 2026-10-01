import type { Section, Snapshot } from "@/Typings"

export const sections: { id: Section; label: string; group: string }[] = [
  { id: "dashboard", label: "Visão da operação", group: "OPERAÇÃO" },
  { id: "agents", label: "Operadores e usuários", group: "OPERAÇÃO" },
  { id: "queues", label: "Filas de atendimento", group: "OPERAÇÃO" },
  { id: "campaigns", label: "Discador e campanhas", group: "GESTÃO" },
  { id: "contacts", label: "Mailing", group: "GESTÃO" },
  { id: "calls", label: "Chamadas e gravações", group: "GESTÃO" },
  { id: "integrations", label: "API e integrações", group: "SISTEMA" },
  { id: "settings", label: "Configuração da central", group: "SISTEMA" }
]

export const labels: Record<string, string> = {
  available: "Disponível",
  busy: "Em atendimento",
  ringing: "Chamando",
  paused: "Em pausa",
  offline: "Desconectado",
  queued: "Em espera",
  active: "Em atendimento",
  completed: "Concluída",
  failed: "Não atendida",
  abandoned: "Abandonada",
  pending: "Pendente",
  dialing: "Discando",
  blocked: "Bloqueado",
  draft: "Rascunho",
  running: "Em execução",
  admin: "Administrador",
  supervisor: "Supervisor",
  operator: "Operador"
}

export const emptySnapshot: Snapshot = {
  agents: [],
  queues: [],
  campaigns: [],
  contacts: [],
  calls: [],
  me: null,
  worker_online: false
}
