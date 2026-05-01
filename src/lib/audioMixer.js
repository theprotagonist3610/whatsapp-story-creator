// ─── Audio pre-mixer — OfflineAudioContext ────────────────────────────────────
//
// Rend le mix audio complet de la scène en une passe non-temps-réel
// avant l'export Puppeteer (mode normal). Le WAV résultant est envoyé
// au serveur, qui n'a plus qu'à muxer vidéo + audio.
//
// Sons UI   : income/sent/notification/keyboard chargés comme modules Vite.
// Notes vocales : chargées depuis leur URL (blob Supabase) passée dans les steps.

import sndIncome       from '../assets/iphone/tones/income.mp3'
import sndNotification from '../assets/iphone/tones/notification.mp3'
import sndSent         from '../assets/iphone/tones/sent.mp3'
import sndKeyboard1    from '../assets/iphone/tones/keyboard_1.mp3'
import sndKeyboard2    from '../assets/iphone/tones/keyboard_2.mp3'
import { estimateDuration } from '../engine/actions.js'
import { getSfxVolume, getVocalsVolume } from '../engine/sounds.js'

// ─── Catalogue action → son UI ────────────────────────────────────────────────

const ACTION_SOUND = {
  receiveMessage:       { url: sndIncome,       volume: 1.0 },
  receiveSticker:       { url: sndIncome,       volume: 1.0 },
  receiveVocal:         { url: sndIncome,       volume: 1.0 },
  sendMessage:          { url: sndSent,         volume: 1.0 },
  selectAndSendSticker: { url: sndSent,         volume: 1.0 },
  sendVocal:            { url: sndSent,         volume: 1.0 },
  showNotification:     { url: sndNotification, volume: 1.0 },
}

const KEYBOARD_URLS = [sndKeyboard1, sndKeyboard2]
const KEYBOARD_VOL  = 0.6
const KB_MAX        = 60   // plafond global clics clavier

// ─── Timeline ─────────────────────────────────────────────────────────────────

/**
 * Construit la liste des événements sonores avec leur timestamp en secondes.
 * Inclut les sons UI ET les notes vocales (blobUrl dans payload).
 *
 * @param  {Array}  steps
 * @returns {{ events: Array<{url, t_sec, volume, isVocal}>, totalDuration: number }}
 */
function buildTimeline(steps) {
  const events   = []
  let   t_ms     = 300    // délai initial identique à HeadlessExport
  let   kbCount  = 0
  let   kbToggle = false

  const sfxVol    = getSfxVolume()
  const vocalsVol = getVocalsVolume()

  for (const step of steps) {
    const { actionId, payload: p = {} } = step
    const dur = step.durationMs ?? estimateDuration(actionId, p)

    // Son UI principal
    const snd = ACTION_SOUND[actionId]
    if (snd) {
      events.push({ url: snd.url, t_sec: t_ms / 1000, volume: snd.volume * sfxVol, isVocal: false })
    }

    // Clics clavier pour writeMessage
    if (actionId === 'writeMessage' && p.text?.length > 0) {
      const speeds = { slow: 120, normal: 60, fast: 30 }
      const delay  = speeds[p.speed ?? 'normal'] ?? 60
      for (let i = 0; i < p.text.length && kbCount < KB_MAX; i++) {
        events.push({
          url:     KEYBOARD_URLS[kbToggle ? 1 : 0],
          t_sec:   (t_ms + i * delay) / 1000,
          volume:  KEYBOARD_VOL * sfxVol,
          isVocal: false,
        })
        kbToggle = !kbToggle
        kbCount++
      }
    }

    // Note vocale — le payload doit contenir blobUrl (pré-résolu par DesktopEdition)
    if ((actionId === 'sendVocal' || actionId === 'receiveVocal') && p.blobUrl) {
      const vocalDur = p.duration ?? 0
      events.push({
        url:     p.blobUrl,
        t_sec:   t_ms / 1000,
        volume:  vocalsVol,
        isVocal: true,
        duration: vocalDur,
      })
    }

    t_ms += dur
  }

  return { events, totalDuration: t_ms / 1000 }
}

// ─── Chargement audio ─────────────────────────────────────────────────────────

async function loadBuffer(ctx, url) {
  const response    = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return ctx.decodeAudioData(arrayBuffer)
}

// ─── Encodage WAV PCM 16-bit stéréo ──────────────────────────────────────────

function audioBufferToWav(buffer) {
  const numChannels = Math.min(buffer.numberOfChannels, 2)
  const sampleRate  = buffer.sampleRate
  const numSamples  = buffer.length
  const bytesPerSmp = 2
  const blockAlign  = numChannels * bytesPerSmp
  const dataLength  = numSamples * blockAlign
  const ab          = new ArrayBuffer(44 + dataLength)
  const view        = new DataView(ab)

  const str = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)) }

  str(0, 'RIFF');  view.setUint32(4, 36 + dataLength, true)
  str(8, 'WAVE');  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  str(36, 'data'); view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const ch     = c < buffer.numberOfChannels ? c : 0
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
      offset += 2
    }
  }

  return ab
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Rend le mix audio complet de la scène (sons UI + notes vocales).
 *
 * @param  {Array}        steps  tableau de steps (payload.blobUrl requis pour vocaux)
 * @returns {Promise<Blob|null>}  blob WAV, ou null si aucun son
 */
export async function renderSceneAudio(steps) {
  const { events, totalDuration } = buildTimeline(steps)
  if (events.length === 0) return null

  const SAMPLE_RATE = 44100
  const duration    = totalDuration + 3    // queue pour le dernier son
  const ctx         = new OfflineAudioContext(2, Math.ceil(SAMPLE_RATE * duration), SAMPLE_RATE)

  // Charge les fichiers uniques en parallèle (URL identiques mutualisées)
  const uniqueUrls = [...new Set(events.map(e => e.url))]
  const bufferMap  = Object.create(null)

  await Promise.all(
    uniqueUrls.map(async url => {
      try {
        bufferMap[url] = await loadBuffer(ctx, url)
      } catch (err) {
        console.warn('[audioMixer] Impossible de charger :', url, err.message)
      }
    })
  )

  for (const { url, t_sec, volume } of events) {
    const decoded = bufferMap[url]
    if (!decoded) continue

    const source = ctx.createBufferSource()
    source.buffer = decoded

    if (volume !== 1.0) {
      const gain      = ctx.createGain()
      gain.gain.value = volume
      source.connect(gain)
      gain.connect(ctx.destination)
    } else {
      source.connect(ctx.destination)
    }

    source.start(Math.max(0, t_sec))
  }

  const rendered = await ctx.startRendering()
  return new Blob([audioBufferToWav(rendered)], { type: 'audio/wav' })
}
