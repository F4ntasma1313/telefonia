import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import { before, after, test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto"

const db = new PGlite({ extensions: { pgcrypto } })
const queueId = "10000000-0000-4000-8000-000000000001"
const firstAgent = "30000000-0000-4000-8000-000000000001"
const secondAgent = "30000000-0000-4000-8000-000000000002"
const campaignId = "20000000-0000-4000-8000-000000000001"

before(async () => {
  await db.exec(`
    create schema auth;
    create schema storage;
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  `)

  const files = (await readdir("supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of files) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"))
  }

  await db.query("insert into queues(id,name,number) values($1,'Comercial','2000')", [queueId])

  for (const [index, id] of [firstAgent, secondAgent].entries()) {
    await db.query("insert into auth.users(id) values($1)", [id])
    await db.query(
      "insert into agents(id,name,email,role,extension,status,last_seen,queue_ids) values($1,$2,$3,'operator',$4,'available',now(),array[$5::uuid])",
      [id, `Agent ${index}`, `agent${index}@example.com`, String(1000 + index), queueId]
    )
  }

  await db.query(
    "insert into campaigns(id,name,queue_id,status,start_hour,end_hour,max_attempts) values($1,'Teste',$2,'running',0,24,2)",
    [campaignId, queueId]
  )
})

after(async () => {
  await db.close()
})

test("verificação confirma a instalação completa sem modificar dados", async () => {
  const sql = await readFile("supabase/verify.sql", "utf8")
  const result = await db.query<{ estado: string, itens_pendentes: string }>(sql)

  assert.equal(result.rows[0].estado, "COMPLETO")
  assert.equal(result.rows[0].itens_pendentes, "")
})

test("idempotência não duplica chamada e bloqueia outro solicitante", async () => {
  const requestId = "40000000-0000-4000-8000-000000000001"
  const first = await db.query<{ id: string }>("select (enqueue_call($1,'1001',$2,$3)).id", [
    firstAgent,
    queueId,
    requestId
  ])
  const repeated = await db.query<{ id: string }>(
    "select (enqueue_call($1,'1001',$2,$3)).id",
    [firstAgent, queueId, requestId]
  )
  assert.equal(first.rows[0].id, repeated.rows[0].id)
  await assert.rejects(
    db.query("select enqueue_call($1,'1001',$2,$3)", [secondAgent, queueId, requestId]),
    /conflict/
  )
  await db.query("select reserve_destination($1)", [first.rows[0].id])
  const reserved = await db.query<{ status: string }>(
    "select status from agents where id=$1",
    [secondAgent]
  )
  assert.equal(reserved.rows[0].status, "ringing")
  await db.query("select finish_call($1,'completed')", [first.rows[0].id])
  const released = await db.query<{ status: string }>("select status from agents")
  assert.ok(released.rows.every((agent) => agent.status === "available"))
})

test("números bloqueados não geram chamada nem reservam operador", async () => {
  await db.exec("insert into denylist(phone) values('+5511999999999')")
  await assert.rejects(
    db.query("select enqueue_call($1,'+5511999999999',$2,gen_random_uuid())", [
      firstAgent,
      queueId
    ]),
    /bloqueado/
  )
  const agents = await db.query<{ status: string }>("select status from agents")
  assert.ok(agents.rows.every((agent) => agent.status === "available"))
})

test("discador respeita bloqueio, tentativas e intervalo", async () => {
  await db.query(
    "insert into contacts(name,phone,campaign_id) values('Bloqueado','+5511999999999',$1),('Elegível','+5511888888888',$1)",
    [campaignId]
  )
  const claim = await db.query<{ id: string; phone: string }>(
    "select id,phone from claim_campaign_contact()"
  )
  assert.equal(claim.rows[0].phone, "+5511888888888")
  const contact = await db.query<{ attempts: number; status: string }>(
    "select attempts,status from contacts where phone='+5511888888888'"
  )
  assert.equal(contact.rows[0].attempts, 1)
  assert.equal(contact.rows[0].status, "dialing")
  await db.query("select finish_call($1,'failed')", [claim.rows[0].id])
  const next = await db.query<{ id: string | null }>("select id from claim_campaign_contact()")
  assert.equal(next.rows[0].id, null)
  await db.exec(
    "update contacts set next_attempt_at=now()-interval '1 minute' where phone='+5511888888888'"
  )
  const retry = await db.query<{ id: string }>("select id from claim_campaign_contact()")
  await db.query("select finish_call($1,'failed')", [retry.rows[0].id])
  const exhausted = await db.query<{ status: string; attempts: number }>(
    "select status,attempts from contacts where phone='+5511888888888'"
  )
  assert.equal(exhausted.rows[0].status, "failed")
  assert.equal(exhausted.rows[0].attempts, 2)
})

test("RLS e grants bloqueiam acesso direto autenticado", async () => {
  await db.exec("set role authenticated")
  await assert.rejects(db.query("select * from sip_credentials"), /permission denied/)
  await assert.rejects(db.query("select reserve_agent($1)", [queueId]), /permission denied/)
  await db.exec("reset role")
})

test("lease impede dois workers e limite de API é aplicado", async () => {
  const a = await db.query<{ acquired: boolean }>(
    "select acquire_worker_lease($1) as acquired",
    [firstAgent]
  )
  const b = await db.query<{ acquired: boolean }>(
    "select acquire_worker_lease($1) as acquired",
    [secondAgent]
  )
  assert.equal(a.rows[0].acquired, true)
  assert.equal(b.rows[0].acquired, false)
  await db.exec("insert into rate_limits values('test',now(),180)")
  const limited = await db.query<{ allowed: boolean }>(
    "select consume_rate_limit('test') as allowed"
  )
  assert.equal(limited.rows[0].allowed, false)
})
