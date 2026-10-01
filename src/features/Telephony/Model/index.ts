import type { LiveCall } from "@/Typings"

export const liveCalls = new Map<string, LiveCall>()
export const applicationName = "nexuscc"

export function channelCallId(channelId: string): string | undefined {
  return [...liveCalls.values()].find((live) => live.channels.has(channelId))?.call.id
}
