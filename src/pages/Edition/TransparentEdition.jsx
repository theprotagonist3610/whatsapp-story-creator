// ─── TransparentEdition ───────────────────────────────────────────────────────
//
// Interface d'édition pour le mode transparent (3 panneaux) :
//   Gauche  — timeline des steps (typingIndicator / writeMessage / wait)
//   Centre  — preview live TransparentConversation sur fond damier
//   Droite  — formulaire d'ajout d'action

import { useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowsClockwiseIcon, PlayIcon, TrashIcon, PlusIcon,
         ArrowUpIcon, ArrowDownIcon, DownloadSimpleIcon,
         SpinnerGapIcon, XIcon, FilmSlateIcon } from '@phosphor-icons/react'
import TransparentConversation from '../../components/transparent/TransparentConversation.jsx'
import { getThreads } from '../../lib/supabase.js'
import { isStickerText, stickerFilename, isVocalText, vocalPath, vocalDuration } from '../Histoires/DesktopHistoireDetail.jsx'
import { getLocalUrl } from '../../lib/stickers.js'

// ─── Constantes ───────────────────────────────────────────────────────────────

const NAV_H = 64   // hauteur navbar

const STEP_TYPES = [
  { id: 'writeMessage',    label: 'Message',       color: '#25D366' },
  { id: 'typingIndicator', label: 'Est en train d\'écrire…', color: '#d9571d' },
  { id: 'wait',            label: 'Attendre',      color: '#8E8E93' },
]

const MSG_TYPES = [
  { id: 'text',    label: 'Texte'       },
  { id: 'sticker', label: 'Sticker'     },
  { id: 'photo',   label: 'Photo'       },
  { id: 'vocal',   label: 'Note vocale' },
]

const CLS = 'w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-orange bg-white'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Générateur de scène transparente depuis les fils de l'histoire ───────────
//
// Produit uniquement 3 types de steps : writeMessage / typingIndicator / wait.
// Les corrections [avant]:[après] sont réduites à la version finale.

const CORRECTION_RE = /^\[([^\]]+)\]:\[([^\]]+)\]$/

function generateTransparentScene(threads) {
  const step = (type, extra = {}) => ({ id: uid(), type, ...extra })

  const mainThread = threads.find(t => t.type === 'main')
  if (!mainThread) return []

  // Fusionner tous les messages de tous les fils triés par heure
  const allMessages = []
  for (const t of threads) {
    for (const m of (t.messages ?? [])) {
      allMessages.push({ ...m, thread: t })
    }
  }
  allMessages.sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''))

  const steps = []

  for (const msg of allMessages) {
    const contact    = msg.thread.character_name ?? 'Inconnu'
    const time       = msg.sentAt ?? '09:41'
    const isSticker  = isStickerText(msg.text)
    const isVocal    = !isSticker && isVocalText(msg.text)
    const correction = !isSticker && !isVocal
      ? (msg.text ?? '').trim().match(CORRECTION_RE)
      : null

    const effectiveText = correction ? correction[2] : msg.text   // version finale si correction
    const effectiveLen  = effectiveText?.length ?? 0
    const typingMs      = isSticker ? 1200
      : Math.min(3000, Math.max(800, effectiveLen * 40))
    const readMs        = isVocal
      ? Math.max(1500, vocalDuration(msg.text) * 1000 + 800)
      : isSticker ? 1500
      : Math.min(4000, Math.max(1500, effectiveLen * 55))

    if (isSticker) {
      const filename = stickerFilename(msg.text)
      const url      = getLocalUrl(filename) ?? ''
      if (msg.side === 'incoming') {
        steps.push(step('typingIndicator', { duration: typingMs, characterName: contact }))
      }
      steps.push(step('writeMessage', {
        side:          msg.side,
        msgType:       'sticker',
        attachmentUrl: url,
        characterName: msg.side === 'incoming' ? contact : '',
        time,
      }))
    } else if (isVocal) {
      const dur = vocalDuration(msg.text)
      if (msg.side === 'incoming') {
        steps.push(step('typingIndicator', { duration: Math.max(1500, Math.round(dur * 800)), characterName: contact }))
      }
      steps.push(step('writeMessage', {
        side:          msg.side,
        msgType:       'vocal',
        duration:      dur,
        characterName: msg.side === 'incoming' ? contact : '',
        time,
      }))
    } else {
      // Texte (ou version corrigée finale)
      if (msg.side === 'incoming') {
        steps.push(step('typingIndicator', { duration: typingMs, characterName: contact }))
      }
      steps.push(step('writeMessage', {
        side:          msg.side,
        msgType:       'text',
        text:          effectiveText,
        characterName: msg.side === 'incoming' ? contact : '',
        time,
      }))
    }

    steps.push(step('wait', { duration: readMs }))
  }

  return steps
}

function stepLabel(step) {
  switch (step.type) {
    case 'writeMessage':
      if (step.msgType === 'sticker') return `Sticker — ${step.side === 'outgoing' ? '→' : '←'} ${step.characterName || ''}`
      if (step.msgType === 'photo')   return `Photo — ${step.side === 'outgoing' ? '→' : '←'} ${step.characterName || ''}`
      if (step.msgType === 'vocal')   return `Vocal ${step.duration ?? 0}s — ${step.side === 'outgoing' ? '→' : '←'}`
      return `"${(step.text ?? '').slice(0, 28) || '…'}" — ${step.side === 'outgoing' ? '→' : '←'} ${step.characterName || ''}`
    case 'typingIndicator':
      return `Frappe… ${((step.duration ?? 1000) / 1000).toFixed(1)}s`
    case 'wait':
      return `Pause ${((step.duration ?? 1000) / 1000).toFixed(1)}s`
    default:
      return step.type
  }
}

// ─── Panneau gauche — timeline ────────────────────────────────────────────────

function StepList({ steps, selectedId, onSelect, onDelete, onMoveUp, onMoveDown, playIdx }) {
  if (steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300 text-xs px-4 text-center">
        Ajoutez des actions depuis le panneau de droite
      </div>
    )
  }

  const typeColor = id => STEP_TYPES.find(t => t.id === id)?.color ?? '#8E8E93'

  return (
    <div className="flex-1 overflow-y-auto">
      {steps.map((step, i) => {
        const isPlaying = playIdx === i
        const isSelected = selectedId === step.id
        return (
          <div
            key={step.id}
            onClick={() => onSelect(step.id)}
            className={`group flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
              isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
            } ${isPlaying ? 'ring-1 ring-inset ring-green-400' : ''}`}
          >
            {/* Numéro + couleur */}
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: typeColor(step.type) }}>
              {i + 1}
            </span>

            {/* Label */}
            <span className="flex-1 text-xs text-gray-700 truncate">{stepLabel(step)}</span>

            {/* Actions (visibles au hover ou sélection) */}
            <div className={`flex items-center gap-0.5 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <button onClick={e => { e.stopPropagation(); onMoveUp(i) }} disabled={i === 0}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded">
                <ArrowUpIcon size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onMoveDown(i) }} disabled={i === steps.length - 1}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded">
                <ArrowDownIcon size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(step.id) }}
                className="p-1 text-red-300 hover:text-red-500 rounded">
                <TrashIcon size={11} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Panneau droit — formulaire d'ajout ──────────────────────────────────────

function AddPanel({ onAdd }) {
  const [actionType, setActionType] = useState('writeMessage')
  // writeMessage
  const [side,          setSide]          = useState('outgoing')
  const [msgType,       setMsgType]       = useState('text')
  const [text,          setText]          = useState('')
  const [characterName, setCharacterName] = useState('')
  const [time,          setTime]          = useState('09:41')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [duration,      setDuration]      = useState(3)
  // typingIndicator / wait
  const [indicatorDur,  setIndicatorDur]  = useState(2000)
  const [waitDur,       setWaitDur]       = useState(1000)
  // side incoming name
  const [typingName,    setTypingName]    = useState('')

  const handleAdd = () => {
    let step = { id: uid(), type: actionType }
    if (actionType === 'writeMessage') {
      step = { ...step, side, msgType, text, characterName, time, attachmentUrl, duration }
    } else if (actionType === 'typingIndicator') {
      step = { ...step, duration: indicatorDur, characterName: typingName }
    } else if (actionType === 'wait') {
      step = { ...step, duration: waitDur }
    }
    onAdd(step)
    // Reset texte
    setText('')
    setAttachmentUrl('')
  }

  const canAdd = () => {
    if (actionType === 'writeMessage') {
      if (msgType === 'text') return text.trim().length > 0
      return attachmentUrl.trim().length > 0
    }
    return true
  }

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Ajouter une action</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Sélecteur de type */}
        <div className="flex flex-col gap-1.5">
          {STEP_TYPES.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setActionType(id)}
              className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${
                actionType === id
                  ? 'border-transparent text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={actionType === id ? { backgroundColor: color } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── writeMessage ── */}
        {actionType === 'writeMessage' && (
          <div className="flex flex-col gap-3">
            {/* Sens */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Sens</label>
              <div className="flex gap-1.5">
                {[{v:'outgoing',l:'Sortant →'},{v:'incoming',l:'← Entrant'}].map(({v,l}) => (
                  <button key={v} onClick={() => setSide(v)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                      side === v ? 'border-brand-orange bg-orange-50 text-brand-orange font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {/* Type de message */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {MSG_TYPES.map(({id, label}) => (
                  <button key={id} onClick={() => setMsgType(id)}
                    className={`text-xs py-1.5 rounded-lg border transition-colors ${
                      msgType === id ? 'border-brand-orange bg-orange-50 text-brand-orange font-semibold' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>{label}</button>
                ))}
              </div>
            </div>

            {/* Champ texte */}
            {msgType === 'text' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Texte</label>
                <textarea rows={3} value={text} onChange={e => setText(e.target.value)}
                  className={`${CLS} resize-none`} placeholder="Message…" />
              </div>
            )}

            {/* URL pour sticker / photo */}
            {(msgType === 'sticker' || msgType === 'photo') && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">URL de l'image</label>
                <input type="text" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
                  className={CLS} placeholder="https://…" />
                {attachmentUrl && (
                  <img src={attachmentUrl} alt="" className="mt-2 rounded-lg max-h-24 object-contain border border-gray-100" />
                )}
              </div>
            )}

            {/* Durée vocale */}
            {msgType === 'vocal' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Durée (secondes)</label>
                <input type="number" min={1} step={1} value={duration}
                  onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                  className={CLS} />
              </div>
            )}

            {/* Nom du personnage (entrant) */}
            {side === 'incoming' && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Nom du personnage</label>
                <input type="text" value={characterName} onChange={e => setCharacterName(e.target.value)}
                  className={CLS} placeholder="Gérante" />
              </div>
            )}

            {/* Heure */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Heure</label>
              <input type="text" value={time} onChange={e => setTime(e.target.value)}
                className={CLS} placeholder="09:41" />
            </div>
          </div>
        )}

        {/* ── typingIndicator ── */}
        {actionType === 'typingIndicator' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Nom du personnage</label>
              <input type="text" value={typingName} onChange={e => setTypingName(e.target.value)}
                className={CLS} placeholder="Gérante" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Durée (ms)</label>
              <input type="number" min={500} step={100} value={indicatorDur}
                onChange={e => setIndicatorDur(Math.max(100, Number(e.target.value)))}
                className={CLS} />
            </div>
          </div>
        )}

        {/* ── wait ── */}
        {actionType === 'wait' && (
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Durée (ms)</label>
            <input type="number" min={100} step={100} value={waitDur}
              onChange={e => setWaitDur(Math.max(100, Number(e.target.value)))}
              className={CLS} />
          </div>
        )}
      </div>

      {/* Bouton Ajouter */}
      <div className="p-4 border-t border-gray-100 shrink-0">
        <button
          onClick={handleAdd}
          disabled={!canAdd()}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: '#d9571d' }}
        >
          <PlusIcon size={14} weight="bold" />
          Ajouter
        </button>
      </div>
    </aside>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function TransparentEdition({ onChangeMode }) {
  const { id: storyId } = useParams()
  const [steps,        setSteps]        = useState([])
  const [selectedId,   setSelectedId]   = useState(null)
  const [bubbles,      setBubbles]      = useState([])
  const [isTyping,     setIsTyping]     = useState(false)
  const [typingName,   setTypingName]   = useState('')
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [playIdx,      setPlayIdx]      = useState(null)
  const [isExporting,  setIsExporting]  = useState(false)
  const [exportMsg,    setExportMsg]    = useState('')
  const [exportModal,  setExportModal]  = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError,     setGenError]     = useState(null)
  const [glass,        setGlass]        = useState(false)
  const timerRef   = useRef(null)
  const captureRef = useRef(null)

  // ── Génération depuis l'histoire ──────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!storyId) return
    if (steps.length > 0 && !window.confirm('Remplacer la timeline actuelle par la scène générée ?')) return
    setIsGenerating(true)
    setGenError(null)
    // Réinitialise le player
    clearTimeout(timerRef.current)
    setIsPlaying(false)
    setPlayIdx(null)
    setBubbles([])
    setIsTyping(false)
    setTypingName('')
    try {
      const threads   = await getThreads(storyId)
      const generated = generateTransparentScene(threads ?? [])
      if (generated.length === 0) {
        setGenError('Aucun message trouvé dans cette histoire.')
      } else {
        setSteps(generated)
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }, [storyId, steps.length])

  // ── Gestion de la liste ────────────────────────────────────────────────────

  const addStep = useCallback(step => {
    setSteps(prev => [...prev, step])
  }, [])

  const deleteStep = useCallback(id => {
    setSteps(prev => prev.filter(s => s.id !== id))
  }, [])

  const moveUp = useCallback(i => {
    setSteps(prev => {
      if (i === 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }, [])

  const moveDown = useCallback(i => {
    setSteps(prev => {
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }, [])

  // ── Lecture ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    clearTimeout(timerRef.current)
    setIsPlaying(false)
    setPlayIdx(null)
    setBubbles([])
    setIsTyping(false)
    setTypingName('')
  }, [])

  const play = useCallback((onComplete) => {
    if (isPlaying) { reset(); return }
    if (steps.length === 0) return
    setBubbles([])
    setIsTyping(false)
    setIsPlaying(true)

    const snap = steps
    const playNext = (idx) => {
      if (idx >= snap.length) {
        setIsPlaying(false)
        setPlayIdx(null)
        setIsTyping(false)
        onComplete?.()
        return
      }
      setPlayIdx(idx)
      const step = snap[idx]

      switch (step.type) {
        case 'typingIndicator':
          setIsTyping(true)
          setTypingName(step.characterName ?? '')
          timerRef.current = setTimeout(() => {
            setIsTyping(false)
            playNext(idx + 1)
          }, step.duration ?? 1000)
          break

        case 'writeMessage':
          setIsTyping(false)
          setBubbles(prev => [...prev, {
            id:            step.id,
            side:          step.side,
            type:          step.msgType,
            text:          step.text,
            time:          step.time,
            characterName: step.characterName,
            attachmentUrl: step.attachmentUrl,
            duration:      step.duration,
            status:        step.side === 'outgoing' ? 'read' : undefined,
            isNew:         true,
          }])
          timerRef.current = setTimeout(() => playNext(idx + 1), 400)
          break

        case 'wait':
          timerRef.current = setTimeout(() => playNext(idx + 1), step.duration ?? 1000)
          break

        default:
          playNext(idx + 1)
      }
    }

    playNext(0)
  }, [isPlaying, steps, reset])

  // ─── Damier (fond transparent visuel) ────────────────────────────────────

  const checkerStyle = {
    backgroundImage: `
      linear-gradient(45deg, #ccc 25%, transparent 25%),
      linear-gradient(-45deg, #ccc 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #ccc 75%),
      linear-gradient(-45deg, transparent 75%, #ccc 75%)
    `,
    backgroundSize:     '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor:    '#e8e8e8',
  }

  return (
    <div className="flex overflow-hidden" style={{ height: `calc(100vh - ${NAV_H}px)` }}>

      {/* ── Panneau gauche — timeline ── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Timeline</p>
            {onChangeMode && (
              <button onClick={onChangeMode} title="Changer de mode"
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
                <ArrowsClockwiseIcon size={13} />
              </button>
            )}
          </div>

          {/* Bouton de génération depuis l'histoire */}
          {storyId && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#fff5ee', color: '#d9571d', border: '1.5px solid #f9c09a' }}
            >
              {isGenerating
                ? <SpinnerGapIcon size={12} className="animate-spin" />
                : <FilmSlateIcon size={12} weight="bold" />}
              {isGenerating ? 'Génération…' : 'Générer depuis l\'histoire'}
            </button>
          )}
          {genError && (
            <p className="text-[10px] text-red-500 mt-1 text-center">{genError}</p>
          )}
        </div>

        <StepList
          steps={steps}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={deleteStep}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          playIdx={playIdx}
        />

        {/* Contrôles lecture */}
        <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={() => play()}
            disabled={steps.length === 0}
            className="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: isPlaying ? '#FF3B30' : '#25D366' }}
          >
            <PlayIcon size={12} weight="fill" />
            {isPlaying ? 'Arrêter' : 'Lire'}
          </button>
          <button
            onClick={reset}
            disabled={steps.length === 0}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
          >
            <ArrowsClockwiseIcon size={14} />
          </button>
        </div>
      </aside>

      {/* ── Centre — preview ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 overflow-hidden"
        style={checkerStyle}>
        {/* Barre de contrôle preview */}
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-semibold text-gray-500 bg-white/80 rounded-full px-3 py-1 shadow-sm">
            Mode Transparent · 390 × 844
          </div>
          {/* Toggle Normal / Glass */}
          <button
            onClick={() => setGlass(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold shadow-sm transition-all"
            style={glass
              ? { background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.85)', border: '1px solid #e5e7eb', color: '#555' }
            }
          >
            {glass ? '✦ Glass' : '◻ Normal'}
          </button>
        </div>

        <TransparentConversation
          bubbles={bubbles}
          isTyping={isTyping}
          typingName={typingName}
          captureRef={captureRef}
          glass={glass}
        />
        {/* Bouton export */}
        <button
          onClick={() => setExportModal(true)}
          disabled={isExporting || steps.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 shadow-md"
          style={{ backgroundColor: '#1c1c1e' }}
        >
          {isExporting
            ? <SpinnerGapIcon size={13} className="animate-spin" />
            : <DownloadSimpleIcon size={13} weight="bold" />}
          {isExporting ? (exportMsg || '…') : 'Exporter transparent'}
        </button>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <AddPanel onAdd={addStep} />

      {/* ── Modal export ── */}
      {exportModal && !isExporting && (
        <ExportModal
          onClose={() => setExportModal(false)}
          onExport={async (format) => {
            setExportModal(false)
            setIsExporting(true)
            setExportMsg('Connexion au serveur…')
            const ext = format === 'prores' ? 'mov' : 'webm'

            try {
              // 1. Démarre le job — le serveur répond immédiatement avec { jobId }
              const startRes = await fetch('http://localhost:3001/export-transparent', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ steps, format, glass }),
              })
              if (!startRes.ok) {
                const err = await startRes.json().catch(() => ({ error: startRes.statusText }))
                throw new Error(err.error ?? 'Erreur serveur')
              }
              const { jobId } = await startRes.json()

              // 2. Écoute la progression via SSE
              await new Promise((resolve, reject) => {
                const evtSource = new EventSource(
                  `http://localhost:3001/export-transparent/progress/${jobId}`
                )
                evtSource.onmessage = (e) => {
                  const data = JSON.parse(e.data)
                  if (data.type === 'progress') {
                    setExportMsg(data.message)
                  } else if (data.type === 'done') {
                    evtSource.close()
                    resolve()
                  } else if (data.type === 'error') {
                    evtSource.close()
                    reject(new Error(data.message))
                  }
                }
                evtSource.onerror = () => {
                  evtSource.close()
                  reject(new Error('Connexion SSE perdue'))
                }
              })

              // 3. Téléchargement du fichier final
              setExportMsg('Téléchargement en cours…')
              const a = document.createElement('a')
              a.href     = `http://localhost:3001/export-transparent/download/${jobId}`
              a.download = `transparent.${ext}`
              a.click()

            } catch (err) {
              console.error('[export-transparent]', err)
              setExportMsg(`Erreur : ${err.message}`)
              await new Promise(r => setTimeout(r, 3000))
            } finally {
              setIsExporting(false)
              setExportMsg('')
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Modal de sélection du format d'export ────────────────────────────────────

function ExportModal({ onClose, onExport }) {
  const FORMATS = [
    {
      id:    'webm',
      label: 'WebM VP9',
      ext:   '.webm',
      desc:  'Canal alpha supporté. Compatible Premiere, DaVinci Resolve, After Effects. Fichier léger.',
      color: '#5856D6',
    },
    {
      id:    'prores',
      label: 'ProRes 4444',
      ext:   '.mov',
      desc:  'Format professionnel avec alpha. Qualité maximale pour la post-production. Fichier volumineux.',
      color: '#d9571d',
    },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', width: 440,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', marginBottom: 2 }}>Format d'export</p>
            <p style={{ fontSize: 12, color: '#8E8E93' }}>Choisissez le format avec canal alpha</p>
          </div>
          <button onClick={onClose} style={{ color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <XIcon size={18} />
          </button>
        </div>

        {FORMATS.map(({ id, label, ext, desc, color }) => (
          <button
            key={id}
            onClick={() => onExport(id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left',
              padding: '16px 18px', borderRadius: 14,
              border: `1.5px solid ${color}33`,
              backgroundColor: `${color}0d`,
              cursor: 'pointer', transition: 'background-color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${color}1a` }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${color}0d` }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DownloadSimpleIcon size={18} color="#fff" weight="bold" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1c1c1e', marginBottom: 2 }}>
                {label} <span style={{ fontSize: 11, color: '#8E8E93', fontWeight: 400 }}>{ext}</span>
              </p>
              <p style={{ fontSize: 12, color: '#636366', lineHeight: 1.5 }}>{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
