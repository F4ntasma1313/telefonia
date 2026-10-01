import { useResourceDialog } from "./Controller"
import { ResourceDialogView } from "./View"
import type { ResourceDialogProps } from "@/Typings"

export function ResourceDialog(props: ResourceDialogProps) {
  return (
    <ResourceDialogView
      props={props}
      controller={useResourceDialog(props)}
    />
  )
}
