// ─── Moteur sonore ─────────────────────────────────────────────────────────────
//
// Deux modes de fonctionnement :
//
//  ① Mode preview (défaut)
//     Howler.js — préchargement, volume global via Howler.volume(), cross-browser.
//
//  ② Mode export (exportSceneToMp4)
//     setExportAudioContext(ctx, dest) active le mode export.
//     Les sons sont routés vers l'AudioContext fourni → MediaStreamDestination.
//     clearExportAudioContext() restaure le mode preview.
//
// Volume SFX global  : setSfxVolume(0..1)   → Howler.volume() en preview
//                                            → GainNode en export
// Volume vocaux      : setVocalsVolume(0..1) → lu par audioMixer.js + manifest transparent

import { Howl, Howler } from 'howler'

import sndIncome        from '../assets/iphone/tones/income.mp3'
import sndNotification  from '../assets/iphone/tones/notification.mp3'
import sndSent          from '../assets/iphone/tones/sent.mp3'
import sndKeyboard1     from '../assets/iphone/tones/keyboard_1.mp3'
import sndKeyboard2     from '../assets/iphone/tones/keyboard_2.mp3'

// ─── Catalogue Howler (preview) ───────────────────────────────────────────────

const HOWLS = {
  receiveMessage:   new Howl({ src: [sndIncome],        volume: 1.0, preload: true }),
  showNotification: new Howl({ src: [sndNotification],  volume: 1.0, preload: true }),
  sendMessage:      new Howl({ src: [sndSent],          volume: 1.0, preload: true }),
  keyboard1:        new Howl({ src: [sndKeyboard1],     volume: 0.6, preload: true }),
  keyboard2:        new Howl({ src: [sndKeyboard2],     volume: 0.6, preload: true }),
}

// Catalogue URL pour le mode export (AudioContext)
const CATALOG = {
  receiveMessage:   { src: sndIncome,       volume: 1.0 },
  showNotification: { src: sndNotification, volume: 1.0 },
  sendMessage:      { src: sndSent,         volume: 1.0 },
  keyboard1:        { src: sndKeyboard1,    volume: 0.6 },
  keyboard2:        { src: sndKeyboard2,    volume: 0.6 },
}

// ─── État global des volumes ──────────────────────────────────────────────────

let _sfxVolume    = 1.0
let _vocalsVolume = 1.0

/** Volume des effets sonores UI (0..1). Affecte immédiatement Howler en preview. */
export function setSfxVolume(v) {
  _sfxVolume = Math.max(0, Math.min(1, v))
  Howler.volume(_sfxVolume)
}

/** Volume des notes vocales (0..1). Utilisé par audioMixer.js et le manifest transparent. */
export function setVocalsVolume(v) {
  _vocalsVolume = Math.max(0, Math.min(1, v))
}

export function getSfxVolume()    { return _sfxVolume    }
export function getVocalsVolume() { return _vocalsVolume }

// ─── Mode export ──────────────────────────────────────────────────────────────

let _exportCtx  = null
let _exportDest = null
const _bufferCache = new Map()

export function setExportAudioContext(ctx, dest) {
  _exportCtx  = ctx
  _exportDest = dest
  _bufferCache.clear()
}

export function clearExportAudioContext() {
  _exportCtx  = null
  _exportDest = null
  _bufferCache.clear()
}

async function loadBuffer(ctx, url) {
  if (_bufferCache.has(url)) return _bufferCache.get(url)
  const response    = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const decoded     = await ctx.decodeAudioData(arrayBuffer)
  _bufferCache.set(url, decoded)
  return decoded
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Joue un son.
 * Preview → Howler.js (volume global via setSfxVolume).
 * Export  → AudioBufferSourceNode routé vers MediaStreamDestination.
 */
export function playSound(id) {
  if (_exportCtx && _exportDest) {
    const entry = CATALOG[id]
    if (!entry) return
    loadBuffer(_exportCtx, entry.src)
      .then(buffer => {
        const source = _exportCtx.createBufferSource()
        source.buffer = buffer

        const gain      = _exportCtx.createGain()
        gain.gain.value = entry.volume * _sfxVolume

        source.connect(gain)
        gain.connect(_exportDest)
        gain.connect(_exportCtx.destination)
        source.start()
      })
      .catch(() => {})
  } else {
    HOWLS[id]?.play()
  }
}

// Alternance clavier : keyboard1 / keyboard2 pour varier le timbre
let _kbToggle = false
export function playKeyboardClick() {
  _kbToggle = !_kbToggle
  playSound(_kbToggle ? 'keyboard1' : 'keyboard2')
}

/**
 * Joue une note vocale depuis une URL (blob: ou https:) avec le volume vocal courant.
 * Retourne le Howl créé pour permettre d'en stopper la lecture.
 */
export function playVocal(url) {
  const howl = new Howl({
    src:    [url],
    format: ['m4a', 'ogg', 'mp3', 'webm'],
    volume: _vocalsVolume,
    html5:  true,   // streaming — évite le décodage complet en mémoire
  })
  howl.play()
  return howl
}
