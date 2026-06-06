
-- Remove anon SELECT on base tables; rely on public_shared_pieces / public_shared_vl_versions views which expose only safe columns
DROP POLICY IF EXISTS "pieces anon read shared safe" ON public.pieces;
DROP POLICY IF EXISTS "vl_versions anon read shared safe" ON public.vl_versions;
REVOKE SELECT ON public.pieces FROM anon;
REVOKE SELECT ON public.vl_versions FROM anon;

-- Fix piece-exports storage policies: accept user_id at segment [1] OR [2] (paths used: {uid}/..., visual-law/{uid}/..., visual-law-ai/{uid}/...)
DROP POLICY IF EXISTS "piece-exports own read" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own write" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own delete" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own update" ON storage.objects;

CREATE POLICY "piece-exports own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'piece-exports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  ));

CREATE POLICY "piece-exports own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'piece-exports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  ));

CREATE POLICY "piece-exports own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'piece-exports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  ))
  WITH CHECK (bucket_id = 'piece-exports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  ));

CREATE POLICY "piece-exports own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'piece-exports' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR auth.uid()::text = (storage.foldername(name))[2]
  ));
