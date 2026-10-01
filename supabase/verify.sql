with checks (item, present) as (
  select 'public.queues', to_regclass('public.queues') is not null
  union all select 'public.agents', to_regclass('public.agents') is not null
  union all select 'public.sip_credentials', to_regclass('public.sip_credentials') is not null
  union all select 'public.campaigns', to_regclass('public.campaigns') is not null
  union all select 'public.contacts', to_regclass('public.contacts') is not null
  union all select 'public.denylist', to_regclass('public.denylist') is not null
  union all select 'public.calls', to_regclass('public.calls') is not null
  union all select 'public.api_keys', to_regclass('public.api_keys') is not null
  union all select 'public.audit_events', to_regclass('public.audit_events') is not null
  union all select 'public.worker_health', to_regclass('public.worker_health') is not null
  union all select 'public.rate_limits', to_regclass('public.rate_limits') is not null
  union all select 'worker_health.owner', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'worker_health' and column_name = 'owner'
  )
  union all select 'calls.destination_agent_id', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'calls' and column_name = 'destination_agent_id'
  )
  union all select 'public.reserve_agent(uuid)', to_regprocedure('public.reserve_agent(uuid)') is not null
  union all select 'public.enqueue_call(uuid,text,uuid,uuid)', to_regprocedure('public.enqueue_call(uuid,text,uuid,uuid)') is not null
  union all select 'public.claim_campaign_contact()', to_regprocedure('public.claim_campaign_contact()') is not null
  union all select 'public.finish_call(uuid,text)', to_regprocedure('public.finish_call(uuid,text)') is not null
  union all select 'public.claim_manual_call()', to_regprocedure('public.claim_manual_call()') is not null
  union all select 'public.acquire_worker_lease(uuid)', to_regprocedure('public.acquire_worker_lease(uuid)') is not null
  union all select 'public.reserve_destination(uuid)', to_regprocedure('public.reserve_destination(uuid)') is not null
  union all select 'public.consume_rate_limit(text)', to_regprocedure('public.consume_rate_limit(text)') is not null
  union all select 'recordings bucket privado', exists (
    select 1 from storage.buckets where id = 'recordings' and public = false
  )
  union all select 'RLS em agentes', exists (
    select 1 from pg_class where oid = to_regclass('public.agents') and relrowsecurity
  )
  union all select 'RLS em credenciais SIP', exists (
    select 1 from pg_class where oid = to_regclass('public.sip_credentials') and relrowsecurity
  )
)
select
  case when bool_and(present) then 'COMPLETO' else 'INCOMPLETO' end as estado,
  coalesce(string_agg(item, ', ' order by item) filter (where not present), '') as itens_pendentes
from checks;
