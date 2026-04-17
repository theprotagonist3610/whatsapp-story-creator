// ─── HeadlessTransparent ─────────────────────────────────────────────────────
//
// Page publique : /headless-transparent?id=<sceneId>
//
// Rendu Puppeteer — fond transparent, conversation seule.
// Viewport : 1080×1920 (Instagram 9:16).
// La conversation (390×844) est mise à l'échelle par la hauteur :
//   SCALE = 1920 / 844 ≈ 2.275
//   → largeur effective ≈ 887px, centrée dans 1080px (marges transparentes ~96px)
//
// Signal de fin : window.__sceneFinished = true

import { useEffect, useRef, useState } from 'react'
import TransparentConversation, { CONV_W, CONV_H } from '../../components/transparent/TransparentConversation.jsx'

const SERVER_BASE  = 'http://localhost:3001'
const EXPORT_W     = 1080
const EXPORT_H     = 1920
const EXPORT_SCALE = EXPORT_H / CONV_H   // ≈ 2.2749

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function HeadlessTransparent() {
  const [status,     setStatus]     = useState('loading')  // loading | error | playing | done
  const [errorMsg,   setErrorMsg]   = useState('')
  const [bubbles,    setBubbles]    = useState([])
  const [isTyping,   setIsTyping]   = useState(false)
  const [typingName, setTypingName] = useState('')
  const [glass,      setGlass]      = useState(false)
  const captureRef  = useRef(null)
  const hasStarted  = useRef(false)   // garde contre le double-mount de StrictMode

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const params  = new URLSearchParams(window.location.search)
    const sceneId = params.get('id')
    if (!sceneId) { setErrorMsg('Paramètre id manquant'); setStatus('error'); return }

    fetch(`${SERVER_BASE}/scene/${sceneId}`)
      .then(r => { if (!r.ok) throw new Error('Scène introuvable'); return r.json() })
      .then(data => {
        setGlass(data.glass ?? false)
        return runScene(data.steps ?? [])
      })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [])

  async function runScene(steps) {
    setStatus('playing')
    await sleep(300)   // laisse Puppeteer stabiliser la vue

    for (const step of steps) {
      switch (step.type) {
        case 'typingIndicator':
          setIsTyping(true)
          setTypingName(step.characterName ?? '')
          await sleep(step.duration ?? 1000)
          setIsTyping(false)
          break

        case 'writeMessage':
          setIsTyping(false)
          setBubbles(prev => [...prev, {
            id:            step.id,
            side:          step.side,
            type:          step.msgType,
            text:          step.text,
            time:          step.time,
            characterName: step.characterName,
            attachmentUrl: step.attachmentUrl,
            duration:      step.duration,
            status:        step.side === 'outgoing' ? 'read' : undefined,
            isNew:         true,
          }])
          await sleep(400)
          break

        case 'wait':
          await sleep(step.duration ?? 1000)
          break

        default:
          break
      }
    }

    await sleep(800)   // frames finales
    setStatus('done')
    window.__sceneFinished = true
  }

  // ── Mise à l'échelle dans le viewport 1080×1920 ───────────────────────────

  const outerStyle = {
    width:           EXPORT_W,
    height:          EXPORT_H,
    overflow:        'hidden',
    background:      'transparent',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    position:        'relative',
  }

  const innerStyle = {
    width:           CONV_W,
    height:          CONV_H,
    transform:       `scale(${EXPORT_SCALE})`,
    transformOrigin: 'center center',
    flexShrink:      0,
  }

  if (status === 'error') {
    return (
      <div style={{ ...outerStyle, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'red', fontFamily: 'monospace', fontSize: 16 }}>
          Erreur : {errorMsg}
        </p>
      </div>
    )
  }

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <TransparentConversation
          bubbles={bubbles}
          isTyping={isTyping}
          typingName={typingName}
          captureRef={captureRef}
          glass={glass}
        />
      </div>
    </div>
  )
}
