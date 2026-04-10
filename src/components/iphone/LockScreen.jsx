import { FlashlightIcon, CameraIcon } from '@phosphor-icons/react'
import wallpaperImg from '../../assets/wallpaper/WhatsApp Image 2026-04-10 at 15.34.26.jpeg'

import svgWhatsapp  from '../../assets/iphone/icons8-whatsapp-96.svg'
import svgInstagram from '../../assets/iphone/icons8-instagram-96.svg'
import svgTiktok    from '../../assets/iphone/icons8-tiktok-96.svg'
import svgFacebook  from '../../assets/iphone/icons8-facebook-96.svg'
import svgMail      from '../../assets/iphone/mail.svg'
import svgCamera    from '../../assets/iphone/camera.svg'

import StatusBar from './StatusBar.jsx'

// ─── LockScreen — écran de verrouillage iOS 15 (iPhone 13 Pro Max) ────────────
// Dimensions : 390×844px

const DEFAULT_WALLPAPER = `url(${wallpaperImg})`

// Icônes des apps pour les notifications
const APP_CONFIG = {
  WhatsApp:  { svg: svgWhatsapp,  bg: '#25D366', svgOnBg: true  },
  Instagram: { svg: svgInstagram, bg: '#ffffff', svgOnBg: true  },
  TikTok:    { svg: svgTiktok,    bg: '#000000', svgOnBg: true  },
  Facebook:  { svg: svgFacebook,  bg: '#ffffff', svgOnBg: true  },
  Mail:      { svg: svgMail,      bg: null,       svgOnBg: false },
}

export default function LockScreen({
  time          = '9:41',
  date          = 'Jeudi 10 avril',
  wallpaper     = DEFAULT_WALLPAPER,
  notifications = [],
  statusTime,
}) {
  const [hour, minute] = time.split(':')

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
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        flexShrink: 0,
      }}
    >
      {/* ── Overlay dégradé — assombrit le bas pour lisibilité, laisse le haut respirer ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.12) 60%, rgba(0,0,0,0.45) 100%)',
          zIndex: 0,
        }}
      />

      {/* ── Halo ambiant derrière l'horloge ── */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 320,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.20) 0%, transparent 70%)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* ── StatusBar ── */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <StatusBar time={statusTime ?? time} theme="dark" />
      </div>

      {/* ── Horloge de luxe ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          marginTop: 28,
          paddingInline: 24,
        }}
      >
        {/* Heure */}
        <div
          style={{
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            fontSize: 100,
            fontWeight: 200,
            lineHeight: 1,
            letterSpacing: 2,
            fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.92) 60%, rgba(240,235,255,0.85) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(0,0,0,0.4))',
          }}
        >
          {hour.padStart(2, '0')}
          <span
            style={{
              display: 'inline-block',
              opacity: 0.55,
              marginInline: 2,
              fontWeight: 100,
            }}
          >
            :
          </span>
          {minute.padStart(2, '0')}
        </div>

        {/* Séparateur ornemental */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginTop: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: 0.5,
              width: 52,
              background: 'linear-gradient(90deg, transparent, rgba(200,190,255,0.6), transparent)',
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'rgba(200,190,255,0.55)',
              boxShadow: '0 0 6px rgba(180,160,255,0.5)',
            }}
          />
          <div
            style={{
              height: 0.5,
              width: 52,
              background: 'linear-gradient(90deg, transparent, rgba(200,190,255,0.6), transparent)',
            }}
          />
        </div>

        {/* Date */}
        <div
          style={{
            fontFamily: '"Cormorant Garamond", "Georgia", serif',
            fontSize: 15,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.90)',
            letterSpacing: 4,
            textTransform: 'uppercase',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))',
          }}
        >
          {date}
        </div>
      </div>

      {/* ── Notifications ── */}
      {notifications.length > 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 28,
            paddingInline: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {notifications.map((notif) => (
            <NotificationBanner key={notif.id} {...notif} />
          ))}
        </div>
      )}

      {/* ── Bas : boutons + swipe + home ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
        }}
      >
        {/* Lampe torche + Caméra */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingInline: 40,
            paddingBottom: 12,
          }}
        >
          <LockButton icon={<FlashlightIcon size={22} color="#ffffff" weight="light" />} />
          <LockButton icon={<img src={svgCamera} alt="Caméra" style={{ width: 26, height: 26 }} />} />
        </div>

        {/* Swipe hint */}
        <div
          style={{
            textAlign: 'center',
            paddingBottom: 8,
            fontFamily: '"Inter", sans-serif',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Balayer vers le haut pour ouvrir
        </div>

        <HomeIndicator theme="dark" />
      </div>
    </div>
  )
}

// ─── Bannière de notification ─────────────────────────────────────────────────

function NotificationBanner({ app = 'WhatsApp', sender = '', message = '', time = 'maint.' }) {
  const cfg = APP_CONFIG[app]

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderRadius: 18,
        padding: '11px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        border: '0.5px solid rgba(255,255,255,0.22)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Icône app */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: cfg?.bg ?? '#8E8E93',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: cfg?.svgOnBg ? 4 : 0,
          boxSizing: 'border-box',
        }}
      >
        {cfg ? (
          <img
            src={cfg.svg}
            alt={app}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: 18 }}>🔔</span>
        )}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 1,
          }}
        >
          <span
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {app}
          </span>
          <span
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            {time}
          </span>
        </div>
        {sender && (
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.25,
            }}
          >
            {sender}
          </div>
        )}
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 13,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}

// ─── Bouton bas (lampe / caméra) ──────────────────────────────────────────────

function LockButton({ icon }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '0.5px solid rgba(255,255,255,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {icon}
    </div>
  )
}

// ─── Home indicator ───────────────────────────────────────────────────────────

export function HomeIndicator({ theme = 'dark' }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 6,
        paddingBottom: 8,
      }}
    >
      <div
        style={{
          width: 134,
          height: 5,
          borderRadius: 3,
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}
