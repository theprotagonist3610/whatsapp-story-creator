// ─── ExportTrueStoryModal — export vidéo + audio de la True Story ─────────────
//
// Props :
//   onClose              — ferme la modale
//   story                — { id, title }
//   pairs                — buildTrueStoryPairs() résultat
//   imageConfigs         — config par paire (imageStoragePath, position, taille, anims)
//   getSignedUrl         — fn(storagePath) → Promise<string> (URL signée vocal)
//   bgMode               — 'solid' | 'transparent'
//   bgColor              — hex (mode solid)
//   subtitleMode         — 'plein' | 'down'
//   textBold / textItalic / textColor / textSizeMultiplier / textFont
//   animationMode        — 'fade' | 'pop' | 'slide-up'
//   transitionDuration   — ms

import { useState } from 'react'
import { DownloadSimpleIcon, SpinnerIcon, CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'

const SERVER = 'http://localhost:3001'

const VIDEO_FORMAT_OPTS = [
  { val: 'mp4',    label: 'MP4 H.264  (opaque)' },
  { val: 'webm',   label: 'WebM VP9  (transparent)' },
  { val: 'prores', label: 'ProRes 4444  (transparent)' },
]

const AUDIO_FORMAT_OPTS = [
  { val: 'mp3', label: 'MP3' },
  { val: 'wav', label: 'WAV' },
]

// ─── SSE helper ───────────────────────────────────────────────────────────────

function listenSSE(url, onProgress, onDone, onError) {
  const es = new EventSource(url)
  es.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data)
      if (d.type === 'progress') onProgress(d.pct ?? 0, d.message ?? '')
      if (d.type === 'done')     { onDone();           es.close() }
      if (d.type === 'error')    { onError(d.message); es.close() }
    } catch {}
  }
  es.onerror = () => { onError('Connexion SSE perdue'); es.close() }
  return () => es.close()
}

function triggerDownload(url) {
  const a = document.createElement('a')
  a.href = url; a.click()
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ExportTrueStoryModal({
  onClose,
  story,
  pairs               = [],
  imageConfigs        = [],
  getSignedUrl,
  bgMode              = 'solid',
  bgColor             = '#111111',
  subtitleMode        = 'down',
  textBold            = true,
  textItalic          = false,
  textColor           = '#ffffff',
  textSizeMultiplier  = 1.0,
  textFont            = 'system',
  animationMode       = 'fade',
  transitionDuration  = 0,
}) {
  const [videoFormat, setVideoFormat] = useState('mp4')
  const [audioFormat, setAudioFormat] = useState('mp3')
  const [vocalsVolume, setVocalsVolume] = useState(1.0)

  // ── State vidéo ──
  const [vidStatus, setVidStatus] = useState('idle')  // idle | building | done | error
  const [vidPct,    setVidPct]    = useState(0)
  const [vidMsg,    setVidMsg]    = useState('')
  const [vidJobId,  setVidJobId]  = useState(null)
  const [vidError,  setVidError]  = useState('')

  // ── State audio ──
  const [audStatus, setAudStatus] = useState('idle')
  const [audPct,    setAudPct]    = useState(0)
  const [audMsg,    setAudMsg]    = useState('')
  const [audJobId,  setAudJobId]  = useState(null)
  const [audError,  setAudError]  = useState('')

  // ── Construction de la séquence pour le serveur ───────────────────────────

  async function buildServerSequence() {
    return Promise.all(
      pairs.map(async (pair, i) => {
        const conf    = imageConfigs[i] ?? {}
        const vocalUrl = pair.historien.storagePath
          ? await getSignedUrl(pair.historien.storagePath)
          : null
        return {
          subtitle:      pair.drka?.subtitle ?? '',
          duration:      pair.historien.duration ?? 1,
          vocalUrl,
          imagePath:     conf.imageStoragePath ?? null,
          imagePosition: conf.imagePosition    ?? 'center',
          imageSize:     conf.imageSize        ?? 'medium',
          animEnter:     conf.animEnter        ?? 'fade-in',
          animExit:      conf.animExit         ?? 'fade-out',
          animLoop:      conf.animLoop         ?? 'none',
        }
      })
    )
  }

  // ── Export vidéo ─────────────────────────────────────────────────────────────

  async function startVideo() {
    setVidStatus('building')
    setVidPct(0)
    setVidMsg('Préparation…')
    setVidError('')
    try {
      const sequence = await buildServerSequence()
      const r = await fetch(`${SERVER}/export-true-story/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: story?.title ?? 'true-story',
          sequence,
          bgMode,
          bgColor,
          subtitleMode,
          videoFormat,
          textBold,
          textItalic,
          textColor,
          textSizeMultiplier,
          textFont,
          animationMode,
          transitionDuration,
        }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? r.statusText) }
      const { jobId } = await r.json()
      setVidJobId(jobId)
      listenSSE(
        `${SERVER}/export-true-story/progress/${jobId}`,
        (pct, msg) => { setVidPct(pct); setVidMsg(msg) },
        ()    => setVidStatus('done'),
        (err) => { setVidStatus('error'); setVidError(err) },
      )
    } catch (err) {
      setVidStatus('error')
      setVidError(err.message)
    }
  }

  // ── Export audio ─────────────────────────────────────────────────────────────

  async function startAudio() {
    setAudStatus('building')
    setAudPct(0)
    setAudMsg('Préparation…')
    setAudError('')
    try {
      const sequence = await buildServerSequence()
      const r = await fetch(`${SERVER}/export-true-story/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: story?.title ?? 'true-story',
          sequence,
          vocalsVolume,
          audioFormat,
        }),
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error ?? r.statusText) }
      const { jobId } = await r.json()
      setAudJobId(jobId)
      listenSSE(
        `${SERVER}/export-true-story/progress/${jobId}`,
        (pct, msg) => { setAudPct(pct); setAudMsg(msg) },
        ()    => setAudStatus('done'),
        (err) => { setAudStatus('error'); setAudError(err) },
      )
    } catch (err) {
      setAudStatus('error')
      setAudError(err.message)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">

        {/* En-tête */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Exporter la True Story</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{story?.title}</p>
            </div>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none shrink-0">×</button>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">

          {/* ── Vidéo ── */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Vidéo</p>

            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs text-gray-500">Format vidéo</span>
              <div className="flex flex-col gap-1">
                {VIDEO_FORMAT_OPTS.map(({ val, label }) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="vf" value={val}
                      checked={videoFormat === val}
                      onChange={() => setVideoFormat(val)}
                      className="accent-orange-500" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {vidStatus === 'idle' && (
              <button onClick={startVideo}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#d9571d' }}>
                <DownloadSimpleIcon size={15} weight="fill" />
                Lancer l'export vidéo
              </button>
            )}

            {vidStatus === 'building' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <SpinnerIcon size={15} className="animate-spin shrink-0" />
                  <span className="truncate">{vidMsg}</span>
                  <span className="ml-auto tabular-nums text-xs text-gray-400 shrink-0">{vidPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${vidPct}%`, backgroundColor: '#d9571d' }} />
                </div>
              </div>
            )}

            {vidStatus === 'done' && vidJobId && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircleIcon size={15} weight="fill" />
                  Vidéo prête
                </div>
                <button
                  onClick={() => triggerDownload(`${SERVER}/export-true-story/download/${vidJobId}/video`)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}>
                  <DownloadSimpleIcon size={15} weight="fill" />
                  Télécharger la vidéo
                </button>
              </div>
            )}

            {vidStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
                <WarningIcon size={15} className="shrink-0 mt-0.5" />
                <span>{vidError}</span>
              </div>
            )}
          </section>

          {/* ── Audio ── */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Audio</p>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
              {AUDIO_FORMAT_OPTS.map(({ val, label }) => (
                <button key={val} onClick={() => setAudioFormat(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    audioFormat === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >{label}</button>
              ))}
            </div>

            <div className="flex flex-col gap-1 mb-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Volume des vocaux</span>
                <span className="tabular-nums">{Math.round(vocalsVolume * 100)} %</span>
              </div>
              <input type="range" min={0} max={2} step={0.05}
                value={vocalsVolume} onChange={e => setVocalsVolume(parseFloat(e.target.value))}
                className="w-full accent-orange-500" />
            </div>

            {audStatus === 'idle' && (
              <button onClick={startAudio}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5856D6' }}>
                <DownloadSimpleIcon size={15} weight="fill" />
                Lancer l'export audio
              </button>
            )}

            {audStatus === 'building' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-indigo-700">
                  <SpinnerIcon size={15} className="animate-spin shrink-0" />
                  <span className="truncate">{audMsg}</span>
                  <span className="ml-auto tabular-nums text-xs text-gray-400 shrink-0">{audPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${audPct}%`, backgroundColor: '#5856D6' }} />
                </div>
              </div>
            )}

            {audStatus === 'done' && audJobId && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircleIcon size={15} weight="fill" />
                  Audio prêt
                </div>
                <button
                  onClick={() => triggerDownload(`${SERVER}/export-true-story/download/${audJobId}/audio`)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#25D366' }}>
                  <DownloadSimpleIcon size={15} weight="fill" />
                  Télécharger l'audio
                </button>
              </div>
            )}

            {audStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
                <WarningIcon size={15} className="shrink-0 mt-0.5" />
                <span>{audError}</span>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
