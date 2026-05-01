import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PlusIcon, TrashIcon, SpinnerIcon,
  PlayIcon, PauseIcon, ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react'
import {
  ACTION_CATEGORIES,
  actionsForScreen,
  getAction,
  defaultParams,
  estimateDuration,
} from '../../engine/actions.js'
import { getStoryWorkflow, updateStory, getThreads } from '../../lib/supabase.js'
import { isStickerText, stickerFilename, isVocalText, vocalPath, vocalDuration, isPhotoText, photoPath } from '../Histoires/DesktopHistoireDetail.jsx'
import { LOCAL_STICKERS, getLocalUrl } from '../../lib/stickers.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BLK_W = 64

// Contacts fictifs pour étoffer la liste de discussions
const FICTIONAL_CONTACTS = [
  { name: 'Sophie Martin',   avatarColor: '#E17055', time: '09:12', lastMessage: "Bonjour docteur !",      unread: 0, isOnline: false },
  { name: 'Marc Dupont',     avatarColor: '#74B9FF', time: '08:45', lastMessage: "C'est noté, merci.",     unread: 0, isOnline: false },
  { name: 'Amina Baldé',    avatarColor: '#55EFC4', time: '08:30', lastMessage: "Ok parfait 👍",           unread: 0, isOnline: false },
  { name: 'Jean-Paul M.',    avatarColor: '#A29BFE', time: '07:55', lastMessage: "À demain !",              unread: 0, isOnline: false },
  { name: 'Fatou Kouyaté',  avatarColor: '#FDCB6E', time: '07:20', lastMessage: "Je comprends.",           unread: 0, isOnline: false },
  { name: 'Pierre Leblanc', avatarColor: '#FD79A8', time: 'hier',  lastMessage: "D'accord.",               unread: 0, isOnline: false },
  { name: 'Nadia Ould',     avatarColor: '#00B894', time: 'hier',  lastMessage: "Merci beaucoup.",         unread: 0, isOnline: false },
  { name: 'Thomas B.',      avatarColor: '#6C5CE7', time: 'hier',  lastMessage: "Je vais voir.",           unread: 0, isOnline: false },
  { name: 'Isabelle Roy',   avatarColor: '#B2BEC3', time: 'lun.',  lastMessage: "Bonne continuation !",   unread: 0, isOnline: false },
]

const SCREEN_META = {
  LockScreen:           { icon: '🔒', label: 'Verrouillé'  },
  HomeScreen:           { icon: '📱', label: 'Accueil'      },
  WhatsAppDiscussions:  { icon: '💬', label: 'Discussions'  },
  WhatsAppConversation: { icon: '🗨️', label: 'Conversation' },
  WhatsAppKeyboard:     { icon: '⌨️', label: 'Clavier'      },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMs(ms) {
  if (!ms || ms < 1000) return `${Math.round(ms || 0)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function uid() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function computeScreens(steps) {
  const out = []
  let cur = 'LockScreen'
  for (const s of steps) {
    out.push(cur)
    const a = getAction(s.actionId)
    if (a?.nextScreen) cur = a.nextScreen
  }
  return out
}

function screenAfterIndex(steps, screens, i) {
  if (i < 0 || steps.length === 0) return 'LockScreen'
  const a = getAction(steps[i].actionId)
  return a?.nextScreen ?? screens[i] ?? 'LockScreen'
}

function stepDur(step) {
  return step.durationMs ?? estimateDuration(step.actionId, step.payload)
}

function stepW(step, pxPerSec) {
  return Math.max(MIN_BLK_W, (stepDur(step) / 1000) * pxPerSec)
}

function makeStep(actionId) {
  return { id: uid(), actionId, payload: defaultParams(actionId), durationMs: null, note: '' }
}

// ─── ActionPicker ─────────────────────────────────────────────────────────────

function ActionPicker({ screen, onAdd, onClose }) {
  const actions = actionsForScreen(screen)
  const grouped = actions.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[480px] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Ajouter une action</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {SCREEN_META[screen]?.icon} {SCREEN_META[screen]?.label ?? screen}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {Object.entries(grouped).map(([cat, acts]) => {
            const { label, color } = ACTION_CATEGORIES[cat]
            return (
              <div key={cat}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {acts.map(a => (
                    <button
                      key={a.id}
                      onClick={() => onAdd(a.id)}
                      className="text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                    >
                      <div className="text-xs font-semibold text-gray-900 mb-0.5">{a.label}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{a.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Sélecteur sticker compact (utilisé dans StepConfigPanel) ────────────────

const SHUFFLED_FOR_PANEL = [...LOCAL_STICKERS].sort(() => Math.random() - 0.5)

function StickerParamPicker({ value, onChange }) {
  const selectedRef = useRef(null)

  useEffect(() => {
    if (value && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [value])

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      {/* Aperçu sticker sélectionné */}
      {value && (
        <div style={{
          padding: '5px 8px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <img
            src={getLocalUrl(value) ?? ''}
            alt=""
            style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{ fontSize: 10, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
            {value}
          </span>
        </div>
      )}
      {/* Grille scrollable — ordre aléatoire, 4 colonnes */}
      <div style={{ maxHeight: 136, overflowY: 'auto', padding: 4, backgroundColor: '#ffffff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {SHUFFLED_FOR_PANEL.map(s => {
            const selected = value === s.name
            return (
              <button
                key={s.name}
                ref={selected ? selectedRef : null}
                onClick={() => onChange(s.name)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 5,
                  backgroundColor: selected ? 'rgba(37,211,102,0.15)' : 'transparent',
                  border: `1.5px solid ${selected ? '#25D366' : 'transparent'}`,
                  padding: 2,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <img
                  src={s.url}
                  alt={s.name}
                  onError={e => { e.currentTarget.src = getLocalUrl(s.name) ?? '' }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── StepConfigPanel ──────────────────────────────────────────────────────────

function StepConfigPanel({ step, onChange, onDelete }) {
  const action = getAction(step.actionId)
  if (!action) return null
  const { color } = ACTION_CATEGORIES[action.category] ?? {}
  const estDur = estimateDuration(step.actionId, step.payload)
  const CLS = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-orange bg-white'

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold text-gray-900 flex-1 truncate">{action.label}</span>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
        >
          <TrashIcon size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Durée (ms)
            <span className="normal-case font-normal text-gray-400 ml-1">— auto : {estDur}ms</span>
          </label>
          <input
            type="number" min={50} step={50}
            placeholder={String(estDur)}
            value={step.durationMs ?? ''}
            onChange={e => onChange({ durationMs: e.target.value !== '' ? Number(e.target.value) : null })}
            className={CLS}
          />
        </div>
        {Object.keys(action.params).length > 0 && (
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
            {Object.entries(action.params).map(([key, schema]) => (
              <div key={key}>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                  {schema.label}
                  {schema.required && <span className="text-red-400 ml-0.5 normal-case font-normal"> *</span>}
                </label>
                {schema.type === 'sticker' ? (
                  <StickerParamPicker
                    value={step.payload[key] ?? ''}
                    onChange={v => onChange({ payload: { ...step.payload, [key]: v } })}
                  />
                ) : schema.type === 'textarea' ? (
                  <textarea rows={3} value={step.payload[key] ?? ''} onChange={e => onChange({ payload: { ...step.payload, [key]: e.target.value } })} className={CLS + ' resize-none'} />
                ) : schema.type === 'select' ? (
                  <select value={step.payload[key] ?? schema.default ?? ''} onChange={e => onChange({ payload: { ...step.payload, [key]: e.target.value } })} className={CLS}>
                    {schema.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : schema.type === 'number' ? (
                  <input type="number" min={schema.min ?? 0} step={schema.step ?? 1} value={step.payload[key] ?? schema.default ?? 0} onChange={e => onChange({ payload: { ...step.payload, [key]: Number(e.target.value) } })} className={CLS} />
                ) : (
                  <input type="text" value={step.payload[key] ?? ''} onChange={e => onChange({ payload: { ...step.payload, [key]: e.target.value } })} className={CLS} />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-gray-100">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">Note</label>
          <textarea rows={2} value={step.note ?? ''} onChange={e => onChange({ note: e.target.value })} placeholder="Note de mise en scène…" className={CLS + ' resize-none'} />
        </div>
      </div>
    </div>
  )
}

// ─── InsertZone ───────────────────────────────────────────────────────────────

function InsertZone({ afterIndex, onInsert }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onInsert(afterIndex)}
      style={{
        width: hov ? 22 : 6, flexShrink: 0, cursor: 'pointer', position: 'relative',
        transition: 'width 140ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {hov && (
        <>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, backgroundColor: '#d9571d', borderRadius: 1, transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', backgroundColor: '#d9571d', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(217,87,29,0.4)' }}>
            <PlusIcon size={9} color="#fff" weight="bold" />
          </div>
        </>
      )}
    </div>
  )
}

// ─── TimelineBlock ────────────────────────────────────────────────────────────

function TimelineBlock({ step, screen, index, isSelected, isPlaying, pxPerSec, onSelect, onResize }) {
  const action    = getAction(step.actionId)
  const color     = ACTION_CATEGORIES[action?.category]?.color ?? '#8E8E93'
  const dur       = stepDur(step)
  const w         = stepW(step, pxPerSec)
  const resizeRef = useRef({ dragging: false, startX: 0, startDur: 0 })
  const meta      = SCREEN_META[screen]

  const onResizeStart = (e) => {
    e.stopPropagation(); e.preventDefault()
    resizeRef.current = { dragging: true, startX: e.clientX, startDur: dur }
    const onMove = (ev) => {
      if (!resizeRef.current.dragging) return
      const delta  = ev.clientX - resizeRef.current.startX
      const newDur = Math.max(100, Math.round(resizeRef.current.startDur + (delta / pxPerSec) * 1000))
      onResize(index, newDur)
    }
    const onUp = () => {
      resizeRef.current.dragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onClick={() => onSelect(isSelected ? null : index)}
      style={{
        width: w, flexShrink: 0, position: 'relative', borderRadius: 8,
        backgroundColor: isPlaying ? `${color}35` : isSelected ? `${color}25` : `${color}12`,
        border:    `1px solid ${isPlaying ? color : isSelected ? color : color + '50'}`,
        borderTop: `3px solid ${color}`,
        cursor: 'pointer', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        padding: '5px 22px 5px 8px',
        transition: 'background-color 120ms',
        userSelect: 'none', minWidth: MIN_BLK_W,
        outline: isPlaying ? `2px solid ${color}` : 'none',
        outlineOffset: 1,
      }}
    >
      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta?.icon} {meta?.label ?? screen}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {action?.label ?? step.actionId}
      </div>
      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.38)', marginTop: 'auto', paddingTop: 3 }}>{fmtMs(dur)}</div>
      <div
        onMouseDown={onResizeStart}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 14, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 3, height: 18, backgroundColor: `${color}55`, borderRadius: 2 }} />
      </div>
    </div>
  )
}

// ─── TimelineRuler ────────────────────────────────────────────────────────────

function TimelineRuler({ steps, pxPerSec }) {
  const totalMs = steps.reduce((acc, s) => acc + stepDur(s), 0)
  const trackW  = steps.reduce((acc, s) => acc + stepW(s, pxPerSec), 0) + steps.length * 6 + 80
  const tickMs  = pxPerSec >= 250 ? 500 : pxPerSec >= 100 ? 1000 : 2000
  const ticks   = []
  for (let t = 0; t <= totalMs + tickMs; t += tickMs) {
    const x = totalMs > 0 ? (t / totalMs) * (trackW - 80) : (t / 1000) * pxPerSec
    ticks.push({ t, x })
  }
  return (
    <div style={{ height: 20, position: 'relative', width: trackW, flexShrink: 0 }}>
      {ticks.map(({ t, x }) => (
        <div key={t} style={{ position: 'absolute', left: x, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 1, height: 6, backgroundColor: '#d1d5db' }} />
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap' }}>{fmtMs(t)}</div>
        </div>
      ))}
    </div>
  )
}

// ─── DialogueView ─────────────────────────────────────────────────────────────

const STATUS_LABEL = { sent: '✓', delivered: '✓✓', read: '✓✓' }

function StickerThumb({ filename, size = 72 }) {
  if (!filename) return null
  return (
    <img
      src={getLocalUrl(filename) ?? ''}
      alt="sticker"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  )
}

function Avatar({ name, color, size = 28 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-full text-white font-bold select-none"
      style={{ width: size, height: size, backgroundColor: color ?? '#8E8E93', fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

function DialogueView({ threads = [] }) {
  const total = threads.reduce((n, t) => n + (t.messages?.length ?? 0), 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Dialogue</h2>
        <span className="text-xs text-gray-400">
          {total} message{total !== 1 ? 's' : ''} · {threads.length} fil{threads.length !== 1 ? 's' : ''}
        </span>
      </div>

      {threads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 select-none">
          <div className="text-3xl">💬</div>
          <p className="text-sm">Aucun dialogue dans cette histoire</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {threads.map((thread, ti) => {
            const msgs = thread.messages ?? []
            const isMain = thread.type === 'main'
            return (
              <div key={thread.id}>
                {/* Séparateur de fil */}
                <div className="flex items-center gap-3 px-6 py-3 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  {thread.character_color
                    ? <Avatar name={thread.character_name} color={thread.character_color} size={26} />
                    : <div className="w-6 h-6 rounded-full bg-gray-200" />
                  }
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {thread.character_name ?? 'Fil sans personnage'}
                    </span>
                    {isMain && (
                      <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-brand-orange">
                        principal
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-300">{msgs.length} msg</span>
                </div>

                {/* Messages du fil */}
                {msgs.length === 0 ? (
                  <div className="px-6 pb-6 text-xs text-gray-300 italic">Aucun message</div>
                ) : (
                  <div className="px-6 pb-6 flex flex-col gap-2">
                    {msgs.map(m => {
                      const isOut       = m.side === 'outgoing'
                      const isSticker   = isStickerText(m.text)
                      const isVocal     = !isSticker && isVocalText(m.text)
                      const isPhotoMsg  = !isSticker && !isVocal && isPhotoText(m.text)
                      const filename    = isSticker ? stickerFilename(m.text) : null
                      const correction  = !isSticker && !isVocal && !isPhotoMsg ? parseCorrectionText(m.text) : null
                      const displayText = correction
                        ? `[🚫 ${correction.before}] → ${correction.after}`
                        : isVocal
                          ? `🎤 Note vocale (${fmtMs(vocalDuration(m.text) * 1000)})`
                          : isPhotoMsg
                            ? '📷 Photo'
                            : m.text
                      return (
                        <div key={m.id} className={`flex items-end gap-2 ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                          {!isOut && (
                            <Avatar name={thread.character_name} color={thread.character_color} size={24} />
                          )}
                          {isSticker ? (
                            /* ── Bulle sticker ── */
                            <div className="flex flex-col" style={{ alignItems: isOut ? 'flex-end' : 'flex-start' }}>
                              <StickerThumb filename={filename} size={72} />
                              <span className="text-[10px] text-gray-400 mt-0.5 px-0.5">{m.sentAt}</span>
                            </div>
                          ) : (
                            /* ── Bulle texte ── */
                            <div
                              className="max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed"
                              style={{
                                borderRadius: isOut ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
                                backgroundColor: isOut ? '#E8FAF0' : '#F5F5F5',
                                color: '#1a1a1a',
                              }}
                            >
                              <p className="whitespace-pre-wrap">{displayText}</p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-400">{m.sentAt}</span>
                                {isOut && (
                                  <span
                                    className="text-[10px] font-medium"
                                    style={{ color: m.status === 'read' ? '#53BDEB' : '#9ca3af' }}
                                  >
                                    {STATUS_LABEL[m.status] ?? '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {ti < threads.length - 1 && (
                  <div className="mx-6 border-t border-gray-100 mb-1" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Générateur de scène improvisée ──────────────────────────────────────────

function buildConversationList(threads) {
  // Vrais personnages des fils en tête (fil principal d'abord)
  const real = [...threads]
    .sort((a, b) => (a.type === 'main' ? -1 : b.type === 'main' ? 1 : 0))
    .map(t => {
      const msgs    = t.messages ?? []
      const last    = msgs.at(-1)
      const firstIn = msgs.find(m => m.side === 'incoming')
      const rawPreview = last?.text || firstIn?.text || null
      const preview = rawPreview
        ? isStickerText(rawPreview)
          ? '🖼 Sticker'
          : isVocalText(rawPreview)
            ? '🎤 Note vocale'
            : isPhotoText(rawPreview)
              ? '📷 Photo'
              : (parseCorrectionText(rawPreview)?.after ?? rawPreview)
        : null
      // Le fil principal démarre sans aperçu : la scène affichera les messages au fur et à mesure
      const isMain = t.type === 'main'
      return {
        id:             t.id,
        name:           t.character_name ?? 'Inconnu',
        avatarColor:    t.character_color ?? '#8E8E93',
        followers:      t.character_followers ?? 0,
        lastMessage:    isMain ? '' : (preview ?? 'Appuyer pour ouvrir'),
        time:           isMain ? '' : (last?.sentAt ?? ''),
        unread:         isMain && msgs.some(m => m.side === 'incoming') ? 1 : 0,
        isOnline:       isMain,
        isOutgoing:     !isMain && last?.side === 'outgoing',
        outgoingStatus: !isMain && last?.side === 'outgoing' ? (last?.status ?? 'delivered') : undefined,
      }
    })

  // Compléter avec des contacts fictifs jusqu'à ~10
  const needed = Math.max(0, 10 - real.length)
  const fictifs = FICTIONAL_CONTACTS.slice(0, needed)

  return [...real, ...fictifs]
}

// Détecte le format [avant]:[après] — correction de message
const CORRECTION_RE = /^\[([^\]]+)\]:\[([^\]]+)\]$/

function parseCorrectionText(text) {
  const m = (text ?? '').trim().match(CORRECTION_RE)
  if (!m) return null
  return { before: m[1], after: m[2] }
}

/** Masque les 4 derniers chiffres si le nom ressemble à un numéro de téléphone */
function maskPhone(name) {
  if (!name) return 'Inconnu'
  return /^[+\d\s()./-]{7,}$/.test(name.trim())
    ? name.trimEnd().slice(0, -4) + '••••'
    : name
}

/** Délai par caractère (ms) pour que la frappe tienne en ≤ 4 s */
function writeSpeed(text) {
  const len = text?.length ?? 0
  return len === 0 ? 60 : Math.min(60, Math.floor(3820 / len))
}

function generateImprovisedScene(threads) {
  const s = (actionId, payload = {}, durationMs = null) => ({
    id: uid(), actionId,
    payload: { ...defaultParams(actionId), ...payload },
    durationMs,
    note: '',
  })

  const mainThread = threads.find(t => t.type === 'main')
  if (!mainThread) return []

  const steps = []

  // ── 1. Notification ──────────────────────────────────────────────────────────
  const firstIncoming = (mainThread.messages ?? []).find(m => m.side === 'incoming')
  steps.push(s('showNotification', {
    app:     'WhatsApp',
    sender:  maskPhone(mainThread.character_name ?? 'Inconnu'),
    message: firstIncoming
      ? isStickerText(firstIncoming.text)
        ? '🖼 Sticker'
        : isVocalText(firstIncoming.text)
          ? '🎤 Note vocale'
          : isPhotoText(firstIncoming.text)
            ? '📷 Photo'
            : (parseCorrectionText(firstIncoming.text)?.before ?? firstIncoming.text)
      : '…',
    time:    firstIncoming?.sentAt ?? 'maint.',
  }))

  steps.push(s('wait', { duration: 2000 }))

  // ── 2. Unlock + ouvrir WhatsApp ──────────────────────────────────────────────
  steps.push(s('unlock'))
  steps.push(s('tapApp'))
  steps.push(s('wait', { duration: 600 }))

  // ── 3. Scroll + ouvrir la discussion principale ───────────────────────────────
  steps.push(s('scrollTo',       { contactName: mainThread.character_name }))
  steps.push(s('tapConversation', { contactName: mainThread.character_name }))

  // ── 4. Tous les messages triés par sentAt ────────────────────────────────────
  const allMessages = []
  for (const t of threads) {
    for (const m of (t.messages ?? [])) {
      allMessages.push({ ...m, thread: t })
    }
  }
  allMessages.sort((a, b) => (a.sentAt ?? '').localeCompare(b.sentAt ?? ''))

  let currentConv  = mainThread.character_name
  let keyboardOpen = false

  for (const msg of allMessages) {
    const contact = maskPhone(msg.thread.character_name ?? 'Inconnu')

    // Changer de conversation si nécessaire
    if (contact !== currentConv) {
      if (keyboardOpen) {
        steps.push(s('dismissKeyboard'))
        keyboardOpen = false
      }
      steps.push(s('swipeBack'))
      steps.push(s('wait', { duration: 500 }))
      steps.push(s('scrollTo',        { contactName: contact }))
      steps.push(s('tapConversation', { contactName: contact }))
      currentConv = contact
    }

    // Mot-clé BLOQUER — bloque le contact immédiatement
    if ((msg.text ?? '').trim() === 'BLOQUER') {
      if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
      steps.push(s('blockContact'))
      continue   // pas de wait trailing
    }

    const isSticker    = isStickerText(msg.text)
    const isVocal      = !isSticker && isVocalText(msg.text)
    const isPhoto      = !isSticker && !isVocal && isPhotoText(msg.text)
    const correction   = !isSticker && !isVocal && !isPhoto ? parseCorrectionText(msg.text) : null
    const effectiveLen = correction
      ? Math.max((correction.before?.length ?? 0), (correction.after?.length ?? 0))
      : (msg.text?.length ?? 0)
    const vocalDurSecs = isVocal ? vocalDuration(msg.text) : 0
    const readMs    = isVocal ? Math.min(1000, Math.max(750, vocalDurSecs * 500 + 400))
                    : 1000
    const typingMs  = (isSticker || isPhoto) ? 600 : Math.min(1500, Math.max(500, effectiveLen * 20))

    if (isVocal) {
      const storagePath = vocalPath(msg.text)
      const duration    = vocalDurSecs
      if (msg.side === 'incoming') {
        steps.push(s('recordingIndicator', { duration: Math.max(2000, Math.round(vocalDurSecs * 800)) }))
        steps.push(s('receiveVocal', { storagePath, duration, characterName: contact, time: msg.sentAt ?? '09:41' }))
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
      } else {
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
        steps.push(s('sendVocal', { storagePath, duration, time: msg.sentAt ?? '09:41', status: msg.status ?? 'sent' }))
      }
    } else if (isPhoto) {
      const storagePath   = photoPath(msg.text)
      if (msg.side === 'incoming') {
        steps.push(s('typingIndicator', { duration: typingMs }))
        steps.push(s('receivePhoto', {
          storagePath,
          characterName: contact,
          time:          msg.sentAt ?? '09:41',
        }))
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
      } else {
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
        steps.push(s('sendPhoto', {
          storagePath,
          time:   msg.sentAt ?? '09:41',
          status: msg.status ?? 'sent',
        }))
      }
    } else if (isSticker) {
      const filename = stickerFilename(msg.text)
      if (msg.side === 'incoming') {
        steps.push(s('typingIndicator', { duration: typingMs }))
        steps.push(s('receiveSticker', {
          filename,
          characterName: contact,
          time:          msg.sentAt ?? '09:41',
        }))
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
      } else {
        if (keyboardOpen) { steps.push(s('dismissKeyboard')); keyboardOpen = false }
        steps.push(s('selectAndSendSticker', {
          filename,
          time:   msg.sentAt ?? '09:41',
          status: msg.status ?? 'sent',
        }))
      }
    } else if (correction) {
      // ── Format [avant]:[après] : envoyer/recevoir, supprimer, renvoyer ──
      const time   = msg.sentAt ?? '09:41'
      const status = msg.status ?? 'sent'
      const beforeTypingMs = Math.min(3000, Math.max(800, (correction.before?.length ?? 0) * 40))
      const afterTypingMs  = Math.min(3000, Math.max(800, (correction.after?.length  ?? 0) * 40))

      if (msg.side === 'incoming') {
        steps.push(s('typingIndicator', { duration: beforeTypingMs }))
        steps.push(s('receiveMessage', { text: correction.before, characterName: contact, time }))
        steps.push(s('wait', { duration: 1200 }))
        steps.push(s('deleteReceivedMessage', { bubbleIndex: -1 }))
        steps.push(s('wait', { duration: 800 }))
        steps.push(s('typingIndicator', { duration: afterTypingMs }))
        steps.push(s('receiveMessage', { text: correction.after, characterName: contact, time }))
        keyboardOpen = false
      } else {
        if (!keyboardOpen) { steps.push(s('tapInput')); keyboardOpen = true }
        steps.push(s('writeMessage', { text: correction.before, speed: writeSpeed(correction.before) }))
        steps.push(s('sendMessage',  { time, status }))
        steps.push(s('wait', { duration: 1200 }))
        steps.push(s('deleteSentMessage', { bubbleIndex: -1 }))
        steps.push(s('wait', { duration: 800 }))
        steps.push(s('tapInput'))
        steps.push(s('writeMessage', { text: correction.after, speed: writeSpeed(correction.after) }))
        steps.push(s('sendMessage',  { time, status }))
        keyboardOpen = false
      }
    } else if (msg.side === 'incoming') {
      steps.push(s('typingIndicator', { duration: typingMs }))
      steps.push(s('receiveMessage', {
        text:          msg.text,
        characterName: contact,
        time:          msg.sentAt ?? '09:41',
      }))
      keyboardOpen = false
    } else {
      if (!keyboardOpen) {
        steps.push(s('tapInput'))
        keyboardOpen = true
      }
      steps.push(s('writeMessage', { text: msg.text, speed: writeSpeed(msg.text) }))
      steps.push(s('sendMessage',  { time: msg.sentAt ?? '09:41', status: msg.status ?? 'sent' }))
      keyboardOpen = false
    }

    steps.push(s('wait', { duration: readMs }))
  }

  steps.push(s('wait', { duration: 2000 }))
  return steps
}

// ─── SceneTab (controlled) ────────────────────────────────────────────────────

export default function SceneTab({
  storyId,
  sceneSteps,    setSceneSteps,
  sceneSelIdx,   setSceneSelIdx,
  scenePlayIdx,
  sceneIsPlaying,
  onPlay,
  onReset,
  onConversationsChange,
}) {
  const [pxPerSec,  setPxPerSec]  = useState(120)
  const [pickerFor, setPickerFor] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [threads,   setThreads]   = useState([])
  const saveTimer = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!storyId) { setLoading(false); return }
    Promise.all([
      getStoryWorkflow(storyId),
      getThreads(storyId),
    ])
      .then(([wf, th]) => {
        setSceneSteps(wf.steps ?? [])
        setThreads(th ?? [])
        onConversationsChange?.(buildConversationList(th ?? []))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [storyId])

  // ── Save (debounced 800ms) ────────────────────────────────────────────────

  const saveSteps = useCallback((next) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!storyId) return
      try { await updateStory(storyId, { workflow: { steps: next } }) }
      catch { /* silent */ }
    }, 800)
  }, [storyId])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const screens  = computeScreens(sceneSteps)
  const totalMs  = sceneSteps.reduce((acc, s) => acc + stepDur(s), 0)
  const selected = sceneSelIdx !== null ? sceneSteps[sceneSelIdx] : null

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addStep = useCallback((afterIndex, actionId) => {
    const s    = makeStep(actionId)
    const next = [...sceneSteps]
    next.splice(afterIndex + 1, 0, s)
    setSceneSteps(next)
    setSceneSelIdx(afterIndex + 1)
    setPickerFor(null)
    saveSteps(next)
  }, [sceneSteps, saveSteps])

  const deleteStep = useCallback((idx) => {
    const next = sceneSteps.filter((_, i) => i !== idx)
    setSceneSteps(next)
    setSceneSelIdx(null)
    saveSteps(next)
  }, [sceneSteps, saveSteps])

  const updateSelected = useCallback((patch) => {
    if (sceneSelIdx === null) return
    const next = sceneSteps.map((s, i) => i === sceneSelIdx ? { ...s, ...patch } : s)
    setSceneSteps(next)
    saveSteps(next)
  }, [sceneSteps, sceneSelIdx, saveSteps])

  const resizeStep = useCallback((idx, newDur) => {
    const next = sceneSteps.map((s, i) => i === idx ? { ...s, durationMs: newDur } : s)
    setSceneSteps(next)
    saveSteps(next)
  }, [sceneSteps, saveSteps])

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <SpinnerIcon size={28} className="animate-spin" />
    </div>
  )
  if (error) return (
    <div className="flex-1 flex items-center justify-center text-red-500 text-sm px-8 text-center">{error}</div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Zone supérieure : dialogue + config ──────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Dialogue — toujours visible */}
        <DialogueView threads={threads} />

        {/* Config panel — glisse depuis la droite quand une étape est sélectionnée */}
        {selected && !sceneIsPlaying && (
          <StepConfigPanel
            key={selected.id}
            step={selected}
            onChange={updateSelected}
            onDelete={() => deleteStep(sceneSelIdx)}
          />
        )}
      </div>

      {/* ── Zone inférieure : timeline ────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-gray-200 flex flex-col" style={{ height: 200 }}>

        {/* Toolbar */}
        <div className="flex items-center px-3 h-9 border-b border-gray-100 gap-2 shrink-0">
          {/* Transport */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors shadow-sm shrink-0"
            title="Revenir au début"
          >
            <ArrowCounterClockwiseIcon size={12} />
          </button>
          <button
            onClick={onPlay}
            disabled={sceneSteps.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-40 shrink-0"
            style={{ backgroundColor: '#d9571d' }}
          >
            {sceneIsPlaying
              ? <><PauseIcon size={11} weight="fill" /> Pause</>
              : <><PlayIcon  size={11} weight="fill" /> {scenePlayIdx !== null ? 'Reprendre' : 'Jouer'}</>
            }
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1 shrink-0" />

          <span className="text-xs font-bold text-gray-700 shrink-0">Timeline</span>
          <span className="text-xs text-gray-400 shrink-0">
            {sceneSteps.length} étape{sceneSteps.length !== 1 ? 's' : ''} · {fmtMs(totalMs)}
          </span>

          <div className="flex items-center gap-3 ml-auto">
            {/* Scène improvisée */}
            <button
              onClick={() => {
                if (sceneIsPlaying) return
                const generated = generateImprovisedScene(threads)
                if (generated.length === 0) return
                setSceneSteps(generated)
                setSceneSelIdx(null)
                saveSteps(generated)
              }}
              disabled={sceneIsPlaying || threads.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 shrink-0"
              style={{
                borderColor: '#d9571d40',
                color: '#d9571d',
                backgroundColor: '#fff7f4',
              }}
              title="Générer automatiquement la scène depuis le dialogue"
            >
              ✦ Scène improvisée
            </button>

            <div className="w-px h-4 bg-gray-200 shrink-0" />

            {/* Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">Zoom</span>
              <input
                type="range" min={40} max={400} step={20}
                value={pxPerSec}
                onChange={e => setPxPerSec(Number(e.target.value))}
                className="w-20 accent-orange-500"
              />
              <span className="text-[10px] text-gray-400 w-8">{pxPerSec}px</span>
            </div>
          </div>
        </div>

        {/* Track */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ padding: '8px 16px 8px' }}>
          {sceneSteps.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <button
                onClick={() => setPickerFor(-1)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                <PlusIcon size={14} weight="bold" />
                Ajouter la première action
              </button>
            </div>
          ) : (
            <div className="flex items-stretch h-full">
              <div className="flex flex-col" style={{ minWidth: 'max-content' }}>
                <TimelineRuler steps={sceneSteps} pxPerSec={pxPerSec} />
                <div className="flex items-stretch flex-1 gap-0">
                  {sceneSteps.map((step, i) => (
                    <div key={step.id} className="flex items-stretch">
                      <TimelineBlock
                        step={step}
                        screen={screens[i]}
                        index={i}
                        isSelected={sceneSelIdx === i}
                        isPlaying={scenePlayIdx === i}
                        pxPerSec={pxPerSec}
                        onSelect={(idx) => { if (!sceneIsPlaying) setSceneSelIdx(idx) }}
                        onResize={resizeStep}
                      />
                      <InsertZone afterIndex={i} onInsert={setPickerFor} />
                    </div>
                  ))}
                  <button
                    onClick={() => setPickerFor(sceneSteps.length - 1)}
                    className="shrink-0 w-10 h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-300 hover:border-brand-orange hover:text-brand-orange transition-colors ml-1"
                  >
                    <PlusIcon size={13} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ActionPicker */}
      {pickerFor !== null && (
        <ActionPicker
          screen={screenAfterIndex(sceneSteps, screens, pickerFor)}
          onAdd={(actionId) => addStep(pickerFor, actionId)}
          onClose={() => setPickerFor(null)}
        />
      )}

    </div>
  )
}
