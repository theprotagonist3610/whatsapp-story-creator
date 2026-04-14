-- ============================================================
-- Migration 009 : bucket "vocals" pour les notes vocales
-- ⚠️  À exécuter APRÈS avoir créé le bucket "vocals"
--     via le Dashboard Supabase (Storage > New bucket)
--     → Bucket privé (Public bucket : OFF)
-- Script idempotent : peut être ré-exécuté sans erreur
-- ============================================================

-- Lecture réservée aux utilisateurs authentifiés
DROP POLICY IF EXISTS vocals_storage_select_authenticated ON storage.objects;
CREATE POLICY vocals_storage_select_authenticated
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND bucket_id = 'vocals'
  );

-- Upload réservé aux utilisateurs authentifiés
-- Convention de chemin : {user_id}/{filename}
DROP POLICY IF EXISTS vocals_storage_insert_authenticated ON storage.objects;
CREATE POLICY vocals_storage_insert_authenticated
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bucket_id = 'vocals'
  );

-- Suppression réservée au propriétaire du fichier
DROP POLICY IF EXISTS vocals_storage_delete_own ON storage.objects;
CREATE POLICY vocals_storage_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = (storage.foldername(name))[1]
    AND bucket_id = 'vocals'
  );
