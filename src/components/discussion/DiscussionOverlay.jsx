// ─── DiscussionOverlay — affichage animé des sous-titres de discussion ────────
//
// Modes de fond :
//   transparent — fond alpha 0, pilule derrière le texte avec opacité rgba
//   solid       — fond uni couleur choisie par l'utilisateur
//
// Modes de position :
//   plein — sous-titres centrés verticalement (50 % de l'écran)
//   down  — sous-titres à 80 % depuis le haut (20 % depuis le bas)
//
// Modes d'animation (animationMode) :
//   fade     — fondu entrant/sortant (défaut)
//   pop      — apparition avec sur-échelle spring, disparition rétrécissement
//   slide-up — glissement vers le haut + fondu
//
// Nom du personnage :
//   speakerName — petite capsule au-dessus de la pilule, anime avec le sous-titre
//
// Transition scénique :
//   transitioning — overlay noir plein écran (CSS transition 300 ms)

import { useState, useEffect, useRef } from 'react'

// ─── Polices disponibles ──────────────────────────────────────────────────────

export const FONT_OPTIONS = [
  { key: 'system',    label: 'Système',    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { key: 'roboto',    label: 'Roboto',     css: '"Roboto", sans-serif' },
  { key: 'nunito',    label: 'Nunito',     css: '"Nunito", sans-serif' },
  { key: 'montserrat',label: 'Montserrat', css: '"Montserrat", sans-serif' },
  { key: 'poppins',   label: 'Poppins',    css: '"Poppins", sans-serif' },
  { key: 'oswald',    label: 'Oswald',     css: '"Oswald", sans-serif' },
  { key: 'bebas',     label: 'Bebas',      css: '"Bebas Neue", sans-serif' },
  { key: 'playfair',  label: 'Playfair',   css: '"Playfair Display", serif' },
  { key: 'dancing',   label: 'Dancing',    css: '"Dancing Script", cursive' },
  { key: 'impact',    label: 'Impact',     css: 'Impact, "Arial Narrow", sans-serif' },
]

function _fontCss(key) {
  return (FONT_OPTIONS.find(f => f.key === key) ?? FONT_OPTIONS[0]).css
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const FADE_MS       = 280   // durée fadeIn/fadeOut sous-titres
const TRANS_FADE_MS = 300   // durée fondu de l'overlay de transition

// ─── Style d'animation selon le mode ─────────────────────────────────────────

function _animStyle(mode, visible) {
  if (mode === 'pop') return {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'scale(1)' : 'scale(0.78)',
    transition: `opacity ${FADE_MS}ms ease-in-out, transform ${FADE_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
  }
  if (mode === 'slide-up') return {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0px)' : 'translateY(32px)',
    transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
  }
  return {
    opacity:    visible ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DiscussionOverlay({
  subtitle           = '',
  subtitleMode       = 'plein',
  bgMode             = 'transparent',
  bgOpacity          = 0.5,
  bgColor            = '#111111',
  textBold           = true,
  textItalic         = false,
  textColor          = '#ffffff',
  textSizeMultiplier = 1.0,
  textFont           = 'system',
  animationMode      = 'fade',
  speakerName        = '',
  transitioning      = false,
  width              = 390,
  height             = 844,
}) {

  // ── Animation fadeIn/fadeOut ─────────────────────────────────────────────────

  const [displayed, setDisplayed] = useState('')
  const [visible,   setVisible]   = useState(false)
  const fadeRef    = useRef(null)
  const prevSubRef = useRef('')

  useEffect(() => {
    clearTimeout(fadeRef.current)

    const prev = prevSubRef.current
    const next = subtitle?.trim() ?? ''
    prevSubRef.current = next

    if (next === prev) return

    if (!next) {
      setVisible(false)
      fadeRef.current = setTimeout(() => setDisplayed(''), FADE_MS)
    } else if (!prev) {
      setDisplayed(next)
      fadeRef.current = setTimeout(() => setVisible(true), 30)
    } else {
      setVisible(false)
      fadeRef.current = setTimeout(() => {
        setDisplayed(next)
        setTimeout(() => setVisible(true), 30)
      }, FADE_MS)
    }

    return () => clearTimeout(fadeRef.current)
  }, [subtitle])

  // ── Styles ──────────────────────────────────────────────────────────────────

  const containerBg = bgMode === 'solid' ? bgColor : 'transparent'

  const pillBg = bgMode === 'transparent'
    ? `rgba(0,0,0,${bgOpacity})`
    : 'transparent'

  const textShadow = bgMode === 'transparent'
    ? '0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9)'
    : '0 1px 4px rgba(0,0,0,0.25)'

  const fontSize = Math.round(width * 0.087 * textSizeMultiplier)
  const fontCss  = _fontCss(textFont)

  const verticalTop = subtitleMode === 'plein' ? '50%' : '80%'

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width,
      height,
      background:  containerBg,
      position:    'relative',
      overflow:    'hidden',
      fontFamily:  fontCss,
    }}>

      {/* Bloc sous-titre positionné via top + translateY */}
      <div style={{
        position:      'absolute',
        left:          Math.round(width * 0.06),
        right:         Math.round(width * 0.06),
        top:           verticalTop,
        transform:     'translateY(-50%)',
        zIndex:        10,
        textAlign:     'center',
        pointerEvents: 'none',
      }}>
        {/* Wrapper animé — nom + pilule partagent la même transition */}
        <div style={{
          display:       'inline-flex',
          flexDirection: 'column',
          alignItems:    'center',
          gap:           Math.round(height * 0.007),
          ..._animStyle(animationMode, visible),
        }}>

          {/* Nom du personnage */}
          {displayed && speakerName && (
            <p style={{
              color:         textColor,
              fontSize:      Math.round(fontSize * 0.52),
              fontWeight:    800,
              fontFamily:    fontCss,
              fontStyle:     'normal',
              lineHeight:    1,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow:    '0 1px 6px rgba(0,0,0,0.75)',
              opacity:       0.82,
              margin:        0,
            }}>
              {speakerName}
            </p>
          )}

          {/* Pilule de sous-titre */}
          {displayed && (
            <div style={{
              background:   pillBg,
              borderRadius: bgMode === 'transparent' ? Math.round(width * 0.051) : 0,
              padding:      bgMode === 'transparent'
                ? `${Math.round(height * 0.019)}px ${Math.round(width * 0.062)}px`
                : `${Math.round(height * 0.009)}px 0`,
              display:      'inline-block',
              maxWidth:     '100%',
            }}>
              <p style={{
                color:      textColor,
                fontSize,
                fontWeight: textBold   ? 800 : 400,
                fontStyle:  textItalic ? 'italic' : 'normal',
                fontFamily: fontCss,
                lineHeight: 1.38,
                textShadow,
                margin:     0,
                whiteSpace: 'pre-line',
                wordBreak:  'break-word',
              }}>
                {displayed}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Overlay de transition — fondu au noir entre répliques */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    '#000000',
        opacity:       transitioning ? 1 : 0,
        transition:    `opacity ${TRANS_FADE_MS}ms ease-in-out`,
        zIndex:        20,
        pointerEvents: 'none',
      }} />

    </div>
  )
}
