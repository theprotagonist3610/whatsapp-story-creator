import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CaretLeftIcon,
  PlusIcon,
  TrashIcon,
  CrownIcon,
  ChatCircleIcon,
  SpinnerIcon,
  UserIcon,
  FilmSlateIcon,
  StickerIcon,
  MicrophoneIcon,
  PlayIcon,
  PauseIcon,
  XIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import {
  getStory,
  getThreads,
  getCharacters,
  createThread  as dbCreateThread,
  deleteThread  as dbDeleteThread,
  createMessage as dbCreateMessage,
  updateMessage as dbUpdateMessage,
  deleteMessage as dbDeleteMessage,
  uploadVocalFile,
  getVocalBlobUrl,
  deleteVocalFile,
} from '../../lib/supabase.js'
import { LOCAL_STICKERS, getStickerUrl, getLocalUrl, listRemoteStickers } from '../../lib/stickers.js'

// ─── Helpers stickers ─────────────────────────────────────────────────────────

const STICKER_RE = /^\[sticker:(.+)\]$/

export function isStickerText(text) {
  return STICKER_RE.test(text?.trim() ?? '')
}

export function stickerFilename(text) {
  return text?.trim().match(STICKER_RE)?.[1] ?? null
}

function stickerUrl(filename) {
  return getStickerUrl(filename) ?? ''
}

// ─── Helpers vocals ───────────────────────────────────────────────────────────

const VOCAL_RE = /^\[vocal:(.+):(\d+(?:\.\d+)?)\]$/

export function isVocalText(text) {
  return VOCAL_RE.test(text?.trim() ?? '')
}

export function vocalPath(text) {
  return text?.trim().match(VOCAL_RE)?.[1] ?? null
}

export function vocalDuration(text) {
  const raw = text?.trim().match(VOCAL_RE)?.[2]
  return raw ? parseFloat(raw) : 0
}

export function vocalText(path, duration) {
  return `[vocal:${path}:${duration.toFixed(1)}]`
}

function fmtDuration(secs) {
  const s = Math.round(secs)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

async function readAudioDuration(file) {
  return new Promise((resolve) => {
    const url    = URL.createObjectURL(file)
    const audio  = new Audio(url)
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(isFinite(audio.duration) ? audio.duration : 0)
    })
    audio.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(0) })
  })
}

// ─── Mappers DB → UI ──────────────────────────────────────────────────────────

const dbToCharacter = (row) => ({
  id:          row.id,
  nom:         row.name,
  avatarColor: row.bubble_color ?? '#8E8E93',
  avatarImage: row.avatar_url   ?? null,
  isDefault:   row.is_default   ?? false,
})

const dbToMessage = (m) => ({
  id:          m.id,
  order:       m.order,
  side:        m.side,
  characterId: m.characterId ?? m.character_id ?? null,
  text:        m.text        ?? '',
  sentAt:      m.sentAt      ?? m.sent_at ?? '00:00',
  status:      m.status      ?? 'delivered',
})

const dbToThread = (row) => ({
  id:          row.id,
  type:        row.type,
  order:       row.order,
  characterId: row.character_id ?? null,
  messages:    (row.messages ?? []).map(dbToMessage),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findChar(characters, id) {
  return characters.find((c) => c.id === id) ?? null
}

function drKA(characters) {
  return characters.find((c) => c.isDefault) ?? null
}

// ─── Avatar mini ──────────────────────────────────────────────────────────────

function AvatarMini({ personnage, size = 32 }) {
  const initials = personnage?.nom
    ?.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('') ?? '?'

  if (personnage?.avatarImage) {
    return <img src={personnage.avatarImage} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: personnage?.avatarColor ?? '#8E8E93',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ─── Dialogue sélection stickers ─────────────────────────────────────────────

function StickerPicker({ onSelect, onClose }) {
  const [stickers, setStickers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)   // string | null
  const [query,    setQuery]    = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    listRemoteStickers()
      .then(list => {
        if (list.length === 0) throw new Error('Bucket vide ou inaccessible')
        setStickers(list)
      })
      .catch(err => {
        setError(err.message ?? 'Bucket distant inaccessible')
        setStickers([])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? stickers.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : stickers

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 520, height: 480 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
          <StickerIcon size={18} className="text-brand-orange shrink-0" />
          <span className="text-sm font-bold text-gray-900 flex-1">Stickers</span>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <MagnifyingGlassIcon size={13} className="text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Rechercher…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="text-xs bg-transparent outline-none w-28 text-gray-700 placeholder:text-gray-400"
            />
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <SpinnerIcon size={24} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
              <span className="text-2xl">⚠️</span>
              <span className="text-sm font-semibold text-red-500">Bucket distant inaccessible</span>
              <span className="text-xs text-gray-400">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Aucun résultat
            </div>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {filtered.map(s => (
                <button
                  key={s.name}
                  onClick={() => onSelect(s.name)}
                  className="aspect-square rounded-xl hover:bg-brand-orange/10 hover:scale-105 transition-all flex items-center justify-center p-1.5 border border-transparent hover:border-brand-orange/30"
                >
                  <img
                    src={s.url}
                    alt={s.name}
                    onError={e => { e.currentTarget.src = getLocalUrl(s.name) ?? '' }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Bulle vocale ─────────────────────────────────────────────────────────────

// Waveform statique décorative (barres aléatoires fixées à la construction)
const BARS = Array.from({ length: 28 }, (_, i) => {
  const heights = [0.3,0.5,0.8,0.6,0.4,0.9,0.7,0.5,0.3,0.6,0.8,0.4,0.7,0.5,
                   0.9,0.6,0.3,0.8,0.5,0.7,0.4,0.6,0.3,0.9,0.5,0.7,0.4,0.6]
  return heights[i % heights.length]
})

function VocalBubble({ message, isOut, onUpdate, onDelete }) {
  const [playing,    setPlaying]    = useState(false)
  const [signedUrl,  setSignedUrl]  = useState(null)
  const [urlLoading, setUrlLoading] = useState(false)
  const [progress,   setProgress]   = useState(0)  // 0..1
  const audioRef                    = useRef(null)
  const blobUrlRef                  = useRef(null)
  const path                        = vocalPath(message.text)
  const duration                    = vocalDuration(message.text)

  // Révoquer la blob URL à la destruction pour éviter les fuites mémoire
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }
  }, [])

  // Charger l'URL signée à la première demande de lecture
  const ensureUrl = useCallback(async () => {
    if (signedUrl) return signedUrl
    setUrlLoading(true)
    try {
      const url = await getVocalBlobUrl(path)
      blobUrlRef.current = url
      setSignedUrl(url)
      return url
    } finally {
      setUrlLoading(false)
    }
  }, [signedUrl, path])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.src || audio.src === window.location.href) {
      const url = await ensureUrl()
      audio.src = url
    }
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => {})
      setPlaying(true)
    }
  }

  const bgColor    = isOut ? '#DCF8C6' : '#ffffff'
  const barColor   = isOut ? '#34C759' : '#8E8E93'
  const barFilled  = isOut ? '#128C7E' : '#34C759'

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '8px 10px 6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 180,
        maxWidth: 260,
      }}
    >
      <audio
        ref={audioRef}
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onTimeUpdate={(e) => {
          const d = e.target.duration
          if (d && isFinite(d)) setProgress(e.target.currentTime / d)
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Bouton play/pause */}
        <button
          onClick={togglePlay}
          disabled={urlLoading}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: isOut ? '#25D366' : '#8E8E93',
            border: 'none', cursor: urlLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {urlLoading
            ? <SpinnerIcon size={16} color="#fff" className="animate-spin" />
            : playing
              ? <PauseIcon size={16} color="#fff" weight="fill" />
              : <PlayIcon  size={16} color="#fff" weight="fill" />
          }
        </button>

        {/* Waveform */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, height: 28 }}>
          {BARS.map((h, i) => {
            const filled = progress > 0 && (i / BARS.length) < progress
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.round(h * 100)}%`,
                  borderRadius: 2,
                  backgroundColor: filled ? barFilled : barColor,
                  opacity: filled ? 1 : 0.45,
                  transition: 'background-color 0.1s',
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Footer : durée + heure */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 44 }}>
        <span style={{ fontSize: 11, color: '#8E8E93' }}>
          {fmtDuration(progress > 0 && audioRef.current ? audioRef.current.currentTime : duration)}
        </span>
        <input
          type="text"
          value={message.sentAt}
          onChange={(e) => onUpdate({ sentAt: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 10, color: '#8E8E93', background: 'transparent',
            border: 'none', outline: 'none', textAlign: 'right',
            width: 36, cursor: 'text', padding: 0,
          }}
        />
      </div>
    </div>
  )
}

// ─── Bulle éditable ───────────────────────────────────────────────────────────

function MessageBubble({ message, characters, storyId, onUpdate, onDelete }) {
  const [editing,       setEditing]       = useState(false)
  const [draft,         setDraft]         = useState(message.text)
  const [stickerOpen,   setStickerOpen]   = useState(false)
  const [vocalUploading,setVocalUploading]= useState(false)
  const vocalInputRef                     = useRef()
  const taRef                             = useRef()
  const isOut                             = message.side === 'outgoing'
  const perso                             = isOut ? null : findChar(characters, message.characterId)
  const isSticker                         = isStickerText(message.text)
  const isVocal                           = isVocalText(message.text)

  useEffect(() => { if (editing && !isSticker && !isVocal) taRef.current?.focus() }, [editing, isSticker, isVocal])

  const commit = () => {
    const t = draft.trim()
    if (t) onUpdate({ text: t })
    else   setDraft(message.text)
    setEditing(false)
  }

  const selectSticker = (filename) => {
    onUpdate({ text: `[sticker:${filename}]` })
    setStickerOpen(false)
    setEditing(false)
  }

  const handleVocalFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVocalUploading(true)
    try {
      const duration = await readAudioDuration(file)
      const path     = await uploadVocalFile(storyId, file)
      onUpdate({ text: vocalText(path, duration) })
    } catch (err) {
      console.error('Upload vocal échoué', err)
    } finally {
      setVocalUploading(false)
      e.target.value = ''
    }
  }

  const replaceVocal = () => vocalInputRef.current?.click()

  return (
    <>
      {/* Input fichier caché pour upload vocal */}
      <input
        ref={vocalInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleVocalFile}
      />

      <div className={`flex items-end gap-2 group ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOut && <AvatarMini personnage={perso} size={28} />}

        {/* Bulle */}
        {isVocal ? (
          <VocalBubble
            message={message}
            isOut={isOut}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ) : (
          <div
            style={{
              maxWidth: 340,
              backgroundColor: isSticker ? 'transparent' : isOut ? '#DCF8C6' : '#ffffff',
              borderRadius: isOut ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: isSticker ? '2px' : '7px 11px 5px',
              boxShadow: isSticker ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
              cursor: editing ? 'default' : 'pointer',
            }}
            onClick={() => !editing && setEditing(true)}
          >
            {/* Nom */}
            {!isOut && perso && !isSticker && (
              <div style={{ fontSize: 11, fontWeight: 600, color: perso.avatarColor ?? '#d9571d', marginBottom: 2 }}>
                {perso.nom}
              </div>
            )}

            {/* Contenu : sticker ou texte */}
            {isSticker ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={stickerUrl(stickerFilename(message.text))}
                  alt="sticker"
                  style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 12,
                    backgroundColor: 'rgba(0,0,0,0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  className="group-hover:bg-black/10 transition-colors"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setStickerOpen(true) }}
                    className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-1.5 shadow transition-opacity"
                  >
                    <StickerIcon size={14} className="text-brand-orange" />
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: 4, right: 6 }}>
                  <input
                    type="text"
                    value={message.sentAt}
                    onChange={(e) => onUpdate({ sentAt: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 10, color: 'rgba(255,255,255,0.9)',
                      background: 'rgba(0,0,0,0.35)', borderRadius: 4,
                      border: 'none', outline: 'none', textAlign: 'right',
                      width: 32, cursor: 'text', padding: '1px 3px',
                    }}
                  />
                </div>
              </div>
            ) : editing ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                  <textarea
                    ref={taRef}
                    value={draft}
                    rows={2}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
                      if (e.key === 'Escape') { setDraft(message.text); setEditing(false) }
                    }}
                    style={{
                      fontSize: 14, lineHeight: 1.4, color: '#111',
                      background: 'transparent', border: 'none', outline: 'none',
                      resize: 'none', flex: 1, fontFamily: 'inherit',
                      padding: 0, margin: 0,
                    }}
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setStickerOpen(true) }}
                    className="p-1 text-gray-300 hover:text-brand-orange rounded transition-colors shrink-0"
                    title="Insérer un sticker"
                  >
                    <StickerIcon size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111', margin: 0 }}>
                {message.text || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Cliquer pour éditer</span>}
              </p>
            )}

            {/* Heure éditable (texte normal) */}
            {!isSticker && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                <input
                  type="text"
                  value={message.sentAt}
                  onChange={(e) => onUpdate({ sentAt: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 10, color: '#8E8E93', background: 'transparent',
                    border: 'none', outline: 'none', textAlign: 'right',
                    width: 36, cursor: 'text', padding: 0,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Actions groupe */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isSticker && !isVocal && (
            <button
              onClick={() => setStickerOpen(true)}
              className="p-1.5 text-gray-300 hover:text-brand-orange hover:scale-125 rounded-lg transition-all shrink-0"
              title="Remplacer par un sticker"
            >
              <StickerIcon size={14} />
            </button>
          )}
          {!isSticker && (
            <button
              onClick={replaceVocal}
              disabled={vocalUploading}
              className="p-1.5 text-gray-300 hover:text-[#25D366] hover:scale-125 rounded-lg transition-all shrink-0"
              title={isVocal ? 'Remplacer la note vocale' : 'Convertir en note vocale'}
            >
              {vocalUploading
                ? <SpinnerIcon size={14} className="animate-spin" />
                : <MicrophoneIcon size={14} />
              }
            </button>
          )}
          <button
            onClick={() => onDelete(message.id)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:scale-125 rounded-lg transition-all shrink-0"
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {stickerOpen && (
        <StickerPicker
          onSelect={selectSticker}
          onClose={() => setStickerOpen(false)}
        />
      )}
    </>
  )
}

// ─── Bouton + entre messages ──────────────────────────────────────────────────

function AddMessageButton({ thread, characters, onAdd }) {
  const [open, setOpen] = useState(false)
  const perso           = findChar(characters, thread.characterId)
  const drka            = drKA(characters)

  const add = (side) => {
    onAdd({ side, characterId: side === 'incoming' ? thread.characterId : null })
    setOpen(false)
  }

  return (
    <div className="flex justify-center items-center py-1 relative">
      {open ? (
        <div className="flex items-center gap-2 bg-white rounded-full shadow-md px-3 py-1.5 border border-gray-100">
          <button
            onClick={() => add('incoming')}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-brand-orange transition-colors"
          >
            <AvatarMini personnage={perso} size={20} />
            {perso?.nom ?? 'Contact'}
          </button>
          <span className="text-gray-200 text-sm">|</span>
          <button
            onClick={() => add('outgoing')}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-700 hover:text-brand-orange transition-colors"
          >
            {drka?.nom ?? 'Dr KA'}
            <AvatarMini personnage={drka} size={20} />
          </button>
          <span className="text-gray-200 text-sm">|</span>
          <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500 text-xs">×</button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="opacity-0 group-hover/zone:opacity-100 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-all"
        >
          <PlusIcon size={12} weight="bold" />
        </button>
      )}
    </div>
  )
}

// ─── Zone messages du fil ─────────────────────────────────────────────────────

function ThreadEditor({ thread, characters, storyId, onAddMessage, onUpdateMessage, onDeleteMessage }) {
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.messages.length])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto px-6 py-4 group/zone"
        style={{ backgroundColor: '#e5ddd5' }}
      >
        {thread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <ChatCircleIcon size={36} weight="thin" />
            <p className="text-sm">Aucun message</p>
            <AddMessageButton thread={thread} characters={characters} onAdd={(p) => onAddMessage(0, p)} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <AddMessageButton thread={thread} characters={characters} onAdd={(p) => onAddMessage(0, p)} />

            {thread.messages.map((m, i) => (
              <div key={m.id}>
                <MessageBubble
                  message={m}
                  characters={characters}
                  storyId={storyId}
                  onUpdate={(patch) => onUpdateMessage(m.id, patch)}
                  onDelete={onDeleteMessage}
                />
                <AddMessageButton thread={thread} characters={characters} onAdd={(p) => onAddMessage(i + 1, p)} />
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Modale nouveau fil ───────────────────────────────────────────────────────

function ThreadModal({ characters, usedCharacterIds, isMain = false, onSave, onClose, onGoToPersonnages }) {
  const available = characters.filter((c) => !c.isDefault && !usedCharacterIds.includes(c.id))
  const [characterId, setCharacterId] = useState(available[0]?.id ?? '')

  const noCharacters = available.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {isMain ? 'Personnage principal' : 'Nouveau fil secondaire'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-6">
          {noCharacters ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <UserIcon size={36} weight="thin" className="text-gray-300" />
              <p className="text-sm text-gray-500">
                {isMain
                  ? 'Aucun personnage disponible.\nCréez d\'abord un personnage sur la page Personnages.'
                  : 'Tous les personnages ont déjà un fil dans cette histoire.'}
              </p>
              {isMain && onGoToPersonnages && (
                <button
                  onClick={onGoToPersonnages}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-xl"
                  style={{ backgroundColor: '#d9571d' }}
                >
                  Aller aux personnages
                </button>
              )}
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-gray-500 block mb-2">
                {isMain ? 'Qui discute avec Dr KA dans cette histoire ?' : 'Contact *'}
              </label>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
              >
                {available.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            {noCharacters ? 'Fermer' : 'Annuler'}
          </button>
          {!noCharacters && (
            <button
              onClick={() => characterId && onSave(characterId)}
              disabled={!characterId}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#d9571d' }}
            >
              Créer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DesktopHistoireDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [histoire,     setHistoire]     = useState(null)
  const [threads,      setThreads]      = useState([])
  const [characters,   setCharacters]   = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [showModal,    setShowModal]    = useState(false) // secondary thread modal
  const [showMainModal,setShowMainModal]= useState(false) // main thread modal (auto on empty)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getStory(id), getThreads(id), getCharacters()])
      .then(([story, threadRows, charRows]) => {
        setHistoire(story)
        const mapped = threadRows.map(dbToThread).sort((a, b) => a.order - b.order)
        setThreads(mapped)
        setActiveThread(mapped[0]?.id ?? null)
        setCharacters(charRows.map(dbToCharacter))
        // Aucun fil → demander le personnage principal
        if (mapped.length === 0) setShowMainModal(true)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  const current          = threads.find((t) => t.id === activeThread)
  const usedCharacterIds = threads.map((t) => t.characterId)

  // ── Mutations fils ────────────────────────────────────────────────────────

  const addMainThread = async (characterId) => {
    try {
      const row = await dbCreateThread({ storyId: id, type: 'main', order: 0, characterId })
      const t   = { ...dbToThread(row), characterId }
      setThreads([t])
      setActiveThread(t.id)
      setShowMainModal(false)
    } catch (e) { setError(e.message) }
  }

  const addThread = async (characterId) => {
    try {
      const row = await dbCreateThread({ storyId: id, type: 'secondary', order: threads.length, characterId })
      const t   = { ...dbToThread(row), characterId }
      setThreads((p) => [...p, t])
      setActiveThread(t.id)
      setShowModal(false)
    } catch (e) { setError(e.message) }
  }

  const removeThread = async (threadId) => {
    try {
      await dbDeleteThread(threadId)
      setThreads((p) => {
        const next = p.filter((t) => t.id !== threadId)
        if (activeThread === threadId) setActiveThread(next[0]?.id ?? null)
        return next
      })
    } catch (e) { setError(e.message) }
  }

  // ── Mutations messages ────────────────────────────────────────────────────

  const addMessage = async (index, { side, characterId }) => {
    try {
      const order = index
      const row   = await dbCreateMessage({
        threadId:    activeThread,
        order,
        side,
        characterId: characterId ?? null,
        text:        '',
        sentAt:      '09:41',
        status:      'read',
      })
      const msg = dbToMessage({ ...row, characterId: row.character_id })
      setThreads((p) => p.map((t) => {
        if (t.id !== activeThread) return t
        const msgs = [...t.messages]
        msgs.splice(index, 0, msg)
        return { ...t, messages: msgs }
      }))
    } catch (e) { setError(e.message) }
  }

  const handleUpdateMessage = async (messageId, patch) => {
    // Optimistic update
    setThreads((p) => p.map((t) =>
      t.id !== activeThread ? t : {
        ...t,
        messages: t.messages.map((m) => m.id === messageId ? { ...m, ...patch } : m),
      }
    ))
    try {
      await dbUpdateMessage(messageId, {
        ...(patch.text   !== undefined && { text:   patch.text }),
        ...(patch.sentAt !== undefined && { sentAt: patch.sentAt }),
        ...(patch.status !== undefined && { status: patch.status }),
      })
    } catch (e) { setError(e.message) }
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      await dbDeleteMessage(messageId)
      setThreads((p) => p.map((t) =>
        t.id !== activeThread ? t : {
          ...t,
          messages: t.messages.filter((m) => m.id !== messageId),
        }
      ))
    } catch (e) { setError(e.message) }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      <SpinnerIcon size={28} className="animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Erreur */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between shrink-0">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">×</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/histoires')}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
          <CaretLeftIcon size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{histoire?.title ?? '—'}</h1>
          {histoire?.debrief && <p className="text-xs text-gray-400 truncate">{histoire.debrief}</p>}
        </div>
        <button
          onClick={() => navigate(`/edition/${id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FilmSlateIcon size={12} weight="bold" /> Éditer
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#d9571d' }}
        >
          <PlusIcon size={12} weight="bold" /> Fil secondaire
        </button>
      </div>

      {/* ── Layout 2 colonnes ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar fils ── */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fils</div>

          {threads.map((t) => {
            const perso    = findChar(characters, t.characterId)
            const isActive = t.id === activeThread
            return (
              <div
                key={t.id}
                onClick={() => setActiveThread(t.id)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer group transition-colors ${
                  isActive ? 'bg-brand-orange/5' : 'hover:bg-gray-50'
                }`}
              >
                <AvatarMini personnage={perso} size={34} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isActive ? 'text-brand-orange' : 'text-gray-800'}`}>
                    {perso?.nom ?? '—'}
                  </div>
                  <div className="flex items-center gap-1">
                    {t.type === 'main'
                      ? <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5"><CrownIcon size={9} /> Principal</span>
                      : <span className="text-[10px] text-gray-400">Secondaire</span>
                    }
                    <span className="text-[10px] text-gray-300">· {t.messages.length} msg</span>
                  </div>
                </div>
                {t.type === 'secondary' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeThread(t.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-400"
                  >
                    <TrashIcon size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </aside>

        {/* ── Zone messages ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {current ? (
            <ThreadEditor
              thread={current}
              characters={characters}
              storyId={id}
              onAddMessage={addMessage}
              onUpdateMessage={handleUpdateMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <ChatCircleIcon size={48} weight="thin" />
              <p className="text-sm">{threads.length === 0 ? 'Aucun fil — créez-en un !' : 'Sélectionnez un fil'}</p>
            </div>
          )}
        </div>

      </div>

      {/* Modale fil principal (auto à la création) */}
      {showMainModal && (
        <ThreadModal
          characters={characters}
          usedCharacterIds={[]}
          isMain
          onSave={addMainThread}
          onClose={() => setShowMainModal(false)}
          onGoToPersonnages={() => navigate('/personnages')}
        />
      )}

      {/* Modale fil secondaire */}
      {showModal && (
        <ThreadModal
          characters={characters}
          usedCharacterIds={usedCharacterIds}
          onSave={addThread}
          onClose={() => setShowModal(false)}
          onGoToPersonnages={() => navigate('/personnages')}
        />
      )}
    </div>
  )
}
