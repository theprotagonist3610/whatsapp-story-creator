-- ============================================================
-- Migration 003 : ajout de la colonne workflow dans stories
-- À exécuter dans l'éditeur SQL Supabase après 001_initial_schema.sql
-- Idempotent : peut être ré-exécuté sans erreur
-- ============================================================

-- Ajoute la colonne workflow si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'stories'
      AND column_name  = 'workflow'
  ) THEN
    ALTER TABLE public.stories
      ADD COLUMN workflow jsonb NOT NULL DEFAULT '{"steps": []}';
  END IF;
END;
$$;

-- Structure attendue du jsonb workflow :
-- {
--   "id": "string",
--   "title": "string",
--   "steps": [
--     {
--       "id": "string",
--       "interfaceId": "LockScreen" | "HomeScreen" | "WhatsAppDiscussions" | "WhatsAppConversation" | "Keyboard" | "__black__",
--       "actionId": "wakeUp" | "unlock" | "receiveNotification" | ...,
--       "payload": { ...données spécifiques à l'action },
--       "duration": number | null,
--       "note": "string"
--     }
--   ],
--   "createdAt": "ISO string",
--   "updatedAt": "ISO string"
-- }

-- La vue stories_with_profiles est gérée par la migration 006.
