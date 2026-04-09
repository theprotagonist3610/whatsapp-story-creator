-- ============================================================
-- Les Sandwichs du Docteur — Schéma Supabase complet
-- PostgreSQL 15 / Supabase
-- Script idempotent : peut être ré-exécuté sans erreur
-- ============================================================


-- ============================================================
-- Section 1 : Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- Section 2 : Table `profiles`
-- Profil applicatif lié à auth.users (1:1)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text       NOT NULL DEFAULT '',
  avatar_url  text,
  role        text        NOT NULL DEFAULT 'editor',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger : créer automatiquement un profil vide à chaque inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies : profiles
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- Section 3 : Table `characters`
-- Personnages récurrents de la série
-- ============================================================

CREATE TABLE IF NOT EXISTS public.characters (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  avatar_url  text,
  bubble_color text       NOT NULL DEFAULT '#ffffff',
  is_default  boolean     NOT NULL DEFAULT false,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Données initiales
INSERT INTO public.characters (id, name, bubble_color, is_default)
VALUES
  (gen_random_uuid(), 'Dr KA',   '#d9571d', true),
  (gen_random_uuid(), 'Gérante', '#ffb564', true)
ON CONFLICT DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_characters_is_default ON public.characters (is_default);

-- RLS policies : characters
DROP POLICY IF EXISTS characters_select_authenticated ON public.characters;
CREATE POLICY characters_select_authenticated
  ON public.characters
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS characters_insert_authenticated ON public.characters;
CREATE POLICY characters_insert_authenticated
  ON public.characters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS characters_update_authenticated ON public.characters;
CREATE POLICY characters_update_authenticated
  ON public.characters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS characters_delete_non_default ON public.characters;
CREATE POLICY characters_delete_non_default
  ON public.characters
  FOR DELETE
  TO authenticated
  USING (is_default = false AND auth.uid() IS NOT NULL);


-- ============================================================
-- Section 4 : Table `stories`
-- Histoires (conversations WhatsApp animées)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stories (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text        NOT NULL,
  status              text        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'ready', 'published')),
  -- Tableau JSON ordonné de bulles.
  -- Structure d'une bulle :
  -- {
  --   "id": "string",
  --   "character_id": "uuid",
  --   "character_name": "string",
  --   "text": "string",
  --   "time": "string",       -- ex: "08:42"
  --   "status": "string",     -- "sent" | "delivered" | "read"
  --   "side": "string"        -- "incoming" | "outgoing"
  -- }
  bubbles             jsonb       NOT NULL DEFAULT '[]',
  teaser_bubble_index integer     NOT NULL DEFAULT 0,
  debrief             text,
  week_date           date,
  created_by          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Trigger : mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_set_updated_at ON public.stories;
CREATE TRIGGER stories_set_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_stories_status     ON public.stories (status);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_week_date  ON public.stories (week_date);

-- RLS policies : stories
DROP POLICY IF EXISTS stories_select_authenticated ON public.stories;
CREATE POLICY stories_select_authenticated
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS stories_insert_own ON public.stories;
CREATE POLICY stories_insert_own
  ON public.stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS stories_update_authenticated ON public.stories;
CREATE POLICY stories_update_authenticated
  ON public.stories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS stories_delete_own ON public.stories;
CREATE POLICY stories_delete_own
  ON public.stories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);


-- ============================================================
-- Section 5 : Table `exports`
-- Tracker les fichiers PNG et MP4 générés par histoire
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id         uuid        NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  type             text        NOT NULL CHECK (type IN ('png', 'mp4')),
  storage_path     text        NOT NULL,
  file_size        integer,
  duration_seconds integer,
  uploaded_by      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- Index
CREATE INDEX IF NOT EXISTS idx_exports_story_id   ON public.exports (story_id);
CREATE INDEX IF NOT EXISTS idx_exports_type        ON public.exports (type);
CREATE INDEX IF NOT EXISTS idx_exports_created_at  ON public.exports (created_at DESC);

-- RLS policies : exports
DROP POLICY IF EXISTS exports_select_authenticated ON public.exports;
CREATE POLICY exports_select_authenticated
  ON public.exports
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS exports_insert_own ON public.exports;
CREATE POLICY exports_insert_own
  ON public.exports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS exports_delete_own ON public.exports;
CREATE POLICY exports_delete_own
  ON public.exports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);


-- ============================================================
-- Section 6 : Bucket Storage `exports`
-- ⚠️  Le bucket doit être créé via le Dashboard Supabase
--     (Storage > New bucket), PAS via SQL.
--     Le schéma `storage` n'est pas accessible depuis l'éditeur SQL.
--
-- Paramètres du bucket à créer manuellement :
--   - Nom          : exports
--   - Visibilité   : Private (non public)
--   - Max file size: 100 Mo
--   - MIME types   : image/png, video/mp4
--
-- Structure des chemins dans le bucket :
--   PNG : {story_id}/png/{story_id}_teaser_{timestamp}.png
--   MP4 : {story_id}/mp4/{story_id}_video_{timestamp}.mp4
--
-- Après avoir créé le bucket, exécuter le script
-- supabase/migrations/002_storage_policies.sql
-- ============================================================


-- ============================================================
-- Section 7 : Vue `stories_with_profiles`
-- Stories enrichies avec les noms des utilisateurs
-- ============================================================

CREATE OR REPLACE VIEW public.stories_with_profiles AS
SELECT
  s.id,
  s.title,
  s.status,
  s.bubbles,
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

-- Donner l'accès en lecture aux utilisateurs authentifiés
GRANT SELECT ON public.stories_with_profiles TO authenticated;


-- ============================================================
-- Section 8 : Vue `exports_with_profiles`
-- Exports enrichis avec le nom de l'uploader
-- ============================================================

CREATE OR REPLACE VIEW public.exports_with_profiles AS
SELECT
  e.id,
  e.story_id,
  e.type,
  e.storage_path,
  e.file_size,
  e.duration_seconds,
  e.uploaded_by,
  e.created_at,
  p.display_name AS uploader_name
FROM public.exports e
LEFT JOIN public.profiles p ON p.id = e.uploaded_by;

-- Donner l'accès en lecture aux utilisateurs authentifiés
GRANT SELECT ON public.exports_with_profiles TO authenticated;
