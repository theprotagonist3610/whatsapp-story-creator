// ─── HeadlessTrueStoryTransparent ────────────────────────────────────────────
//
// Variante transparente — fond conteneur transparent pour capture alpha Puppeteer.
// Mêmes params URL que HeadlessTrueStory, sauf pas de &color.

import { useState, useEffect, useRef } from 'react'
import TrueStoryOverlay, { FONT_OPTIONS } from '../../components/truestory/TrueStoryOverlay.jsx'
import { getPhotoPublicUrl } from '../../lib/supabase.js'

function _validFontKey(k) {
  return FONT_OPTIONS.some(f => f.key === k) ? k : 'system'
}

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
const SUBTITLE_DELAY_MS = 300

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

export default function HeadlessTrueStoryTransparent() {
  const [subtitle,           setSubtitle]           = useState('')
  const [imageSrc,           setImageSrc]           = useState(null)
  const [imagePosition,      setImagePosition]      = useState('center')
  const [imageSize,          setImageSize]          = useState('medium')
  const [animEnter,          setAnimEnter]          = useState('fade-in')
  const [animExit,           setAnimExit]           = useState('fade-out')
  const [animLoop,           setAnimLoop]           = useState('none')
  const [transitioning,      setTransitioning]      = useState(false)
  const [subtitleMode,       setSubtitleMode]       = useState('down')
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
    const mode     = params.get('mode')      ?? 'down'
    const bold     = params.get('bold')      !== 'false'
    const italic   = params.get('italic')    === 'true'
    const tColor   = params.get('textColor') ?? '#ffffff'
    const tSize    = Math.min(2, Math.max(0.5, parseFloat(params.get('textSize') ?? '1.0')))
    const font     = _validFontKey(params.get('font') ?? 'system')
    const animMode = params.get('animMode')  ?? 'fade'
    const transDur = Math.max(0, parseInt(params.get('transDur') ?? '0'))

    if (!jobId) { setErrorMsg('Paramètre id manquant'); setStatus('error'); return }

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
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [])

  async function runAnimation(sequence, transDur) {
    await document.fonts.ready
    await sleep(STABILIZE_MS)

    for (let i = 0; i < sequence.length; i++) {
      const item = sequence[i]

      const imgSrc = item.imagePath ? getPhotoPublicUrl(item.imagePath) : null
      setImageSrc(imgSrc)
      setImagePosition(item.imagePosition ?? 'center')
      setImageSize(item.imageSize ?? 'medium')
      setAnimEnter(item.animEnter ?? 'fade-in')
      setAnimExit(item.animExit ?? 'fade-out')
      setAnimLoop(item.animLoop ?? 'none')

      await sleep(SUBTITLE_DELAY_MS)
      setSubtitle(item.subtitle ?? '')

      await sleep(Math.max(500, Math.round(item.duration * 1000)) - SUBTITLE_DELAY_MS)

      setSubtitle('')
      setImageSrc(null)

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
          <TrueStoryOverlay
            width={CANVAS_W}
            height={CANVAS_H}
            bgMode="transparent"
            subtitle={subtitle}
            subtitleMode={subtitleMode}
            animationMode={animationMode}
            textBold={textBold}
            textItalic={textItalic}
            textColor={textColor}
            textSizeMultiplier={textSizeMultiplier}
            textFont={textFont}
            imageSrc={imageSrc}
            imagePosition={imagePosition}
            imageSize={imageSize}
            animEnter={animEnter}
            animExit={animExit}
            animLoop={animLoop}
            imageVisible={true}
            transitioning={transitioning}
          />
        </div>
      )}
    </div>
  )
}
