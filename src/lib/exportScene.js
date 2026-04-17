// ─── Export scène → MP4 ────────────────────────────────────────────────────────
//
// Deux stratégies selon la disponibilité du serveur local :
//
//  ① Serveur local (http://localhost:3001) — PRIORITAIRE
//     • /convert  : reçoit un WebM (MediaRecorder), retourne un MP4 H.264 natif
//                   → beaucoup plus rapide que FFmpeg WASM
//
//  ② FFmpeg WASM — fallback si le serveur n'est pas démarré
//     Chargement depuis unpkg.com (nécessite internet)
//
// Stratégie commune :
//   1. Canvas 390×844 hors-écran
//   2. Boucle html-to-image → canvas (12 fps)
//   3. MediaRecorder → WebM
//   4. Conversion WebM → MP4 (serveur ou WASM)

import { toCanvas } from 'html-to-image'
import { FFmpeg }   from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import { renderSceneAudio } from './audioMixer.js'
import { setExportAudioContext, clearExportAudioContext } from '../engine/sounds.js'

export const EXPORT_W = 390
export const EXPORT_H = 844

const CAPTURE_FPS    = 12
const SERVER_BASE    = 'http://localhost:3001'
const SERVER_TIMEOUT = 2500   // ms pour détecter si le serveur est dispo

// ─── Détection du serveur local ───────────────────────────────────────────────

let _serverAvailable = null   // null = pas encore testé

async function checkServer() {
  if (_serverAvailable !== null) return _serverAvailable
  try {
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), SERVER_TIMEOUT)
    const r    = await fetch(`${SERVER_BASE}/health`, { signal: ctrl.signal })
    clearTimeout(tid)
    _serverAvailable = r.ok
  } catch {
    _serverAvailable = false
  }
  return _serverAvailable
}

// Réinitialise le cache de disponibilité (appelé en début d'export)
export function resetServerCache() { _serverAvailable = null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, Math.max(0, ms)))
}

// ─── Boucle de capture DOM → Canvas ──────────────────────────────────────────

async function runCaptureLoop(captureRef, canvas, shouldStop) {
  const ctx      = canvas.getContext('2d')
  const interval = Math.round(1000 / CAPTURE_FPS)

  while (!shouldStop.value) {
    const t0 = performance.now()
    try {
      const src = await toCanvas(captureRef.current, {
        width:         EXPORT_W,
        height:        EXPORT_H,
        pixelRatio:    1,
        cacheBust:     false,
        skipAutoScale: true,
      })
      ctx.drawImage(src, 0, 0, EXPORT_W, EXPORT_H)
    } catch {
      // frame ratée — on continue
    }
    const elapsed = performance.now() - t0
    await sleep(Math.max(0, interval - elapsed))
  }
}

// ─── Conversion via serveur local ─────────────────────────────────────────────

async function webmToMp4ViaServer(webmBlob, onProgress) {
  onProgress(0.3, 'Envoi au serveur local…')

  const formData = new FormData()
  formData.append('video', webmBlob, 'scene.webm')

  const response = await fetch(`${SERVER_BASE}/convert`, {
    method: 'POST',
    body:   formData,
  })

  if (!response.ok) {
    throw new Error(`Serveur : ${response.status} ${response.statusText}`)
  }

  onProgress(0.9, 'MP4 reçu…')
  return await response.blob()
}

// ─── Conversion via FFmpeg WASM (fallback) ────────────────────────────────────

async function webmToMp4ViaWasm(webmBlob, onProgress) {
  onProgress(0.01, 'Chargement FFmpeg WASM…')
  const ffmpeg = new FFmpeg()
  const BASE   = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`,   'text/javascript'),
    wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(progress, `Encodage MP4 ${Math.round(progress * 100)}%…`)
  })

  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob))

  await ffmpeg.exec([
    '-i',        'input.webm',
    '-c:v',      'libx264',
    '-preset',   'fast',
    '-crf',      '18',
    '-pix_fmt',  'yuv420p',
    '-movflags', '+faststart',
    'output.mp4',
  ])

  const data = await ffmpeg.readFile('output.mp4')
  return new Blob([data.buffer], { type: 'video/mp4' })
}

// ─── Conversion WebM → MP4 (auto-sélection) ──────────────────────────────────

async function webmToMp4(webmBlob, onProgress) {
  const useServer = await checkServer()

  if (useServer) {
    try {
      return await webmToMp4ViaServer(webmBlob, onProgress)
    } catch (err) {
      console.warn('[exportScene] Serveur local échoué, fallback WASM :', err.message)
      // Réinitialise le cache pour retenter la prochaine fois
      _serverAvailable = false
    }
  }

  onProgress(0, 'Conversion MP4 (WASM)…')
  return await webmToMp4ViaWasm(webmBlob, onProgress)
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Enregistre la scène en la jouant en temps réel via MediaRecorder.
 *
 * Audio : Web Audio API + MediaStreamDestination.
 * Les sons joués pendant la scène (playSound / playKeyboardClick) sont
 * automatiquement routés vers l'AudioContext et capturés dans le même
 * MediaStream que le canvas → WebM avec piste audio synchronisée nativement.
 *
 * @param {object}  opts
 * @param {React.RefObject}  opts.captureRef   ref sur le div 390×844 du preview
 * @param {function}         opts.playScene    appelle startScenePlay(), retourne Promise résolue à la fin
 * @param {function}         opts.onProgress   (message: string) => void
 * @param {boolean}          [opts.convertToMp4=true]
 */
export async function exportSceneToMp4({
  captureRef,
  playScene,
  onProgress = () => {},
  convertToMp4 = true,
}) {
  if (!captureRef?.current) throw new Error('captureRef non défini')

  resetServerCache()

  // ── 1. Canvas hors-écran ────────────────────────────────────────────────────
  const canvas   = document.createElement('canvas')
  canvas.width   = EXPORT_W
  canvas.height  = EXPORT_H

  // ── 2. Web Audio API — capture des sons en temps réel ───────────────────────
  // AudioContext créé avant l'interaction utilisateur → toujours actif.
  // MediaStreamDestination expose un MediaStream audio que MediaRecorder
  // peut capturer directement, garantissant une sync parfaite avec la vidéo.
  const audioCtx  = new AudioContext({ sampleRate: 44100 })
  const audioDest = audioCtx.createMediaStreamDestination()

  // Active le mode export dans le moteur sonore :
  // playSound() et playKeyboardClick() vont désormais router leurs sons
  // vers cet AudioContext au lieu de créer des Audio() éphémères.
  setExportAudioContext(audioCtx, audioDest)

  // ── 3. MediaRecorder — stream vidéo + audio combinés ────────────────────────
  const canvasStream = canvas.captureStream(CAPTURE_FPS)

  // Fusionne les tracks vidéo (canvas) et audio (Web Audio) en un seul stream
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ])

  // Préférence codec : VP9 avec Opus (meilleure qualité audio en WebM)
  const mimeType = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
    audioBitsPerSecond: 128_000,
  })

  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  // ── 4. Démarrage ────────────────────────────────────────────────────────────
  const shouldStop = { value: false }

  onProgress('Initialisation…')
  await sleep(200)

  recorder.start(100)

  const capturePromise = runCaptureLoop(captureRef, canvas, shouldStop)

  // ── 5. Lecture de la scène ──────────────────────────────────────────────────
  // Les sons déclenchés par le player sont capturés automatiquement.
  onProgress('Lecture de la scène…')
  await playScene()

  // ── 6. Arrêt ────────────────────────────────────────────────────────────────
  await sleep(500)   // laisse les derniers sons se terminer
  shouldStop.value = true
  await capturePromise

  const webmBlob = await new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.stop()
  })

  // Nettoyage du mode export
  clearExportAudioContext()
  await audioCtx.close()

  // ── 7. Conversion WebM → MP4 ────────────────────────────────────────────────
  if (!convertToMp4) return webmBlob

  try {
    onProgress('Conversion MP4…')
    return await webmToMp4(webmBlob, (progress, msg) => onProgress(msg ?? 'Conversion…'))
  } catch (err) {
    console.warn('[exportScene] Conversion MP4 échouée, WebM retourné :', err)
    return webmBlob
  }
}

/**
 * Déclenche le téléchargement d'un Blob dans le navigateur.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Export Puppeteer côté serveur — livraison en deux fichiers séparés :
 *   • <baseName>-audio.wav  — mix pré-rendu par OfflineAudioContext
 *   • <baseName>-video.mp4  — capture Puppeteer sans piste audio
 *
 * L'utilisateur assemble les deux dans son logiciel de montage.
 *
 * @param {object}   opts
 * @param {Array}    opts.steps
 * @param {Array}    opts.conversations
 * @param {object}   opts.storyMeta
 * @param {string}   [opts.baseName]     nom de base des fichiers téléchargés
 * @param {function} [opts.onProgress]
 */
export async function exportSceneViaServer({
  steps,
  conversations,
  storyMeta,
  baseName   = 'scene',
  onProgress = () => {},
}) {
  // ── 1. Rendu audio dans le navigateur (OfflineAudioContext) ──────────────────
  onProgress('Rendu audio…')
  let audioBlob = null
  try {
    audioBlob = await renderSceneAudio(steps)
  } catch (err) {
    console.warn('[exportScene] Rendu audio échoué :', err.message)
  }

  // Télécharge le WAV immédiatement — déjà disponible, pas besoin d'attendre le serveur
  if (audioBlob) {
    downloadBlob(audioBlob, `${baseName}-audio.wav`)
  }

  // ── 2. Capture vidéo via Puppeteer (serveur) ─────────────────────────────────
  onProgress('Capture de la scène…')

  const formData = new FormData()
  formData.append('sceneData', JSON.stringify({ steps, conversations, storyMeta }))

  const response = await fetch(`${SERVER_BASE}/export`, {
    method: 'POST',
    body:   formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(err.error ?? 'Erreur serveur')
  }

  // ── 3. Télécharge la vidéo ───────────────────────────────────────────────────
  onProgress('Téléchargement de la vidéo…')
  const videoBlob = await response.blob()
  downloadBlob(videoBlob, `${baseName}-video.mp4`)
}
