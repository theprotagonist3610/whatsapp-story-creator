import { useEffect, useState } from 'react'

// ─── Points de rupture (alignés sur Tailwind v4 defaults) ────────────────────
export const BREAKPOINTS = {
  sm:  640,
  md:  768,   // seuil mobile ↔ desktop
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
}

/**
 * Retourne l'orientation actuelle de l'écran.
 * Préfère screen.orientation (standard) avec fallback sur matchMedia.
 */
function getOrientation() {
  if (typeof window === 'undefined') return 'portrait'

  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape')
      ? 'landscape'
      : 'portrait'
  }
  // Fallback matchMedia
  return window.matchMedia('(orientation: landscape)').matches
    ? 'landscape'
    : 'portrait'
}

/**
 * Retourne le nom du breakpoint actif selon la largeur de la fenêtre.
 * Exemples :
 *   320px  → 'base'
 *   700px  → 'sm'
 *   900px  → 'md'
 *   1100px → 'lg'
 */
function getBreakpointName(width) {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl)    return 'xl'
  if (width >= BREAKPOINTS.lg)    return 'lg'
  if (width >= BREAKPOINTS.md)    return 'md'
  if (width >= BREAKPOINTS.sm)    return 'sm'
  return 'base'
}

/**
 * Hook useBreakpoint
 *
 * Retourne :
 *   - breakpoint  : 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 *   - width       : largeur de fenêtre en px
 *   - height      : hauteur de fenêtre en px
 *   - orientation : 'portrait' | 'landscape'
 *   - isMobile    : true si width < 768 (breakpoint md)
 *   - isDesktop   : true si width >= 768
 *   - isPortrait  : raccourci orientation === 'portrait'
 *   - isLandscape : raccourci orientation === 'landscape'
 *
 * Usage :
 *   const { isMobile, isLandscape } = useBreakpoint()
 */
export default function useBreakpoint() {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint:  'base',
        width:       0,
        height:      0,
        orientation: 'portrait',
      }
    }
    return {
      breakpoint:  getBreakpointName(window.innerWidth),
      width:       window.innerWidth,
      height:      window.innerHeight,
      orientation: getOrientation(),
    }
  })

  useEffect(() => {
    function update() {
      setState({
        breakpoint:  getBreakpointName(window.innerWidth),
        width:       window.innerWidth,
        height:      window.innerHeight,
        orientation: getOrientation(),
      })
    }

    // ResizeObserver sur document.documentElement pour une détection précise
    // (couvre aussi le zoom navigateur et le clavier virtuel mobile)
    const ro = new ResizeObserver(update)
    ro.observe(document.documentElement)

    // Événement de rotation (iOS / Android)
    window.addEventListener('orientationchange', update)

    // Changement d'orientation via matchMedia (desktop, Chrome DevTools)
    const mql = window.matchMedia('(orientation: landscape)')
    mql.addEventListener('change', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', update)
      mql.removeEventListener('change', update)
    }
  }, [])

  return {
    breakpoint:  state.breakpoint,
    width:       state.width,
    height:      state.height,
    orientation: state.orientation,
    isMobile:    state.width < BREAKPOINTS.md,
    isDesktop:   state.width >= BREAKPOINTS.md,
    isPortrait:  state.orientation === 'portrait',
    isLandscape: state.orientation === 'landscape',
    // Helpers booléens par breakpoint nommé
    isSm:  state.width >= BREAKPOINTS.sm,
    isMd:  state.width >= BREAKPOINTS.md,
    isLg:  state.width >= BREAKPOINTS.lg,
    isXl:  state.width >= BREAKPOINTS.xl,
    is2xl: state.width >= BREAKPOINTS['2xl'],
  }
}
