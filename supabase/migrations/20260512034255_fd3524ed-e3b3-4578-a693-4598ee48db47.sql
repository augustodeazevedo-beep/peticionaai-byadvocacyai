
-- Tornar bucket office-brand privado
update storage.buckets set public = false where id = 'office-brand';

-- Limpar policies antigas (se houver)
drop policy if exists "office-brand public read" on storage.objects;
drop policy if exists "office-brand owner all" on storage.objects;
drop policy if exists "office-brand owner read" on storage.objects;
drop policy if exists "office-brand owner write" on storage.objects;
drop policy if exists "office-brand owner update" on storage.objects;
drop policy if exists "office-brand owner delete" on storage.objects;

-- Policies: dono (primeira pasta = user_id) tem acesso total
create policy "office-brand owner read"
on storage.objects for select to authenticated
using (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "office-brand owner write"
on storage.objects for insert to authenticated
with check (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "office-brand owner update"
on storage.objects for update to authenticated
using (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "office-brand owner delete"
on storage.objects for delete to authenticated
using (bucket_id = 'office-brand' and auth.uid()::text = (storage.foldername(name))[1]);
