-- ============================================================
-- Migration 005 : ajout colonne gender sur characters
-- ============================================================

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'autre'
    CHECK (gender IN ('homme', 'femme', 'autre'));
