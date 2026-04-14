// ─── Export scène → MP4 via MediaRecorder ────────────────────────────────────
//
// Stratégie :
//   1. Créer un <canvas> 390×844 hors-écran
//   2. Boucle de capture : html-to-image.toCanvas(captureRef) → dessin sur canvas
//   3. canvas.captureStream(fps) → MediaRecorder → chunks WebM
//   4. Lancer la scène normalement avec startScenePlay()
//   5. Quand la scène se termine → arrêter MediaRecorder
//   6. FFmpeg WASM : WebM → MP4 H.264 (pour compatibilité universelle)
//
// Avantage par rapport à l'approche frame-by-frame :
//   - Capture le vrai DOM avec les vraies animations CSS
//   - Utilise le moteur de lecture existant sans le dupliquer
//   - Pas de problème de synchronisation React/DOM

import { toCanvas } from 'html-to-image'
import { FFmpeg }   from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

export const EXPORT_W = 390
export const EXPORT_H = 844

// FPS de capture (limité par la vitesse de html-to-image ~50-80ms/frame)
const CAPTURE_FPS = 12

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
    } catch (e) {
      // frame ratée — on continue
    }
    const elapsed = performance.now() - t0
    await sleep(Math.max(0, interval - elapsed))
  }
}

// ─── Conversion WebM → MP4 via FFmpeg WASM ───────────────────────────────────

async function webmToMp4(webmBlob, onProgress) {
  onProgress(0.01, 'Chargement FFmpeg…')
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

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Enregistre la scène en la jouant en temps réel via MediaRecorder.
 *
 * @param {object} opts
 * @param {React.RefObject}  opts.captureRef   ref sur le div 390×844 du preview
 * @param {function}         opts.playScene    appelle startScenePlay(), retourne Promise qui résout quand la scène se termine
 * @param {function}         opts.onProgress   (message: string) => void
 * @param {boolean}          [opts.convertToMp4=true]  convertir WebM → MP4 via FFmpeg
 */
export async function exportSceneToMp4({
  captureRef,
  playScene,
  onProgress = () => {},
  convertToMp4 = true,
}) {
  if (!captureRef?.current) throw new Error('captureRef non défini')

  // ── 1. Canvas hors-écran ──────────────────────────────────────────────────
  const canvas      = document.createElement('canvas')
  canvas.width      = EXPORT_W
  canvas.height     = EXPORT_H

  // ── 2. MediaRecorder ──────────────────────────────────────────────────────
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'

  const stream   = canvas.captureStream(CAPTURE_FPS)
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6_000_000,
  })

  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  // ── 3. Démarrage ─────────────────────────────────────────────────────────
  const shouldStop = { value: false }

  // Capture la frame initiale (LockScreen) avant de lancer la scène
  onProgress('Initialisation…')
  await sleep(200)  // laisser React monter le preview

  recorder.start(100)  // chunk toutes les 100ms

  // Lance la boucle de capture en parallèle (ne pas await ici)
  const capturePromise = runCaptureLoop(captureRef, canvas, shouldStop)

  // ── 4. Lance la scène et attend la fin ────────────────────────────────────
  onProgress('Lecture de la scène…')
  await playScene()  // résout quand tous les steps sont joués

  // ── 5. Arrêt ─────────────────────────────────────────────────────────────
  // Laisser 500ms pour capturer les dernières frames (animations de fin)
  await sleep(500)
  shouldStop.value = true
  await capturePromise

  const webmBlob = await new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
    recorder.stop()
  })

  // ── 6. Conversion WebM → MP4 (optionnel) ─────────────────────────────────
  if (!convertToMp4) return webmBlob

  try {
    onProgress('Conversion MP4…')
    return await webmToMp4(webmBlob, (progress, msg) => onProgress(msg))
  } catch (err) {
    console.warn('[exportScene] FFmpeg failed, returning WebM', err)
    return webmBlob  // fallback : retourner le WebM directement
  }
}
