-- A prepared guest starts with a pending membership (user_id is null). On the
-- guest's first sign-in, the app links that row to auth.uid(). PostgreSQL also
-- applies SELECT visibility to UPDATEs, so the linked row must remain visible
-- after the transition in the same statement.
alter policy trip_members_select_trip
on travel_planner.trip_members
using (
  (select travel_planner_private.role_for_trip(trip_id)) is not null
  or (
    user_id = (select auth.uid())
    and accepted_at is not null
  )
  or (
    user_id is null
    and lower(invited_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  )
);
