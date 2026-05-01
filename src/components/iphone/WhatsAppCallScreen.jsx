// ─── WhatsAppCallScreen — écran d'appel vocal WhatsApp iOS ────────────────────
//
// Dimensions : 390×844px (même que tous les composants iPhone)
//
// Props :
//   statusTime    string      heure dans la StatusBar (défaut '9:41')
//   callerName    string      nom du personnage qui appelle
//   callerColor   string      couleur de l'avatar (hex)
//   callerInitials string     initiales affichées dans l'avatar
//   callerAvatarUrl string|null  URL photo de profil (optionnel)
//   phase         'incoming'|'active'|'ended'
//   activeSide    'incoming'|'outgoing'|null   qui parle en ce moment
//   elapsedSeconds  number    secondes écoulées (affiché en timer pendant l'appel)
//   onAnswer      function    callback bouton "Décrocher"
//   onDecline     function    callback bouton "Refuser"
//   onHangup      function    callback bouton "Raccrocher"
//   glassOpacity  number      0=opaque, 0.35|0.50|0.80=fond semi-transparent (export incrustation)

import { HomeIndicator } from './LockScreen.jsx'
import StatusBar from './StatusBar.jsx'

// ─── Animations CSS (keyframes) ───────────────────────────────────────────────

const CALL_STYLES = `
@keyframes callPulse {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes callPulse2 {
  0%   { transform: scale(1);   opacity: 0.35; }
  100% { transform: scale(2.8); opacity: 0; }
}
@keyframes waveBar {
  0%, 100% { transform: scaleY(0.25); }
  50%       { transform: scaleY(1); }
}
@keyframes callFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wa-call-styles')) return
  const el = document.createElement('style')
  el.id = 'wa-call-styles'
  el.textContent = CALL_STYLES
  document.head.appendChild(el)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CallAvatar({ color, initials, avatarUrl, size = 100, pulse = false }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Anneaux de pulsation */}
      {pulse && (
        <>
          <div style={{
            position: 'absolute',
            inset: -size * 0.25,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0,
            animation: 'callPulse 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: -size * 0.15,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0,
            animation: 'callPulse2 2s ease-out infinite 0.6s',
          }} />
        </>
      )}

      {/* Avatar */}
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid rgba(255,255,255,0.25)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={initials}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{
            fontSize: size * 0.36,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: -0.5,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          }}>
            {initials}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Waveform animée (indication de prise de parole) ─────────────────────────

function SpeakingWave({ color = '#ffffff', bars = 9 }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      height: 28,
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 28,
            borderRadius: 2,
            backgroundColor: color,
            transformOrigin: 'center',
            animation: `waveBar ${0.5 + (i % 3) * 0.15}s ease-in-out infinite`,
            animationDelay: `${(i * 0.07).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Label "qui parle" ────────────────────────────────────────────────────────

function SpeakerLabel({ activeSide, callerName, callerColor }) {
  if (!activeSide) return <div style={{ height: 52 }} />

  const isCallerSpeaking = activeSide === 'incoming'
  const name    = isCallerSpeaking ? callerName : 'Dr KA'
  const color   = isCallerSpeaking ? callerColor : '#d9571d'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      animation: 'callFadeIn 250ms ease both',
    }}>
      <span style={{
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        letterSpacing: 0.2,
      }}>
        {name} parle…
      </span>
      <SpeakingWave color={color} />
    </div>
  )
}

// ─── Bouton circulaire d'appel ────────────────────────────────────────────────

function CallBtn({ icon, label, bg, size = 68, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        padding: 0,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}>
        {icon}
      </div>
      {label && (
        <span style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.75)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: 70,
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

const PhoneDownIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
)

const PhoneIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
)

const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
  </svg>
)

const SpeakerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
)

const PersonAddIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
)

const VideoOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
    <path d="M21 6.5l-4-4-2 2-1 1 4 4 3 3V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>
  </svg>
)

// ─── Phase : Appel entrant ────────────────────────────────────────────────────

function IncomingCallPhase({ callerName, callerColor, callerInitials, callerAvatarUrl, onAnswer, onDecline }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 60,
      paddingTop: 40,
    }}>
      {/* Zone appelant */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        flex: 1,
        justifyContent: 'center',
      }}>
        {/* Label WhatsApp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            backgroundColor: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 32 32" fill="white">
              <path d="M16 2C8.28 2 2 8.28 2 16c0 2.46.65 4.77 1.78 6.78L2 30l7.42-1.74A13.9 13.9 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.44 11.44 0 01-5.83-1.6l-.42-.25-4.35 1.02 1.04-4.24-.28-.43A11.44 11.44 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5z"/>
              <path d="M22.5 19.1c-.34-.17-2-.98-2.3-1.09-.3-.11-.52-.17-.74.17-.22.34-.85 1.09-1.04 1.31-.19.22-.38.24-.72.08-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.14-.69.15-.15.34-.39.51-.58.17-.2.22-.34.34-.57.11-.22.06-.42-.03-.58-.08-.17-.74-1.79-1.01-2.45-.27-.64-.54-.55-.74-.56-.19 0-.41-.02-.63-.02-.22 0-.57.08-.87.42-.3.34-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.17.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.87.69.78.25 1.5.21 2.06.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.63-.39z"/>
            </svg>
          </div>
          <span style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}>
            Appel WhatsApp Voice
          </span>
        </div>

        <CallAvatar
          color={callerColor}
          initials={callerInitials}
          avatarUrl={callerAvatarUrl}
          size={110}
          pulse
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 30,
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            letterSpacing: -0.5,
            textAlign: 'center',
          }}>
            {callerName}
          </span>
          <span style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}>
            appelle…
          </span>
        </div>
      </div>

      {/* Boutons Refuser / Décrocher */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        width: '100%',
        paddingInline: 40,
      }}>
        <CallBtn
          icon={<PhoneDownIcon />}
          label="Refuser"
          bg="#FF3B30"
          onClick={onDecline}
        />
        <CallBtn
          icon={<PhoneIcon />}
          label="Décrocher"
          bg="#34C759"
          onClick={onAnswer}
        />
      </div>
    </div>
  )
}

// ─── Phase : Appel actif ──────────────────────────────────────────────────────

function ActiveCallPhase({ callerName, callerColor, callerInitials, callerAvatarUrl, activeSide, elapsedSeconds, onHangup }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 60,
      paddingTop: 20,
    }}>
      {/* Zone info appelant */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        paddingTop: 20,
      }}>
        <CallAvatar
          color={callerColor}
          initials={callerInitials}
          avatarUrl={callerAvatarUrl}
          size={86}
          pulse={false}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 26,
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            letterSpacing: -0.3,
          }}>
            {callerName}
          </span>
          <span style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            letterSpacing: 0.2,
          }}>
            Appel WhatsApp Voice · {fmtDuration(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Waveform — qui parle */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minHeight: 60,
        justifyContent: 'center',
      }}>
        <SpeakerLabel
          activeSide={activeSide}
          callerName={callerName}
          callerColor={callerColor}
        />
      </div>

      {/* Grille de boutons décoratifs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px 48px',
        paddingInline: 48,
      }}>
        <CallBtn icon={<MicOffIcon />}    label="Sourdine"     bg="rgba(255,255,255,0.18)" size={60} disabled />
        <CallBtn icon={<SpeakerIcon />}   label="Haut-parleur" bg="rgba(255,255,255,0.18)" size={60} disabled />
        <CallBtn icon={<PersonAddIcon />} label="Ajouter"      bg="rgba(255,255,255,0.18)" size={60} disabled />
        <CallBtn icon={<VideoOffIcon />}  label="Vidéo"        bg="rgba(255,255,255,0.18)" size={60} disabled />
      </div>

      {/* Bouton raccrocher */}
      <CallBtn
        icon={<PhoneDownIcon size={30} />}
        bg="#FF3B30"
        size={72}
        onClick={onHangup}
      />
    </div>
  )
}

// ─── Phase : Appel terminé ────────────────────────────────────────────────────

function EndedCallPhase({ callerName, elapsedSeconds }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <PhoneDownIcon size={32} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 20,
          fontWeight: 500,
          color: 'rgba(255,255,255,0.8)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        }}>
          Appel terminé
        </span>
        <span style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.45)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}>
          {callerName} · {fmtDuration(elapsedSeconds)}
        </span>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function WhatsAppCallScreen({
  statusTime      = '9:41',
  callerName      = 'Inconnu',
  callerColor     = '#25D366',
  callerInitials  = '?',
  callerAvatarUrl = null,
  phase           = 'incoming',   // 'incoming' | 'active' | 'ended'
  activeSide      = null,         // 'incoming' | 'outgoing' | null
  elapsedSeconds  = 0,
  onAnswer        = () => {},
  onDecline       = () => {},
  onHangup        = () => {},
  glassOpacity    = 0,            // 0=opaque | 0.35|0.50|0.80 → fond semi-transparent (export incrustation)
  subtitle        = '',           // texte affiché en overlay pendant la lecture du vocal en cours
}) {
  injectStyles()

  // glassOpacity > 0 → fond rgba pour export incrustation
  const background = glassOpacity > 0
    ? `rgba(13, 27, 20, ${glassOpacity})`
    : 'linear-gradient(160deg, #0d2b1e 0%, #071a12 40%, #000000 100%)'

  const haloOpacity = glassOpacity > 0 ? '18' : '28'   // hex suffix sur la couleur

  return (
    <div style={{
      width:       390,
      height:      844,
      background,
      display:     'flex',
      flexDirection: 'column',
      position:    'relative',
      overflow:    'hidden',
      flexShrink:  0,
      fontFamily:  '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* Halo ambiant coloré derrière l'avatar */}
      <div style={{
        position:        'absolute',
        top:             -80,
        left:            '50%',
        transform:       'translateX(-50%)',
        width:           500,
        height:          500,
        borderRadius:    '50%',
        background:      `radial-gradient(circle, ${callerColor}${haloOpacity} 0%, transparent 70%)`,
        pointerEvents:   'none',
        zIndex:          0,
      }} />

      {/* StatusBar */}
      <StatusBar time={statusTime} theme="dark" />

      {/* Contenu */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 1 }}>
        {phase === 'incoming' && (
          <IncomingCallPhase
            callerName={callerName}
            callerColor={callerColor}
            callerInitials={callerInitials}
            callerAvatarUrl={callerAvatarUrl}
            onAnswer={onAnswer}
            onDecline={onDecline}
          />
        )}
        {phase === 'active' && (
          <ActiveCallPhase
            callerName={callerName}
            callerColor={callerColor}
            callerInitials={callerInitials}
            callerAvatarUrl={callerAvatarUrl}
            activeSide={activeSide}
            elapsedSeconds={elapsedSeconds}
            onHangup={onHangup}
          />
        )}
        {phase === 'ended' && (
          <EndedCallPhase
            callerName={callerName}
            elapsedSeconds={elapsedSeconds}
          />
        )}
      </div>

      <HomeIndicator theme="dark" />

      {/* ── Overlay sous-titre vocal ── */}
      {phase === 'active' && subtitle && (
        <div style={{
          position:       'absolute',
          bottom:         110,
          left:           20,
          right:          20,
          zIndex:         20,
          display:        'flex',
          justifyContent: 'center',
          pointerEvents:  'none',
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.58)',
            borderRadius:    8,
            padding:         '5px 14px',
            maxWidth:        '100%',
          }}>
            <p style={{
              color:      '#ffffff',
              fontSize:   15,
              lineHeight: 1.4,
              textAlign:  'center',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              margin:     0,
            }}>
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
