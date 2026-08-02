-- Make this shared Supabase project a Travel Planner-only public surface.
-- Dormant app data is preserved, but browser roles can no longer discover or
-- access public, dog_training, or spanish_app objects through PostgREST.

-- Expose only the schema used by the Travel Planner client. Supabase Auth and
-- Edge Functions are separate services and are unaffected by this setting.
alter role authenticator set pgrst.db_schemas = 'travel_planner';
notify pgrst, 'reload config';

-- Lock down the dormant schemas themselves, then remove every current object
-- grant for browser roles. Keeping service_role access lets an administrator
-- recover or migrate the preserved data later without reopening it publicly.
revoke all on schema public, dog_training, spanish_app
  from public, anon, authenticated;
grant usage on schema public, dog_training, spanish_app to service_role;

revoke all on all tables in schema public, dog_training, spanish_app
  from public, anon, authenticated;
revoke all on all sequences in schema public, dog_training, spanish_app
  from public, anon, authenticated;

-- Only postgres-owned application functions are changed. Extension-owned
-- vector functions may retain their internal ACLs, but are unreachable because
-- the public schema is no longer exposed and browser roles lack schema usage.
do $$
declare
  application_function regprocedure;
begin
  for application_function in
    select p.oid::regprocedure
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname in ('public', 'dog_training', 'spanish_app')
      and pg_get_userbyid(p.proowner) = 'postgres'
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      application_function
    );
  end loop;
end;
$$;

-- New dormant-app objects must be explicitly granted before they can ever be
-- reached from a client. This opts the older project into Supabase's newer,
-- least-privilege defaults.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions
  from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema dog_training
  revoke select, insert, update, delete on tables
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema dog_training
  revoke usage, select, update on sequences
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema dog_training
  revoke execute on functions
  from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema spanish_app
  revoke select, insert, update, delete on tables
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema spanish_app
  revoke usage, select, update on sequences
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema spanish_app
  revoke execute on functions
  from public, anon, authenticated, service_role;

-- Preserve every stored file but remove public delivery and the dormant dog
-- app's authenticated object policies. No Travel Planner feature uses Storage.
update storage.buckets
set public = false
where public is true;

drop policy if exists "clip uploads delete own" on storage.objects;
drop policy if exists "clip uploads insert own" on storage.objects;
drop policy if exists "clip uploads read own" on storage.objects;

-- Stop dormant background workers from continuing to call their old app code.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'focus-sync-tick',
  'companion-life-2h',
  'consolidate-memory-nightly',
  'salience-nightly-decay',
  'companion-day-daily'
);

-- Reassert the intended Travel Planner boundary. Anonymous visitors remain
-- local-only; signed-in users receive only the table privileges already
-- constrained by the schema's membership-aware RLS policies.
revoke all on schema travel_planner from public, anon;
grant usage on schema travel_planner to authenticated, service_role;

revoke all on all tables in schema travel_planner from public, anon;
revoke all on all sequences in schema travel_planner from public, anon;
revoke all on all functions in schema travel_planner from public, anon, authenticated;
grant execute on function travel_planner.consume_miller_time_quota(text, integer, integer)
  to service_role;

-- The RLS helper schema is not part of the API. Authenticated users need only
-- the one role lookup used inside Travel Planner policies.
revoke all on schema travel_planner_private from public, anon;
revoke all on all functions in schema travel_planner_private
  from public, anon, authenticated;
grant usage on schema travel_planner_private to authenticated, service_role;
grant execute on function travel_planner_private.role_for_trip(uuid)
  to authenticated, service_role;
