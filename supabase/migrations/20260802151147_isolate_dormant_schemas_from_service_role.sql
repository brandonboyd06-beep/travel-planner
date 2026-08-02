-- Edge Functions receive the project's service-role credential. Removing that
-- role from dormant schemas makes old function code harmless to preserved app
-- data even if an endpoint is accidentally left deployed.
revoke all on schema public, dog_training, spanish_app from service_role;
revoke all on all tables in schema public, dog_training, spanish_app
  from service_role;
revoke all on all sequences in schema public, dog_training, spanish_app
  from service_role;

do $$
declare
  application_function regprocedure;
begin
  for application_function in
    select p.oid::regprocedure
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname in ('public', 'dog_training', 'spanish_app')
      and pg_get_userbyid(p.proowner) = 'postgres'
  loop
    execute format(
      'revoke all on function %s from service_role',
      application_function
    );
  end loop;
end;
$$;

-- Miller Time's server-side memory and rate limiting continue to use only the
-- dedicated Travel Planner schemas.
grant usage on schema travel_planner, travel_planner_private to service_role;
grant all on all tables in schema travel_planner to service_role;
grant all on all sequences in schema travel_planner to service_role;
grant execute on function travel_planner.consume_miller_time_quota(text, integer, integer)
  to service_role;
grant execute on function travel_planner_private.role_for_trip(uuid)
  to service_role;
