// ─── TrueStoryOverlay — canvas 390×844 pour la True Story ────────────────────
//
// Props :
//   width / height       — dimensions du canvas (390 / 844)
//   bgMode               — 'solid' | 'transparent'
//   bgColor              — couleur de fond (mode solid)
//   subtitle             — texte du sous-titre (Dr KA)
//   subtitleMode         — 'plein' (centre) | 'down' (bas)
//   animationMode        — 'fade' | 'pop' | 'slide-up'
//   textBold / textItalic / textColor / textSizeMultiplier / textFont
//   imageSrc             — URL de l'image courante (blob ou public)
//   imagePosition        — 'center' | 'top-left' | 'top-right'
//   imageSize            — 'small' | 'medium' | 'large' | 'full'
//   animEnter            — animation d'entrée de l'image
//   animExit             — animation de sortie de l'image
//   animLoop             — animation de boucle de l'image
//   imageVisible         — true → image entrante / false → image sortante
//   transitioning        — overlay noir entre paires

import { useState, useEffect, useRef } from 'react'
import { IMAGE_SIZES } from '../../lib/trueStorySequence.js'

// ─── Polices ──────────────────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { key: 'system',      label: 'Système',  css: 'system-ui, sans-serif'                      },
  { key: 'inter',       label: 'Inter',    css: '"Inter", sans-serif'                         },
  { key: 'nunito',      label: 'Nunito',   css: '"Nunito", sans-serif'                        },
  { key: 'roboto',      label: 'Roboto',   css: '"Roboto", sans-serif'                        },
  { key: 'playfair',    label: 'Playfair', css: '"Playfair Display", serif'                   },
  { key: 'merriweather',label: 'Merriw.',  css: '"Merriweather", serif'                       },
  { key: 'montserrat',  label: 'Montser.', css: '"Montserrat", sans-serif'                    },
  { key: 'lato',        label: 'Lato',     css: '"Lato", sans-serif'                          },
  { key: 'oswald',      label: 'Oswald',   css: '"Oswald", sans-serif'                        },
  { key: 'raleway',     label: 'Raleway',  css: '"Raleway", sans-serif'                       },
]

function _fontCss(key) {
  return FONT_OPTIONS.find(f => f.key === key)?.css ?? 'system-ui, sans-serif'
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TRANS_FADE_MS = 300
const KEYFRAMES_ID  = 'ts-overlay-keyframes'

const KEYFRAMES_CSS = `
@keyframes ts-heartbeat   { 0%,100%{transform:scale(1)} 14%{transform:scale(1.07)} 28%{transform:scale(1)} 42%{transform:scale(1.05)} 70%{transform:scale(1)} }
@keyframes ts-breathing   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes ts-float       { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes ts-ken-burns   { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.12) translate(-3%,-3%)} }
@keyframes ts-shake       { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-2deg)} 40%{transform:rotate(2deg)} 60%{transform:rotate(-1.5deg)} 80%{transform:rotate(1.5deg)} }
@keyframes ts-swing       { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(4deg)} 75%{transform:rotate(-4deg)} }
@keyframes ts-glow-pulse  { 0%,100%{filter:drop-shadow(0 0 0px rgba(255,255,255,0))} 50%{filter:drop-shadow(0 0 18px rgba(255,255,255,0.7))} }
@keyframes ts-rotate-loop { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
`

function _injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = KEYFRAMES_CSS
  document.head.appendChild(style)
}

// ─── Styles d'animation image ─────────────────────────────────────────────────

const ENTER_DUR = 420
const EXIT_DUR  = 380

function _enterStyle(anim, visible) {
  const base = { transition: `opacity ${ENTER_DUR}ms ease, transform ${ENTER_DUR}ms cubic-bezier(0.25,0.46,0.45,0.94), filter ${ENTER_DUR}ms ease` }
  if (!visible) {
    switch (anim) {
      case 'pop-in':     return { ...base, opacity: 0, transform: 'scale(0.6)' }
      case 'slide-up':   return { ...base, opacity: 0, transform: 'translateY(40px)' }
      case 'slide-down': return { ...base, opacity: 0, transform: 'translateY(-40px)' }
      case 'slide-left': return { ...base, opacity: 0, transform: 'translateX(60px)' }
      case 'slide-right':return { ...base, opacity: 0, transform: 'translateX(-60px)' }
      case 'zoom-in':    return { ...base, opacity: 0, transform: 'scale(1.4)' }
      case 'flip-x':     return { ...base, opacity: 0, transform: 'rotateX(90deg)' }
      case 'flip-y':     return { ...base, opacity: 0, transform: 'rotateY(90deg)' }
      case 'fade-in':
      default:           return { ...base, opacity: 0 }
    }
  }
  return { ...base, opacity: 1, transform: 'none', filter: 'none' }
}

function _exitStyle(anim, exiting) {
  const base = { transition: `opacity ${EXIT_DUR}ms ease, transform ${EXIT_DUR}ms cubic-bezier(0.55,0,1,0.45), filter ${EXIT_DUR}ms ease` }
  if (!exiting) return { ...base, opacity: 1, transform: 'none' }
  switch (anim) {
    case 'pop-out':    return { ...base, opacity: 0, transform: 'scale(0.5)' }
    case 'slide-up':   return { ...base, opacity: 0, transform: 'translateY(-50px)' }
    case 'slide-down': return { ...base, opacity: 0, transform: 'translateY(60px)' }
    case 'slide-left': return { ...base, opacity: 0, transform: 'translateX(-80px)' }
    case 'slide-right':return { ...base, opacity: 0, transform: 'translateX(80px)' }
    case 'zoom-out':   return { ...base, opacity: 0, transform: 'scale(1.5)' }
    case 'flip-x':     return { ...base, opacity: 0, transform: 'rotateX(-90deg)' }
    case 'flip-y':     return { ...base, opacity: 0, transform: 'rotateY(-90deg)' }
    case 'fade-out':
    default:           return { ...base, opacity: 0 }
  }
}

function _loopAnimation(anim) {
  const map = {
    'heartbeat':   'ts-heartbeat 1.3s ease-in-out infinite',
    'breathing':   'ts-breathing 3s ease-in-out infinite',
    'float':       'ts-float 3.5s ease-in-out infinite',
    'ken-burns':   'ts-ken-burns 8s ease-in-out infinite alternate',
    'shake':       'ts-shake 0.5s ease-in-out infinite',
    'swing':       'ts-swing 2s ease-in-out infinite',
    'glow-pulse':  'ts-glow-pulse 2s ease-in-out infinite',
    'rotate-loop': 'ts-rotate-loop 8s linear infinite',
  }
  return map[anim] ?? 'none'
}

// ─── Styles de sous-titre ─────────────────────────────────────────────────────

const SUBTITLE_FADE_MS = 280

function _subtitleAnimStyle(mode, visible) {
  const base = {
    transition: `opacity ${SUBTITLE_FADE_MS}ms ease, transform ${SUBTITLE_FADE_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`,
  }
  if (!visible) {
    if (mode === 'pop')      return { ...base, opacity: 0, transform: 'scale(0.78)' }
    if (mode === 'slide-up') return { ...base, opacity: 0, transform: 'translateY(32px)' }
    return { ...base, opacity: 0 }
  }
  return { ...base, opacity: 1, transform: 'none' }
}

function _subtitleTransition(mode) {
  if (mode === 'pop')      return `${SUBTITLE_FADE_MS}ms cubic-bezier(0.34,1.56,0.64,1)`
  if (mode === 'slide-up') return `${SUBTITLE_FADE_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`
  return `${SUBTITLE_FADE_MS}ms ease`
}

// ─── Composant Image ──────────────────────────────────────────────────────────

function TrueStoryImage({ src, position, size, animEnter, animExit, animLoop, canvasW, canvasH }) {
  const [displayed, setDisplayed] = useState(false)
  const [visible,   setVisible]   = useState(false)
  const [exiting,   setExiting]   = useState(false)
  const prevSrcRef                = useRef(null)

  useEffect(() => { _injectKeyframes() }, [])

  useEffect(() => {
    if (src === prevSrcRef.current) return
    const prev = prevSrcRef.current
    prevSrcRef.current = src

    if (!src) {
      // sortie
      setExiting(true)
      setTimeout(() => { setDisplayed(false); setVisible(false); setExiting(false) }, EXIT_DUR + 30)
      return
    }

    if (prev) {
      // sortie puis entrée
      setExiting(true)
      setTimeout(() => {
        setExiting(false)
        setDisplayed(true)
        setVisible(false)
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      }, EXIT_DUR + 30)
    } else {
      // entrée directe
      setDisplayed(true)
      setVisible(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }
  }, [src])

  if (!displayed && !exiting) return null

  const sizePct  = IMAGE_SIZES.find(s => s.val === size)?.pct ?? 0.60
  const imgW     = Math.round(canvasW * sizePct)

  const posStyle = _positionStyle(position, canvasW, canvasH, imgW)
  const outerStyle = exiting ? _exitStyle(animExit, true) : _enterStyle(animEnter, visible)
  const loopAnim   = (!exiting && visible) ? _loopAnimation(animLoop) : 'none'

  return (
    <div style={{
      position: 'absolute',
      ...posStyle,
      width:  imgW,
      zIndex: 5,
      ...outerStyle,
    }}>
      <div style={{ animation: loopAnim, width: '100%' }}>
        <img
          src={src}
          alt=""
          style={{
            width:        '100%',
            height:       'auto',
            display:      'block',
            borderRadius: 12,
            boxShadow:    '0 4px 24px rgba(0,0,0,0.4)',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

function _positionStyle(position, canvasW, canvasH, imgW) {
  const pad = 20
  switch (position) {
    case 'top-left':  return { top: pad + 60, left: pad }
    case 'top-right': return { top: pad + 60, right: pad }
    case 'center':
    default:          return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TrueStoryOverlay({
  width  = 390,
  height = 844,
  bgMode = 'solid',
  bgColor = '#111111',
  subtitle = '',
  subtitleMode = 'plein',
  animationMode = 'fade',
  textBold           = true,
  textItalic         = false,
  textColor          = '#ffffff',
  textSizeMultiplier = 1.0,
  textFont           = 'system',
  imageSrc           = null,
  imagePosition      = 'center',
  imageSize          = 'medium',
  animEnter          = 'fade-in',
  animExit           = 'fade-out',
  animLoop           = 'none',
  imageVisible       = true,
  transitioning      = false,
}) {
  // ── Sous-titre ──────────────────────────────────────────────────────────────
  const [subDisplayed, setSubDisplayed] = useState(false)
  const [subVisible,   setSubVisible]   = useState(false)
  const prevSubRef = useRef('')

  useEffect(() => {
    if (subtitle === prevSubRef.current) return
    const prev = prevSubRef.current
    prevSubRef.current = subtitle

    if (!subtitle) {
      setSubVisible(false)
      setTimeout(() => setSubDisplayed(false), SUBTITLE_FADE_MS + 30)
      return
    }

    if (prev) {
      setSubVisible(false)
      setTimeout(() => {
        setSubDisplayed(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setSubVisible(true)))
      }, SUBTITLE_FADE_MS + 30)
    } else {
      setSubDisplayed(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setSubVisible(true)))
    }
  }, [subtitle])

  // ── Position sous-titre ─────────────────────────────────────────────────────
  const fontSize   = Math.round(17 * textSizeMultiplier)
  const pillPadH   = Math.round(14 * textSizeMultiplier)
  const pillPadV   = Math.round(10 * textSizeMultiplier)
  const pillRadius = Math.round(14 * textSizeMultiplier)
  const fontCss    = _fontCss(textFont)

  const verticalTop = subtitleMode === 'down' ? height - 100 : Math.round(height * 0.55)
  const translateY  = subtitleMode === 'down' ? '-100%' : '-50%'

  const bgStyle = bgMode === 'transparent'
    ? { background: `rgba(0,0,0,0.6)` }
    : { background: bgColor === '#ffffff' || bgColor === '#fff' ? 'rgba(0,0,0,0.7)' : bgColor }

  const transitionProp = _subtitleTransition(animationMode)

  return (
    <div style={{
      width,
      height,
      position:   'relative',
      overflow:   'hidden',
      background: bgMode === 'solid' ? bgColor : 'transparent',
    }}>

      {/* ── Image ── */}
      <TrueStoryImage
        src={imageSrc && imageVisible ? imageSrc : null}
        position={imagePosition}
        size={imageSize}
        animEnter={animEnter}
        animExit={animExit}
        animLoop={animLoop}
        canvasW={width}
        canvasH={height}
      />

      {/* ── Sous-titre ── */}
      {subDisplayed && (
        <div style={{
          position:  'absolute',
          left:      0,
          right:     0,
          top:       verticalTop,
          transform: `translateY(${translateY})`,
          display:   'flex',
          justifyContent: 'center',
          padding:   '0 24px',
          zIndex:    10,
        }}>
          <div style={{
            display:        'inline-flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            Math.round(6 * textSizeMultiplier),
            ..._subtitleAnimStyle(animationMode, subVisible),
            transition: `opacity ${transitionProp}, transform ${transitionProp}`,
          }}>
            <div style={{
              background:   'rgba(0,0,0,0.55)',
              borderRadius: pillRadius,
              padding:      `${pillPadV}px ${pillPadH}px`,
              backdropFilter: 'blur(6px)',
            }}>
              <p style={{
                margin:      0,
                fontSize,
                fontFamily:  fontCss,
                fontWeight:  textBold   ? 800 : 400,
                fontStyle:   textItalic ? 'italic' : 'normal',
                color:       textColor,
                lineHeight:  1.45,
                textAlign:   'center',
                whiteSpace:  'pre-wrap',
                letterSpacing: '0.01em',
              }}>
                {subtitle || prevSubRef.current}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay de transition au noir ── */}
      <div style={{
        position:   'absolute',
        inset:      0,
        zIndex:     20,
        background: '#000',
        opacity:    transitioning ? 1 : 0,
        transition: `opacity ${TRANS_FADE_MS}ms ease`,
        pointerEvents: 'none',
      }} />

    </div>
  )
}
