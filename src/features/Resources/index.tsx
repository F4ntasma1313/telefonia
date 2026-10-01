import { useResources } from "./Controller"
import { ResourcesView } from "./View"
import type { ConsoleController } from "@/Typings"

export function Resources({ controller }: { controller: ConsoleController }) {
  return (
    <ResourcesView
      app={controller}
      data={useResources(controller)}
    />
  )
}
