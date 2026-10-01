begin;

create extension if not exists pgcrypto;

create table public.queues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text not null unique check (number ~ '^[0-9]{3,6}$'),
  timeout integer not null default 120 check (timeout between 15 and 600),
  active boolean not null default true
);

create table public.agents (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'supervisor', 'operator')),
  extension text not null unique check (extension ~ '^[0-9]{3,6}$'),
  status text not null default 'offline' check (status in ('offline', 'available', 'paused', 'ringing', 'busy')),
  queue_ids uuid[] not null default '{}',
  last_seen timestamptz,
  last_assigned timestamptz,
  active boolean not null default true
);

create table public.sip_credentials (
  agent_id uuid primary key references public.agents on delete cascade,
  password text not null default encode(gen_random_bytes(24), 'hex')
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  queue_id uuid not null references public.queues,
  status text not null default 'draft' check (status in ('draft', 'running', 'paused', 'completed')),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  start_hour integer not null default 9 check (start_hour between 0 and 23),
  end_hour integer not null default 18 check (end_hour between 1 and 24),
  check (end_hour > start_hour)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null check (phone ~ '^(\+[1-9][0-9]{7,14}|[0-9]{3,6})$'),
  campaign_id uuid not null references public.campaigns,
  status text not null default 'pending' check (status in ('pending', 'dialing', 'completed', 'failed', 'blocked')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  unique (campaign_id, phone)
);

create table public.denylist (
  phone text primary key,
  reason text not null default 'Solicitação de não contato',
  created_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  status text not null default 'queued' check (status in ('queued', 'ringing', 'active', 'completed', 'failed', 'abandoned')),
  agent_id uuid references public.agents,
  destination_agent_id uuid references public.agents,
  queue_id uuid references public.queues,
  contact_id uuid references public.contacts,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  recording_path text,
  disposition text,
  idempotency_key uuid unique,
  requested_by uuid references public.agents,
  error text
);

create unique index one_live_call_per_agent on public.calls(agent_id)
  where status in ('queued', 'ringing', 'active') and agent_id is not null;
create index calls_created_at on public.calls(created_at desc);
create index contacts_pending on public.contacts(campaign_id, next_attempt_at) where status = 'pending';

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prefix text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  resource_id text,
  created_at timestamptz not null default now()
);

create table public.worker_health (
  id text primary key,
  last_seen timestamptz not null default now()
);

create function public.reserve_agent(target_queue uuid)
returns setof public.agents language plpgsql security definer set search_path = public as $$
declare selected_id uuid;
begin
  select id into selected_id from agents
  where active and status = 'available' and last_seen > now() - interval '45 seconds'
    and target_queue = any(queue_ids)
  order by last_assigned nulls first, id for update skip locked limit 1;
  return query update agents set status = 'ringing', last_assigned = now()
    where id = selected_id returning *;
end;
$$;

create function public.enqueue_call(target_agent uuid, destination text, target_queue uuid, request_key uuid)
returns public.calls language plpgsql security definer set search_path = public as $$
declare result calls;
begin
  select * into result from calls where idempotency_key = request_key;
  if found then
    if result.requested_by <> target_agent then raise exception 'Idempotency key conflict'; end if;
    return result;
  end if;
  if exists(select 1 from denylist where phone = destination) then raise exception 'Número bloqueado'; end if;
  perform 1 from agents where id = target_agent and active and status = 'available'
    and last_seen > now() - interval '45 seconds' for update;
  if not found then raise exception 'Operador indisponível ou telefone desconectado'; end if;
  update agents set status = 'ringing', last_assigned = now() where id = target_agent;
  insert into calls(phone, direction, agent_id, queue_id, idempotency_key, requested_by)
    values(destination, 'outbound', target_agent, target_queue, request_key, target_agent) returning * into result;
  return result;
end;
$$;

create function public.claim_campaign_contact()
returns public.calls language plpgsql security definer set search_path = public as $$
declare selected_contact contacts; selected_campaign campaigns; selected_agent agents; result calls;
begin
  for selected_campaign in select * from campaigns where status = 'running'
    and extract(hour from now() at time zone 'America/Sao_Paulo') >= start_hour
    and extract(hour from now() at time zone 'America/Sao_Paulo') < end_hour
    and exists(select 1 from queues where id = queue_id and active)
  loop
    select * into selected_contact from contacts
      where campaign_id = selected_campaign.id and status = 'pending'
      and attempts < selected_campaign.max_attempts and next_attempt_at <= now()
      and not exists(select 1 from denylist where phone = contacts.phone)
      order by next_attempt_at, id for update skip locked limit 1;
    if not found then continue; end if;
    select * into selected_agent from reserve_agent(selected_campaign.queue_id);
    if selected_agent.id is null then continue; end if;
    update contacts set status = 'dialing', attempts = attempts + 1 where id = selected_contact.id;
    insert into calls(phone, direction, agent_id, queue_id, contact_id)
      values(selected_contact.phone, 'outbound', selected_agent.id, selected_campaign.queue_id, selected_contact.id)
      returning * into result;
    return result;
  end loop;
  return null;
end;
$$;

create function public.finish_call(call_id uuid, final_status text)
returns void language plpgsql security definer set search_path = public as $$
declare current_call calls;
begin
  if final_status not in ('completed', 'failed', 'abandoned') then raise exception 'Invalid status'; end if;
  update calls set status = final_status, ended_at = now()
    where id = call_id and ended_at is null returning * into current_call;
  if not found then return; end if;
  update agents set status = case when last_seen > now() - interval '45 seconds' then 'available' else 'offline' end
    where id in (current_call.agent_id, current_call.destination_agent_id);
  if current_call.contact_id is not null then
    update contacts set status = case
      when final_status = 'completed' then 'completed'
      when attempts < (select max_attempts from campaigns where id = contacts.campaign_id) then 'pending'
      else 'failed' end,
      next_attempt_at = now() + interval '15 minutes'
      where id = current_call.contact_id and status <> 'blocked';
  end if;
end;
$$;

create function public.claim_manual_call()
returns public.calls language plpgsql security definer set search_path = public as $$
declare result calls;
begin
  select * into result from calls where status = 'queued' and direction = 'outbound'
    order by created_at for update skip locked limit 1;
  if result.id is not null then
    update calls set status = 'ringing' where id = result.id returning * into result;
  end if;
  return result;
end;
$$;

alter table public.queues enable row level security;
alter table public.agents enable row level security;
alter table public.sip_credentials enable row level security;
alter table public.campaigns enable row level security;
alter table public.contacts enable row level security;
alter table public.calls enable row level security;
alter table public.api_keys enable row level security;
alter table public.audit_events enable row level security;
alter table public.worker_health enable row level security;
alter table public.denylist enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke execute on function public.reserve_agent(uuid) from public, anon, authenticated;
revoke execute on function public.enqueue_call(uuid,text,uuid,uuid) from public, anon, authenticated;
revoke execute on function public.claim_campaign_contact() from public, anon, authenticated;
revoke execute on function public.finish_call(uuid,text) from public, anon, authenticated;
revoke execute on function public.claim_manual_call() from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 104857600, array['audio/wav'])
on conflict(id) do nothing;


alter table public.worker_health add column owner uuid;

create function public.acquire_worker_lease(worker_owner uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  insert into worker_health(id, last_seen, owner) values ('telephony', now(), worker_owner)
    on conflict(id) do update set last_seen = now(), owner = excluded.owner
    where worker_health.owner = excluded.owner or worker_health.last_seen < now() - interval '30 seconds';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke execute on function public.acquire_worker_lease(uuid) from public, anon, authenticated;
grant execute on function public.acquire_worker_lease(uuid) to service_role;


create function public.reserve_destination(target_call uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare current_call calls; destination_id uuid;
begin
  select * into current_call from calls where id = target_call for update;
  if not found then raise exception 'Chamada não encontrada'; end if;
  update agents set status = 'ringing'
    where extension = current_call.phone and id <> current_call.agent_id
      and active and status = 'available' and last_seen > now() - interval '45 seconds'
    returning id into destination_id;
  if destination_id is null then raise exception 'Ramal de destino indisponível'; end if;
  update calls set destination_agent_id = destination_id where id = target_call;
  return destination_id;
end;
$$;

create table public.rate_limits (
  actor text primary key,
  window_start timestamptz not null,
  requests integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create function public.consume_rate_limit(actor_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  insert into rate_limits(actor, window_start, requests) values(actor_id, now(), 1)
    on conflict(actor) do update set
      window_start = case when rate_limits.window_start < now() - interval '1 minute' then now() else rate_limits.window_start end,
      requests = case when rate_limits.window_start < now() - interval '1 minute' then 1 else rate_limits.requests + 1 end
    returning requests into used;
  return used <= 180;
end;
$$;

revoke execute on function public.reserve_destination(uuid) from public, anon, authenticated;
revoke execute on function public.consume_rate_limit(text) from public, anon, authenticated;
grant execute on function public.reserve_destination(uuid) to service_role;
grant execute on function public.consume_rate_limit(text) to service_role;


commit;
