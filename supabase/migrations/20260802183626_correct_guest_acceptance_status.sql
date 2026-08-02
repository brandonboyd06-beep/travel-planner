-- A generated temporary password does not mean the traveler received it or
-- signed in. Only mark a guest accepted after their first real session.
alter table travel_planner.trip_members disable trigger trip_members_guard_update;

update travel_planner.trip_members as member
set accepted_at = null
from auth.users as account
where member.user_id = account.id
  and member.role <> 'owner'
  and member.accepted_at is not null
  and account.last_sign_in_at is null;

alter table travel_planner.trip_members enable trigger trip_members_guard_update;
