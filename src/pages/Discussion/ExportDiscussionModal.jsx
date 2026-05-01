// ─── ExportDiscussionModal — modale d'export de la simulation de discussion ────
//
// Props :
//   onClose      () → void
//   story        { title }
//   rawSeq       [{ storagePath, duration, side, subtitle }]
//   getSignedUrl (storagePath) → Promise<string>
//   bgMode       'transparent' | 'solid'
//   bgOpacity    0.3 | 0.5 | 0.8 (mode transparent)
//   bgColor      '#hex' (mode solid)
//   subtitleMode 'plein' | 'down'
//
// Flux :
//   Section Vidéo  : POST /export-discussion/video  → SSE → download
//   Section Audio  : POST /export-discussion/audio  → SSE → download

import { useState, useRef, useEffect } from 'react'
import {
  XIcon, DownloadSimpleIcon, SpinnerIcon,
  SpeakerHighIcon, MusicNoteIcon, VideoCameraIcon,
  CheckCircleIcon, WarningCircleIcon,
  TextBIcon, TextItalicIcon,
} from '@phosphor-icons/react'
import { FONT_OPTIONS } from '../../components/discussion/DiscussionOverlay.jsx'

const SERVER_BASE = 'http://localhost:3001'

const OPACITY_OPTS = [
  { label: '30 %', value: 0.30 },
  { label: '50 %', value: 0.50 },
  { label: '80 %', value: 0.80 },
]

const SIZE_OPTS = [
  { label: 'S',  value: 0.75 },
  { label: 'M',  value: 1.0  },
  { label: 'L',  value: 1.25 },
  { label: 'XL', value: 1.5  },
]

// ─── Sub-composants communs ───────────────────────────────────────────────────

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

function ExportSection({ title, icon: Icon, color, job, onStart, onRetry, downloadHref, downloadLabel, downloadIcon, children }) {
  const { phase, pct, message } = job
  const isRunning = phase === 'running'
  const isDone    = phase === 'done'
  const isError   = phase === 'error'

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
          <Icon size={13} style={{ color }} weight="fill" />
        </div>
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {isDone && <CheckCircleIcon size={14} color="#25D366" weight="fill" className="ml-auto" />}
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        {phase === 'idle' && children}
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
        {isError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
            <WarningCircleIcon size={13} color="#FF3B30" weight="fill" className="shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed">{message}</p>
          </div>
        )}
        {isDone && downloadHref && (
          <DownloadBtn href={downloadHref} label={downloadLabel} icon={downloadIcon} color={color} />
        )}
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

export default function ExportDiscussionModal({
  onClose, story, rawSeq, getSignedUrl,
  bgMode: defaultBgMode = 'transparent',
  bgOpacity: defaultBgOpacity = 0.50,
  bgColor: defaultBgColor = '#111111',
  subtitleMode: defaultSubtitleMode = 'plein',
  // ── Style du texte ──
  textBold: defaultTextBold = true,
  textItalic: defaultTextItalic = false,
  textColor: defaultTextColor = '#ffffff',
  textSizeMultiplier: defaultTextSize = 1.0,
  textFont: defaultTextFont = 'system',
  // ── Mise en scène ──
  animationMode: defaultAnimMode = 'fade',
  showSpeakerName: defaultShowSpeakerName = false,
  transitionDuration: defaultTransDuration = 0,
}) {

  // ── Paramètres vidéo ──
  const [bgMode,             setBgMode]             = useState(defaultBgMode)
  const [bgOpacity,          setBgOpacity]          = useState(defaultBgOpacity)
  const [bgColor,            setBgColor]            = useState(defaultBgColor)
  const [subtitleMode,       setSubtitleMode]       = useState(defaultSubtitleMode)
  const [videoFormat,        setVideoFormat]        = useState(defaultBgMode === 'transparent' ? 'webm' : 'mp4')
  // ── Style du texte ──
  const [textBold,           setTextBold]           = useState(defaultTextBold)
  const [textItalic,         setTextItalic]         = useState(defaultTextItalic)
  const [textColor,          setTextColor]          = useState(defaultTextColor)
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(defaultTextSize)
  const [textFont,           setTextFont]           = useState(defaultTextFont)
  // ── Mise en scène ──
  const [animationMode,      setAnimationMode]      = useState(defaultAnimMode)
  const [showSpeakerName,    setShowSpeakerName]    = useState(defaultShowSpeakerName)
  const [transitionDuration, setTransitionDuration] = useState(defaultTransDuration)

  // ── Paramètres audio ──
  const [vocalsVol,   setVocalsVol]   = useState(1.00)
  const [audioFormat, setAudioFormat] = useState('mp3')

  // ── Jobs ──
  const [videoJob, setVideoJob] = useState(INIT_JOB)
  const [audioJob, setAudioJob] = useState(INIT_JOB)
  const videoSseRef = useRef(null)
  const audioSseRef = useRef(null)

  // ── État serveur ──
  const [serverOk, setServerOk] = useState(null)

  useEffect(() => {
    fetch(`${SERVER_BASE}/health`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.ok ? setServerOk(true) : Promise.reject())
      .catch(() => setServerOk(false))
  }, [])

  useEffect(() => () => {
    videoSseRef.current?.close()
    audioSseRef.current?.close()
  }, [])

  useEffect(() => {
    const isExporting = videoJob.phase === 'running' || audioJob.phase === 'running'
    function onKey(e) { if (e.key === 'Escape' && !isExporting) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoJob.phase, audioJob.phase, onClose])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleBgMode(v) {
    setBgMode(v)
    if (v === 'solid') setVideoFormat('mp4')
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
      const seqForVideo = rawSeq.map(({ duration, side, subtitle, speakerName }) => ({
        duration, side,
        subtitle:    subtitle    ?? '',
        speakerName: showSpeakerName ? (speakerName ?? '') : '',
      }))
      const resp = await fetch(`${SERVER_BASE}/export-discussion/video`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle:        story?.title ?? 'discussion',
          sequence:          seqForVideo,
          bgMode,
          bgColor,
          bgOpacity,
          subtitleMode,
          videoFormat:       bgMode === 'transparent' ? videoFormat : 'mp4',
          textBold,
          textItalic,
          textColor,
          textSizeMultiplier,
          textFont,
          animationMode,
          transitionDuration,
          appUrl:            window.location.origin,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error ?? `HTTP ${resp.status}`)
      }
      const { jobId } = await resp.json()
      setVideoJob(j => ({ ...j, jobId }))
      videoSseRef.current = subscribeSSE(
        `${SERVER_BASE}/export-discussion/progress/${jobId}`,
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
      const resp = await fetch(`${SERVER_BASE}/export-discussion/audio`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle:   story?.title ?? 'discussion',
          sequence:     seqWithUrls,
          vocalsVolume: vocalsVol,
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
        `${SERVER_BASE}/export-discussion/progress/${jobId}`,
        setAudioJob, jobId,
      )
    } catch (err) {
      setAudioJob({ phase: 'error', pct: 0, message: err.message, jobId: null })
    }
  }

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const transparent = bgMode === 'transparent'
  const isExporting = videoJob.phase === 'running' || audioJob.phase === 'running'

  const videoLabel = transparent
    ? (videoFormat === 'prores' ? 'Vidéo ProRes 4444 (MOV)' : 'Vidéo WebM VP9 (alpha)')
    : 'Vidéo MP4 (1080×1920)'
  const audioLabel = audioFormat === 'wav' ? 'Audio WAV (lossless)' : 'Audio MP3'

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => { if (!isExporting) onClose() }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }}>

          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5856D618' }}>
                <DownloadSimpleIcon size={16} color="#5856D6" weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Exporter la discussion</p>
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

            {serverOk === null && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <SpinnerIcon size={13} className="animate-spin" />
                Connexion au serveur…
              </div>
            )}

            {serverOk === false && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <WarningCircleIcon size={16} color="#FF3B30" weight="fill" className="shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">
                  Serveur indisponible — démarre le serveur (<code>npm start</code> dans d:/lsd/server) puis réessaie.
                </p>
              </div>
            )}

            {serverOk === true && (
              <>
                {/* Section Vidéo */}
                <ExportSection
                  title="Vidéo"
                  icon={VideoCameraIcon}
                  color="#5856D6"
                  job={videoJob}
                  onStart={startVideoExport}
                  onRetry={() => setVideoJob(INIT_JOB)}
                  downloadHref={videoJob.jobId ? `${SERVER_BASE}/export-discussion/download/${videoJob.jobId}/video` : null}
                  downloadLabel={videoLabel}
                  downloadIcon={VideoCameraIcon}
                >
                  {/* Mode fond */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Mode fond</p>
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => handleBgMode('transparent')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          bgMode === 'transparent'
                            ? 'bg-white shadow-sm text-indigo-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Transparent
                      </button>
                      <button
                        onClick={() => handleBgMode('solid')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          bgMode === 'solid'
                            ? 'bg-white shadow-sm text-gray-800'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Couleur
                      </button>
                    </div>

                    {/* Opacité (transparent) */}
                    {transparent && (
                      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {OPACITY_OPTS.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => setBgOpacity(value)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              bgOpacity === value
                                ? 'bg-white shadow-sm text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Couleur (solid) */}
                    {!transparent && (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                        <span className="text-xs text-gray-500 flex-1">Couleur du fond</span>
                        <input
                          type="color"
                          value={bgColor}
                          onChange={e => setBgColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-400">{bgColor}</span>
                      </div>
                    )}
                  </div>

                  {/* Position des sous-titres */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Position des sous-titres</p>
                    <div className="flex gap-2">
                      <FormatPill active={subtitleMode === 'plein'} onClick={() => setSubtitleMode('plein')}>
                        Centre
                      </FormatPill>
                      <FormatPill active={subtitleMode === 'down'} onClick={() => setSubtitleMode('down')}>
                        Bas
                      </FormatPill>
                    </div>
                  </div>

                  {/* ── Style du texte ── */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Style du texte</p>

                    {/* Gras + Italique */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTextBold(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          textBold
                            ? 'bg-gray-900 border-gray-900 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        <TextBIcon size={13} weight="bold" />
                        Gras
                      </button>
                      <button
                        onClick={() => setTextItalic(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                          textItalic
                            ? 'bg-gray-900 border-gray-900 text-white italic'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        <TextItalicIcon size={13} />
                        Italique
                      </button>
                    </div>

                    {/* Couleur du texte */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex-1">Couleur</span>
                      <input
                        type="color"
                        value={textColor}
                        onChange={e => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-gray-400">{textColor}</span>
                      <button
                        onClick={() => setTextColor('#ffffff')}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        reset
                      </button>
                    </div>

                    {/* Taille */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Taille</span>
                      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {SIZE_OPTS.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => setTextSizeMultiplier(value)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              textSizeMultiplier === value
                                ? 'bg-white shadow-sm text-gray-800'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Police */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Police</span>
                      <div className="flex flex-wrap gap-1.5">
                        {FONT_OPTIONS.map(({ key, label, css }) => (
                          <button
                            key={key}
                            onClick={() => setTextFont(key)}
                            style={{ fontFamily: css }}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all border ${
                              textFont === key
                                ? 'bg-gray-900 border-gray-900 text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Mise en scène ── */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Mise en scène</p>

                    {/* Animation */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Animation d'entrée</span>
                      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {[
                          { val: 'fade',     label: 'Fondu'  },
                          { val: 'pop',      label: 'Pop'    },
                          { val: 'slide-up', label: 'Glisse' },
                        ].map(({ val, label }) => (
                          <button
                            key={val}
                            onClick={() => setAnimationMode(val)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              animationMode === val
                                ? 'bg-white shadow-sm text-gray-800'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nom du personnage */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Nom du personnage</span>
                      <button
                        onClick={() => setShowSpeakerName(v => !v)}
                        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${showSpeakerName ? 'bg-indigo-600' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showSpeakerName ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>

                    {/* Fondu au noir */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Fondu au noir</span>
                        <button
                          onClick={() => setTransitionDuration(v => v > 0 ? 0 : 600)}
                          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${transitionDuration > 0 ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${transitionDuration > 0 ? 'translate-x-4' : ''}`} />
                        </button>
                      </div>
                      {transitionDuration > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Durée du noir</span>
                            <span className="tabular-nums font-mono">{transitionDuration} ms</span>
                          </div>
                          <input
                            type="range" min={100} max={2000} step={100}
                            value={transitionDuration}
                            onChange={e => setTransitionDuration(parseInt(e.target.value))}
                            className="w-full accent-indigo-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Format vidéo (transparent uniquement) */}
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
                          ? 'ProRes 4444 avec canal alpha — montage pro.'
                          : 'WebM VP9 avec canal alpha — DaVinci, Kdenlive, navigateurs.'}
                      </p>
                    </div>
                  )}
                </ExportSection>

                {/* Section Audio */}
                <ExportSection
                  title="Audio"
                  icon={MusicNoteIcon}
                  color="#FF9500"
                  job={audioJob}
                  onStart={startAudioExport}
                  onRetry={() => setAudioJob(INIT_JOB)}
                  downloadHref={audioJob.jobId ? `${SERVER_BASE}/export-discussion/download/${audioJob.jobId}/audio` : null}
                  downloadLabel={audioLabel}
                  downloadIcon={MusicNoteIcon}
                >
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Volume</p>
                    <VolumeSlider
                      label="Notes vocales"
                      icon={SpeakerHighIcon}
                      value={vocalsVol}
                      onChange={setVocalsVol}
                      color="#25D366"
                    />
                  </div>
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
                  </div>
                </ExportSection>
              </>
            )}

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
