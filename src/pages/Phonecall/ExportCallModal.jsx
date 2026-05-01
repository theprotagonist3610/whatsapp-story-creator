// ─── ExportCallModal — modale d'export de la simulation d'appel ───────────────
//
// Props :
//   onClose      () → void
//   story        { title }
//   caller       { name, color, initials, avatarUrl }
//   rawSeq       [{ storagePath, duration, side }]
//   getSignedUrl (storagePath) → Promise<string>
//   glassOpacity number  0=opaque | 0.35|0.50|0.80=transparent (prérempli depuis le player)
//
// Flux (indépendant pour vidéo et audio) :
//   1. Ping /health au montage
//   2. Section Vidéo  : POST /export-call/video  → SSE → download
//      (aucune signed URL nécessaire pour la vidéo)
//   3. Section Audio  : POST /export-call/audio  → SSE → download
//      (génère les signed URLs juste avant le POST)

import { useState, useRef, useEffect } from 'react'
import {
  XIcon, DownloadSimpleIcon, SpinnerIcon,
  SpeakerHighIcon, MusicNoteIcon, VideoCameraIcon,
  CheckCircleIcon, WarningCircleIcon, CircleHalfIcon,
} from '@phosphor-icons/react'

const SERVER_BASE = 'http://localhost:3001'

const OPACITY_OPTS = [
  { label: 'Opaque', value: 0 },
  { label: '35 %',   value: 0.35 },
  { label: '50 %',   value: 0.50 },
  { label: '80 %',   value: 0.80 },
]

// ─── Sub-composants ───────────────────────────────────────────────────────────

function VolumeSlider({ label, icon: Icon, value, onChange, color = '#5856D6' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <Icon size={13} color={color} />
          {label}
        </span>
        <span className="text-gray-400 tabular-nums">{Math.round(value * 100)} %</span>
      </div>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value * 100}%, #e5e7eb ${value * 100}%, #e5e7eb 100%)`,
          accentColor: color,
        }}
      />
    </div>
  )
}

function FormatPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function ProgressBar({ pct, color = '#5856D6' }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

function DownloadBtn({ href, label, icon: Icon, color }) {
  return (
    <a
      href={href}
      download
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
      style={{ backgroundColor: color }}
    >
      <Icon size={15} weight="fill" />
      {label}
    </a>
  )
}

// ─── Section d'export (vidéo ou audio) ───────────────────────────────────────

function ExportSection({ title, icon: Icon, color, job, onStart, onRetry, downloadHref, downloadLabel, downloadIcon, children }) {
  const { phase, pct, message } = job
  const isRunning = phase === 'running'
  const isDone    = phase === 'done'
  const isError   = phase === 'error'

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
          <Icon size={13} style={{ color }} weight="fill" />
        </div>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {isDone && <CheckCircleIcon size={14} color="#25D366" weight="fill" className="ml-auto" />}
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex flex-col gap-3">

        {/* Paramètres — visibles en idle */}
        {phase === 'idle' && children}

        {/* Progression */}
        {(isRunning || isDone) && (
          <div className="flex flex-col gap-1.5">
            <ProgressBar pct={pct} color={isDone ? '#25D366' : color} />
            <div className="flex items-center gap-1.5">
              {isRunning && <SpinnerIcon size={11} className="animate-spin shrink-0" style={{ color }} />}
              {isDone    && <CheckCircleIcon size={11} color="#25D366" weight="fill" className="shrink-0" />}
              <p className={`text-xs ${isDone ? 'text-green-600' : 'text-gray-400'}`}>{message}</p>
            </div>
          </div>
        )}

        {/* Erreur */}
        {isError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
            <WarningCircleIcon size={13} color="#FF3B30" weight="fill" className="shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed">{message}</p>
          </div>
        )}

        {/* Téléchargement */}
        {isDone && downloadHref && (
          <DownloadBtn href={downloadHref} label={downloadLabel} icon={downloadIcon} color={color} />
        )}

        {/* Bouton Exporter / Réessayer */}
        {!isDone && (
          <button
            onClick={isError ? onRetry : onStart}
            disabled={isRunning}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: isError ? '#6B7280' : color }}
          >
            {isRunning
              ? <><SpinnerIcon size={13} className="animate-spin" /> {pct}%</>
              : isError
              ? 'Réessayer'
              : <><DownloadSimpleIcon size={13} weight="fill" /> Exporter</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Modale principale ────────────────────────────────────────────────────────

const INIT_JOB = { phase: 'idle', pct: 0, message: '', jobId: null }

export default function ExportCallModal({
  onClose, story, caller, rawSeq, getSignedUrl,
  glassOpacity: defaultGlassOpacity = 0,
}) {

  // ── Paramètres vidéo ──
  const [glassOpacity, setGlassOpacityRaw] = useState(defaultGlassOpacity)
  const [videoFormat,  setVideoFormat]     = useState(defaultGlassOpacity > 0 ? 'webm' : 'mp4')

  // ── Paramètres audio ──
  const [ringtoneVol, setRingtoneVol] = useState(0.75)
  const [vocalsVol,   setVocalsVol]   = useState(1.00)
  const [audioFormat, setAudioFormat] = useState('mp3')

  // ── Jobs indépendants ──
  const [videoJob, setVideoJob] = useState(INIT_JOB)
  const [audioJob, setAudioJob] = useState(INIT_JOB)
  const videoSseRef = useRef(null)
  const audioSseRef = useRef(null)

  // ── État serveur ──
  const [serverOk, setServerOk] = useState(null)   // null=checking, true, false

  // ── Ping serveur au montage ───────────────────────────────────────────────

  useEffect(() => {
    fetch(`${SERVER_BASE}/health`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.ok ? setServerOk(true) : Promise.reject())
      .catch(() => setServerOk(false))
  }, [])

  // ── Cleanup SSE au démontage ──────────────────────────────────────────────

  useEffect(() => () => {
    videoSseRef.current?.close()
    audioSseRef.current?.close()
  }, [])

  // ── Fermeture sur Échap ───────────────────────────────────────────────────

  useEffect(() => {
    const isExporting = videoJob.phase === 'running' || audioJob.phase === 'running'
    function onKey(e) { if (e.key === 'Escape' && !isExporting) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoJob.phase, audioJob.phase, onClose])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleOpacity(v) {
    setGlassOpacityRaw(v)
    if (v === 0) setVideoFormat('mp4')
    else if (videoFormat === 'mp4') setVideoFormat('webm')
  }

  function subscribeSSE(url, setJob, jobId) {
    const sse = new EventSource(url)
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'progress') {
        setJob(j => ({ ...j, pct: data.pct ?? 0, message: data.message ?? '' }))
      } else if (data.type === 'done') {
        sse.close()
        setJob({ phase: 'done', pct: 100, message: 'Fichier prêt !', jobId })
      } else if (data.type === 'error') {
        sse.close()
        setJob({ phase: 'error', pct: 0, message: data.message, jobId })
      }
    }
    sse.onerror = () => {
      sse.close()
      setJob(j => ({ ...j, phase: 'error', message: 'Connexion SSE perdue.' }))
    }
    return sse
  }

  // ── Export vidéo ──────────────────────────────────────────────────────────

  async function startVideoExport() {
    if (videoJob.phase === 'running') return
    setVideoJob({ phase: 'running', pct: 0, message: 'Démarrage…', jobId: null })

    try {
      // Séquence pour la vidéo — duration + side + subtitle (pas de signed URLs)
      const seqForVideo = rawSeq.map(({ duration, side, subtitle }) => ({ duration, side, subtitle: subtitle ?? '' }))

      const resp = await fetch(`${SERVER_BASE}/export-call/video`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle:  story?.title ?? 'appel',
          caller,
          sequence:    seqForVideo,
          videoFormat: glassOpacity > 0 ? videoFormat : 'mp4',
          glassOpacity,
          appUrl:      window.location.origin,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${resp.status}`)
      }
      const { jobId } = await resp.json()
      setVideoJob(j => ({ ...j, jobId }))
      videoSseRef.current = subscribeSSE(
        `${SERVER_BASE}/export-call/progress/${jobId}`,
        setVideoJob, jobId,
      )

    } catch (err) {
      setVideoJob({ phase: 'error', pct: 0, message: err.message, jobId: null })
    }
  }

  // ── Export audio ──────────────────────────────────────────────────────────

  async function startAudioExport() {
    if (audioJob.phase === 'running') return
    setAudioJob({ phase: 'running', pct: 2, message: 'Préparation des URLs…', jobId: null })

    try {
      // Génère les signed URLs (nécessaire uniquement pour l'audio)
      const seqWithUrls = await Promise.all(
        rawSeq.map(async item => {
          try {
            const vocalUrl = await getSignedUrl(item.storagePath)
            return { vocalUrl, duration: item.duration, side: item.side }
          } catch {
            return { vocalUrl: null, duration: item.duration, side: item.side }
          }
        })
      )

      setAudioJob(j => ({ ...j, pct: 10, message: 'Démarrage de l\'export…' }))

      const resp = await fetch(`${SERVER_BASE}/export-call/audio`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle:     story?.title ?? 'appel',
          sequence:       seqWithUrls,
          ringtoneVolume: ringtoneVol,
          vocalsVolume:   vocalsVol,
          audioFormat,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${resp.status}`)
      }
      const { jobId } = await resp.json()
      setAudioJob(j => ({ ...j, jobId }))
      audioSseRef.current = subscribeSSE(
        `${SERVER_BASE}/export-call/progress/${jobId}`,
        setAudioJob, jobId,
      )

    } catch (err) {
      setAudioJob({ phase: 'error', pct: 0, message: err.message, jobId: null })
    }
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const transparent  = glassOpacity > 0
  const isExporting  = videoJob.phase === 'running' || audioJob.phase === 'running'

  const videoLabel = transparent
    ? (videoFormat === 'prores' ? 'Vidéo ProRes 4444 (MOV)' : 'Vidéo WebM VP9 (alpha)')
    : 'Vidéo MP4 (1080×1920)'

  const audioLabel = audioFormat === 'wav' ? 'Audio WAV (lossless)' : 'Audio MP3'

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!isExporting) onClose() }}
      />

      {/* Panneau */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>

          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5856D618' }}>
                <DownloadSimpleIcon size={16} color="#5856D6" weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Exporter l'appel</p>
                <p className="text-xs text-gray-400 truncate max-w-56">{story?.title}</p>
              </div>
            </div>
            <button
              onClick={() => { if (!isExporting) onClose() }}
              disabled={isExporting}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Corps */}
          <div className="px-6 py-5 flex flex-col gap-4">

            {/* ── Serveur en vérification ── */}
            {serverOk === null && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <SpinnerIcon size={13} className="animate-spin" />
                Connexion au serveur…
              </div>
            )}

            {/* ── Serveur indisponible ── */}
            {serverOk === false && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <WarningCircleIcon size={16} color="#FF3B30" weight="fill" className="shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">
                  Serveur indisponible — démarre le serveur (<code>npm start</code> dans d:/lsd/server) puis réessaie.
                </p>
              </div>
            )}

            {/* ── Sections vidéo + audio ── */}
            {serverOk === true && (
              <>

                {/* ── Section Vidéo ── */}
                <ExportSection
                  title="Vidéo"
                  icon={VideoCameraIcon}
                  color="#5856D6"
                  job={videoJob}
                  onStart={startVideoExport}
                  onRetry={() => setVideoJob(INIT_JOB)}
                  downloadHref={videoJob.jobId ? `${SERVER_BASE}/export-call/download/${videoJob.jobId}/video` : null}
                  downloadLabel={videoLabel}
                  downloadIcon={VideoCameraIcon}
                >
                  {/* Transparence */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Transparence du fond</p>
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                      {OPACITY_OPTS.map(({ label, value }) => (
                        <button
                          key={value}
                          onClick={() => handleOpacity(value)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            glassOpacity === value
                              ? value === 0 ? 'bg-white shadow-sm text-gray-800' : 'bg-white shadow-sm text-indigo-600'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Format vidéo — visible uniquement si transparent */}
                  {transparent && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Format vidéo</p>
                      <div className="flex gap-2">
                        <FormatPill active={videoFormat === 'webm'}   onClick={() => setVideoFormat('webm')}>
                          WebM VP9
                        </FormatPill>
                        <FormatPill active={videoFormat === 'prores'} onClick={() => setVideoFormat('prores')}>
                          ProRes 4444
                        </FormatPill>
                      </div>
                      <p className="text-xs text-gray-400">
                        {videoFormat === 'prores'
                          ? 'ProRes 4444 avec canal alpha — montage pro (Premiere, DaVinci, Final Cut).'
                          : 'WebM VP9 avec canal alpha — DaVinci Resolve, Kdenlive, navigateurs.'}
                      </p>
                    </div>
                  )}
                </ExportSection>

                {/* ── Section Audio ── */}
                <ExportSection
                  title="Audio"
                  icon={MusicNoteIcon}
                  color="#FF9500"
                  job={audioJob}
                  onStart={startAudioExport}
                  onRetry={() => setAudioJob(INIT_JOB)}
                  downloadHref={audioJob.jobId ? `${SERVER_BASE}/export-call/download/${audioJob.jobId}/audio` : null}
                  downloadLabel={audioLabel}
                  downloadIcon={MusicNoteIcon}
                >
                  {/* Volumes */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Volumes</p>
                    <VolumeSlider
                      label="Sonnerie entrante"
                      icon={MusicNoteIcon}
                      value={ringtoneVol}
                      onChange={setRingtoneVol}
                      color="#FF9500"
                    />
                    <VolumeSlider
                      label="Notes vocales"
                      icon={SpeakerHighIcon}
                      value={vocalsVol}
                      onChange={setVocalsVol}
                      color="#25D366"
                    />
                  </div>

                  {/* Format audio */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Format audio</p>
                    <div className="flex gap-2">
                      <FormatPill active={audioFormat === 'mp3'} onClick={() => setAudioFormat('mp3')}>
                        MP3 — compressé
                      </FormatPill>
                      <FormatPill active={audioFormat === 'wav'} onClick={() => setAudioFormat('wav')}>
                        WAV — lossless
                      </FormatPill>
                    </div>
                    <p className="text-xs text-gray-400">
                      {audioFormat === 'wav'
                        ? 'Qualité maximale — fichier plus lourd (~10×). Idéal pour montage pro.'
                        : 'Format compressé 192 kbps — parfait pour réseaux sociaux.'}
                    </p>
                  </div>
                </ExportSection>

              </>
            )}

            {/* Fermer */}
            <button
              onClick={onClose}
              disabled={isExporting}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center disabled:opacity-30"
            >
              Fermer
            </button>

          </div>
        </div>
      </div>
    </>
  )
}
