// ─── Générateur de manifest audio (mode transparent) ─────────────────────────
//
// Transforme la timeline de steps transparents en un manifest JSON que le
// serveur utilise pour construire la piste audio via ffmpeg.
//
// Format du manifest :
// {
//   duration_ms:  number,          // durée totale estimée de la scène (ms)
//   sfx_volume:   number,          // 0..1 — volume global des sons UI
//   vocals_volume: number,         // 0..1 — volume global des vocaux
//   master_volume: number,         // 0..1 — gain master final
//   events: [
//     { type: 'sfx',   asset: 'income.mp3', t_ms: 1200, volume: 0.85 },
//     { type: 'vocal', url: 'https://…',    t_ms: 4800, volume: 1.0, duration_ms: 8000 },
//   ]
// }
//
// Les URLs de vocaux sont des URLs signées Supabase (1h) — le serveur les fetch
// directement sans avoir besoin de la session utilisateur.

import { getVocalSignedUrl } from './supabase.js'

// ─── Mapping step transparent → son UI ───────────────────────────────────────

// t_offset = délai avant que le son se déclenche dans le step (en ms)
// Pour writeMessage : le son joue au début du step (dès que la bulle apparaît)
// Pour typingIndicator : pas de son

const SFX_ASSETS = {
  // côté serveur dans server/assets/tones/
  receiveMessage: 'income.mp3',
  sendMessage:    'sent.mp3',
  notification:   'notification.mp3',
}

// ─── Estimation de durée d'un step transparent ───────────────────────────────

function estimateStepDuration(step) {
  switch (step.type) {
    case 'typingIndicator': return step.duration ?? 1000
    case 'writeMessage':    return 400   // délai fixe avant le step suivant
    case 'wait':            return step.duration ?? 1000
    case 'blockContact':    return 600
    default:                return 0
  }
}

// ─── Résolution des URLs vocales ──────────────────────────────────────────────

/**
 * Pour chaque step writeMessage vocal, résout une URL signée Supabase.
 * Les steps sans storagePath sont ignorés silencieusement.
 *
 * @param  {Array}  steps
 * @returns {Promise<Map<string, string>>}  storagePath → signedUrl
 */
async function resolveVocalUrls(steps) {
  const paths = []
  for (const step of steps) {
    if (step.type === 'writeMessage' && step.msgType === 'vocal' && step.storagePath) {
      paths.push(step.storagePath)
    }
  }

  const unique = [...new Set(paths)]
  const map    = new Map()

  await Promise.all(
    unique.map(async path => {
      try {
        const url = await getVocalSignedUrl(path)
        map.set(path, url)
      } catch (err) {
        console.warn('[audioManifest] Impossible de signer l\'URL vocale :', path, err.message)
      }
    })
  )

  return map
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Construit le manifest audio depuis la timeline transparente.
 *
 * @param {Array}  steps         timeline de steps (writeMessage / typingIndicator / wait / blockContact)
 * @param {object} mix           volumes { sfx: 0..1, vocals: 0..1, master: 0..1 }
 * @returns {Promise<object>}    manifest JSON prêt à envoyer au serveur
 */
export async function buildAudioManifest(steps, mix = {}) {
  const sfxVol    = mix.sfx    ?? 1.0
  const vocalsVol = mix.vocals ?? 1.0
  const masterVol = mix.master ?? 1.0

  // Résoudre les URLs signées des vocaux
  const vocalUrlMap = await resolveVocalUrls(steps)

  const events   = []
  let   t_ms     = 300   // délai initial (Puppeteer stabilise la vue)

  for (const step of steps) {
    const dur = estimateStepDuration(step)

    if (step.type === 'writeMessage') {
      const asset = step.side === 'outgoing'
        ? SFX_ASSETS.sendMessage
        : SFX_ASSETS.receiveMessage

      // Son UI
      events.push({
        type:   'sfx',
        asset,
        t_ms,
        volume: sfxVol,
      })

      // Audio vocal réel (par-dessus le ding de réception)
      if (step.msgType === 'vocal') {
        const signedUrl = step.storagePath ? vocalUrlMap.get(step.storagePath) : null
        if (signedUrl) {
          events.push({
            type:        'vocal',
            url:         signedUrl,
            t_ms:        t_ms + 300,   // légère latence après le ding
            volume:      vocalsVol,
            duration_ms: Math.round((step.duration ?? 0) * 1000),
          })
        }
      }
    }

    t_ms += dur
  }

  return {
    duration_ms:   t_ms + 2000,   // +2s de queue
    sfx_volume:    sfxVol,
    vocals_volume: vocalsVol,
    master_volume: masterVol,
    events,
  }
}
