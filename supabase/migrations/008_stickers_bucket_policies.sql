-- ============================================================
-- Migration 008 : policies RLS pour le bucket "stickers"
-- Le bucket est public (lecture sans auth) — les stickers
-- sont des assets statiques partagés entre tous les utilisateurs.
-- Upload/suppression réservés aux admins (service_role).
-- ============================================================

-- Lecture publique (anon + authenticated)
DROP POLICY IF EXISTS stickers_storage_select_public ON storage.objects;
CREATE POLICY stickers_storage_select_public
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'stickers');
