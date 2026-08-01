-- Private account-scoped memory for Miller Time AI. Guest conversations remain
-- browser-local and never touch these tables.

create table travel_planner.ai_conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid not null references travel_planner.trips(id) on delete cascade,
  title text not null default 'Miller Time AI'
    check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trip_id),
  unique (id, user_id)
);

create table travel_planner.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 6000),
  sources jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sources) = 'array'),
  created_at timestamptz not null default now(),
  constraint ai_messages_conversation_owner_fk
    foreign key (conversation_id, user_id)
    references travel_planner.ai_conversations (id, user_id)
    on delete cascade
);

create index ai_conversations_user_updated_idx
  on travel_planner.ai_conversations (user_id, updated_at desc);
create index ai_messages_conversation_id_idx
  on travel_planner.ai_messages (conversation_id, id desc);
create index ai_messages_user_id_idx
  on travel_planner.ai_messages (user_id, id desc);

comment on table travel_planner.ai_conversations is
  'One private Miller Time AI conversation per authenticated user and trip.';
comment on table travel_planner.ai_messages is
  'Persistent Miller Time AI transcript and cited web sources for signed-in users.';

alter table travel_planner.ai_conversations enable row level security;
alter table travel_planner.ai_messages enable row level security;

create policy ai_conversations_select_own
on travel_planner.ai_conversations for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select travel_planner_private.role_for_trip(trip_id)) is not null
);

create policy ai_conversations_insert_own
on travel_planner.ai_conversations for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select travel_planner_private.role_for_trip(trip_id)) is not null
);

create policy ai_conversations_update_own
on travel_planner.ai_conversations for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select travel_planner_private.role_for_trip(trip_id)) is not null
)
with check (
  user_id = (select auth.uid())
  and (select travel_planner_private.role_for_trip(trip_id)) is not null
);

create policy ai_conversations_delete_own
on travel_planner.ai_conversations for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (select travel_planner_private.role_for_trip(trip_id)) is not null
);

create policy ai_messages_select_own
on travel_planner.ai_messages for select
to authenticated
using (user_id = (select auth.uid()));

create policy ai_messages_insert_own
on travel_planner.ai_messages for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy ai_messages_delete_own
on travel_planner.ai_messages for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on travel_planner.ai_conversations from public, anon;
revoke all on travel_planner.ai_messages from public, anon;
grant select, insert, update, delete on travel_planner.ai_conversations to authenticated;
grant select, insert, delete on travel_planner.ai_messages to authenticated;
grant all on travel_planner.ai_conversations to service_role;
grant all on travel_planner.ai_messages to service_role;

revoke all on sequence travel_planner.ai_conversations_id_seq from public, anon;
revoke all on sequence travel_planner.ai_messages_id_seq from public, anon;
grant usage, select on sequence travel_planner.ai_conversations_id_seq to authenticated;
grant usage, select on sequence travel_planner.ai_messages_id_seq to authenticated;
grant all on sequence travel_planner.ai_conversations_id_seq to service_role;
grant all on sequence travel_planner.ai_messages_id_seq to service_role;

notify pgrst, 'reload schema';
