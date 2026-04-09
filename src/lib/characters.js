import { nanoid } from 'nanoid'
import {
  getCharacters as dbGetCharacters,
  createCharacter as dbCreateCharacter,
  deleteCharacter as dbDeleteCharacter,
  supabase,
} from './supabase.js'

// ─── Palette de couleurs proposées pour les nouveaux personnages ──────────────

export const BUBBLE_COLORS = [
  { label: 'Orange Dr KA',   value: '#d9571d' },
  { label: 'Jaune Gérante',  value: '#ffb564' },
  { label: 'Rouge marque',   value: '#a41624' },
  { label: 'Crème',          value: '#ffe8c9' },
  { label: 'Vert WhatsApp',  value: '#dcf8c6' },
  { label: 'Bleu ciel',      value: '#cce5ff' },
  { label: 'Lavande',        value: '#e8d5ff' },
  { label: 'Rose',           value: '#ffd6e0' },
  { label: 'Menthe',         value: '#d4f5e9' },
  { label: 'Blanc',          value: '#ffffff' },
]

// ─── Constantes des personnages par défaut ────────────────────────────────────
// Ces valeurs sont utilisées comme fallback avant que la BDD soit chargée
// et pour identifier les personnages côté client.

export const DEFAULT_CHARACTERS = {
  DR_KA: {
    name:        'Dr KA',
    bubbleColor: '#d9571d',
    isDefault:   true,
    side:        'outgoing',
    initials:    'DK',
  },
  GERANTE: {
    name:        'Gérante',
    bubbleColor: '#ffb564',
    isDefault:   true,
    side:        'incoming',
    initials:    'GE',
  },
}

// ─── Helpers locaux ───────────────────────────────────────────────────────────

/**
 * Retourne les initiales d'un nom (ex: "Dr KA" → "DK", "Patient X" → "PX")
 */
export function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Détermine si un personnage est expéditeur (outgoing) ou destinataire (incoming)
 * selon une convention : Dr KA est toujours outgoing, les autres incoming.
 * Peut être surchargé par le champ `side` stocké en BDD.
 */
export function getDefaultSide(character) {
  if (character?.side) return character.side
  return character?.name === 'Dr KA' ? 'outgoing' : 'incoming'
}

// ─── Factory bulle ────────────────────────────────────────────────────────────

/**
 * Crée un objet bulle prêt à être stocké dans stories.bubbles (jsonb).
 *
 * @param {Object} params
 * @param {string} params.characterId    - UUID du personnage (depuis la BDD)
 * @param {string} params.characterName  - Nom affiché
 * @param {string} params.text           - Contenu du message
 * @param {string} [params.time]         - Heure affichée, ex: "08:42"
 * @param {'sent'|'delivered'|'read'} [params.status] - Statut de lecture
 * @param {'incoming'|'outgoing'} [params.side]       - Côté de la bulle
 * @returns {Object} bulle
 */
export function createBubble({
  characterId,
  characterName,
  text,
  time = formatCurrentTime(),
  status = 'sent',
  side = 'incoming',
}) {
  return {
    id:             nanoid(),
    character_id:   characterId,
    character_name: characterName,
    text,
    time,
    status,
    side,
  }
}

/**
 * Crée une bulle vide (template pour le formulaire éditeur).
 */
export function createEmptyBubble(character) {
  return createBubble({
    characterId:   character?.id   ?? '',
    characterName: character?.name ?? '',
    text:          '',
    time:          formatCurrentTime(),
    status:        'sent',
    side:          getDefaultSide(character),
  })
}

function formatCurrentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// ─── Accès BDD — lecture ──────────────────────────────────────────────────────

/**
 * Récupère tous les personnages (défauts + personnalisés) depuis Supabase.
 * Les personnages par défaut (is_default=true) sont en premier.
 */
export async function fetchCharacters() {
  return dbGetCharacters()
}

/**
 * Récupère un personnage par son id.
 */
export async function fetchCharacterById(id) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ─── Accès BDD — création ─────────────────────────────────────────────────────

/**
 * Crée un nouveau personnage personnalisé dans Supabase.
 *
 * @param {Object} params
 * @param {string} params.name        - Nom du personnage (obligatoire)
 * @param {string} [params.bubbleColor] - Couleur de fond de ses bulles (hex)
 * @param {string} [params.avatarUrl]   - URL d'un avatar (optionnel)
 * @returns {Promise<Object>} Le personnage créé
 */
export async function addCharacter({ name, bubbleColor = '#ffffff', avatarUrl = null }) {
  if (!name?.trim()) throw new Error('Le nom du personnage est obligatoire.')
  return dbCreateCharacter({ name: name.trim(), bubbleColor, avatarUrl })
}

// ─── Accès BDD — mise à jour ──────────────────────────────────────────────────

/**
 * Met à jour le nom ou la couleur d'un personnage non-défaut.
 *
 * @param {string} id  - UUID du personnage
 * @param {Object} updates - { name?, bubbleColor?, avatarUrl? }
 * @returns {Promise<Object>} Le personnage mis à jour
 */
export async function editCharacter(id, { name, bubbleColor, avatarUrl }) {
  const payload = {}
  if (name        !== undefined) payload.name         = name.trim()
  if (bubbleColor !== undefined) payload.bubble_color = bubbleColor
  if (avatarUrl   !== undefined) payload.avatar_url   = avatarUrl

  if (Object.keys(payload).length === 0) throw new Error('Aucune modification à appliquer.')

  const { data, error } = await supabase
    .from('characters')
    .update(payload)
    .eq('id', id)
    .eq('is_default', false) // protection : jamais modifier Dr KA / Gérante via cette fonction
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Accès BDD — suppression ──────────────────────────────────────────────────

/**
 * Supprime un personnage personnalisé (is_default=false uniquement).
 * La RLS Supabase applique la même contrainte côté serveur.
 *
 * @param {string} id - UUID du personnage
 */
export async function removeCharacter(id) {
  return dbDeleteCharacter(id)
}

// ─── Upload avatar ────────────────────────────────────────────────────────────

/**
 * Upload une image d'avatar dans le bucket Supabase Storage "exports"
 * et retourne l'URL publique signée.
 *
 * Le fichier est stocké sous : avatars/{characterId}/{timestamp}.{ext}
 *
 * @param {string}  characterId  - UUID du personnage
 * @param {File}    file         - Fichier image (JPG, PNG, WebP)
 * @returns {Promise<string>}    URL signée (1 an)
 */
export async function uploadCharacterAvatar(characterId, file) {
  const ext  = file.name.split('.').pop() || 'png'
  const path = `avatars/${characterId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('exports')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) throw uploadError

  const { data, error: urlError } = await supabase.storage
    .from('exports')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 an
  if (urlError) throw urlError

  return data.signedUrl
}

// ─── Utilitaire : normaliser un personnage BDD vers le format UI ──────────────

/**
 * Transforme un enregistrement BDD (snake_case) en objet camelCase
 * utilisé dans les composants.
 */
export function normalizeCharacter(row) {
  return {
    id:          row.id,
    name:        row.name,
    bubbleColor: row.bubble_color,
    avatarUrl:   row.avatar_url ?? null,
    isDefault:   row.is_default,
    initials:    getInitials(row.name),
    side:        row.name === 'Dr KA' ? 'outgoing' : 'incoming',
    createdBy:   row.created_by ?? null,
    createdAt:   row.created_at,
  }
}
