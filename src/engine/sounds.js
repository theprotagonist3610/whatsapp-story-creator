// ─── Moteur sonore léger ──────────────────────────────────────────────────────
//
// Deux modes de fonctionnement :
//
//  ① Mode normal (preview)
//     playSound() crée un Audio éphémère → lecture directe dans le browser.
//
//  ② Mode export navigateur (exportSceneToMp4)
//     setExportAudioContext(ctx, dest) active le mode export.
//     playSound() route les sons vers l'AudioContext fourni, connecté à un
//     MediaStreamDestination. Le stream audio est ensuite combiné avec le
//     canvas stream dans MediaRecorder → WebM avec piste audio synchronisée.
//     clearExportAudioContext() restaure le mode normal.

import sndIncome        from '../assets/iphone/tones/income.mp3'
import sndNotification  from '../assets/iphone/tones/notification.mp3'
import sndSent          from '../assets/iphone/tones/sent.mp3'
import sndKeyboard1     from '../assets/iphone/tones/keyboard_1.mp3'
import sndKeyboard2     from '../assets/iphone/tones/keyboard_2.mp3'

// Catalogue : id → { src, volume }
const CATALOG = {
  receiveMessage:   { src: sndIncome,       volume: 1.0 },
  showNotification: { src: sndNotification, volume: 1.0 },
  sendMessage:      { src: sndSent,         volume: 1.0 },
  keyboard1:        { src: sndKeyboard1,    volume: 0.6 },
  keyboard2:        { src: sndKeyboard2,    volume: 0.6 },
}

// ─── Mode export ──────────────────────────────────────────────────────────────

let _exportCtx  = null   // AudioContext fourni par exportSceneToMp4
let _exportDest = null   // MediaStreamDestination

// Cache des AudioBuffers décodés (évite de re-fetcher pendant l'export)
const _bufferCache = new Map()

/**
 * Active le mode export : les sons sont routés vers l'AudioContext
 * au lieu d'être joués via new Audio().
 * Appelé par exportSceneToMp4 avant de lancer la scène.
 */
export function setExportAudioContext(ctx, dest) {
  _exportCtx  = ctx
  _exportDest = dest
  _bufferCache.clear()
}

/**
 * Désactive le mode export et libère les ressources.
 * Appelé par exportSceneToMp4 après l'enregistrement.
 */
export function clearExportAudioContext() {
  _exportCtx  = null
  _exportDest = null
  _bufferCache.clear()
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Charge et met en cache un AudioBuffer dans le contexte export.
 */
async function loadBuffer(ctx, url) {
  if (_bufferCache.has(url)) return _bufferCache.get(url)
  const response    = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const decoded     = await ctx.decodeAudioData(arrayBuffer)
  _bufferCache.set(url, decoded)
  return decoded
}

/**
 * Joue un son.
 *
 * Mode normal  → Audio() éphémère, non bloquant.
 * Mode export  → AudioBufferSourceNode connecté au MediaStreamDestination,
 *                capturé par MediaRecorder avec le canvas video.
 */
export function playSound(id) {
  const entry = CATALOG[id]
  if (!entry) return

  if (_exportCtx && _exportDest) {
    // ── Mode export : passe par l'AudioContext ────────────────────────────────
    loadBuffer(_exportCtx, entry.src)
      .then(buffer => {
        const source = _exportCtx.createBufferSource()
        source.buffer = buffer

        const gain      = _exportCtx.createGain()
        gain.gain.value = entry.volume

        source.connect(gain)
        gain.connect(_exportDest)   // → MediaStreamDestination → MediaRecorder
        gain.connect(_exportCtx.destination)  // → haut-parleurs (feedback preview)

        source.start()
      })
      .catch(() => {})
  } else {
    // ── Mode normal : Audio éphémère ──────────────────────────────────────────
    try {
      const audio  = new Audio(entry.src)
      audio.volume = entry.volume
      audio.play().catch(() => {})
    } catch {}
  }
}

// Alternance clavier : keyboard1 / keyboard2 pour varier le timbre
let _kbToggle = false
export function playKeyboardClick() {
  _kbToggle = !_kbToggle
  playSound(_kbToggle ? 'keyboard1' : 'keyboard2')
}
