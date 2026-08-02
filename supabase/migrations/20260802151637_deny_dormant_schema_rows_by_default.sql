-- Defense in depth for preserved dormant-app data. Even if a schema or table
-- grant is accidentally restored later, no browser role receives rows until a
-- new app deliberately recreates its policies.
do $$
declare
  dormant_table record;
begin
  for dormant_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname in ('public', 'dog_training', 'spanish_app')
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      dormant_table.schema_name,
      dormant_table.table_name
    );
  end loop;
end;
$$;

do $$
declare
  dormant_policy record;
begin
  for dormant_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname in ('public', 'dog_training', 'spanish_app')
  loop
    execute format(
      'drop policy %I on %I.%I',
      dormant_policy.policyname,
      dormant_policy.schemaname,
      dormant_policy.tablename
    );
  end loop;
end;
$$;
