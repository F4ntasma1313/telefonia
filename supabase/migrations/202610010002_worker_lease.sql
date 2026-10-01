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
