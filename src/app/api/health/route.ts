import { version } from "@/config"

export function GET() {
  return Response.json({ service: "nexuscc", version, status: "ok" })
}
