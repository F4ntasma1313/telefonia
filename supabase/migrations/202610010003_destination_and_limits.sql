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
