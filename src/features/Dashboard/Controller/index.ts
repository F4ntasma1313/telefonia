import type { Snapshot } from "@/Typings"

export function buildDashboard(snapshot: Snapshot, queueFilter: string) {
  const calls = snapshot.calls.filter((call) => !queueFilter || call.queue_id === queueFilter)
  const agents = snapshot.agents.filter(
    (agent) => !queueFilter || agent.queue_ids.includes(queueFilter)
  )
  const queues = snapshot.queues.filter((queue) => !queueFilter || queue.id === queueFilter)
  const completed = calls.filter((call) => call.status === "completed").length
  const abandoned = calls.filter((call) => call.status === "abandoned").length
  const answered = calls.filter((call) => call.answered_at && call.ended_at)
  const average = answered.length
    ? answered.reduce(
        (sum, call) =>
          sum +
          (new Date(call.ended_at!).getTime() - new Date(call.answered_at!).getTime()) / 1000,
        0
      ) / answered.length
    : 0
  const chart = Array.from({ length: 10 }, (_, index) => {
    const end = Date.now() - (9 - index) * 3600000
    const start = end - 3600000
    const group = calls.filter(
      (call) =>
        new Date(call.created_at).getTime() > start &&
        new Date(call.created_at).getTime() <= end
    )

    return {
      label: new Date(end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      completed: group.filter((call) => call.status === "completed").length,
      missed: group.filter((call) => ["failed", "abandoned"].includes(call.status)).length
    }
  })
  const peak = Math.max(1, ...chart.map((bar) => bar.completed + bar.missed))

  return {
    calls,
    agents,
    queues,
    completed,
    abandoned,
    chart,
    peak,
    average: `${Math.floor(average / 60)}m ${Math.round(average % 60)}s`,
    available: agents.filter((agent) => agent.status === "available").length,
    busy: agents.filter((agent) => agent.status === "busy").length,
    paused: agents.filter((agent) => agent.status === "paused").length,
    online: agents.filter((agent) => agent.status !== "offline").length,
    completionRate: calls.length ? Math.round((completed / calls.length) * 100) : 0,
    queueCards: queues.map((queue) => ({
      ...queue,
      agents: agents.filter((agent) => agent.queue_ids.includes(queue.id)),
      calls: calls.filter((call) => call.queue_id === queue.id),
      waiting: calls.filter((call) => call.queue_id === queue.id && call.status === "queued")
        .length
    }))
  }
}
