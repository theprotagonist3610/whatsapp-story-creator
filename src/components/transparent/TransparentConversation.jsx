// ─── TransparentConversation ──────────────────────────────────────────────────
//
// Conteneur 390×844 à fond transparent.
// Affiche une liste de bulles WhatsApp + un indicateur de frappe optionnel.
// Scroll automatique vers le bas à chaque nouvelle bulle.
//
// Props :
//   bubbles[]        — tableau de props ConversationBubble
//   isTyping         — affiche les 3 points animés
//   typingName       — nom affiché dans l'indicateur (entrant seulement)
//   captureRef       — ref transmise au div racine (pour Puppeteer / MediaRecorder)

import { useEffect, useRef } from 'react'
import ConversationBubble from './ConversationBubble.jsx'

// ─── Indicateur de frappe (3 points bondissants) ─────────────────────────────

function TypingIndicator({ name }) {
  return (
    <div style={{
      display:     'flex',
      justifyContent: 'flex-start',
      paddingLeft:  8,
      paddingRight: 48,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius:    '4px 18px 18px 18px',
        padding:         '10px 14px',
        boxShadow:       '0 1px 3px rgba(0,0,0,0.15)',
        display:         'flex',
        flexDirection:   'column',
        gap:             4,
      }}>
        {name && (
          <p style={{ fontSize: 11, fontWeight: 700, color: '#d9571d', margin: 0 }}>
            {name}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width:           8,
                height:          8,
                borderRadius:    '50%',
                backgroundColor: '#8E8E93',
                display:         'inline-block',
                animation:       `typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Keyframes injectés une seule fois ────────────────────────────────────────

let _keyframesInjected = false
function ensureKeyframes() {
  if (_keyframesInjected) return
  _keyframesInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes typing-dot {
      0%, 60%, 100% { transform: translateY(0);   opacity: 0.4; }
      30%            { transform: translateY(-5px); opacity: 1;   }
    }
  `
  document.head.appendChild(style)
}

// ─── Composant principal ──────────────────────────────────────────────────────

export const CONV_W = 390
export const CONV_H = 844

export default function TransparentConversation({
  bubbles    = [],
  isTyping   = false,
  typingName = '',
  captureRef = null,
  glass      = false,
}) {
  const scrollRef  = useRef(null)
  const bottomRef  = useRef(null)

  // Injecte les keyframes au premier rendu
  useEffect(() => { ensureKeyframes() }, [])

  // Scroll vers le bas à chaque changement
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [bubbles.length, isTyping])

  return (
    <div
      ref={captureRef}
      style={{
        width:           CONV_W,
        height:          CONV_H,
        overflow:        'hidden',
        background:      'transparent',
        display:         'flex',
        flexDirection:   'column',
        position:        'relative',
      }}
    >
      {/* Zone scrollable interne */}
      <div
        ref={scrollRef}
        style={{
          flex:           1,
          overflowY:      'auto',
          overflowX:      'hidden',
          display:        'flex',
          flexDirection:  'column',
          gap:            6,
          padding:        '12px 0 8px',
          scrollbarWidth: 'none',       // Firefox
          msOverflowStyle: 'none',      // IE
        }}
      >
        {bubbles.map((b, i) => (
          <ConversationBubble
            key={b.id ?? i}
            isNew={b.isNew}
            glass={glass}
            {...b}
          />
        ))}

        {isTyping && <TypingIndicator name={typingName} />}

        {/* Ancre de scroll */}
        <div ref={bottomRef} style={{ height: 1, flexShrink: 0 }} />
      </div>
    </div>
  )
}
