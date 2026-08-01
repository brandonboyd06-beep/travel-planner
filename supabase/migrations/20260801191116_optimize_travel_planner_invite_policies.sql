drop policy if exists trip_members_select_trip
on travel_planner.trip_members;

create policy trip_members_select_trip
on travel_planner.trip_members for select
to authenticated
using (
  (select travel_planner_private.role_for_trip(trip_id)) is not null
  or (
    user_id is null
    and lower(invited_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);

drop policy if exists trip_members_update_owner_or_accept
on travel_planner.trip_members;

create policy trip_members_update_owner_or_accept
on travel_planner.trip_members for update
to authenticated
using (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  or (
    user_id is null
    and lower(invited_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
)
with check (
  (select travel_planner_private.role_for_trip(trip_id)) = 'owner'
  or (
    user_id = (select auth.uid())
    and accepted_at is not null
    and role in ('editor', 'viewer')
    and lower(invited_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);
