create policy ai_messages_update_own
on travel_planner.ai_messages for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant update (metadata) on travel_planner.ai_messages to authenticated;
