// ─── trueStorySequence — utilitaires purs pour la True Story ─────────────────
//
// Éligibilité : exactement 2 personnages (Dr KA + Historien).
//   - Historien : notes vocales + images (incoming)
//   - Dr KA     : sous-titres (outgoing)
// La séquence commence TOUJOURS par l'Historien.
// Alternance stricte : Historien → Dr KA → Historien → Dr KA…
//
// Chaque paire : { historien, drka }
//   historien : { storagePath, duration, blobUrl: null }   ← vocal
//   drka      : { subtitle }                               ← sous-titre

import { isVocalText, vocalPath, vocalDuration, vocalSubtitle } from '../pages/Histoires/DesktopHistoireDetail.jsx'

// ─── Éligibilité ─────────────────────────────────────────────────────────────

/**
 * Retourne true si l'histoire est éligible à la True Story.
 * Conditions :
 *   1. Exactement 2 personnages distincts (Dr KA + un autre)
 *   2. L'autre personnage = Historien (par convention : non-Dr KA)
 *   3. Tous les messages de l'Historien sont des notes vocales
 *   4. Le premier message de la séquence ordonnée est de l'Historien (incoming)
 *   5. Alternance stricte Historien/Dr KA
 */
export function isTrueStoryEligible(threads) {
  if (!threads || threads.length === 0) return false

  const chars = [...new Set(
    threads.map(t => t.character_name).filter(Boolean)
  )]
  if (chars.length !== 2) return false
  if (!chars.includes('Dr KA')) return false

  const sorted = threads.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const flat   = sorted.flatMap(t =>
    (t.messages ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(m => ({ ...m, characterName: t.character_name, side: m.side }))
  )

  if (flat.length === 0) return false

  // Premier message doit être incoming (Historien)
  if (flat[0].side !== 'incoming') return false

  // Alternance stricte et tous les incoming sont des vocaux
  for (let i = 0; i < flat.length; i++) {
    const m = flat[i]
    if (i % 2 === 0) {
      // Position Historien (incoming) → doit être vocal
      if (m.side !== 'incoming') return false
      if (!isVocalText(m.text)) return false
    } else {
      // Position Dr KA (outgoing)
      if (m.side !== 'outgoing') return false
    }
  }

  // La séquence doit contenir un nombre pair de messages (paires complètes)
  // ou un nombre impair si la dernière paire n'a que l'Historien
  return true
}

// ─── Infos Historien ─────────────────────────────────────────────────────────

export function getHistorienInfo(threads) {
  for (const t of threads) {
    if (t.character_name && t.character_name !== 'Dr KA') {
      const name = t.character_name
      const initials = name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
      return {
        name,
        color:     t.character_color      ?? '#25D366',
        initials,
        avatarUrl: t.character_avatar_url ?? null,
      }
    }
  }
  return { name: 'Historien', color: '#8E8E93', initials: 'H', avatarUrl: null }
}

// ─── Construction des paires ─────────────────────────────────────────────────

/**
 * Construit la liste de paires { historien, drka }.
 * historien : { storagePath, duration, blobUrl: null }
 * drka      : { subtitle }  ← null si pas encore de réplique Dr KA
 */
export function buildTrueStoryPairs(threads) {
  const sorted = threads.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const flat   = sorted.flatMap(t =>
    (t.messages ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(m => ({ ...m, characterName: t.character_name }))
  )

  const pairs = []
  for (let i = 0; i < flat.length; i += 2) {
    const hist = flat[i]
    const drka = flat[i + 1] ?? null
    pairs.push({
      historien: {
        storagePath: vocalPath(hist.text),
        duration:    vocalDuration(hist.text),
        blobUrl:     null,
      },
      drka: {
        subtitle: drka ? (vocalSubtitle(drka.text) || drka.text || '') : '',
      },
    })
  }
  return pairs
}

// ─── Config image par défaut ─────────────────────────────────────────────────

export const IMAGE_ENTER_ANIMS = [
  { val: 'none',       label: 'Aucune'         },
  { val: 'fade-in',    label: 'Fondu'          },
  { val: 'pop-in',     label: 'Pop'            },
  { val: 'slide-up',   label: 'Glisse haut'    },
  { val: 'slide-down', label: 'Glisse bas'     },
  { val: 'slide-left', label: 'Glisse gauche'  },
  { val: 'slide-right',label: 'Glisse droite'  },
  { val: 'zoom-in',    label: 'Zoom entrée'    },
  { val: 'flip-x',     label: 'Flip H'         },
  { val: 'flip-y',     label: 'Flip V'         },
]

export const IMAGE_EXIT_ANIMS = [
  { val: 'none',        label: 'Aucune'         },
  { val: 'fade-out',    label: 'Fondu'          },
  { val: 'pop-out',     label: 'Pop'            },
  { val: 'slide-up',    label: 'Glisse haut'    },
  { val: 'slide-down',  label: 'Glisse bas'     },
  { val: 'slide-left',  label: 'Glisse gauche'  },
  { val: 'slide-right', label: 'Glisse droite'  },
  { val: 'zoom-out',    label: 'Zoom sortie'    },
  { val: 'flip-x',      label: 'Flip H'         },
  { val: 'flip-y',      label: 'Flip V'         },
]

export const IMAGE_LOOP_ANIMS = [
  { val: 'none',        label: 'Aucune'      },
  { val: 'heartbeat',   label: 'Battement'   },
  { val: 'breathing',   label: 'Respiration' },
  { val: 'float',       label: 'Flottement'  },
  { val: 'ken-burns',   label: 'Ken Burns'   },
  { val: 'shake',       label: 'Tremblement' },
  { val: 'swing',       label: 'Balancement' },
  { val: 'glow-pulse',  label: 'Glow'        },
  { val: 'rotate-loop', label: 'Rotation'    },
]

export const IMAGE_POSITIONS = [
  { val: 'center',      label: 'Centre'      },
  { val: 'top-left',    label: 'Haut gauche' },
  { val: 'top-right',   label: 'Haut droite' },
]

export const IMAGE_SIZES = [
  { val: 'small',  label: 'S',    pct: 0.35 },
  { val: 'medium', label: 'M',    pct: 0.60 },
  { val: 'large',  label: 'L',    pct: 0.85 },
  { val: 'full',   label: 'Full', pct: 1.00 },
]

export function defaultPairImageConfig() {
  return {
    imageStoragePath: null,
    imagePosition:    'center',
    imageSize:        'medium',
    animEnter:        'fade-in',
    animExit:         'fade-out',
    animLoop:         'none',
  }
}

// ─── Durée totale estimée ─────────────────────────────────────────────────────

export function estimateTrueStorySecs(pairs) {
  return pairs.reduce((acc, p) => acc + (p.historien?.duration ?? 0) + 0.7, 0)
}

export function fmtElapsed(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
