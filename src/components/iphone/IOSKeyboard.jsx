import { useState } from 'react'
import { ArrowFatUpIcon, BackspaceIcon } from '@phosphor-icons/react'
import globeImg from '../../assets/iphone/icons8-globe-48.png'

// ─── IOSKeyboard — clavier AZERTY iOS (iPhone 13 Pro Max) ────────────────────
// Se superpose en bas de WhatsAppConversation.
// Hauteur : 280px (clavier) + 44px (barre d'outils au-dessus) = 324px total
// Position absolute, bottom: 0 — géré par le parent (PhoneScreen)
//
// Props :
//   inputText   {string}    texte actuellement dans la barre de saisie
//   onKey       {function}  callback(key: string) — pour l'interactivité future

// ─── Layout clavier AZERTY ───────────────────────────────────────────────────

const ROWS = [
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['⇧', 'w', 'x', 'c', 'v', 'b', 'n', '⌫'],
  ['123', '🌐', ' ', 'retour'],
]

const KEY_FLEX = {
  '⇧':     1.5,
  '⌫':     1.5,
  '123':   1.5,
  '🌐':    1,
  ' ':     4,
  'retour': 2,
}

export default function IOSKeyboard({ inputText = '', onKey }) {
  return (
    <div
      style={{
        width: 390,
        backgroundColor: '#D1D5DB',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        userSelect: 'none',
      }}
    >

      {/* ── Rangées de touches ── */}
      <div style={{ padding: '10px 3px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ROWS.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: ri === 3 ? 5 : 6,
              paddingInline: ri === 0 ? 0 : ri === 1 ? 16 : ri === 2 ? 3 : 3,
            }}
          >
            {row.map((key) => (
              <Key
                key={key}
                label={key}
                flex={KEY_FLEX[key] ?? 1}
                isSpecial={['⇧', '⌫', '123', '🌐', 'retour'].includes(key)}
                isSpace={key === ' '}
                onClick={() => onKey?.(key)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Home indicator */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: 6,
          paddingTop: 4,
        }}
      >
        <div
          style={{
            width: 134,
            height: 5,
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        />
      </div>

      {/* Style animation curseur (injecté inline) */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}

// ─── Touche individuelle ──────────────────────────────────────────────────────

function Key({ label, flex, isSpecial, isSpace, onClick }) {
  const [active, setActive] = useState(false)

  const handlePress = () => {
    if (!isSpecial && !isSpace) {
      setActive(true)
      setTimeout(() => setActive(false), 180)
    }
    onClick?.()
  }

  const renderContent = () => {
    if (isSpace) {
      return <div style={{ width: '40%', height: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 1 }} />
    }
    if (label === '⇧') return <ArrowFatUpIcon size={18} color="#000000" weight="regular" />
    if (label === '⌫') return <BackspaceIcon size={20} color="#000000" weight="regular" />
    if (label === '🌐') return <img src={globeImg} alt="globe" style={{ width: 22, height: 22 }} />
    return <span style={{ fontSize: isSpecial ? 14 : 20, fontWeight: isSpecial ? 400 : 300, letterSpacing: label === '123' ? -0.5 : 0 }}>{label}</span>
  }

  return (
    <div
      onMouseDown={handlePress}
      onTouchStart={handlePress}
      style={{
        flex,
        height: isSpace ? 52 : 54,
        backgroundColor: isSpecial && !isSpace ? '#ADB5BD' : '#ffffff',
        borderRadius: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#000000',
        cursor: 'pointer',
        boxShadow: '0 1px 0 1px rgba(0,0,0,0.25)',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        minWidth: isSpace ? 0 : 30,
        position: 'relative',
      }}
    >
      {renderContent()}

      {/* Popover iOS */}
      {active && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
            minWidth: 44,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 300,
            color: '#000000',
            zIndex: 100,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            paddingInline: 8,
          }}
        >
          {label}
          {/* Queue du popover */}
          <div
            style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #ffffff',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
            }}
          />
        </div>
      )}
    </div>
  )
}
