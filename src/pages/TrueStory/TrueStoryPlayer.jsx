// ─── TrueStoryPlayer — lecteur True Story avec configuration par paire ────────

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useBreakpoint from '../../hooks/useBreakpoint.js'
import {
  ArrowLeftIcon, PlayIcon, ArrowCounterClockwiseIcon,
  SpinnerIcon, ImageIcon, WarningIcon,
  TextBIcon, TextItalicIcon, DownloadSimpleIcon,
} from '@phosphor-icons/react'
import {
  getStory, getThreads, getPhotoBlobUrl, listUserPhotos, getPhotoPublicUrl, getVocalSignedUrl,
} from '../../lib/supabase.js'
import ExportTrueStoryModal from './ExportTrueStoryModal.jsx'
import {
  isTrueStoryEligible, buildTrueStoryPairs, getHistorienInfo,
  fmtElapsed, estimateTrueStorySecs,
  IMAGE_ENTER_ANIMS, IMAGE_EXIT_ANIMS, IMAGE_LOOP_ANIMS,
  IMAGE_POSITIONS, IMAGE_SIZES, defaultPairImageConfig,
} from '../../lib/trueStorySequence.js'
import { useTrueStoryPlayer } from '../../hooks/useTrueStoryPlayer.js'
import TrueStoryOverlay, { FONT_OPTIONS } from '../../components/truestory/TrueStoryOverlay.jsx'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CANVAS_W = 390
const CANVAS_H = 844

const CHECKER_BG = 'repeating-conic-gradient(#b8b8b8 0% 25%, #e0e0e0 25% 50%) 0 0 / 20px 20px'

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

const LS_KEY = id => `ts-config-${id}`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrueStoryPlayer() {
  const { id: storyId } = useParams()
  const navigate        = useNavigate()
  const { isMobile, width } = useBreakpoint()

  // ── Données ──
  const [story,     setStory]     = useState(null)
  const [historien, setHistorien] = useState(null)
  const [pairs,     setPairs]     = useState([])
  const [dataReady, setDataReady] = useState(false)
  const [loadErr,   setLoadErr]   = useState(null)

  // ── Fond ──
  const [bgMode,    setBgMode]    = useState('transparent')
  const [bgColor,   setBgColor]   = useState('#111111')

  // ── Sous-titre ──
  const [subtitleMode,       setSubtitleMode]       = useState('down')
  const [animationMode,      setAnimationMode]       = useState('fade')
  const [textBold,           setTextBold]           = useState(true)
  const [textItalic,         setTextItalic]         = useState(false)
  const [textColor,          setTextColor]          = useState('#ffffff')
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0)
  const [textFont,           setTextFont]           = useState('system')
  const [transitionDuration, setTransitionDuration] = useState(0)

  // ── Config images par paire ──
  const [imageConfigs, setImageConfigs] = useState([])

  // ── Modale d'export ──
  const [showExport, setShowExport] = useState(false)

  // ── Bibliothèque photos ──
  const [photoLibrary,    setPhotoLibrary]    = useState([])
  const [photoLoading,    setPhotoLoading]    = useState(false)
  const [activePairPicker,setActivePairPicker]= useState(null)  // index paire | null

  // ── Player ──
  const enrichedConfigs = imageConfigs.map((c, i) => ({
    ...c,
    _blobUrl: c._blobUrl ?? null,
  }))
  const player = useTrueStoryPlayer(dataReady ? pairs : [], enrichedConfigs, { transitionDuration })

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    if (!storyId) return
    let cancelled = false

    async function load() {
      try {
        const [s, threads] = await Promise.all([getStory(storyId), getThreads(storyId)])
        if (cancelled) return
        if (!isTrueStoryEligible(threads ?? [])) {
          setLoadErr("Cette histoire n'est pas éligible — vérifiez la structure Historien/Dr KA.")
          return
        }
        setStory(s)
        setHistorien(getHistorienInfo(threads ?? []))
        const builtPairs = buildTrueStoryPairs(threads ?? [])
        setPairs(builtPairs)

        // Restaurer config depuis localStorage
        const saved = localStorage.getItem(LS_KEY(storyId))
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            // Padder si moins de paires sauvegardées
            const confs = builtPairs.map((_, i) => parsed[i] ?? defaultPairImageConfig())
            setImageConfigs(confs)
          } catch {
            setImageConfigs(builtPairs.map(() => defaultPairImageConfig()))
          }
        } else {
          setImageConfigs(builtPairs.map(() => defaultPairImageConfig()))
        }

        setDataReady(true)
      } catch (err) {
        if (!cancelled) setLoadErr(err.message)
      }
    }

    load()
    return () => { cancelled = true }
  }, [storyId])

  // ── Persistence localStorage ──────────────────────────────────────────────

  useEffect(() => {
    if (!storyId || imageConfigs.length === 0) return
    const clean = imageConfigs.map(c => {
      const { _blobUrl, ...rest } = c
      return rest
    })
    localStorage.setItem(LS_KEY(storyId), JSON.stringify(clean))
  }, [imageConfigs, storyId])

  // ── Chargement bibliothèque photos ────────────────────────────────────────

  const loadPhotoLibrary = useCallback(async () => {
    if (photoLibrary.length > 0) return
    setPhotoLoading(true)
    try {
      const paths = await listUserPhotos()
      setPhotoLibrary(paths)
    } catch (err) {
      console.error('Photos:', err)
    } finally {
      setPhotoLoading(false)
    }
  }, [photoLibrary.length])

  // ── Sélection d'une image pour une paire ──────────────────────────────────

  async function selectPhotoForPair(pairIdx, storagePath) {
    // Charger blob URL pour le navigateur (COEP)
    let blobUrl = null
    try {
      blobUrl = await getPhotoBlobUrl(storagePath)
    } catch { /* skip */ }

    setImageConfigs(prev => prev.map((c, i) =>
      i === pairIdx
        ? { ...c, imageStoragePath: storagePath, _blobUrl: blobUrl }
        : c
    ))
    setActivePairPicker(null)
  }

  function clearPhotoForPair(pairIdx) {
    setImageConfigs(prev => prev.map((c, i) =>
      i === pairIdx
        ? { ...c, imageStoragePath: null, _blobUrl: null }
        : c
    ))
  }

  function updatePairConfig(pairIdx, key, val) {
    setImageConfigs(prev => prev.map((c, i) => i === pairIdx ? { ...c, [key]: val } : c))
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  const availableWidth = isMobile ? Math.max(200, width - 32) : CANVAS_W
  const previewScale   = Math.min(1, availableWidth / CANVAS_W)
  const scaledW        = Math.round(CANVAS_W * previewScale)
  const scaledH        = Math.round(CANVAS_H * previewScale)

  const activePairForPreview = player.isPlaying ? player.currentPairIdx : 0
  const previewConf          = imageConfigs[activePairForPreview] ?? null
  const previewImgSrc        = player.isPlaying
    ? player.currentImageSrc
    : (previewConf?._blobUrl ?? null)
  const previewSubtitle      = player.isPlaying
    ? player.currentSubtitle
    : (pairs[0]?.drka?.subtitle ?? '')

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navbar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-16 z-10">
        <button
          onClick={() => navigate('/true-story')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon size={16} />
          True Story
        </button>
        <span className="text-sm font-semibold text-gray-800 truncate max-w-48">
          {story?.title ?? '…'}
        </span>
        <div style={{ width: 80 }} />
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto w-full px-6 py-8">

        {/* ── Colonne gauche — canvas ── */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div style={{
            width:        scaledW,
            height:       scaledH,
            borderRadius: 20 * previewScale,
            overflow:     'hidden',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
            background:   bgMode === 'transparent' ? CHECKER_BG : bgColor,
            flexShrink:   0,
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
                <TrueStoryOverlay
                  width={CANVAS_W}
                  height={CANVAS_H}
                  bgMode={bgMode}
                  bgColor={bgColor}
                  subtitle={previewSubtitle}
                  subtitleMode={subtitleMode}
                  animationMode={animationMode}
                  textBold={textBold}
                  textItalic={textItalic}
                  textColor={textColor}
                  textSizeMultiplier={textSizeMultiplier}
                  textFont={textFont}
                  imageSrc={previewImgSrc}
                  imagePosition={previewConf?.imagePosition ?? 'center'}
                  imageSize={previewConf?.imageSize ?? 'medium'}
                  animEnter={previewConf?.animEnter ?? 'fade-in'}
                  animExit={previewConf?.animExit ?? 'fade-out'}
                  animLoop={previewConf?.animLoop ?? 'none'}
                  imageVisible={true}
                  transitioning={player.transitioning}
                />
              )}
            </div>
          </div>

          {/* Mode fond */}
          <div className="flex flex-col gap-2" style={{ width: scaledW }}>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[{ val: 'transparent', label: 'Transparent' }, { val: 'solid', label: 'Couleur' }].map(({ val, label }) => (
                <button key={val} onClick={() => setBgMode(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    bgMode === val ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >{label}</button>
              ))}
            </div>
            {bgMode === 'solid' && (
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <label className="text-xs text-gray-500 flex-1">Couleur du fond</label>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-xs text-gray-500 font-mono">{bgColor}</span>
              </div>
            )}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {[{ val: 'plein', label: 'Centre' }, { val: 'down', label: 'Bas' }].map(({ val, label }) => (
                <button key={val} onClick={() => setSubtitleMode(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    subtitleMode === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Infos */}
          {historien && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">True Story</p>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  backgroundColor: historien.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {historien.avatarUrl
                    ? <img src={historien.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{historien.initials}</span>
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{historien.name} × Dr KA</p>
                  <p className="text-sm text-gray-500">{story?.title}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Paires" value={pairs.length} />
                <Stat label="Durée estimée" value={fmtElapsed(estimateTrueStorySecs(pairs))} />
              </div>
            </div>
          )}

          {/* ── Style du texte ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Style du texte</p>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setTextBold(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                  textBold ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              ><TextBIcon size={15} weight="bold" />Gras</button>
              <button onClick={() => setTextItalic(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all border ${
                  textItalic ? 'bg-gray-900 border-gray-900 text-white italic' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              ><TextItalicIcon size={15} />Italique</button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-500 flex-1">Couleur du texte</span>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                <span className="text-xs font-mono text-gray-400">{textColor}</span>
                <button onClick={() => setTextColor('#ffffff')} className="text-xs text-gray-400 hover:text-gray-600 underline">reset</button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs text-gray-500">Taille</span>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {SIZE_OPTS.map(({ label, value }) => (
                  <button key={value} onClick={() => setTextSizeMultiplier(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      textSizeMultiplier === value ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500">Police</span>
              <div className="flex flex-wrap gap-1.5">
                {FONT_OPTIONS.map(({ key, label, css }) => (
                  <button key={key} onClick={() => setTextFont(key)} style={{ fontFamily: css }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                      textFont === key ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Mise en scène ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Mise en scène</p>
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs text-gray-500">Animation sous-titre</span>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {ANIM_OPTS.map(({ val, label }) => (
                  <button key={val} onClick={() => setAnimationMode(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      animationMode === val ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-700 font-medium">Fondu au noir</span>
                  <p className="text-xs text-gray-400 mt-0.5">Transition entre chaque paire</p>
                </div>
                <button
                  onClick={() => setTransitionDuration(v => v > 0 ? 0 : 600)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${transitionDuration > 0 ? 'bg-orange-500' : 'bg-gray-200'}`}
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
                  <input type="range" min={100} max={2000} step={100}
                    value={transitionDuration} onChange={e => setTransitionDuration(parseInt(e.target.value))}
                    className="w-full accent-orange-500" />
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>100 ms</span><span>2 000 ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Paires — configuration images ── */}
          {imageConfigs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Paires</p>
              <div className="flex flex-col gap-4">
                {pairs.map((pair, i) => {
                  const conf = imageConfigs[i] ?? defaultPairImageConfig()
                  const thumb = conf._blobUrl ?? null
                  return (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      {/* En-tête paire */}
                      <div className="flex items-center gap-3 p-3 bg-gray-50">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {historien?.name} → {pair.drka?.subtitle ? `"${pair.drka.subtitle.slice(0, 40)}…"` : 'Dr KA'}
                          </p>
                          <p className="text-xs text-gray-400">{fmtElapsed(Math.round(pair.historien.duration))} vocal</p>
                        </div>
                        {/* Miniature image */}
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-orange-400 transition-colors flex items-center justify-center shrink-0 relative"
                          onClick={() => { setActivePairPicker(activePairPicker === i ? null : i); loadPhotoLibrary() }}
                          style={{ background: thumb ? 'none' : '#f9f9f9' }}
                        >
                          {thumb
                            ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                            : <ImageIcon size={18} color="#9CA3AF" />
                          }
                        </div>
                      </div>

                      {/* Sélecteur d'image */}
                      {activePairPicker === i && (
                        <div className="p-3 border-t border-gray-100">
                          {photoLoading && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                              <SpinnerIcon size={14} className="animate-spin" />
                              Chargement des photos…
                            </div>
                          )}
                          {!photoLoading && photoLibrary.length === 0 && (
                            <p className="text-xs text-gray-400">Aucune photo dans la bibliothèque.</p>
                          )}
                          {!photoLoading && photoLibrary.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                              {conf.imageStoragePath && (
                                <button
                                  onClick={() => clearPhotoForPair(i)}
                                  className="aspect-square rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-xs text-red-400 hover:bg-red-100 transition-colors"
                                >
                                  Retirer
                                </button>
                              )}
                              {photoLibrary.map(path => {
                                const url = getPhotoPublicUrl(path)
                                return (
                                  <button key={path} onClick={() => selectPhotoForPair(i, path)}
                                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                                      conf.imageStoragePath === path ? 'border-orange-400' : 'border-transparent hover:border-orange-300'
                                    }`}
                                  >
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options d'animation */}
                      <div className="p-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                        <SelectRow label="Position" value={conf.imagePosition}
                          options={IMAGE_POSITIONS.map(p => ({ value: p.val, label: p.label }))}
                          onChange={v => updatePairConfig(i, 'imagePosition', v)} />
                        <SelectRow label="Taille" value={conf.imageSize}
                          options={IMAGE_SIZES.map(s => ({ value: s.val, label: s.label }))}
                          onChange={v => updatePairConfig(i, 'imageSize', v)} />
                        <SelectRow label="Entrée" value={conf.animEnter}
                          options={IMAGE_ENTER_ANIMS.map(a => ({ value: a.val, label: a.label }))}
                          onChange={v => updatePairConfig(i, 'animEnter', v)} />
                        <SelectRow label="Sortie" value={conf.animExit}
                          options={IMAGE_EXIT_ANIMS.map(a => ({ value: a.val, label: a.label }))}
                          onChange={v => updatePairConfig(i, 'animExit', v)} />
                        <SelectRow label="Boucle" value={conf.animLoop}
                          options={IMAGE_LOOP_ANIMS.map(a => ({ value: a.val, label: a.label }))}
                          onChange={v => updatePairConfig(i, 'animLoop', v)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── État player ── */}
          {dataReady && !player.blobsReady && !player.isLoading && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Clique sur "Préparer" pour charger les fichiers audio.
            </div>
          )}
          {player.isLoading && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-sm text-blue-700">
              <SpinnerIcon size={16} className="animate-spin shrink-0" />
              Chargement des vocaux…
            </div>
          )}
          {player.error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
              Erreur : {player.error}
            </div>
          )}
          {player.isDone && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700">
              ✓ True Story terminée — {fmtElapsed(player.elapsed)} de lecture.
            </div>
          )}

          {/* ── Boutons ── */}
          <div className="flex flex-col gap-3">
            {dataReady && !player.blobsReady && !player.isLoading && (
              <button onClick={player.preloadBlobs}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#d9571d' }}
              >
                <SpinnerIcon size={16} />
                Préparer
              </button>
            )}
            {(player.canPlay || player.isDone) && (
              <button
                onClick={player.isDone ? player.reset : player.startPlaying}
                disabled={player.isLoading || player.isPlaying}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: '#25D366' }}
              >
                {player.isDone
                  ? <><ArrowCounterClockwiseIcon size={16} /> Recommencer</>
                  : <><PlayIcon size={16} weight="fill" /> Lancer la True Story</>
                }
              </button>
            )}
            {player.isPlaying && (
              <button onClick={player.reset}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#FF3B30' }}
              >
                <ArrowCounterClockwiseIcon size={16} />
                Arrêter
              </button>
            )}

            {player.blobsReady && (
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

        </div>
      </div>

      {/* ── Modale d'export ── */}
      {showExport && (
        <ExportTrueStoryModal
          onClose={() => setShowExport(false)}
          story={story}
          pairs={player.pairs}
          imageConfigs={imageConfigs}
          getSignedUrl={getVocalSignedUrl}
          bgMode={bgMode}
          bgColor={bgColor}
          subtitleMode={subtitleMode}
          textBold={textBold}
          textItalic={textItalic}
          textColor={textColor}
          textSizeMultiplier={textSizeMultiplier}
          textFont={textFont}
          animationMode={animationMode}
          transitionDuration={transitionDuration}
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

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:border-orange-400"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
