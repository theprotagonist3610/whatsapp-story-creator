// ─── groupCallSequence — utilitaires pour la simulation d'appel de groupe ────────
//
// Identique à callSequence mais pour plusieurs participants.
// Chaque item de séquence porte l'identité du personnage qui parle.

import { isVocalText, vocalPath, vocalDuration, vocalSubtitle } from '../pages/Histoires/DesktopHistoireDetail.jsx'

// ─── Dr KA (constant) ─────────────────────────────────────────────────────────

export const DRKA_ID = '__drka__'

export const DRKA_DEFAULT = {
  characterId: DRKA_ID,
  name:        'Dr KA',
  color:       '#d9571d',
  initials:    'DK',
  avatarUrl:   null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name) {
  return (name ?? '')
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

export function fmtElapsed(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function estimateGroupTotalSecs(sequence) {
  const vocal  = sequence.reduce((acc, i) => acc + i.duration, 0)
  const pauses = Math.max(0, sequence.length - 1) * 0.7
  return Math.round(3 + vocal + pauses)
}

// ─── Éligibilité ──────────────────────────────────────────────────────────────

/**
 * Éligible si 100 % vocal ET au moins 2 fils (= au moins 2 contacts distincts).
 */
export function isGroupCallEligible(threads) {
  const all = threads.flatMap(t => t.messages ?? [])
  return all.length > 0
    && all.every(m => isVocalText(m.text))
    && threads.length >= 2
}

// ─── Participants ─────────────────────────────────────────────────────────────

/**
 * Retourne la liste ordonnée des participants du groupe.
 * Les contacts dans l'ordre des fils, puis Dr KA en dernier si des messages
 * outgoing existent.
 *
 * @param {Array}  threads   — threads de l'histoire (avec character_name, etc.)
 * @param {object} drkaInfo  — surcharge optionnelle pour Dr KA (couleur, avatar…)
 */
export function getParticipants(threads, drkaInfo = null) {
  const contacts = threads.map(t => ({
    characterId: String(t.characterId ?? t.character_id ?? t.id ?? ''),
    name:        t.character_name   ?? 'Inconnu',
    color:       t.character_color  ?? '#25D366',
    initials:    getInitials(t.character_name ?? 'Inconnu'),
    avatarUrl:   t.character_avatar_url ?? null,
  }))

  const hasOutgoing = threads.some(t =>
    (t.messages ?? []).some(m => m.side === 'outgoing')
  )

  const drka = { ...DRKA_DEFAULT, ...(drkaInfo ?? {}) }

  return hasOutgoing ? [...contacts, drka] : contacts
}

// ─── Construction de la séquence ─────────────────────────────────────────────

/**
 * Fusionne tous les messages de tous les fils, triés par order global.
 * Chaque item : {
 *   storagePath, duration, subtitle,
 *   side,
 *   characterId, characterName, characterColor, characterAvatarUrl,
 *   blobUrl
 * }
 */
export function buildGroupSequence(threads) {
  const all = []

  for (const t of threads) {
    const cid      = String(t.characterId ?? t.character_id ?? t.id ?? '')
    const cname    = t.character_name        ?? 'Inconnu'
    const color    = t.character_color       ?? '#25D366'
    const avatar   = t.character_avatar_url  ?? null

    for (const m of (t.messages ?? [])) {
      const isOut = m.side === 'outgoing'
      all.push({
        _order:             m.order ?? 0,
        storagePath:        vocalPath(m.text),
        duration:           vocalDuration(m.text),
        subtitle:           vocalSubtitle(m.text),
        side:               m.side,
        characterId:        isOut ? DRKA_ID  : cid,
        characterName:      isOut ? 'Dr KA'  : cname,
        characterColor:     isOut ? '#d9571d': color,
        characterAvatarUrl: isOut ? null      : avatar,
        blobUrl:            null,
      })
    }
  }

  all.sort((a, b) => a._order - b._order)

  // eslint-disable-next-line no-unused-vars
  return all.map(({ _order, ...item }) => item)
}
