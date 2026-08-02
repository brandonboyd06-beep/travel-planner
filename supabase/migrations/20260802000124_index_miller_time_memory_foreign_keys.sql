-- Cover the Miller Time memory foreign keys used by joins and cascading deletes.

create index if not exists ai_conversations_trip_id_idx
  on travel_planner.ai_conversations (trip_id);

create index if not exists ai_messages_conversation_owner_idx
  on travel_planner.ai_messages (conversation_id, user_id);
