// ─── callSequence — utilitaires purs pour la simulation d'appel WhatsApp ───────
//
// Aucun effet de bord, aucun state React — fonctions importables partout.

import { isVocalText, vocalPath, vocalDuration, vocalSubtitle } from '../pages/Histoires/DesktopHistoireDetail.jsx'

// ─── Éligibilité ──────────────────────────────────────────────────────────────

/**
 * Une histoire est éligible à la simulation d'appel si et seulement si
 * 100 % de ses messages sont des notes vocales ([vocal:...]).
 */
export function isCallEligible(threads) {
  const all = threads.flatMap(t => t.messages ?? [])
  return all.length > 0 && all.every(m => isVocalText(m.text))
}

// ─── Informations sur l'appelant ──────────────────────────────────────────────

export function getInitials(name) {
  return (name ?? '')
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

/**
 * Retourne les infos du personnage qui appelle (le premier non-Dr KA trouvé).
 */
export function getCallerInfo(threads) {
  for (const t of threads) {
    if (t.character_name && t.character_name !== 'Dr KA') {
      return {
        name:      t.character_name,
        color:     t.character_color      ?? '#25D366',
        initials:  getInitials(t.character_name),
        avatarUrl: t.character_avatar_url ?? null,
      }
    }
  }
  return { name: 'Inconnu', color: '#8E8E93', initials: '?', avatarUrl: null }
}

// ─── Construction de la séquence ─────────────────────────────────────────────

/**
 * Construit la liste ordonnée des vocaux à jouer.
 * Chaque item : { storagePath, duration (s), side, characterName, characterColor, blobUrl }
 *
 * @param {Array} threads   — résultat de getThreads()
 * @param {Array} characters — résultat de getCharacters() (optionnel, pour résoudre les persos par message)
 */
export function buildSequence(threads, characters = []) {
  const drka = characters.find(c => c.is_default) ?? null

  return threads
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap(t =>
      (t.messages ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(m => {
          let characterName, characterColor
          if (m.side === 'outgoing') {
            // Côté Dr KA — toujours le personnage par défaut
            characterName  = drka?.name         ?? 'Dr KA'
            characterColor = drka?.bubble_color ?? '#d9571d'
          } else {
            // Côté entrant — résoudre via characterId du message, fallback sur le perso du fil
            const perso   = m.characterId ? (characters.find(c => c.id === m.characterId) ?? null) : null
            characterName  = perso?.name         ?? t.character_name  ?? ''
            characterColor = perso?.bubble_color ?? t.character_color ?? '#25D366'
          }
          return {
            storagePath: vocalPath(m.text),
            duration:    vocalDuration(m.text),
            subtitle:    vocalSubtitle(m.text),
            side:        m.side,
            characterName,
            characterColor,
            blobUrl:     null,
          }
        })
    )
}

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

export function fmtElapsed(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function estimateTotalSecs(sequence) {
  const vocal   = sequence.reduce((acc, i) => acc + i.duration, 0)
  const pauses  = Math.max(0, sequence.length - 1) * 0.7
  return Math.round(3 + vocal + pauses)   // 3s sonnerie + vocaux + inter-pauses
}
