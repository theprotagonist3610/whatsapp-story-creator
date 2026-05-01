import { useEffect, useRef, useState } from 'react'
import {
  CaretLeftIcon,
  VideoCameraIcon,
  PhoneIcon,
  PlusIcon,
  PaperclipIcon,
  CameraIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PlayIcon,
  CheckIcon,
  ChecksIcon,
} from '@phosphor-icons/react'
import StatusBar from './StatusBar.jsx'
import { HomeIndicator } from './LockScreen.jsx'
import { getStickerUrl, getLocalUrl } from '../../lib/stickers.js'
import { getPhotoBlobUrl } from '../../lib/supabase.js'

// ─── WhatsAppConversation — chat WhatsApp iOS ─────────────────────────────────
// Dimensions : 390×844px
// Props :
//   statusTime    {string}   heure StatusBar
//   contactName   {string}   nom du contact en haut
//   contactColor  {string}   couleur avatar contact
//   contactOnline {boolean}  "en ligne" sous le nom
//   bubbles       {Array}    [{id, side, text, time, status, characterName}]
//   inputText     {string}   texte dans la barre de saisie (vide = placeholder)
//   showKeyboard  {boolean}  réduit la zone de chat pour laisser place au clavier

// Fond WhatsApp (motif SVG simplifié, couleur exacte)
const WA_BG_COLOR = '#e5ddd5'

// Couleurs des coches
const TICK_COLORS = { sent: '#8E8E93', delivered: '#8E8E93', read: '#53BDEB' }

export default function WhatsAppConversation({
  statusTime       = '9:41',
  contactName      = 'Dr KA',
  contactColor     = '#d9571d',
  contactOnline    = true,
  contactFollowers = 128,
  bubbles          = [],
  inputText        = '',
  showKeyboard     = false,
  keyboardOffset   = 0,
  newBubbleId      = null,
  showTyping       = false,
  showRecording    = false,
  showBlocked      = false,
}) {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        backgroundColor: WA_BG_COLOR,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes bubblePopIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes typingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-4px); opacity: 1; } }
        @keyframes recordingBar { from { transform: scaleY(0.3); opacity: 0.5; } to { transform: scaleY(1); opacity: 1; } }
      `}</style>

      {/* ── Fond motif WhatsApp ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9bbae' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          zIndex: 0,
        }}
      />

      {/* ── StatusBar sur fond vert WhatsApp ── */}
      <div style={{ backgroundColor: '#075E54', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <StatusBar time={statusTime} theme="dark" />
      </div>

      {/* ── Header conversation ── */}
      <div
        style={{
          backgroundColor: '#075E54',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 8,
          gap: 8,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Flèche retour + nombre abonnés */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CaretLeftIcon size={22} color="#ffffff" weight="bold" />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
            {contactFollowers}
          </span>
        </div>

        {/* Avatar */}
        <ContactAvatar name={contactName} color={contactColor} size={38} />

        {/* Nom + statut */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
            {contactName}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>
            {contactOnline ? 'en ligne' : 'vu récemment'}
          </div>
        </div>

        {/* Icônes droite */}
        <div style={{ display: 'flex', gap: 18, paddingRight: 4, alignItems: 'center' }}>
          <VideoCameraIcon size={22} color="#ffffff" weight="regular" />
          <PhoneIcon size={22} color="#ffffff" weight="regular" />
        </div>
      </div>

      {/* ── Bloc translateable : bulles + input + home indicator ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: `translateY(-${keyboardOffset}px)`,
          transition: 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)',
        }}
      >
        {/* Zone de chat (bulles) */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            overflowY: 'hidden',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 3,
          }}
        >
          {bubbles.map((bubble) => (
            <ChatBubble key={bubble.id} {...bubble} isNew={bubble.id === newBubbleId} />
          ))}

          {/* Indicateur "est en train d'écrire" */}
          {showTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 5,
                animation: 'bubblePopIn 280ms cubic-bezier(0.34,1.56,0.64,1) both',
              }}>
                {[0, 0.18, 0.36].map((delay, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: '#8E8E93',
                    animation: `typingDot 1.1s ease-in-out infinite`,
                    animationDelay: `${delay}s`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Bandeau "Vous avez bloqué ce contact" */}
          {showBlocked && (
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '2px 20px 6px',
              animation: 'bubblePopIn 320ms cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              <div style={{
                backgroundColor: 'rgba(0,0,0,0.055)',
                borderRadius: 10,
                padding: '5px 14px',
                fontSize: 12,
                color: 'rgba(0,0,0,0.45)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}>
                🚫 Vous avez bloqué ce contact
              </div>
            </div>
          )}

          {/* Indicateur "Enregistrement…" */}
          {showRecording && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px 16px 16px 4px',
                padding: '8px 12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', gap: 7,
                animation: 'bubblePopIn 280ms cubic-bezier(0.34,1.56,0.64,1) both',
              }}>
                <MicrophoneIcon size={13} color="#25D366" weight="fill" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 16 }}>
                  {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
                    <div key={i} style={{
                      width: 3, borderRadius: 2,
                      backgroundColor: '#25D366',
                      animation: 'recordingBar 0.7s ease-in-out infinite alternate',
                      animationDelay: `${delay}s`,
                      height: [6, 10, 14, 10, 14, 8, 12][i],
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barre de saisie */}
        {showBlocked ? (
          <div style={{
            position: 'relative', zIndex: 2,
            backgroundColor: '#F0F0F0',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', textAlign: 'center' }}>
              Vous ne pouvez pas envoyer de messages à ce contact
            </span>
          </div>
        ) : (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            backgroundColor: '#F0F0F0',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PlusIcon size={26} color="#8E8E93" weight="regular" />
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: '6px 8px 6px 14px',
              fontSize: 15,
              color: inputText ? '#000000' : '#8E8E93',
              minHeight: 38,
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              gap: 6,
            }}
          >
            <span style={{ flex: 1 }}>
              {inputText
                ? <>{inputText}<span style={{ animation: 'blink 1s step-end infinite', marginLeft: 1 }}>|</span></>
                : 'Message'}
            </span>
            <PaperclipIcon  size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
            <CameraIcon     size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
            <MicrophoneIcon size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
          </div>
          {inputText ? (
            <div
              style={{
                width: 38, height: 38, borderRadius: '50%',
                backgroundColor: '#25D366',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PaperPlaneTiltIcon size={20} color="#ffffff" weight="fill" />
            </div>
          ) : null}
        </div>
        )} {/* fin ternaire showBlocked */}

        {/* Home indicator */}
        <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, backgroundColor: '#F0F0F0' }}>
          <HomeIndicator theme="light" />
        </div>
      </div>
    </div>
  )
}

// ─── Helpers stickers ─────────────────────────────────────────────────────────

const STICKER_RE = /^\[sticker:(.+)\]$/

function isStickerText(text) { return STICKER_RE.test(text?.trim() ?? '') }
function stickerFilename(text) { return text?.trim().match(STICKER_RE)?.[1] ?? null }
function stickerUrl(filename) { return getStickerUrl(filename) ?? '' }

// ─── Helpers photos ───────────────────────────────────────────────────────────

const PHOTO_RE = /^\[photo:(.+)\]$/

function isPhotoText(text) { return PHOTO_RE.test(text?.trim() ?? '') }
function photoStoragePath(text) { return text?.trim().match(PHOTO_RE)?.[1] ?? null }

// ─── Helpers vocals ───────────────────────────────────────────────────────────

const VOCAL_RE = /^\[vocal:(.+):(\d+(?:\.\d+)?)\]$/

function isVocalText(text) { return VOCAL_RE.test(text?.trim() ?? '') }
function vocalDuration(text) { const m = text?.trim().match(VOCAL_RE); return m ? parseFloat(m[2]) : 0 }

function fmtDuration(secs) {
  const s = Math.round(secs)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Barres décoratives fixes
const WAVEFORM_BARS = [0.3,0.5,0.8,0.6,0.4,0.9,0.7,0.5,0.3,0.6,0.8,0.4,0.7,0.5,
                       0.9,0.6,0.3,0.8,0.5,0.7,0.4,0.6,0.3,0.9,0.5,0.7,0.4,0.6]

function VocalWave({ isOutgoing, progress = 0 }) {
  const barColor  = isOutgoing ? '#34C759' : '#8E8E93'
  const barFilled = isOutgoing ? '#128C7E' : '#34C759'
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, height: 24 }}>
      {WAVEFORM_BARS.map((h, i) => {
        const filled = progress > 0 && (i / WAVEFORM_BARS.length) < progress
        return (
          <div key={i} style={{
            flex: 1, height: `${Math.round(h * 100)}%`, borderRadius: 2,
            backgroundColor: filled ? barFilled : barColor,
            opacity: filled ? 1 : 0.45,
          }} />
        )
      })}
    </div>
  )
}

// Bulle vocale dans le téléphone (autoplay via blobUrl quand isNew)
function VocalChatBubble({ text, blobUrl, time, status, isOutgoing, isNew, characterName }) {
  const duration = vocalDuration(text)
  const audioRef = useRef(null)

  useEffect(() => {
    if (isNew && blobUrl && audioRef.current) {
      audioRef.current.src = blobUrl
      audioRef.current.play().catch(() => {})
    }
  }, [isNew, blobUrl])

  const bg = isOutgoing ? '#DCF8C6' : '#ffffff'

  return (
    <div style={{
      backgroundColor: bg,
      borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      padding: '8px 10px 6px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 160, maxWidth: 240,
      animation: isNew ? 'bubblePopIn 280ms cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
    }}>
      <audio ref={audioRef} />
      {!isOutgoing && characterName && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#d9571d', lineHeight: 1.2 }}>{characterName}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          backgroundColor: isOutgoing ? '#25D366' : '#8E8E93',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <PlayIcon size={14} color="#fff" weight="fill" />
        </div>
        <VocalWave isOutgoing={isOutgoing} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 39 }}>
        <span style={{ fontSize: 10, color: '#8E8E93' }}>{fmtDuration(duration)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 10, color: '#8E8E93' }}>{time}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Bulle photo ─────────────────────────────────────────────────────────────

function PhotoChatBubble({ text, time, status, isOutgoing, isNew, characterName }) {
  const storagePath  = photoStoragePath(text)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!storagePath) return
    let revoked = false
    getPhotoBlobUrl(storagePath)
      .then(blobUrl => { if (!revoked) setUrl(blobUrl) })
      .catch(() => {})
    return () => { revoked = true }
  }, [storagePath])

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        maxWidth: 220,
        animation: isNew ? 'bubblePopIn 320ms cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
      }}
    >
      {!isOutgoing && characterName && (
        <div style={{
          position: 'absolute', top: 6, left: 8, zIndex: 2,
          fontSize: 11, fontWeight: 600, color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}>
          {characterName}
        </div>
      )}

      {url ? (
        <img
          src={url}
          alt="photo"
          style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: 180, height: 140,
          backgroundColor: isOutgoing ? '#b2dfdb' : '#e0e0e0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CameraIcon size={28} color="rgba(0,0,0,0.3)" />
        </div>
      )}

      {/* Heure + tick en overlay bas-droite */}
      <div style={{
        position: 'absolute', bottom: 5, right: 7,
        display: 'flex', alignItems: 'center', gap: 3,
        background: 'rgba(0,0,0,0.38)', borderRadius: 6, padding: '1px 5px',
      }}>
        <span style={{ fontSize: 10, color: '#fff' }}>{time}</span>
        {isOutgoing && <Ticks status={status} color="#fff" />}
      </div>
    </div>
  )
}

// ─── Bulle de chat ────────────────────────────────────────────────────────────

function ChatBubble({ side = 'incoming', text = '', time = '', status = 'sent', characterName = '', isNew = false, deleted = false, blobUrl = null }) {
  const isOutgoing = side === 'outgoing'
  const tickColor  = TICK_COLORS[status] ?? TICK_COLORS.sent
  const isSticker  = isStickerText(text)
  const isVocal    = isVocalText(text)
  const isPhoto    = isPhotoText(text)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 4,
        maxWidth: '100%',
      }}
    >
      {deleted ? (
        /* ── Bulle supprimée ── */
        <div
          style={{
            maxWidth: 280,
            backgroundColor: isOutgoing ? '#DCF8C6' : '#ffffff',
            borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            padding: '6px 10px 4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 15 }}>🚫</span>
            <span style={{ fontSize: 16, color: '#8E8E93', fontStyle: 'italic' }}>
              Ce message a été supprimé
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
            <span style={{ fontSize: 11, color: '#8E8E93' }}>{time}</span>
          </div>
        </div>
      ) : isVocal ? (
        /* ── Bulle note vocale ── */
        <VocalChatBubble
          text={text} blobUrl={blobUrl} time={time} status={status}
          isOutgoing={isOutgoing} isNew={isNew} characterName={characterName}
        />
      ) : isPhoto ? (
        /* ── Bulle photo ── */
        <PhotoChatBubble
          text={text} time={time} status={status}
          isOutgoing={isOutgoing} isNew={isNew} characterName={characterName}
        />
      ) : isSticker ? (
        /* ── Bulle sticker : image + heure en dessous ── */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOutgoing ? 'flex-end' : 'flex-start',
            animation: isNew ? 'bubblePopIn 280ms cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          }}
        >
          <img
            src={stickerUrl(stickerFilename(text))}
            alt="sticker"
            onError={e => { e.currentTarget.src = getLocalUrl(stickerFilename(text)) ?? '' }}
            style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, paddingInline: 2 }}>
            <span style={{ fontSize: 10, color: '#8E8E93' }}>{time}</span>
            {isOutgoing && <Ticks status={status} color={tickColor} />}
          </div>
        </div>
      ) : (
        /* ── Bulle texte normale ── */
        <div
          style={{
            maxWidth: 280,
            backgroundColor: isOutgoing ? '#DCF8C6' : '#ffffff',
            borderRadius: isOutgoing
              ? '16px 16px 4px 16px'
              : '16px 16px 16px 4px',
            padding: '6px 10px 4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            position: 'relative',
            animation: isNew ? 'bubblePopIn 280ms cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
          }}
        >
          {/* Nom */}
          {!isOutgoing && characterName && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#d9571d', marginBottom: 2, lineHeight: 1.2 }}>
              {characterName}
            </div>
          )}

          {/* Texte */}
          <span style={{ fontSize: 17, color: '#000000', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {text}
          </span>

          {/* Heure + statut */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#8E8E93' }}>{time}</span>
            {isOutgoing && <Ticks status={status} color={tickColor} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Coches de statut ─────────────────────────────────────────────────────────

function Ticks({ status, color }) {
  if (status === 'sent') {
    return <CheckIcon size={14} color={color} weight="regular" />
  }
  return <ChecksIcon size={14} color={color} weight="regular" />
}

// ─── Avatar contact (header) ──────────────────────────────────────────────────

function ContactAvatar({ name, color, size = 38 }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color ?? '#8E8E93',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
