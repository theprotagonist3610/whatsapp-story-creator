// ─── HeadlessGroupCall ────────────────────────────────────────────────────────
//
// Page publique : /headless-group-call?id=<jobId>
//
// Rendu Puppeteer — simule un appel de groupe WhatsApp.
// Viewport : 1080×1920. WhatsAppGroupCallScreen (390×844) mis à l'échelle.
//
// Données de scène attendues (/scene/:id) :
//   { groupName, participants: [...], sequence: [{ duration, characterId, subtitle }] }
//
// Signal de fin : window.__sceneFinished = true

import { useState, useEffect, useRef } from 'react'
import WhatsAppGroupCallScreen from '../../components/iphone/WhatsAppGroupCallScreen.jsx'

const SERVER_BASE  = 'http://localhost:3001'
const IPHONE_W     = 390
const IPHONE_H     = 844
const EXPORT_W     = 1080
const EXPORT_H     = 1920
const EXPORT_SCALE = EXPORT_H / IPHONE_H
const IPHONE_LEFT  = Math.round((EXPORT_W - IPHONE_W * EXPORT_SCALE) / 2)

const INCOMING_MS  = 3200
const PAUSE_MS     = 700
const ENDED_MS     = 1500
const STABILIZE_MS = 400

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function HeadlessGroupCall() {
  const [phase,             setPhase]             = useState('incoming')
  const [activeCharId,      setActiveCharId]      = useState(null)
  const [subtitle,          setSubtitle]          = useState('')
  const [elapsed,           setElapsed]           = useState(0)
  const [groupName,         setGroupName]         = useState('Appel de groupe')
  const [participants,      setParticipants]      = useState([])
  const [status,            setStatus]            = useState('loading')
  const [errorMsg,          setErrorMsg]          = useState('')

  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const params = new URLSearchParams(window.location.search)
    const jobId  = params.get('id')
    if (!jobId) { setErrorMsg('Paramètre id manquant'); setStatus('error'); return }

    fetch(`${SERVER_BASE}/scene/${jobId}`)
      .then(r => { if (!r.ok) throw new Error('Données introuvables'); return r.json() })
      .then(data => {
        setGroupName(data.groupName ?? 'Appel de groupe')
        setParticipants(data.participants ?? [])
        setStatus('playing')
        return runAnimation(data.sequence ?? [])
      })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [])

  async function runAnimation(sequence) {
    await sleep(STABILIZE_MS)

    setPhase('incoming')
    await sleep(INCOMING_MS)

    setPhase('active')

    let elapsedSec = 0
    const timer = setInterval(() => { elapsedSec++; setElapsed(elapsedSec) }, 1000)

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i]
      setActiveCharId(item.characterId ?? null)
      setSubtitle(item.subtitle ?? '')
      await sleep(Math.max(500, Math.round(item.duration * 1000)))
      setActiveCharId(null)
      setSubtitle('')
      if (i < sequence.length - 1) await sleep(PAUSE_MS)
    }

    clearInterval(timer)
    setPhase('ended')
    await sleep(ENDED_MS)

    window.__sceneFinished = true
  }

  return (
    <div style={{
      width: EXPORT_W, height: EXPORT_H,
      overflow: 'hidden', background: '#000', position: 'relative',
    }}>
      {status === 'error' ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', flexDirection: 'column', gap: 12,
          color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', padding: '0 32px',
        }}>
          <span style={{ fontSize: 32 }}>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      ) : (
        <div style={{
          position: 'absolute', left: IPHONE_LEFT, top: 0,
          width: IPHONE_W, height: IPHONE_H,
          transformOrigin: 'top left', transform: `scale(${EXPORT_SCALE})`,
        }}>
          <WhatsAppGroupCallScreen
            statusTime="9:41"
            groupName={groupName}
            participants={participants}
            phase={phase}
            activeCharacterId={activeCharId}
            subtitle={subtitle}
            elapsedSeconds={elapsed}
            onAnswer={() => {}} onDecline={() => {}} onHangup={() => {}}
          />
        </div>
      )}
    </div>
  )
}
