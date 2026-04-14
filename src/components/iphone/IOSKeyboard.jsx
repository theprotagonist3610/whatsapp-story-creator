import { useState } from 'react'
import { ArrowFatUpIcon, BackspaceIcon } from '@phosphor-icons/react'
import globeImg from '../../assets/iphone/icons8-globe-48.png'

// ─── IOSKeyboard — clavier AZERTY iOS 3 vues ─────────────────────────────────
// Props :
//   activeKeys  {Set}      touches à animer programmatiquement
//   activeView  {string}   vue forcée par le typewriter : 'ABC' | '123' | '#+=''
//   onKey       {function} callback(key)

// ─── Layouts ─────────────────────────────────────────────────────────────────

const LAYOUTS = {
  ABC: {
    rows: [
      ['a','z','e','r','t','y','u','i','o','p'],
      ['q','s','d','f','g','h','j','k','l','m'],
      ['⇧','w','x','c','v','b','n','⌫'],
      ['123','🌐',' ','retour'],
    ],
    flex: { '⇧':1.5,'⌫':1.5,'123':1.5,'🌐':1,' ':4,'retour':2 },
    special: ['⇧','⌫','123','🌐','retour'],
  },
  '123': {
    rows: [
      ['1','2','3','4','5','6','7','8','9','0'],
      ['-','/',':', ';','(',')',  '€','&','@','"'],
      ['#+=',' .',',','?','!','\'','⌫'],
      ['ABC','🌐',' ','retour'],
    ],
    flex: { '#+=':1.5,'⌫':1.5,'ABC':1.5,'🌐':1,' ':4,'retour':2 },
    special: ['#+=','⌫','ABC','🌐','retour'],
  },
  '#+=': {
    rows: [
      ['[',']','{','}','#','%','^','*','+','='],
      ['_','\\','|','~','<','>','$','£','¥','•'],
      ['123','.',',','?','!','\'','⌫'],
      ['ABC','🌐',' ','retour'],
    ],
    flex: { '123':1.5,'⌫':1.5,'ABC':1.5,'🌐':1,' ':4,'retour':2 },
    special: ['123','⌫','ABC','🌐','retour'],
  },
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function IOSKeyboard({ activeKeys = new Set(), activeView = null, onKey }) {
  const [view, setView] = useState('ABC')

  const currentView = activeView ?? view

  const handleKey = (key) => {
    if (key === '123')  { setView('123');  return }
    if (key === '#+=')  { setView('#+=');  return }
    if (key === 'ABC')  { setView('ABC');  return }
    onKey?.(key)
  }

  const layout = LAYOUTS[currentView]

  return (
    <div
      style={{
        width: 390,
        backgroundColor: '#D1D5DB',
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 20,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ padding: '10px 3px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {layout.rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: ri === 3 ? 5 : 6,
              paddingInline: currentView === 'ABC'
                ? (ri === 0 ? 0 : ri === 1 ? 16 : ri === 2 ? 3 : 3)
                : (ri === 2 ? 3 : 0),
            }}
          >
            {row.map((key) => (
              <Key
                key={key}
                label={key}
                flex={layout.flex[key] ?? 1}
                isSpecial={layout.special.includes(key)}
                isSpace={key === ' '}
                triggered={activeKeys.has(key)}
                onClick={() => handleKey(key)}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 6, paddingTop: 4 }}>
        <div style={{ width: 134, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' }} />
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  )
}

// ─── Touche individuelle ──────────────────────────────────────────────────────

function Key({ label, flex, isSpecial, isSpace, triggered, onClick }) {
  const [active, setActive] = useState(false)

  const handlePress = () => {
    if (!isSpecial && !isSpace) {
      setActive(true)
      setTimeout(() => setActive(false), 180)
    }
    onClick?.()
  }

  const showPopover = active || triggered

  const renderContent = () => {
    if (isSpace)          return <div style={{ width: '40%', height: 1, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 1 }} />
    if (label === '⇧')   return <ArrowFatUpIcon size={18} color="#000" weight="regular" />
    if (label === '⌫')   return <BackspaceIcon  size={20} color="#000" weight="regular" />
    if (label === '🌐')  return <img src={globeImg} alt="globe" style={{ width: 22, height: 22 }} />
    const isLayoutSwitch = ['123','#+=','ABC'].includes(label)
    return <span style={{ fontSize: isLayoutSwitch ? 14 : isSpecial ? 14 : 20, fontWeight: isSpecial ? 400 : 300, letterSpacing: -0.2 }}>{label}</span>
  }

  const popoverContent = () => {
    if (label === '⇧')   return <ArrowFatUpIcon size={24} color="#000" weight="regular" />
    if (label === '⌫')   return <BackspaceIcon  size={26} color="#000" weight="regular" />
    if (label === ' ')   return <span style={{ fontSize: 13, color: '#8E8E93' }}>espace</span>
    if (label === 'retour') return <span style={{ fontSize: 13 }}>retour</span>
    return <span style={{ fontSize: label.length > 1 ? 16 : 30, fontWeight: 300 }}>{label}</span>
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
        color: '#000',
        cursor: 'pointer',
        boxShadow: showPopover ? 'none' : '0 1px 0 1px rgba(0,0,0,0.25)',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        minWidth: isSpace ? 0 : 30,
        position: 'relative',
        outline: triggered ? '2px solid rgba(0,122,255,0.35)' : 'none',
        outlineOffset: -1,
      }}
    >
      {renderContent()}

      {showPopover && (
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
            zIndex: 100,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            paddingInline: 8,
          }}
        >
          {popoverContent()}
          <div
            style={{
              position: 'absolute',
              bottom: -7, left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
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
