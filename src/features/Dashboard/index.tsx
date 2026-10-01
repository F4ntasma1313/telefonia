import { buildDashboard } from "./Controller"
import { DashboardView } from "./View"
import type { Snapshot } from "@/Typings"

export function Dashboard({
  snapshot,
  queueFilter
}: {
  snapshot: Snapshot
  queueFilter: string
}) {
  return <DashboardView data={buildDashboard(snapshot, queueFilter)} />
}
