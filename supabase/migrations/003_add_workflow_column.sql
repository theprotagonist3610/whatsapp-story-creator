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

-- Met à jour la vue stories_with_profiles pour inclure la nouvelle colonne
CREATE OR REPLACE VIEW public.stories_with_profiles AS
SELECT
  s.id,
  s.title,
  s.status,
  s.bubbles,
  s.workflow,
  s.teaser_bubble_index,
  s.debrief,
  s.week_date,
  s.created_by,
  s.updated_by,
  s.created_at,
  s.updated_at,
  p_creator.display_name AS creator_name,
  p_updater.display_name AS updater_name
FROM public.stories s
LEFT JOIN public.profiles p_creator ON p_creator.id = s.created_by
LEFT JOIN public.profiles p_updater ON p_updater.id = s.updated_by;

GRANT SELECT ON public.stories_with_profiles TO authenticated;
