import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizePhone } from "../src/utils/phone"
import {
  agentSchema,
  campaignSchema,
  contactSchema,
  dialSchema
} from "../src/features/Api/Model"
import { requireRole } from "../src/services/security"
import { createDemoSnapshot } from "../src/services/demo/Model"

test("normaliza E.164 formatado e preserva ramais", () => {
  assert.equal(normalizePhone("+55 (11) 99999-9999"), "+5511999999999")
  assert.equal(normalizePhone("1001"), "1001")
})

test("rejeita URI SIP injetável e números sem país", () => {
  for (const input of [
    "PJSIP/1001",
    "+55119999@carrier",
    "11999999999",
    "1000\n[admin]",
    ""
  ]) {
    assert.throws(() => normalizePhone(input))
  }
})

test("valida fronteiras de usuários, campanhas e mailing", () => {
  assert.equal(
    agentSchema.safeParse({
      name: "Ana",
      email: "bad",
      password: "123",
      role: "root",
      extension: "xx"
    }).success,
    false
  )
  assert.equal(
    campaignSchema.safeParse({
      name: "Teste",
      queue_id: "10000000-0000-4000-8000-000000000001",
      start_hour: 18,
      end_hour: 9
    }).success,
    false
  )
  assert.equal(
    contactSchema.safeParse({
      name: "Contato",
      phone: "+5511999999999",
      campaign_id: "invalid"
    }).success,
    false
  )
  assert.equal(dialSchema.safeParse({ phone: "1001" }).success, false)
})

test("operador não obtém autorização administrativa", () => {
  const agent = createDemoSnapshot().agents[1]
  assert.throws(() => requireRole(agent, ["admin"]), /permissão/)
  assert.throws(() => requireRole(null, ["admin"]), /permissão/)
  assert.doesNotThrow(() => requireRole(agent, ["operator"]))
})
