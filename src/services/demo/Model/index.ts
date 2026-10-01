import type { Snapshot } from "@/Typings"

const queueSales = "10000000-0000-4000-8000-000000000001"
const queueSupport = "10000000-0000-4000-8000-000000000002"
const campaignId = "20000000-0000-4000-8000-000000000001"
const names = [
  "Ana Martins",
  "Bruno Costa",
  "Carolina Lima",
  "Diego Alves",
  "Elisa Santos",
  "Felipe Rocha"
]

export function createDemoSnapshot(): Snapshot {
  const now = Date.now()
  const agents: Snapshot["agents"] = names.map((name, index) => ({
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    role: index === 0 ? "admin" : "operator",
    extension: String(1000 + index),
    status: (["available", "busy", "available", "paused", "busy", "offline"] as const)[index],
    queue_ids: [index < 4 ? queueSales : queueSupport],
    last_seen: new Date(now).toISOString(),
    active: true
  }))

  return {
    agents,
    me: agents[0],
    worker_online: false,
    queues: [
      { id: queueSales, name: "Comercial", number: "2000", timeout: 120, active: true },
      { id: queueSupport, name: "Relacionamento", number: "2001", timeout: 90, active: true }
    ],
    campaigns: [
      {
        id: campaignId,
        name: "Novas oportunidades",
        queue_id: queueSales,
        status: "paused",
        max_attempts: 3,
        start_hour: 9,
        end_hour: 18
      }
    ],
    contacts: Array.from({ length: 12 }, (_, index) => ({
      id: crypto.randomUUID(),
      name: `Contato de exemplo ${index + 1}`,
      phone: `+551199990${String(index).padStart(4, "0")}`,
      campaign_id: campaignId,
      status: index < 4 ? "completed" : "pending",
      attempts: index < 4 ? 1 : 0
    })),
    calls: Array.from({ length: 48 }, (_, index) => {
      const start = now - index * 620000
      const live = index < 2

      return {
        id: crypto.randomUUID(),
        phone: `+551199990${String(index).padStart(4, "0")}`,
        direction: index % 3 === 0 ? "inbound" : "outbound",
        status: live
          ? "active"
          : index % 7 === 0
            ? "abandoned"
            : index % 4 === 0
              ? "failed"
              : "completed",
        agent_id: agents[live ? (index === 0 ? 1 : 4) : index % agents.length].id,
        queue_id: index % 2 === 0 ? queueSales : queueSupport,
        contact_id: null,
        created_at: new Date(start).toISOString(),
        answered_at: index % 4 === 0 && !live ? null : new Date(start + 8000).toISOString(),
        ended_at: live ? null : new Date(start + 138000 + index * 1000).toISOString(),
        recording_path: null,
        disposition: null
      }
    })
  }
}
