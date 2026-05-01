// ─── ConversationBubble ───────────────────────────────────────────────────────
//
// Variantes type  : text | sticker | photo | vocal
// Variantes style : normal (palette WhatsApp) | glass (glassmorphisme)

import { useEffect, useState, useRef } from 'react'
import { getPhotoBlobUrl } from '../../lib/supabase.js'

// ─── Palettes ─────────────────────────────────────────────────────────────────

const NORMAL = {
  outBg:      '#DCF8C6',
  inBg:       '#FFFFFF',
  outText:    '#111111',
  inText:     '#111111',
  timeCl:     'rgba(0,0,0,0.45)',
  tickBlue:   '#4FC3F7',
  tickGrey:   'rgba(0,0,0,0.35)',
  nameCl:     '#d9571d',
  border:     'none',
  shadow:     '0 1px 3px rgba(0,0,0,0.15)',
  blur:       'none',
  playAccOut: '#128C7E',
  playAccIn:  '#d9571d',
}

const GLASS = {
  outBg:      'rgba(37,211,102,0.18)',
  inBg:       'rgba(255,255,255,0.14)',
  outText:    '#ffffff',
  inText:     '#ffffff',
  timeCl:     'rgba(255,255,255,0.6)',
  tickBlue:   '#a8f0ff',
  tickGrey:   'rgba(255,255,255,0.5)',
  nameCl:     '#ffb07c',
  border:     '1px solid rgba(255,255,255,0.28)',
  shadow:     '0 4px 20px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22)',
  blur:       'blur(18px) saturate(160%)',
  playAccOut: 'rgba(255,255,255,0.35)',
  playAccIn:  'rgba(255,255,255,0.25)',
}

// ─── Waveform décorative ──────────────────────────────────────────────────────

const WAVE_BARS = [3,5,8,12,18,14,20,16,10,22,18,12,8,14,20,16,10,6,4,8,14,18,12,8,4]

function Waveform({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
      {WAVE_BARS.map((h, i) => (
        <div key={i} style={{
          width: 3, height: h, borderRadius: 2,
          backgroundColor: color, opacity: 0.8,
        }} />
      ))}
    </div>
  )
}

// ─── Icône lecture ────────────────────────────────────────────────────────────

function PlayIcon({ bg }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 2L12 7L3 12V2Z" fill="#fff" />
      </svg>
    </div>
  )
}

// ─── Tick de statut ───────────────────────────────────────────────────────────

function StatusTick({ status, p }) {
  if (!status) return null
  const color = status === 'read' ? p.tickBlue : p.tickGrey
  if (status === 'sent') {
    return (
      <svg width="14" height="10" viewBox="0 0 14 10" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1 5L4.5 8.5L13 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 5L4.5 8.5L13 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5L8.5 8.5L17 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {'incoming'|'outgoing'}              props.side
 * @param {'text'|'sticker'|'photo'|'vocal'}   props.type
 * @param {string}  [props.text]
 * @param {string}  [props.time]
 * @param {string}  [props.characterName]
 * @param {string}  [props.attachmentUrl]
 * @param {number}  [props.duration]
 * @param {'sent'|'delivered'|'read'} [props.status]
 * @param {boolean} [props.isNew]
 * @param {boolean} [props.glass]             — active le style glassmorphisme
 */
export default function ConversationBubble({
  side          = 'outgoing',
  type          = 'text',
  text          = '',
  time          = '',
  characterName = '',
  attachmentUrl = '',
  duration      = 0,
  status        = 'read',
  isNew         = false,
  glass         = false,
}) {
  const isOut = side === 'outgoing'
  const p     = glass ? GLASS : NORMAL
  const [visible, setVisible] = useState(!isNew)

  useEffect(() => {
    if (!isNew) return
    // Double rAF pour garantir que le premier rendu (état invisible) est peint
    // avant de déclencher la transition
    let id1, id2
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [isNew])

  // ── Slide directionnel ────────────────────────────────────────────────────
  const rowStyle = {
    display:        'flex',
    justifyContent: isOut ? 'flex-end' : 'flex-start',
    paddingLeft:    isOut ? 48 : 8,
    paddingRight:   isOut ? 8  : 48,
    opacity:        visible ? 1 : 0,
    transform:      visible ? 'translateX(0)' : isOut ? 'translateX(40px)' : 'translateX(-40px)',
    transition:     'opacity 280ms cubic-bezier(0.25,0.46,0.45,0.94), transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)',
  }

  // ── Styles de bulle ───────────────────────────────────────────────────────
  const bubbleBase = {
    backgroundColor:    isOut ? p.outBg : p.inBg,
    backdropFilter:     p.blur,
    WebkitBackdropFilter: p.blur,
    border:             p.border,
    boxShadow:          p.shadow,
    borderRadius:       isOut ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
  }

  // ── Meta (heure + tick) ───────────────────────────────────────────────────
  const Meta = ({ forSticker = false }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
      <span style={{ fontSize: 12, color: forSticker ? 'rgba(255,255,255,0.85)' : p.timeCl }}>
        {time}
      </span>
      {isOut && <StatusTick status={status} p={p} />}
    </div>
  )

  const CharName = () => characterName && !isOut ? (
    <p style={{ fontSize: 12, fontWeight: 700, color: p.nameCl, marginBottom: 2 }}>
      {characterName}
    </p>
  ) : null

  // ─────────────────────────────────────────────────────────────────────────

  if (type === 'sticker') {
    return (
      <div style={rowStyle}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <CharName />
          <img src={attachmentUrl} alt="sticker"
            style={{ width: 140, height: 140, objectFit: 'contain', display: 'block' }} />
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8,
            padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{ fontSize: 10, color: '#fff' }}>{time}</span>
            {isOut && <StatusTick status={status} p={{ tickBlue: '#a8f0ff', tickGrey: 'rgba(255,255,255,0.5)' }} />}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'photo') {
    const [blobUrl, setBlobUrl] = useState(null)
    useEffect(() => {
      if (!attachmentUrl) return
      let revoked = false
      getPhotoBlobUrl(attachmentUrl)
        .then(url => { if (!revoked) setBlobUrl(url) })
        .catch(() => {})
      return () => { revoked = true }
    }, [attachmentUrl])

    return (
      <div style={rowStyle}>
        <div style={{ ...bubbleBase, overflow: 'hidden', maxWidth: 220 }}>
          <CharName />
          {blobUrl && <img src={blobUrl} alt="photo"
            style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />}
          <div style={{ padding: '4px 8px 6px' }}>
            {text && (
              <p style={{ fontSize: 16, color: isOut ? p.outText : p.inText,
                margin: '2px 0 4px', lineHeight: 1.4 }}>{text}</p>
            )}
            <Meta />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'vocal') {
    const accent  = isOut ? p.playAccOut : p.playAccIn
    const waveCl  = isOut ? (glass ? 'rgba(255,255,255,0.7)' : '#128C7E') : (glass ? 'rgba(255,255,255,0.6)' : '#d9571d')
    const fmtDur  = duration >= 60
      ? `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, '0')}`
      : `0:${String(Math.round(duration)).padStart(2, '0')}`

    return (
      <div style={rowStyle}>
        <div style={{ ...bubbleBase, padding: '8px 10px 6px', minWidth: 200 }}>
          <CharName />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlayIcon bg={accent} />
            <div style={{ flex: 1 }}>
              <Waveform color={waveCl} />
              <p style={{ fontSize: 11, color: p.timeCl, marginTop: 2 }}>{fmtDur}</p>
            </div>
          </div>
          <Meta />
        </div>
      </div>
    )
  }

  // ── Blocage ───────────────────────────────────────────────────────────────
  if (type === 'block') {
    return (
      <div style={{
        display:    'flex',
        justifyContent: 'center',
        padding:    '10px 24px',
        opacity:    visible ? 1 : 0,
        transition: 'opacity 280ms ease',
      }}>
        <span style={{
          fontSize:   12,
          color:      glass ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.40)',
          textAlign:  'center',
        }}>
          🚫 Vous avez bloqué ce contact
        </span>
      </div>
    )
  }

  // ── Texte (défaut) ────────────────────────────────────────────────────────
  return (
    <div style={rowStyle}>
      <div style={{ ...bubbleBase, padding: '6px 10px 4px', maxWidth: 260, wordBreak: 'break-word' }}>
        <CharName />
        <p style={{ fontSize: 16, color: isOut ? p.outText : p.inText, margin: 0, lineHeight: 1.45 }}>
          {text}
        </p>
        <Meta />
      </div>
    </div>
  )
}
