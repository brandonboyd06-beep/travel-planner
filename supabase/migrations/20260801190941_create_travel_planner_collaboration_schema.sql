-- Banff 2026 local-first collaboration storage.
-- Anonymous visitors never reach these tables; authenticated access is always
-- constrained to a trip membership by row-level security.

create schema if not exists travel_planner;
create schema if not exists travel_planner_private;

comment on schema travel_planner is
  'Authenticated collaboration data for the Banff 2026 travel planner.';
comment on schema travel_planner_private is
  'Non-API helper functions used by travel_planner RLS and triggers.';

revoke all on schema travel_planner from public, anon;
revoke all on schema travel_planner_private from public, anon;
grant usage on schema travel_planner to authenticated, service_role;
grant usage on schema travel_planner_private to authenticated, service_role;

create table travel_planner.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table travel_planner.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null default 'Banff & the Canadian Rockies'
    check (char_length(name) between 1 and 120),
  destination text not null default 'Banff, Alberta, Canada'
    check (char_length(destination) between 1 and 160),
  starts_on date not null default date '2026-10-03',
  ends_on date not null default date '2026-10-10',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_order check (ends_on >= starts_on)
);

create table travel_planner.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_planner.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text not null check (char_length(invited_email) between 3 and 320),
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint owner_members_are_accepted check (
    role <> 'owner' or (user_id is not null and accepted_at is not null)
  )
);

create unique index trip_members_trip_user_uidx
  on travel_planner.trip_members (trip_id, user_id)
  where user_id is not null;
create unique index trip_members_trip_email_uidx
  on travel_planner.trip_members (trip_id, lower(invited_email));
create index trip_members_user_id_idx
  on travel_planner.trip_members (user_id, trip_id)
  where user_id is not null;

create table travel_planner.trip_state (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references travel_planner.trips(id) on delete cascade,
  preference_key text not null check (char_length(preference_key) between 1 and 80),
  value jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, preference_key)
);

create index trip_state_trip_updated_idx
  on travel_planner.trip_state (trip_id, updated_at desc);

comment on table travel_planner.trip_state is
  'One JSON value per localStorage preference key, allowing independent collaborative updates.';

create function travel_planner_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function travel_planner_private.advance_trip_state_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.revision = old.revision + 1;
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on travel_planner.profiles
for each row execute function travel_planner_private.set_updated_at();

create trigger trips_set_updated_at
before update on travel_planner.trips
for each row execute function travel_planner_private.set_updated_at();

create trigger trip_state_advance_revision
before update on travel_planner.trip_state
for each row execute function travel_planner_private.advance_trip_state_revision();

create function travel_planner_private.role_for_trip(check_trip_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    when exists (
      select 1
      from travel_planner.trips
      where id = check_trip_id
        and owner_id = (select auth.uid())
    ) then 'owner'
    else (
      select tm.role
      from travel_planner.trip_members as tm
      where tm.trip_id = check_trip_id
        and tm.user_id = (select auth.uid())
        and tm.accepted_at is not null
      limit 1
    )
  end;
$$;

create function travel_planner_private.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_email text;
begin
  select lower(email) into owner_email
  from auth.users
  where id = new.owner_id;

  insert into travel_planner.trip_members (
    trip_id,
    user_id,
    invited_email,
    role,
    invited_by,
    accepted_at
  ) values (
    new.id,
    new.owner_id,
    owner_email,
    'owner',
    new.owner_id,
    now()
  );

  return new;
end;
$$;

create trigger trips_add_owner_membership
after insert on travel_planner.trips
for each row execute function travel_planner_private.add_owner_membership();

create function travel_planner_private.guard_trip_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' then
    if new.trip_id <> old.trip_id
      or new.user_id is distinct from old.user_id
      or new.invited_email <> old.invited_email
      or new.role <> old.role
      or new.invited_by <> old.invited_by
      or new.accepted_at is distinct from old.accepted_at then
      raise exception 'The owner membership identity cannot be changed.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if exists (
    select 1
    from travel_planner.trips
    where id = old.trip_id
      and owner_id = (select auth.uid())
  ) then
    return new;
  end if;

  if old.user_id is null
    and new.user_id = (select auth.uid())
    and new.trip_id = old.trip_id
    and lower(new.invited_email) = lower(old.invited_email)
    and new.role = old.role
    and new.invited_by = old.invited_by
    and new.accepted_at is not null then
    return new;
  end if;

  raise exception 'Only a trip owner can change this membership.'
    using errcode = '42501';
end;
$$;

create trigger trip_members_guard_update
before update on travel_planner.trip_members
for each row execute function travel_planner_private.guard_trip_member_update();

revoke all on all functions in schema travel_planner_private from public, anon, authenticated;
grant execute on function travel_planner_private.role_for_trip(uuid) to authenticated, service_role;

alter table travel_planner.profiles enable row level security;
alter table travel_planner.trips enable row level security;
alter table travel_planner.trip_members enable row level security;
alter table travel_planner.trip_state enable row level security;

create policy profiles_select_own
on travel_planner.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on travel_planner.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on travel_planner.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy trips_select_members
on travel_planner.trips for select
to authenticated
using ((select travel_planner_private.role_for_trip(id)) is not null);

create policy trips_insert_owner
on travel_planner.trips for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy trips_update_owner
on travel_planner.trips for update
to authenticated
using ((select travel_planner_private.role_for_trip(id)) = 'owner')
with check ((select auth.uid()) = owner_id);

create policy trips_delete_owner
on travel_planner.trips for delete
to authenticated
using ((select travel_planner_private.role_for_trip(id)) = 'owner');

create policy trip_members_select_trip
on travel_planner.trip_members for select
to authenticated
using (
  (select travel_planner_private.role_for_trip(trip_id)) is not null
  or (
    user_id is null
    and lower(invited_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy trip_members_insert_owner
on travel_planner.trip_members for insert
to authenticated
with check (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  and invited_by = (select auth.uid())
  and user_id is null
  and role in ('editor', 'viewer')
);

create policy trip_members_update_owner_or_accept
on travel_planner.trip_members for update
to authenticated
using (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  or (
    user_id is null
    and lower(invited_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
)
with check (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  or (
    user_id = (select auth.uid())
    and accepted_at is not null
    and role in ('editor', 'viewer')
    and lower(invited_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

create policy trip_members_delete_owner
on travel_planner.trip_members for delete
to authenticated
using (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  and role <> 'owner'
);

create policy trip_state_select_members
on travel_planner.trip_state for select
to authenticated
using ((select travel_planner_private.role_for_trip(trip_id)) is not null);

create policy trip_state_insert_editors
on travel_planner.trip_state for insert
to authenticated
with check (
  (select travel_planner_private.role_for_trip(trip_id)) in ('owner', 'editor')
  and updated_by = (select auth.uid())
);

create policy trip_state_update_editors
on travel_planner.trip_state for update
to authenticated
using ((select travel_planner_private.role_for_trip(trip_id)) in ('owner', 'editor'))
with check (
  (select travel_planner_private.role_for_trip(trip_id)) in ('owner', 'editor')
  and updated_by = (select auth.uid())
);

create policy trip_state_delete_editors
on travel_planner.trip_state for delete
to authenticated
using ((select travel_planner_private.role_for_trip(trip_id)) in ('owner', 'editor'));

revoke all on all tables in schema travel_planner from public, anon;
grant select, insert, update on travel_planner.profiles to authenticated;
grant select, insert, update, delete on travel_planner.trips to authenticated;
grant select, insert, update, delete on travel_planner.trip_members to authenticated;
grant select, insert, update, delete on travel_planner.trip_state to authenticated;
grant all on all tables in schema travel_planner to service_role;

alter default privileges for role postgres in schema travel_planner
  revoke all on tables from public, anon;
alter default privileges for role postgres in schema travel_planner
  grant all on tables to service_role;

do $$
begin
  alter publication supabase_realtime add table travel_planner.trip_state;
exception
  when duplicate_object then null;
end;
$$;

-- Keep existing exposed schemas and add this app's API surface.
do $$
declare
  exposed_schemas text;
begin
  select split_part(setting, '=', 2)
  into exposed_schemas
  from pg_roles,
       unnest(rolconfig) as setting
  where rolname = 'authenticator'
    and setting like 'pgrst.db_schemas=%';

  if exposed_schemas is null then
    exposed_schemas := 'public, graphql_public';
  end if;

  if not ('travel_planner' = any(string_to_array(replace(exposed_schemas, ' ', ''), ','))) then
    execute format(
      'alter role authenticator set pgrst.db_schemas = %L',
      exposed_schemas || ', travel_planner'
    );
  end if;
end;
$$;

notify pgrst, 'reload config';
