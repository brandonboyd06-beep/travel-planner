-- Make the intended service-role-only access explicit to the database linter.

drop policy if exists "Public clients cannot read or write Miller Time quotas"
  on travel_planner.ai_rate_limits;

create policy "Public clients cannot read or write Miller Time quotas"
  on travel_planner.ai_rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);
