-- MT Travel is a single private group trip. Accounts are provisioned by the
-- trip owner through the authenticated trip-access Edge Function, so regular
-- authenticated users from other apps in this shared Supabase project must
-- not be able to create their own Travel Planner workspace.

drop policy if exists trips_insert_owner
on travel_planner.trips;

revoke insert on travel_planner.trips from authenticated;
