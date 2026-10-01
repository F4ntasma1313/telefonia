"use client"

import { useConsoleController } from "./Controller"
import { ConsoleView } from "./View"

export default function Console() {
  const controller = useConsoleController()
  return <ConsoleView controller={controller} />
}
