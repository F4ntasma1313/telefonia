import { randomUUID } from "node:crypto"
import { createAdminClient } from "@/services/supabase"
import { ari, hangupChannel } from "@/services/asterisk"
import { checkDatabase } from "@/services/security"
import { applicationName, channelCallId, liveCalls } from "../Model"
import type { Agent, AriEvent, Call, LiveCall } from "@/Typings"

const db = createAdminClient()

export async function finish(live: LiveCall, status: "completed" | "failed" | "abandoned") {
  liveCalls.delete(live.call.id)

  for (const channel of live.channels) {
    await hangupChannel(channel)
  }

  try {
    await ari(`bridges/${live.bridge}`, "DELETE")
  } catch {
    console.info(JSON.stringify({ event: "bridge_closed", call_id: live.call.id }))
  }

  const { error } = await db.rpc("finish_call", {
    call_id: live.call.id,
    final_status: status
  })
  checkDatabase(error)
}

async function originate(live: LiveCall, endpoint: string, leg: "agent" | "peer") {
  const channelId = `nexuscc-${live.call.id}-${leg}`
  live.channels.add(channelId)
  await ari("channels", "POST", {
    endpoint,
    channelId,
    app: applicationName,
    appArgs: `${live.call.id},${leg}`,
    timeout: "25",
    callerId: process.env.OUTBOUND_CALLER_ID || "NexusCC <1000>"
  })
}

export async function startOutbound(call: Call) {
  const live: LiveCall = {
    call,
    channels: new Set(),
    joined: new Set(),
    bridge: `nexuscc-${call.id}`,
    deadline: Date.now() + 65000,
    queueTimeout: 120,
    agentStarted: true,
    recording: false
  }
  liveCalls.set(call.id, live)

  try {
    const { data: blocked, error: blockedError } = await db
      .from("denylist")
      .select("phone")
      .eq("phone", call.phone)
      .maybeSingle()
    checkDatabase(blockedError)

    if (
      blocked ||
      (call.phone.startsWith("+") && process.env.ALLOW_EXTERNAL_CALLS !== "true")
    ) {
      throw new Error("Destino bloqueado.")
    }

    const { data: agent, error } = await db
      .from("agents")
      .select("extension")
      .eq("id", call.agent_id)
      .eq("active", true)
      .single()
    checkDatabase(error)
    if (!call.phone.startsWith("+")) {
      if (call.phone === agent!.extension) {
        throw new Error("Não é possível ligar para o próprio ramal.")
      }

      const { data: destination, error: destinationError } = await db.rpc(
        "reserve_destination",
        { target_call: call.id }
      )
      checkDatabase(destinationError)
      live.destinationAgentId = destination as string
    }

    await ari(`bridges/${live.bridge}`, "POST", { type: "mixing,proxy_media" })
    await originate(live, `PJSIP/${agent!.extension}`, "agent")
  } catch {
    await finish(live, "failed")
  }
}

async function startIncoming(event: AriEvent) {
  const channel = event.channel!
  const maximum = Math.max(1, Math.min(50, Number(process.env.MAX_CONCURRENT_CALLS) || 5))

  if (liveCalls.size >= maximum) {
    await hangupChannel(channel.id)
    return
  }
  const queueNumber = event.args?.[1] ?? channel.dialplan.exten
  const { data: queue, error: queueError } = await db
    .from("queues")
    .select("*")
    .eq("number", queueNumber)
    .eq("active", true)
    .maybeSingle()
  checkDatabase(queueError)

  if (!queue) {
    await hangupChannel(channel.id)
    return
  }

  const id = randomUUID()
  const { data: call, error } = await db
    .from("calls")
    .insert({
      id,
      phone: channel.caller.number || "Anônimo",
      direction: "inbound",
      queue_id: queue.id
    })
    .select()
    .single()
  checkDatabase(error)
  const live: LiveCall = {
    call: call as Call,
    channels: new Set([channel.id]),
    joined: new Set([channel.id]),
    bridge: `nexuscc-${id}`,
    deadline: Date.now() + queue.timeout * 1000,
    queueTimeout: queue.timeout,
    agentStarted: false,
    recording: false
  }
  liveCalls.set(id, live)

  try {
    await ari(`channels/${channel.id}/answer`, "POST")
    await ari(`bridges/${live.bridge}`, "POST", { type: "mixing,proxy_media" })
    await ari(`bridges/${live.bridge}/addChannel`, "POST", { channel: channel.id })
    await ari(`bridges/${live.bridge}/moh`, "POST")
  } catch {
    await finish(live, "failed")
  }
}

export async function assignIncoming(live: LiveCall) {
  const { data, error } = await db.rpc("reserve_agent", { target_queue: live.call.queue_id })
  checkDatabase(error)
  const agent = data?.[0] as Agent | undefined

  if (!agent) {
    return
  }

  live.call.agent_id = agent.id
  live.agentStarted = true
  const { error: updateError } = await db
    .from("calls")
    .update({ agent_id: agent.id, status: "ringing" })
    .eq("id", live.call.id)
  checkDatabase(updateError)

  try {
    await originate(live, `PJSIP/${agent.extension}`, "agent")
  } catch {
    await finish(live, "failed")
  }
}

async function connectLeg(live: LiveCall, event: AriEvent) {
  const channelId = event.channel!.id
  live.joined.add(channelId)
  await ari(`bridges/${live.bridge}/addChannel`, "POST", { channel: channelId })

  if (event.args?.[1] === "agent" && live.call.direction === "outbound") {
    const phone = live.call.phone
    const trunk = process.env.ASTERISK_TRUNK ?? "carrier"

    if (!/^[a-zA-Z0-9_-]+$/.test(trunk)) {
      throw new Error("Tronco inválido.")
    }

    const endpoint = phone.startsWith("+") ? `PJSIP/${phone}@${trunk}` : `PJSIP/${phone}`
    await originate(live, endpoint, "peer")
    return
  }

  if (live.joined.size >= 2 && !live.recording) {
    if (live.call.direction === "inbound") {
      await ari(`bridges/${live.bridge}/moh`, "DELETE")
    }

    await ari(`bridges/${live.bridge}/record`, "POST", {
      name: `nexuscc-${live.call.id}`,
      format: "wav",
      ifExists: "fail",
      beep: "false"
    })
    live.recording = true
    live.call.status = "active"
    live.deadline = Date.now() + 3600000
    const { error } = await db
      .from("calls")
      .update({ status: "active", answered_at: new Date().toISOString() })
      .eq("id", live.call.id)
    checkDatabase(error)
    const { error: agentError } = await db
      .from("agents")
      .update({ status: "busy" })
      .in(
        "id",
        [live.call.agent_id, live.destinationAgentId].filter((id): id is string => Boolean(id))
      )
    checkDatabase(agentError)
  }
}

export async function handleEvent(event: AriEvent) {
  if (event.type === "StasisStart" && event.args?.[0] === "incoming") {
    await startIncoming(event)
    return
  }

  const callId = event.channel ? channelCallId(event.channel.id) : undefined
  const live = callId ? liveCalls.get(callId) : undefined

  if (!live) {
    return
  }

  try {
    if (event.type === "StasisStart") {
      await connectLeg(live, event)
    } else if (["StasisEnd", "ChannelDestroyed"].includes(event.type)) {
      await finish(
        live,
        live.call.status === "active"
          ? "completed"
          : live.call.direction === "inbound"
            ? "abandoned"
            : "failed"
      )
    }
  } catch {
    console.error(JSON.stringify({ event: "call_failed", call_id: live.call.id }))
    await finish(live, "failed")
  }
}
