create policy "vl_versions_update_own" on public.vl_versions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);