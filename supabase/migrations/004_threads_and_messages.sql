-- ============================================================
-- Migration 004 : tables threads et messages
-- Remplace le JSONB bubbles par un modèle relationnel
-- Idempotent : peut être ré-exécuté sans erreur
-- ============================================================


-- ============================================================
-- 1. Table `threads`
-- Un fil de dialogue appartient à une histoire.
-- type  : 'main' (fil principal) ou 'secondary' (fil annexe)
-- order : position dans la liste des fils (0 = premier)
-- character_id : le personnage qui discute avec Dr KA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.threads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  type         text        NOT NULL DEFAULT 'secondary'
                           CHECK (type IN ('main', 'secondary')),
  "order"      integer     NOT NULL DEFAULT 0,
  character_id uuid        REFERENCES public.characters(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_threads_story_id ON public.threads (story_id);
CREATE INDEX IF NOT EXISTS idx_threads_order    ON public.threads (story_id, "order");

-- RLS : accès authentifiés
DROP POLICY IF EXISTS threads_select ON public.threads;
CREATE POLICY threads_select ON public.threads
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS threads_insert ON public.threads;
CREATE POLICY threads_insert ON public.threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS threads_update ON public.threads;
CREATE POLICY threads_update ON public.threads
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS threads_delete ON public.threads;
CREATE POLICY threads_delete ON public.threads
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);


-- ============================================================
-- 2. Table `messages`
-- Un message appartient à un fil.
-- side         : 'incoming' (personnage → Dr KA) ou 'outgoing' (Dr KA → personnage)
-- character_id : redondant pour incoming (= thread.character_id) mais pratique pour jointures
-- sent_at      : heure affichée dans la bulle, ex: "09:41"
-- order        : position dans le fil (0 = premier message)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid        NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  "order"      integer     NOT NULL DEFAULT 0,
  side         text        NOT NULL CHECK (side IN ('incoming', 'outgoing')),
  character_id uuid        REFERENCES public.characters(id) ON DELETE SET NULL,
  text         text        NOT NULL DEFAULT '',
  sent_at      text        NOT NULL DEFAULT '00:00',
  status       text        NOT NULL DEFAULT 'delivered'
                           CHECK (status IN ('sent', 'delivered', 'read')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_order     ON public.messages (thread_id, "order");

-- RLS
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);


-- ============================================================
-- 3. Vue `threads_with_messages`
-- Retourne les fils avec leurs messages et le personnage associé,
-- prêts à être consommés par le front sans jointure côté client.
-- ============================================================

CREATE OR REPLACE VIEW public.threads_with_messages AS
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
         c.id, c.name, c.bubble_color, c.avatar_url;

GRANT SELECT ON public.threads_with_messages TO authenticated;


-- ============================================================
-- 4. Suppression de la colonne bubbles (obsolète)
-- Les bulles sont maintenant dans la table messages.
-- On droppe d'abord la vue dépendante, puis la colonne.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'stories'
      AND column_name  = 'bubbles'
  ) THEN
    DROP VIEW IF EXISTS public.stories_with_profiles;
    ALTER TABLE public.stories DROP COLUMN bubbles;
  END IF;
END;
$$;


-- ============================================================
-- 5. Mise à jour de la vue stories_with_profiles
-- ============================================================

CREATE OR REPLACE VIEW public.stories_with_profiles AS
SELECT
  s.id,
  s.title,
  s.status,
  s.debrief,
  s.week_date,
  s.created_by,
  s.updated_by,
  s.created_at,
  s.updated_at,
  p_creator.display_name AS creator_name,
  p_updater.display_name AS updater_name,
  -- Compteurs utiles pour la carte histoire
  (SELECT COUNT(*) FROM public.threads  WHERE story_id = s.id)                     AS thread_count,
  (SELECT COUNT(*) FROM public.messages m JOIN public.threads t ON t.id = m.thread_id WHERE t.story_id = s.id) AS message_count
FROM public.stories s
LEFT JOIN public.profiles p_creator ON p_creator.id = s.created_by
LEFT JOIN public.profiles p_updater ON p_updater.id = s.updated_by;

GRANT SELECT ON public.stories_with_profiles TO authenticated;
