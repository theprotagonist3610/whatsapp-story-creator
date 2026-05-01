// ─── HeadlessCall ─────────────────────────────────────────────────────────────
//
// Page publique : /headless-call?id=<callId>
//
// Rendu Puppeteer — simule visuellement un appel WhatsApp entrant.
// Viewport : 1080×1920 (Instagram 9:16).
// Le WhatsAppCallScreen (390×844) est mis à l'échelle par la hauteur :
//   SCALE = 1920 / 844 ≈ 2.2749
//   → largeur effective ≈ 887px, centrée dans 1080px
//
// Flux :
//   1. Fetch GET /scene/:id → { caller, sequence: [{duration, side}] }
//   2. Anime les phases : incoming (3.2s) → active (vocaux) → ended (1.5s)
//   3. window.__sceneFinished = true → Puppeteer arrête le screencast
//
// Aucun audio joué ici — l'audio est assemblé côté serveur.

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

const INCOMING_MS   = 3200
const PAUSE_MS      = 700
const ENDED_MS      = 1500
const STABILIZE_MS  = 400

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HeadlessCall() {
  const [phase,      setPhase]      = useState('incoming')
  const [activeSide, setActiveSide] = useState(null)
  const [subtitle,   setSubtitle]   = useState('')
  const [elapsed,    setElapsed]    = useState(0)
  const [caller,     setCaller]     = useState(null)
  const [status,     setStatus]     = useState('loading')  // loading|error|playing
  const [errorMsg,   setErrorMsg]   = useState('')

  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const params = new URLSearchParams(window.location.search)
    const callId = params.get('id')
    if (!callId) {
      setErrorMsg('Paramètre id manquant')
      setStatus('error')
      return
    }

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
    // Pause de stabilisation pour que Puppeteer capture un premier frame propre
    await sleep(STABILIZE_MS)

    // ── Phase sonnerie ───────────────────────────────────────────────────────
    setPhase('incoming')
    await sleep(INCOMING_MS)

    // ── Phase active ─────────────────────────────────────────────────────────
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

    // ── Phase terminée ───────────────────────────────────────────────────────
    setPhase('ended')
    await sleep(ENDED_MS)

    // Signal Puppeteer
    window.__sceneFinished = true
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width:      EXPORT_W,
      height:     EXPORT_H,
      overflow:   'hidden',
      background: '#000',
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
          />
        </div>
      )}
    </div>
  )
}
