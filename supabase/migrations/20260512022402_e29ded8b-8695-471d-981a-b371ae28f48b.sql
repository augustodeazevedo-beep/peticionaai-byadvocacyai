
-- Allow owners to delete and update their own export files
create policy "piece-exports own delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'piece-exports' and auth.uid()::text = (storage.foldername(name))[2]);

create policy "piece-exports own update"
on storage.objects for update
to authenticated
using (bucket_id = 'piece-exports' and auth.uid()::text = (storage.foldername(name))[2])
with check (bucket_id = 'piece-exports' and auth.uid()::text = (storage.foldername(name))[2]);

-- Public read for vl_versions when parent piece is shared
create policy "vl_versions public read by piece slug"
on public.vl_versions for select
to anon, authenticated
using (
  exists (
    select 1 from public.pieces p
    where p.id = vl_versions.piece_id
      and p.is_shared = true
      and p.public_slug is not null
  )
);
