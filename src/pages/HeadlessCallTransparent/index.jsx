// ─── HeadlessCallTransparent ──────────────────────────────────────────────────
//
// Page publique : /headless-call-transparent?id=<callId>
//
// Variante transparente de HeadlessCall :
//   - Le fond du conteneur est transparent (Puppeteer voit le canal alpha)
//   - WhatsAppCallScreen reçoit glass={true} → fond rgba(13,27,20,0.5)
//   - Puppeteer doit activer Emulation.setDefaultBackgroundColorOverride { a:0 }
//   - Frames capturées en PNG (pas JPEG) pour préserver l'alpha
//   - Encodage : encodeTransparent() → WebM VP9 ou ProRes 4444
//
// Signal de fin : window.__sceneFinished = true

import { useState, useEffect, useRef } from 'react'
import WhatsAppCallScreen from '../../components/iphone/WhatsAppCallScreen.jsx'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVER_BASE  = 'http://localhost:3001'
const IPHONE_W     = 390
const IPHONE_H     = 844
const EXPORT_W     = 1080
const EXPORT_H     = 1920
const EXPORT_SCALE = EXPORT_H / IPHONE_H        // ≈ 2.2749
const IPHONE_LEFT  = Math.round((EXPORT_W - IPHONE_W * EXPORT_SCALE) / 2)

const INCOMING_MS  = 3200
const PAUSE_MS     = 700
const ENDED_MS     = 1500
const STABILIZE_MS = 400

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HeadlessCallTransparent() {
  const [phase,        setPhase]        = useState('incoming')
  const [activeSide,   setActiveSide]   = useState(null)
  const [subtitle,     setSubtitle]     = useState('')
  const [elapsed,      setElapsed]      = useState(0)
  const [caller,       setCaller]       = useState(null)
  const [status,       setStatus]       = useState('loading')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [glassOpacity, setGlassOpacity] = useState(0.50)

  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const params  = new URLSearchParams(window.location.search)
    const callId  = params.get('id')
    const opacity = Math.min(1, Math.max(0, parseFloat(params.get('opacity') ?? '0.50')))
    if (!callId) {
      setErrorMsg('Paramètre id manquant')
      setStatus('error')
      return
    }

    setGlassOpacity(opacity)

    fetch(`${SERVER_BASE}/scene/${callId}`)
      .then(r => { if (!r.ok) throw new Error('Données d\'appel introuvables'); return r.json() })
      .then(data => {
        setCaller(data.caller ?? { name: '…', color: '#25D366', initials: '?', avatarUrl: null })
        setStatus('playing')
        return runAnimation(data.sequence ?? [])
      })
      .catch(err => {
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, [])

  async function runAnimation(sequence) {
    await sleep(STABILIZE_MS)

    setPhase('incoming')
    await sleep(INCOMING_MS)

    setPhase('active')

    let elapsedSec = 0
    const timer = setInterval(() => {
      elapsedSec++
      setElapsed(elapsedSec)
    }, 1000)

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i]
      setActiveSide(item.side)
      setSubtitle(item.subtitle ?? '')
      await sleep(Math.max(500, Math.round(item.duration * 1000)))
      setActiveSide(null)
      setSubtitle('')
      if (i < sequence.length - 1) {
        await sleep(PAUSE_MS)
      }
    }

    clearInterval(timer)

    setPhase('ended')
    await sleep(ENDED_MS)

    window.__sceneFinished = true
  }

  // ── Rendu — fond conteneur transparent pour que Puppeteer capture l'alpha ──

  return (
    <div style={{
      width:      EXPORT_W,
      height:     EXPORT_H,
      overflow:   'hidden',
      background: 'transparent',   // ← différence clé vs HeadlessCall (fond noir)
      position:   'relative',
    }}>
      {status === 'error' ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', flexDirection: 'column', gap: 12,
          color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center',
          padding: '0 32px',
        }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      ) : (
        <div style={{
          position:        'absolute',
          left:            IPHONE_LEFT,
          top:             0,
          width:           IPHONE_W,
          height:          IPHONE_H,
          transformOrigin: 'top left',
          transform:       `scale(${EXPORT_SCALE})`,
        }}>
          <WhatsAppCallScreen
            statusTime="9:41"
            callerName={caller?.name      ?? '…'}
            callerColor={caller?.color    ?? '#25D366'}
            callerInitials={caller?.initials ?? '?'}
            callerAvatarUrl={caller?.avatarUrl ?? null}
            phase={phase}
            activeSide={activeSide}
            subtitle={subtitle}
            elapsedSeconds={elapsed}
            onAnswer={() => {}}
            onDecline={() => {}}
            onHangup={() => {}}
            glassOpacity={glassOpacity}
          />
        </div>
      )}
    </div>
  )
}
