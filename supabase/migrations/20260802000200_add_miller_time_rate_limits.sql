-- Keep account-free Miller Time access while protecting the upstream AI budget
-- with a durable, service-role-only per-client quota.

create table if not exists travel_planner.ai_rate_limits (
  bucket_start timestamptz not null,
  client_hash text not null check (client_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null default 1 check (request_count > 0),
  last_seen_at timestamptz not null default now(),
  primary key (bucket_start, client_hash)
);

alter table travel_planner.ai_rate_limits enable row level security;

revoke all on table travel_planner.ai_rate_limits from anon, authenticated;
grant all on table travel_planner.ai_rate_limits to service_role;

create or replace function travel_planner.consume_miller_time_quota(
  p_client_hash text,
  p_limit integer default 10,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, travel_planner
as $$
declare
  v_bucket_start timestamptz;
  v_request_count integer;
begin
  if p_client_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_limit > 100
    or p_window_seconds < 10
    or p_window_seconds > 3600
  then
    raise exception 'invalid Miller Time quota input';
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into travel_planner.ai_rate_limits (
    bucket_start,
    client_hash,
    request_count,
    last_seen_at
  ) values (
    v_bucket_start,
    p_client_hash,
    1,
    clock_timestamp()
  )
  on conflict (bucket_start, client_hash) do update
    set request_count = travel_planner.ai_rate_limits.request_count + 1,
        last_seen_at = excluded.last_seen_at
  returning request_count into v_request_count;

  delete from travel_planner.ai_rate_limits
  where bucket_start < v_bucket_start - interval '1 day';

  return v_request_count <= p_limit;
end;
$$;

revoke all on function travel_planner.consume_miller_time_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function travel_planner.consume_miller_time_quota(text, integer, integer) to service_role;

comment on table travel_planner.ai_rate_limits is
  'Short-lived hashed client quotas for the public Miller Time Edge Function.';

comment on function travel_planner.consume_miller_time_quota(text, integer, integer) is
  'Atomically consumes one Miller Time request from a fixed window; service role only.';
