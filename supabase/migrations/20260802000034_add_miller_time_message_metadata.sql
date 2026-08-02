-- Preserve validated Miller Time itinerary review cards with signed-in chat
-- history. Guest proposal metadata remains browser-local.

alter table travel_planner.ai_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_messages_metadata_object_check'
      and conrelid = 'travel_planner.ai_messages'::regclass
  ) then
    alter table travel_planner.ai_messages
      add constraint ai_messages_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
end
$$;

comment on column travel_planner.ai_messages.metadata is
  'Validated UI metadata for assistant messages, including review-only itinerary proposals.';

notify pgrst, 'reload schema';
