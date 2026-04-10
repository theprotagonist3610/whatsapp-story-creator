import {
  PhoneIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import wallpaperImg from '../../assets/wallpaper/WhatsApp Image 2026-04-10 at 15.34.26.jpeg'

// ── SVG assets iOS ────────────────────────────────────────────────────────────
import svgWhatsapp    from '../../assets/iphone/icons8-whatsapp-96.svg'
import svgMessages    from '../../assets/iphone/ios-message.svg'
import svgMail        from '../../assets/iphone/mail.svg'
import svgSafari      from '../../assets/iphone/icons8-safari-96.svg'
import svgPhotos      from '../../assets/iphone/icons8-ios-photos.svg'
import svgCamera      from '../../assets/iphone/camera.svg'
import svgMaison      from '../../assets/iphone/home.svg'
import svgMusique     from '../../assets/iphone/apple-music.svg'
import svgAppleTv     from '../../assets/iphone/apple-tv.svg'
import svgAppStore    from '../../assets/iphone/app-store.svg'
import svgRaccourcis  from '../../assets/iphone/my-shortcuts.svg'
import svgLivres      from '../../assets/iphone/books.svg'
import svgCalculatrice from '../../assets/iphone/calculator.svg'
import svgTiktok      from '../../assets/iphone/icons8-tiktok-96.svg'
import svgInstagram   from '../../assets/iphone/icons8-instagram-96.svg'
import svgFacebook    from '../../assets/iphone/icons8-facebook-96.svg'

import StatusBar from './StatusBar.jsx'
import { HomeIndicator } from './LockScreen.jsx'

// ─── HomeScreen — écran d'accueil iOS 15 (iPhone 13 Pro Max) ─────────────────
// Dimensions : 390×844px

const DEFAULT_WALLPAPER = `url(${wallpaperImg})`

// Grille 4×4
// svg      : icône 120×120 auto-suffisante (fond inclus) → <img> direct
// svgOnBg  : icône 48×48 sans fond iOS → rendue dans un div coloré
// Icon/bg  : Phosphor sur fond coloré
// badgeKey : clé de prop badges{} pour cet app (ex: 'whatsapp')
const APP_GRID = [
  // Ligne 1
  { name: 'WhatsApp',    svgOnBg: svgWhatsapp,  bg: '#25D366', badgeKey: 'whatsapp'  },
  { name: 'Messages',    svg: svgMessages,                      badgeKey: 'messages'  },
  { name: 'Mail',        svg: svgMail,                          badgeKey: 'mail'      },
  { name: 'Safari',      svgOnBg: svgSafari,    bg: '#ffffff' },
  // Ligne 2
  { name: 'Photos',      svgOnBg: svgPhotos,    bg: '#ffffff' },
  { name: 'Caméra',      svg: svgCamera },
  { name: 'Maison',      svg: svgMaison },
  { name: 'Musique',     svg: svgMusique },
  // Ligne 3
  { name: 'TikTok',      svgOnBg: svgTiktok,    bg: '#000000' },
  { name: 'Facebook',    svgOnBg: svgFacebook,  bg: '#ffffff', badgeKey: 'facebook'  },
  { name: 'Instagram',   svgOnBg: svgInstagram, bg: '#ffffff', badgeKey: 'instagram' },
  { name: 'Apple TV',    svg: svgAppleTv },
  // Ligne 4
  { name: 'App Store',   svg: svgAppStore },
  { name: 'Raccourcis',  svg: svgRaccourcis },
  { name: 'Livres',      svg: svgLivres },
  { name: 'Calculatrice',svg: svgCalculatrice },
]

// Dock — Messages et Mail peuvent aussi avoir des badges
const DOCK_APPS = [
  { name: 'Téléphone',  Icon: PhoneIcon,        bg: '#34C759' },
  { name: 'Safari',     svgOnBg: svgSafari,     bg: '#ffffff' },
  { name: 'Messages',   svg: svgMessages,                      badgeKey: 'messages' },
  { name: 'Mail',       svg: svgMail,                          badgeKey: 'mail'     },
]

export default function HomeScreen({
  statusTime    = '9:41',
  wallpaper     = DEFAULT_WALLPAPER,
  // badges : { whatsapp, messages, mail, instagram, facebook } — 0 ou absent = pas de badge
  badges        = { whatsapp: 2, mail: 4, instagram: 7, facebook: 3 },
  highlightApp  = null,
}) {
  const resolveBadge = (badgeKey) => (badgeKey ? (badges[badgeKey] ?? 0) : 0)

  const grid     = APP_GRID.map((app)  => ({ ...app, badgeCount: resolveBadge(app.badgeKey)  }))
  const dockApps = DOCK_APPS.map((app) => ({ ...app, badgeCount: resolveBadge(app.badgeKey) }))

  return (
    <div
      style={{
        width: 390,
        height: 844,
        background: wallpaper,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)', zIndex: 0 }} />

      {/* StatusBar */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <StatusBar time={statusTime} theme="dark" />
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', zIndex: 2, paddingInline: 16, marginTop: 8, marginBottom: 16 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            paddingInline: 12,
            gap: 6,
          }}
        >
          <MagnifyingGlassIcon size={14} color="rgba(255,255,255,0.6)" weight="regular" />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Rechercher</span>
        </div>
      </div>

      {/* Grille d'apps */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          paddingInline: 22,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '18px 10px',
        }}
      >
        {grid.map((app) => (
          <AppIcon key={app.name} {...app} highlighted={highlightApp === app.name} />
        ))}
      </div>

      {/* Dock */}
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: 16,
          right: 16,
          zIndex: 2,
          background: 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          border: '0.5px solid rgba(255,255,255,0.3)',
        }}
      >
        {dockApps.map((app) => (
          <AppIcon key={app.name} {...app} size={56} highlighted={highlightApp === app.name} />
        ))}
      </div>

      {/* Home indicator */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
        <HomeIndicator theme="dark" />
      </div>
    </div>
  )
}

// ─── Icône d'app ──────────────────────────────────────────────────────────────

function AppIcon({ name, svg, svgOnBg, Icon, iconColor = '#ffffff', bg, badgeCount = 0, highlighted = false, size = 60 }) {
  const radius = size * 0.225
  const shadow = highlighted
    ? '0 0 0 3px rgba(255,255,255,0.8), 0 4px 16px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.25)'
  const transform = highlighted ? 'scale(1.08)' : 'scale(1)'

  const renderIcon = () => {
    // SVG 120×120 auto-suffisant → img direct
    if (svg) {
      return (
        <img
          src={svg}
          alt={name}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            display: 'block',
            boxShadow: shadow,
            transform,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        />
      )
    }

    // SVG 48×48 sans fond iOS → on enveloppe dans un div coloré avec padding
    if (svgOnBg) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: bg ?? '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: size * 0.08,
            boxSizing: 'border-box',
            boxShadow: shadow,
            transform,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          <img
            src={svgOnBg}
            alt={name}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      )
    }

    // Phosphor sur fond coloré
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: shadow,
          transform,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
      >
        {Icon && <Icon size={Math.round(size * 0.47)} color={iconColor} weight="fill" />}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        position: 'relative',
      }}
    >
      {renderIcon()}

      {/* Badge */}
      {badgeCount > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            backgroundColor: '#FF3B30',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingInline: 4,
            border: '2px solid rgba(0,0,0,0.5)',
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </div>
      )}

      {/* Label */}
      <span
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.9)',
          fontWeight: 400,
          textAlign: 'center',
          letterSpacing: 0.1,
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          maxWidth: size + 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
    </div>
  )
}
