-- ============================================================
-- Migration 006 : ajout des personnages dans stories_with_profiles
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
  (SELECT COUNT(*) FROM public.threads WHERE story_id = s.id) AS thread_count,
  (SELECT COUNT(*) FROM public.messages m JOIN public.threads t ON t.id = m.thread_id WHERE t.story_id = s.id) AS message_count,
  -- Personnages non-default qui interviennent dans cette histoire
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'id',           c.id,
        'name',         c.name,
        'bubbleColor',  c.bubble_color,
        'avatarUrl',    c.avatar_url
      ))
      FROM (
        SELECT DISTINCT c.id, c.name, c.bubble_color, c.avatar_url
        FROM public.threads th
        JOIN public.characters c ON c.id = th.character_id
        WHERE th.story_id = s.id
          AND c.is_default = false
        ORDER BY c.name
      ) c
    ),
    '[]'::json
  ) AS characters
FROM public.stories s
LEFT JOIN public.profiles p_creator ON p_creator.id = s.created_by
LEFT JOIN public.profiles p_updater ON p_updater.id = s.updated_by;

GRANT SELECT ON public.stories_with_profiles TO authenticated;
