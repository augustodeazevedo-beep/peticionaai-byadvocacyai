
-- library-files: drop duplicate, less-restrictive policies
DROP POLICY IF EXISTS "library-files select own" ON storage.objects;
DROP POLICY IF EXISTS "library-files insert own" ON storage.objects;
DROP POLICY IF EXISTS "library-files update own" ON storage.objects;
DROP POLICY IF EXISTS "library-files delete own" ON storage.objects;

-- piece-exports: replace OR-position policies with strict position-2 + folder allowlist
DROP POLICY IF EXISTS "piece-exports own read" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own write" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own update" ON storage.objects;
DROP POLICY IF EXISTS "piece-exports own delete" ON storage.objects;

CREATE POLICY "piece-exports own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'piece-exports'
    AND (storage.foldername(name))[1] = ANY (ARRAY['visual-law','visual-law-ai'])
    AND (auth.uid())::text = (storage.foldername(name))[2]
  );

CREATE POLICY "piece-exports own write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'piece-exports'
    AND (storage.foldername(name))[1] = ANY (ARRAY['visual-law','visual-law-ai'])
    AND (auth.uid())::text = (storage.foldername(name))[2]
  );

CREATE POLICY "piece-exports own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'piece-exports'
    AND (storage.foldername(name))[1] = ANY (ARRAY['visual-law','visual-law-ai'])
    AND (auth.uid())::text = (storage.foldername(name))[2]
  )
  WITH CHECK (
    bucket_id = 'piece-exports'
    AND (storage.foldername(name))[1] = ANY (ARRAY['visual-law','visual-law-ai'])
    AND (auth.uid())::text = (storage.foldername(name))[2]
  );

CREATE POLICY "piece-exports own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'piece-exports'
    AND (storage.foldername(name))[1] = ANY (ARRAY['visual-law','visual-law-ai'])
    AND (auth.uid())::text = (storage.foldername(name))[2]
  );

-- protocolo-bundles: per-user ownership at position 1
CREATE POLICY "protocolo-bundles own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'protocolo-bundles'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "protocolo-bundles own write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'protocolo-bundles'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "protocolo-bundles own update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'protocolo-bundles'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'protocolo-bundles'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "protocolo-bundles own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'protocolo-bundles'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
