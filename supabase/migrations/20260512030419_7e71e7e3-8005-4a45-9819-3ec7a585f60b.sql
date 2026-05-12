
drop policy if exists "office-brand public read" on storage.objects;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
