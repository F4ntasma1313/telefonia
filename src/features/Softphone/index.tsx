import { useSoftphone } from "./Controller"
import { SoftphoneView } from "./View"
import type { ConsoleController } from "@/Typings"

export function Softphone({ app }: { app: ConsoleController }) {
  const { audioRef, ...controller } = useSoftphone(app)
  return (
    <SoftphoneView
      data={controller}
      audioRef={audioRef}
      extension={app.snapshot.me?.extension}
    />
  )
}
