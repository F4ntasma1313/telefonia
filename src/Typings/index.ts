export type Role = "admin" | "supervisor" | "operator"
export type AgentStatus = "offline" | "available" | "paused" | "ringing" | "busy"
export type CallStatus = "queued" | "ringing" | "active" | "completed" | "failed" | "abandoned"
export type Section =
  | "dashboard"
  | "agents"
  | "queues"
  | "campaigns"
  | "contacts"
  | "calls"
  | "integrations"
  | "settings"
export type Entity = "agents" | "queues" | "campaigns" | "contacts"
export * from "./interfaces"
export * from "./dtos"
export type ConsoleController = ReturnType<typeof import("@/hooks/useConsole").useConsole>
export type DashboardController = ReturnType<
  typeof import("@/features/Dashboard/Controller").buildDashboard
>
