// ─── DiscussionPlayer — lecteur de discussion avec affichage des sous-titres ──

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useBreakpoint from '../../hooks/useBreakpoint.js'
import {
  ArrowLeftIcon, PlayIcon, ArrowCounterClockwiseIcon,
  SpinnerIcon, DownloadSimpleIcon, WarningIcon,
  TextBIcon, TextItalicIcon,
} from '@phosphor-icons/react'
import { getStory, getThreads, getVocalSignedUrl } from '../../lib/supabase.js'
import {
  isCallEligible, buildSequence, getCallerInfo, getInitials,
  fmtElapsed, estimateTotalSecs,
} from '../../lib/callSequence.js'
import { useDiscussionPlayer } from '../../hooks/useDiscussionPlayer.js'
import DiscussionOverlay, { FONT_OPTIONS } from '../../components/discussion/DiscussionOverlay.jsx'
import ExportDiscussionModal from './ExportDiscussionModal.jsx'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CANVAS_W = 390
const CANVAS_H = 844

const BG_OPACITIES = [
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

const ANIM_OPTS = [
  { val: 'fade',     label: 'Fondu'  },
  { val: 'pop',      label: 'Pop'    },
  { val: 'slide-up', label: 'Glisse' },
]

const CHECKER_BG = 'repeating-conic-gradient(#b8b8b8 0% 25%, #e0e0e0 25% 50%) 0 0 / 20px 20px'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscussionPlayer() {
  const { id: storyId } = useParams()
  const navigate        = useNavigate()

  // ── Données ──
  const [story,     setStory]     = useState(null)
  const [caller,    setCaller]    = useState(null)   // premier non-Dr-KA (compat)
  const [speakers,  setSpeakers]  = useState([])     // tous les non-Dr-KA
  const [rawSeq,    setRawSeq]    = useState([])
  const [dataReady, setDataReady] = useState(false)
  const [loadErr,   setLoadErr]   = useState(null)

  // ── Modale d'export ──
  const [showExport, setShowExport] = useState(false)

  // ── Mode fond ──
  const [bgMode,    setBgMode]    = useState('transparent')
  const [bgOpacity, setBgOpacity] = useState(0.50)
  const [bgColor,   setBgColor]   = useState('#111111')

  // ── Position des sous-titres ──
  const [subtitleMode, setSubtitleMode] = useState('plein')

  // ── Style du texte ──
  const [textBold,           setTextBold]           = useState(true)
  const [textItalic,         setTextItalic]         = useState(false)
  const [textColor,          setTextColor]          = useState('#ffffff')
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0)
  const [textFont,           setTextFont]           = useState('system')

  // ── Mise en scène ──
  const [animationMode,      setAnimationMode]      = useState('fade')
  const [showSpeakerName,    setShowSpeakerName]    = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(0)

  // ── Responsive ──
  const { isMobile, width } = useBreakpoint()

  // ── Player ──
  const player = useDiscussionPlayer(dataReady ? rawSeq : [], { transitionDuration })

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    if (!storyId) return
    let cancelled = false

    async function load() {
      try {
        const [s, threads] = await Promise.all([getStory(storyId), getThreads(storyId)])
        if (cancelled) return
        if (!isCallEligible(threads ?? [])) {
          setLoadErr('Cette histoire n\'est pas éligible — tous les messages doivent être des notes vocales.')
          return
        }
        setStory(s)
        const callerInfo = getCallerInfo(threads ?? [])
        setCaller(callerInfo)

        // Tous les personnages non-Dr-KA (dédupliqués, ordonnés)
        const seen = new Set()
        const allSpeakers = (threads ?? [])
          .filter(t => t.character_name && t.character_name !== 'Dr KA')
          .filter(t => { if (seen.has(t.character_name)) return false; seen.add(t.character_name); return true })
          .map(t => ({
            name:      t.character_name,
            color:     t.character_color      ?? '#25D366',
            initials:  getInitials(t.character_name),
            avatarUrl: t.character_avatar_url ?? null,
          }))
        setSpeakers(allSpeakers)

        setRawSeq(buildSequence(threads ?? []).map(item => ({
          ...item,
          speakerName: item.characterName !== 'Dr KA' ? item.characterName : '',
        })))
        setDataReady(true)
      } catch (err) {
        if (!cancelled) setLoadErr(err.message)
      }
    }

    load()
    return () => { cancelled = true }
  }, [storyId])

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const {
    currentSubtitle, currentSpeakerName, transitioning,
    elapsed, sequence, blobsReady,
    isLoading, isPlaying, isDone, canPlay,
    preloadBlobs, startDiscussion, resetDiscussion,
  } = player

  const availableWidth = isMobile ? Math.max(200, width - 32) : CANVAS_W
  const previewScale   = Math.min(1, availableWidth / CANVAS_W)
  const scaledW        = Math.round(CANVAS_W * previewScale)
  const scaledH        = Math.round(CANVAS_H * previewScale)

  // Sous-titre d'aperçu : premier sous-titre de la séquence quand inactif
  const previewSubtitle = isPlaying
    ? currentSubtitle
    : (sequence.find(s => s.subtitle?.trim())?.subtitle ?? '')

  const previewSpeakerName = showSpeakerName
    ? (isPlaying ? currentSpeakerName : (sequence.find(s => s.subtitle?.trim())?.speakerName ?? ''))
    : ''

  // Props de style partagées entre preview et export
  const textStyle  = { textBold, textItalic, textColor, textSizeMultiplier, textFont }
  const sceneStyle = { animationMode, showSpeakerName, transitionDuration }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Barre de navigation ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-16 z-10">
        <button
          onClick={() => navigate('/discussion')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon size={16} />
          Discussions
        </button>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-48">
          {story?.title ?? '…'}
        </span>
        <div style={{ width: 80 }} />
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto w-full px-6 py-8">

        {/* ── Colonne gauche — preview + contrôles visuels ── */}
        <div className="flex flex-col items-center gap-4 shrink-0">

          {/* Aperçu */}
          <div style={{
            width:        scaledW,
            height:       scaledH,
            flexShrink:   0,
            borderRadius: 20 * previewScale,
            overflow:     'hidden',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
            background:   bgMode === 'transparent' ? CHECKER_BG : bgColor,
          }}>
            <div style={{
              width: CANVAS_W, height: CANVAS_H,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}>
              {loadErr ? (
                <div style={{
                  width: CANVAS_W, height: CANVAS_H, background: '#111',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <WarningIcon size={36} color="#FF3B30" />
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: '0 32px' }}>
                    {loadErr}
                  </p>
                </div>
              ) : (
                <DiscussionOverlay
                  subtitle={previewSubtitle}
                  speakerName={previewSpeakerName}
                  subtitleMode={subtitleMode}
                  bgMode={bgMode}
                  bgOpacity={bgOpacity}
                  bgColor={bgColor}
                  animationMode={animationMode}
                  transitioning={transitioning}
                  {...textStyle}
                  width={CANVAS_W}
                  height={CANVAS_H}
                />
              )}
            </div>
          </div>

          {/* ── Contrôles de fond ── */}
          <div className="flex flex-col gap-2" style={{ width: scaledW }}>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { val: 'transparent', label: 'Transparent' },
                { val: 'solid',       label: 'Couleur' },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setBgMode(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bgMode === val
                      ? val === 'transparent' ? 'bg-white shadow-sm text-indigo-600' : 'bg-white shadow-sm text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {bgMode === 'transparent' && (
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {BG_OPACITIES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setBgOpacity(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bgOpacity === value ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {bgMode === 'solid' && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <label className="text-xs text-gray-500 flex-1">Couleur du fond</label>
                <input
                  type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs text-gray-500 font-mono">{bgColor}</span>
              </div>
            )}

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { val: 'plein', label: 'Centre' },
                { val: 'down',  label: 'Bas'    },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setSubtitleMode(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    subtitleMode === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>{/* fin colonne gauche */}

        {/* ── Colonne droite ── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Infos */}
          {speakers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Discussion</p>
              {speakers.length === 1 ? (
                <div className="flex items-center gap-3">
                  <SpeakerAvatar speaker={speakers[0]} size={44} />
                  <div>
                    <p className="font-semibold text-gray-900">{speakers[0].name}</p>
                    <p className="text-sm text-gray-500">{story?.title}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-500 truncate">{story?.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {speakers.map(sp => (
                      <div key={sp.name} className="flex items-center gap-1.5">
                        <SpeakerAvatar speaker={sp} size={28} />
                        <span className="text-sm font-medium text-gray-700">{sp.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#d9571d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                      }}>KA</div>
                      <span className="text-sm font-medium text-gray-700">Dr KA</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Notes vocales" value={sequence.length} />
                <Stat label="Durée estimée"  value={fmtElapsed(estimateTotalSecs(sequence))} />
              </div>
            </div>
          )}

          {/* ── Style du texte ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Style du texte</p>

            {/* Gras + Italique */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTextBold(v => !v)}
                title="Gras"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                  textBold
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                <TextBIcon size={15} weight="bold" />
                Gras
              </button>
              <button
                onClick={() => setTextItalic(v => !v)}
                title="Italique"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all border ${
                  textItalic
                    ? 'bg-gray-900 border-gray-900 text-white italic'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                <TextItalicIcon size={15} />
                Italique
              </button>
            </div>

            {/* Couleur du texte */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-500 flex-1">Couleur du texte</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  title="Couleur du texte"
                />
                <span className="text-xs font-mono text-gray-400">{textColor}</span>
                <button
                  onClick={() => setTextColor('#ffffff')}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  reset
                </button>
              </div>
            </div>

            {/* Taille */}
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs text-gray-500">Taille</span>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {SIZE_OPTS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setTextSizeMultiplier(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      textSizeMultiplier === value
                        ? 'bg-white shadow-sm text-gray-800'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Police */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500">Police d'écriture</span>
              <div className="flex flex-wrap gap-1.5">
                {FONT_OPTIONS.map(({ key, label, css }) => (
                  <button
                    key={key}
                    onClick={() => setTextFont(key)}
                    style={{ fontFamily: css }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Mise en scène</p>

            {/* Animation d'entrée */}
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs text-gray-500">Animation d'entrée</span>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {ANIM_OPTS.map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setAnimationMode(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      animationMode === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nom du personnage */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-gray-700 font-medium">Nom du personnage</span>
                <p className="text-xs text-gray-400 mt-0.5">Affiché au-dessus de la réplique</p>
              </div>
              <button
                onClick={() => setShowSpeakerName(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${showSpeakerName ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showSpeakerName ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Fondu au noir */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-700 font-medium">Fondu au noir</span>
                  <p className="text-xs text-gray-400 mt-0.5">Transition entre chaque réplique</p>
                </div>
                <button
                  onClick={() => setTransitionDuration(v => v > 0 ? 0 : 600)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${transitionDuration > 0 ? 'bg-indigo-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${transitionDuration > 0 ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {transitionDuration > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Durée du noir</span>
                    <span className="tabular-nums font-mono">{transitionDuration} ms</span>
                  </div>
                  <input
                    type="range" min={100} max={2000} step={100}
                    value={transitionDuration}
                    onChange={e => setTransitionDuration(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>100 ms</span>
                    <span>2 000 ms</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Bandeaux d'état */}
          {dataReady && !blobsReady && !isLoading && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Clique sur "Préparer" pour charger les fichiers audio avant la simulation.
            </div>
          )}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-sm text-blue-700">
              <SpinnerIcon size={16} className="animate-spin shrink-0" />
              Chargement des notes vocales…
            </div>
          )}
          {player.error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              Erreur : {player.error}
            </div>
          )}
          {isDone && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
              ✓ Discussion terminée — {fmtElapsed(elapsed)} de lecture.
            </div>
          )}

          {/* Boutons contrôle */}
          <div className="flex flex-col gap-3">

            {dataReady && !blobsReady && !isLoading && (
              <button
                onClick={preloadBlobs}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5856D6' }}
              >
                <SpinnerIcon size={16} />
                Préparer la discussion
              </button>
            )}

            {(canPlay || isDone) && (
              <button
                onClick={isDone ? resetDiscussion : startDiscussion}
                disabled={isLoading || isPlaying}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#25D366' }}
              >
                {isDone
                  ? <><ArrowCounterClockwiseIcon size={16} /> Recommencer</>
                  : <><PlayIcon size={16} weight="fill" /> Simuler la discussion</>
                }
              </button>
            )}

            {isPlaying && (
              <button
                onClick={resetDiscussion}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#FF3B30' }}
              >
                <ArrowCounterClockwiseIcon size={16} />
                Arrêter
              </button>
            )}

            {blobsReady && (
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#5856D6' }}
              >
                <DownloadSimpleIcon size={16} weight="fill" />
                Exporter (vidéo + audio)
              </button>
            )}

          </div>

          {/* Séquence */}
          {sequence.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Séquence vocale</p>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {sequence.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: item.characterName !== 'Dr KA' ? (item.characterColor ?? '#25D366') : '#d9571d' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-600 truncate">
                        {item.characterName || (item.side === 'incoming' ? caller?.name : 'Dr KA')}
                      </p>
                      {item.subtitle?.trim() && (
                        <p className="text-xs text-indigo-500 truncate mt-0.5 italic">
                          "{item.subtitle}"
                        </p>
                      )}
                    </div>
                    <span className="text-gray-400 font-mono text-xs shrink-0">
                      {fmtElapsed(Math.round(item.duration))}
                    </span>
                    {blobsReady && (
                      <span className={`text-xs shrink-0 ${item.blobUrl ? 'text-green-500' : 'text-red-400'}`}>
                        {item.blobUrl ? '●' : '○'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modale d'export ── */}
      {showExport && (
        <ExportDiscussionModal
          onClose={() => setShowExport(false)}
          story={story}
          rawSeq={rawSeq}
          getSignedUrl={getVocalSignedUrl}
          bgMode={bgMode}
          bgOpacity={bgOpacity}
          bgColor={bgColor}
          subtitleMode={subtitleMode}
          {...textStyle}
          {...sceneStyle}
        />
      )}

    </div>
  )
}

// ─── Composants utilitaires ───────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function SpeakerAvatar({ speaker, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: speaker.color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {speaker.avatarUrl
        ? <img src={speaker.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>{speaker.initials}</span>
      }
    </div>
  )
}
