// ─── PhonecallPlayer — lecteur de simulation d'appel WhatsApp ─────────────────
//
// Charge les threads d'une histoire all-vocal, génère la séquence d'appel,
// délègue la machine à états à useCallPlayer et l'affichage au composant
// WhatsAppCallScreen.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useBreakpoint from '../../hooks/useBreakpoint.js'
import {
  ArrowLeftIcon, PlayIcon, ArrowCounterClockwiseIcon,
  SpinnerIcon, DownloadSimpleIcon, WarningIcon,
} from '@phosphor-icons/react'
import { getStory, getThreads, getVocalSignedUrl } from '../../lib/supabase.js'
import {
  isCallEligible, buildSequence, getCallerInfo,
  fmtElapsed, estimateTotalSecs,
} from '../../lib/callSequence.js'
import { useCallPlayer } from '../../hooks/useCallPlayer.js'
import WhatsAppCallScreen from '../../components/iphone/WhatsAppCallScreen.jsx'
import ExportCallModal    from './ExportCallModal.jsx'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhonecallPlayer() {
  const { id: storyId } = useParams()
  const navigate        = useNavigate()

  // ── Données ──
  const [story,     setStory]     = useState(null)
  const [caller,    setCaller]    = useState(null)
  const [rawSeq,    setRawSeq]    = useState([])    // séquence avant pré-chargement
  const [dataReady, setDataReady] = useState(false)
  const [loadErr,   setLoadErr]   = useState(null)

  // ── Modale d'export ──
  const [showExport, setShowExport] = useState(false)

  // ── Mode preview (0=opaque, 0.35/0.50/0.80=transparent) ──
  const [glassOpacity, setGlassOpacity] = useState(0)

  // ── Responsive ──
  const { isMobile, width } = useBreakpoint()

  // ── Player ──
  const player = useCallPlayer(dataReady ? rawSeq : [])

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    if (!storyId) return
    let cancelled = false

    async function load() {
      try {
        const [s, threads] = await Promise.all([
          getStory(storyId),
          getThreads(storyId),
        ])
        if (cancelled) return
        if (!isCallEligible(threads ?? [])) {
          setLoadErr('Cette histoire n\'est pas éligible — tous les messages doivent être des notes vocales.')
          return
        }
        const seq  = buildSequence(threads ?? [])
        const info = getCallerInfo(threads ?? [])
        setStory(s)
        setRawSeq(seq)
        setCaller(info)
        setDataReady(true)
      } catch (err) {
        if (!cancelled) setLoadErr(err.message)
      }
    }

    load()
    return () => { cancelled = true }
  }, [storyId])

  // ── Dérivés ───────────────────────────────────────────────────────────────

  const { phase, activeSide, currentSubtitle, elapsed, sequence, blobsReady,
          isLoading, isPlaying, isDone, canPlay,
          preloadBlobs, startCall, resetCall } = player

  const iPhonePhase = phase === 'incoming' ? 'incoming'
                    : phase === 'active'   ? 'active'
                    : phase === 'ended'    ? 'ended'
                    : 'incoming'   // idle / loading / ready → preview entrante

  // Scale du preview iPhone : adapté à la largeur disponible sur mobile
  const IPHONE_W       = 390
  const availableWidth = isMobile ? Math.max(200, width - 32) : IPHONE_W
  const previewScale   = Math.min(1, availableWidth / IPHONE_W)
  const scaledW        = Math.round(IPHONE_W * previewScale)
  const scaledH        = Math.round(844 * previewScale)

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Barre de navigation ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-16 z-10">
        <button
          onClick={() => navigate('/phonecall/simple-phone-call')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon size={16} />
          Appels
        </button>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-48">
          {story?.title ?? '…'}
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto w-full px-6 py-8">

        {/* ── Colonne gauche — preview iPhone ── */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          {/* Conteneur scalé */}
          <div style={{
            width:    scaledW,
            height:   scaledH,
            flexShrink: 0,
            borderRadius: 48 * previewScale,
            boxShadow: `0 ${Math.round(24 * previewScale)}px ${Math.round(80 * previewScale)}px rgba(0,0,0,0.22), 0 0 0 ${Math.round(10 * previewScale)}px #1a1a1a, 0 0 0 ${Math.round(12 * previewScale)}px #333`,
            overflow: 'hidden',
          }}>
            {/* Contenu à taille native, scalé par transform */}
            <div style={{
              width:           IPHONE_W,
              height:          844,
              transform:       `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}>
              {loadErr ? (
                <div style={{
                  width: IPHONE_W, height: 844,
                  background: '#111',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                }}>
                  <WarningIcon size={36} color="#FF3B30" />
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: '0 32px' }}>
                    {loadErr}
                  </p>
                </div>
              ) : (
                <WhatsAppCallScreen
                  statusTime="9:41"
                  callerName={caller?.name      ?? '…'}
                  callerColor={caller?.color    ?? '#25D366'}
                  callerInitials={caller?.initials ?? '?'}
                  callerAvatarUrl={caller?.avatarUrl ?? null}
                  phase={iPhonePhase}
                  activeSide={activeSide}
                  subtitle={currentSubtitle}
                  elapsedSeconds={elapsed}
                  onAnswer={() => {}}
                  onDecline={() => {}}
                  onHangup={resetCall}
                  glassOpacity={glassOpacity}
                />
              )}
            </div>
          </div>{/* fin cadre iPhone overflow:hidden */}

          {/* Sélecteur d'opacité : Opaque / 35% / 50% / 80% */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1" style={{ width: scaledW }}>
            {[
              { label: 'Opaque', value: 0 },
              { label: '35 %',   value: 0.35 },
              { label: '50 %',   value: 0.50 },
              { label: '80 %',   value: 0.80 },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setGlassOpacity(value)}
                className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  glassOpacity === value
                    ? value === 0
                      ? 'bg-white shadow-sm text-gray-800'
                      : 'bg-white shadow-sm text-indigo-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>{/* fin colonne gauche */}

        {/* ── Colonne droite — contrôles ── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Infos appel */}
          {caller && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Appel simulé</p>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: caller.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {caller.avatarUrl
                    ? <img src={caller.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{caller.initials}</span>
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{caller.name}</p>
                  <p className="text-sm text-gray-500">appelle Dr KA</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Notes vocales" value={sequence.length} />
                <Stat label="Durée estimée"  value={fmtElapsed(estimateTotalSecs(sequence))} />
              </div>
            </div>
          )}

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
              ✓ Appel terminé — {fmtElapsed(elapsed)} de conversation.
            </div>
          )}

          {/* Boutons contrôle */}
          <div className="flex flex-col gap-3">

            {/* Préparer */}
            {dataReady && !blobsReady && !isLoading && (
              <button
                onClick={preloadBlobs}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#d9571d' }}
              >
                <SpinnerIcon size={16} />
                Préparer l'appel
              </button>
            )}

            {/* Simuler / Recommencer */}
            {(canPlay || isDone) && (
              <button
                onClick={isDone ? resetCall : startCall}
                disabled={isLoading || isPlaying}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#25D366' }}
              >
                {isDone
                  ? <><ArrowCounterClockwiseIcon size={16} /> Recommencer</>
                  : <><PlayIcon size={16} weight="fill" /> Simuler l'appel</>
                }
              </button>
            )}

            {/* Arrêter */}
            {isPlaying && (
              <button
                onClick={resetCall}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#FF3B30' }}
              >
                <ArrowCounterClockwiseIcon size={16} />
                Arrêter
              </button>
            )}

            {/* Exporter */}
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

          {/* Séquence vocale */}
          {sequence.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Séquence vocale</p>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {sequence.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: item.side === 'incoming' ? (caller?.color ?? '#25D366') : '#d9571d' }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-gray-600 truncate flex-1">
                      {item.side === 'incoming' ? caller?.name : 'Dr KA'}
                    </span>
                    <span className="text-gray-400 font-mono text-xs shrink-0">
                      {fmtElapsed(Math.round(item.duration))}
                    </span>
                    {blobsReady && (
                      <span className={`text-xs ${item.blobUrl ? 'text-green-500' : 'text-red-400'}`}>
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
        <ExportCallModal
          onClose={() => setShowExport(false)}
          story={story}
          caller={caller}
          rawSeq={rawSeq}
          getSignedUrl={getVocalSignedUrl}
          glassOpacity={glassOpacity}
        />
      )}

    </div>
  )
}

// ─── Stat mini ────────────────────────────────────────────────────────────────

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
