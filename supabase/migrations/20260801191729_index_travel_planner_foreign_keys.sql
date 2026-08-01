create index trip_members_invited_by_idx
  on travel_planner.trip_members (invited_by);

create index trip_state_updated_by_idx
  on travel_planner.trip_state (updated_by);

create index trips_owner_id_idx
  on travel_planner.trips (owner_id);
