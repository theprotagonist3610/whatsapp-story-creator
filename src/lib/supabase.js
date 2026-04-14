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

export async function createCharacter({ name, bubbleColor, avatarUrl, gender = 'autre', followers = 0 }) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('characters')
    .insert({ name, bubble_color: bubbleColor, avatar_url: avatarUrl ?? null, gender, followers, created_by: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCharacter(id, { name, bubbleColor, avatarUrl, gender, followers }) {
  const payload = {
    ...(name        !== undefined && { name }),
    ...(bubbleColor !== undefined && { bubble_color: bubbleColor }),
    ...(avatarUrl   !== undefined && { avatar_url:   avatarUrl }),
    ...(gender      !== undefined && { gender }),
    ...(followers   !== undefined && { followers }),
  }
  const { data, error } = await supabase
    .from('characters')
    .update(payload)
    .eq('id', id)
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

export async function createStory({ title, debrief = null, weekDate = null }) {
  const user = await getUser()
  const { data, error } = await supabase
    .from('stories')
    .insert({
      title,
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

export async function getStoryWorkflow(id) {
  const { data, error } = await supabase
    .from('stories')
    .select('id, workflow')
    .eq('id', id)
    .single()
  if (error) throw error
  return data.workflow ?? { steps: [] }
}

export async function updateStory(id, updates) {
  const user = await getUser()

  const payload = {
    ...(updates.title             !== undefined && { title:               updates.title }),
    ...(updates.debrief           !== undefined && { debrief:             updates.debrief }),
    ...(updates.weekDate          !== undefined && { week_date:           updates.weekDate }),
    ...(updates.status            !== undefined && { status:              updates.status }),
    ...(updates.workflow          !== undefined && { workflow:            updates.workflow }),
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


// ─── Threads ─────────────────────────────────────────────────────────────────

export async function getThreads(storyId) {
  const { data, error } = await supabase
    .from('threads_with_messages')
    .select('*')
    .eq('story_id', storyId)
    .order('order')
  if (error) throw error
  return data
}

export async function createThread({ storyId, type = 'secondary', order = 0, characterId = null }) {
  const { data, error } = await supabase
    .from('threads')
    .insert({ story_id: storyId, type, order, character_id: characterId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateThread(id, { type, order, characterId }) {
  const payload = {
    ...(type        !== undefined && { type }),
    ...(order       !== undefined && { order }),
    ...(characterId !== undefined && { character_id: characterId }),
  }
  const { data, error } = await supabase
    .from('threads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteThread(id) {
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', id)
  if (error) throw error
}


// ─── Messages ─────────────────────────────────────────────────────────────────

export async function createMessage({ threadId, order = 0, side, characterId = null, text, sentAt = '00:00', status = 'delivered' }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, order, side, character_id: characterId, text, sent_at: sentAt, status })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMessage(id, { text, sentAt, status, order }) {
  const payload = {
    ...(text   !== undefined && { text }),
    ...(sentAt !== undefined && { sent_at: sentAt }),
    ...(status !== undefined && { status }),
    ...(order  !== undefined && { order }),
  }
  const { data, error } = await supabase
    .from('messages')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMessage(id) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
  if (error) throw error
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

// ─── Storage (bucket `vocals`) ────────────────────────────────────────────────

export async function uploadVocalFile(storyId, file) {
  const user      = await getUser()
  const ext       = file.name.split('.').pop() || 'ogg'
  const timestamp = Date.now()
  const path      = `${user.id}/${storyId}_${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('vocals')
    .upload(path, file, { contentType: file.type || 'audio/ogg', upsert: false })

  if (error) throw error
  return path
}

// Télécharge le fichier vocal comme blob et retourne une blob: URL.
// Les blob URLs sont same-origin → pas de blocage COEP (FFmpeg WASM).
export async function getVocalBlobUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('vocals')
    .download(storagePath)
  if (error) throw error
  return URL.createObjectURL(data)
}

export async function deleteVocalFile(storagePath) {
  const { error } = await supabase.storage
    .from('vocals')
    .remove([storagePath])
  if (error) throw error
}
