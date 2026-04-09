-- ============================================================
-- Les Sandwichs du Docteur — Policies RLS Storage
-- ⚠️  À exécuter APRÈS avoir créé le bucket "exports"
--     via le Dashboard Supabase (Storage > New bucket)
-- Script idempotent : peut être ré-exécuté sans erreur
-- ============================================================


-- ============================================================
-- Section 6 : RLS sur storage.objects pour le bucket `exports`
-- ============================================================

DROP POLICY IF EXISTS exports_storage_select_authenticated ON storage.objects;
CREATE POLICY exports_storage_select_authenticated
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND bucket_id = 'exports'
  );

DROP POLICY IF EXISTS exports_storage_insert_authenticated ON storage.objects;
CREATE POLICY exports_storage_insert_authenticated
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id = 'exports'
  );

DROP POLICY IF EXISTS exports_storage_delete_own ON storage.objects;
CREATE POLICY exports_storage_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = (storage.foldername(name))[1]
    AND bucket_id = 'exports'
  );
