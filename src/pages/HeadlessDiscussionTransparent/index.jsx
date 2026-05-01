// ─── HeadlessDiscussionTransparent ────────────────────────────────────────────
//
// Page publique : /headless-discussion-transparent?id=<jobId>&opacity=0.5&mode=plein
//   &bold=<bool>&italic=<bool>&textColor=<hex>&textSize=<mult>&font=<key>
//   &animMode=<fade|pop|slide-up>&transDur=<ms>
//
// Variante transparente — fond conteneur transparent pour capture alpha Puppeteer.
//
// Params URL :
//   id       — jobId
//   opacity  — opacité de la pilule (0.3 / 0.5 / 0.8)
//   mode     — 'plein' | 'down'
//   bold, italic, textColor, textSize, font — style du texte
//   animMode  — 'fade' | 'pop' | 'slide-up'
//   transDur  — durée du noir entre répliques en ms (0 = désactivé)

import { useState, useEffect, useRef } from 'react'
import DiscussionOverlay, { FONT_OPTIONS } from '../../components/discussion/DiscussionOverlay.jsx'

function _validFontKey(k) {
  return FONT_OPTIONS.some(f => f.key === k) ? k : 'system'
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVER_BASE   = 'http://localhost:3001'
const CANVAS_W      = 390
const CANVAS_H      = 844
const EXPORT_W      = 1080
const EXPORT_H      = 1920
const EXPORT_SCALE  = EXPORT_H / CANVAS_H
const CANVAS_LEFT   = Math.round((EXPORT_W - CANVAS_W * EXPORT_SCALE) / 2)

const PAUSE_MS      = 700
const ENDED_MS      = 1500
const STABILIZE_MS  = 400
const TRANS_FADE_MS = 300

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HeadlessDiscussionTransparent() {
  const [subtitle,           setSubtitle]           = useState('')
  const [speakerName,        setSpeakerName]        = useState('')
  const [transitioning,      setTransitioning]      = useState(false)
  const [subtitleMode,       setSubtitleMode]       = useState('plein')
  const [bgOpacity,          setBgOpacity]          = useState(0.50)
  const [textBold,           setTextBold]           = useState(true)
  const [textItalic,         setTextItalic]         = useState(false)
  const [textColor,          setTextColor]          = useState('#ffffff')
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(1.0)
  const [textFont,           setTextFont]           = useState('system')
  const [animationMode,      setAnimationMode]      = useState('fade')
  const [status,             setStatus]             = useState('loading')
  const [errorMsg,           setErrorMsg]           = useState('')

  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const params   = new URLSearchParams(window.location.search)
    const jobId    = params.get('id')
    const opacity  = Math.min(1, Math.max(0, parseFloat(params.get('opacity') ?? '0.50')))
    const mode     = params.get('mode')      ?? 'plein'
    const bold     = params.get('bold')      !== 'false'
    const italic   = params.get('italic')    === 'true'
    const tColor   = params.get('textColor') ?? '#ffffff'
    const tSize    = Math.min(2, Math.max(0.5, parseFloat(params.get('textSize') ?? '1.0')))
    const font     = _validFontKey(params.get('font') ?? 'system')
    const animMode = params.get('animMode')  ?? 'fade'
    const transDur = Math.max(0, parseInt(params.get('transDur') ?? '0'))

    if (!jobId) {
      setErrorMsg('Paramètre id manquant')
      setStatus('error')
      return
    }

    setBgOpacity(opacity)
    setSubtitleMode(mode)
    setTextBold(bold)
    setTextItalic(italic)
    setTextColor(tColor)
    setTextSizeMultiplier(tSize)
    setTextFont(font)
    setAnimationMode(['fade', 'pop', 'slide-up'].includes(animMode) ? animMode : 'fade')

    fetch(`${SERVER_BASE}/scene/${jobId}`)
      .then(r => { if (!r.ok) throw new Error('Données introuvables'); return r.json() })
      .then(data => {
        setStatus('playing')
        return runAnimation(data.sequence ?? [], transDur)
      })
      .catch(err => {
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, [])

  async function runAnimation(sequence, transDur) {
    await document.fonts.ready
    await sleep(STABILIZE_MS)

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i]
      setSubtitle(item.subtitle ?? '')
      setSpeakerName(item.speakerName ?? '')
      await sleep(Math.max(500, Math.round(item.duration * 1000)))
      setSubtitle('')
      setSpeakerName('')

      if (i < sequence.length - 1) {
        if (transDur > 0) {
          setTransitioning(true)
          await sleep(TRANS_FADE_MS + transDur)
          setTransitioning(false)
          await sleep(TRANS_FADE_MS)
        } else {
          await sleep(PAUSE_MS)
        }
      }
    }

    await sleep(ENDED_MS)
    window.__sceneFinished = true
  }

  // ── Rendu — fond conteneur transparent pour que Puppeteer capture l'alpha ──

  return (
    <div style={{
      width:      EXPORT_W,
      height:     EXPORT_H,
      overflow:   'hidden',
      background: 'transparent',
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
          left:            CANVAS_LEFT,
          top:             0,
          width:           CANVAS_W,
          height:          CANVAS_H,
          transformOrigin: 'top left',
          transform:       `scale(${EXPORT_SCALE})`,
        }}>
          <DiscussionOverlay
            subtitle={subtitle}
            speakerName={speakerName}
            subtitleMode={subtitleMode}
            bgMode="transparent"
            bgOpacity={bgOpacity}
            animationMode={animationMode}
            transitioning={transitioning}
            textBold={textBold}
            textItalic={textItalic}
            textColor={textColor}
            textSizeMultiplier={textSizeMultiplier}
            textFont={textFont}
            width={CANVAS_W}
            height={CANVAS_H}
          />
        </div>
      )}
    </div>
  )
}
