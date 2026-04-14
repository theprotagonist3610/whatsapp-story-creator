-- ============================================================
-- Migration 007 : ajout du champ followers sur characters
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'characters'
      AND column_name  = 'followers'
  ) THEN
    ALTER TABLE public.characters
      ADD COLUMN followers integer NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- Mise à jour de la vue threads_with_messages pour exposer character_followers
-- DROP obligatoire : CREATE OR REPLACE ne peut pas modifier les noms de colonnes existantes
DROP VIEW IF EXISTS public.threads_with_messages;
CREATE VIEW public.threads_with_messages AS
SELECT
  t.id,
  t.story_id,
  t.type,
  t."order",
  t.created_at,
  -- Personnage du fil
  c.id             AS character_id,
  c.name           AS character_name,
  c.bubble_color   AS character_color,
  c.avatar_url     AS character_avatar,
  c.followers      AS character_followers,
  -- Messages agrégés en tableau JSON ordonné
  COALESCE(
    json_agg(
      json_build_object(
        'id',           m.id,
        'order',        m."order",
        'side',         m.side,
        'characterId',  m.character_id,
        'text',         m.text,
        'sentAt',       m.sent_at,
        'status',       m.status
      ) ORDER BY m."order"
    ) FILTER (WHERE m.id IS NOT NULL),
    '[]'::json
  ) AS messages
FROM public.threads t
LEFT JOIN public.characters c ON c.id = t.character_id
LEFT JOIN public.messages   m ON m.thread_id = t.id
GROUP BY t.id, t.story_id, t.type, t."order", t.created_at,
         c.id, c.name, c.bubble_color, c.avatar_url, c.followers;

GRANT SELECT ON public.threads_with_messages TO authenticated;
