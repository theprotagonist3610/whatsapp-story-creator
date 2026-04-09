import { createClient } from '@supabase/supabase-js'

// ─── Client ──────────────────────────────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)


// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}


// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─── Characters ──────────────────────────────────────────────────────────────

export async function getCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')
  if (error) throw error
  return data
}

export async function createCharacter({ name, bubbleColor, avatarUrl }) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('characters')
    .insert({ name, bubble_color: bubbleColor, avatar_url: avatarUrl ?? null, created_by: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCharacter(id) {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)
    .eq('is_default', false)
  if (error) throw error
}


// ─── Stories ─────────────────────────────────────────────────────────────────

export async function getStories() {
  const { data, error } = await supabase
    .from('stories_with_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getStory(id) {
  const { data, error } = await supabase
    .from('stories_with_profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createStory({ title, bubbles = [], teaserBubbleIndex = 0, debrief = null, weekDate = null }) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('stories')
    .insert({
      title,
      bubbles,
      teaser_bubble_index: teaserBubbleIndex,
      debrief,
      week_date: weekDate,
      status: 'draft',
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStory(id, updates) {
  const user = await getUser()

  const payload = {
    ...(updates.title              !== undefined && { title:                updates.title }),
    ...(updates.bubbles            !== undefined && { bubbles:              updates.bubbles }),
    ...(updates.teaserBubbleIndex  !== undefined && { teaser_bubble_index:  updates.teaserBubbleIndex }),
    ...(updates.debrief            !== undefined && { debrief:              updates.debrief }),
    ...(updates.weekDate           !== undefined && { week_date:            updates.weekDate }),
    ...(updates.status             !== undefined && { status:               updates.status }),
    updated_by: user.id,
  }

  const { data, error } = await supabase
    .from('stories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStory(id) {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateStoryStatus(id, status) {
  return updateStory(id, { status })
}


// ─── Exports (trackers fichiers PNG/MP4) ─────────────────────────────────────

export async function getExportsForStory(storyId) {
  const { data, error } = await supabase
    .from('exports_with_profiles')
    .select('*')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function trackExport({ storyId, type, storagePath, fileSize = null, durationSeconds = null }) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('exports')
    .insert({
      story_id:         storyId,
      type,
      storage_path:     storagePath,
      file_size:        fileSize,
      duration_seconds: durationSeconds,
      uploaded_by:      user.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExportRecord(id) {
  const { error } = await supabase
    .from('exports')
    .delete()
    .eq('id', id)
  if (error) throw error
}


// ─── Storage (bucket `exports`) ───────────────────────────────────────────────

export async function uploadExportFile(storyId, type, blob) {
  const timestamp = Date.now()
  const ext       = type === 'png' ? 'png' : 'mp4'
  const suffix    = type === 'png' ? 'teaser' : 'video'
  const path      = `${storyId}/${type}/${storyId}_${suffix}_${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('exports')
    .upload(path, blob, { contentType: type === 'png' ? 'image/png' : 'video/mp4', upsert: false })

  if (error) throw error
  return path
}

export async function getExportFileUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('exports')
    .createSignedUrl(storagePath, 60 * 60) // URL valide 1 heure
  if (error) throw error
  return data.signedUrl
}

export async function deleteExportFile(storagePath) {
  const { error } = await supabase.storage
    .from('exports')
    .remove([storagePath])
  if (error) throw error
}
