-- Leave an unused prepared Auth account unattached from the trip membership.
-- The guest attaches it to the membership on their first real sign-in.
alter table travel_planner.trip_members disable trigger trip_members_guard_update;

update travel_planner.trip_members as member
set user_id = null
from auth.users as account
where member.user_id = account.id
  and member.role <> 'owner'
  and member.accepted_at is null
  and account.last_sign_in_at is null;

alter table travel_planner.trip_members enable trigger trip_members_guard_update;
