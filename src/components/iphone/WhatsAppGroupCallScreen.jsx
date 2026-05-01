// ─── WhatsAppGroupCallScreen — écran d'appel vocal de groupe WhatsApp iOS ──────
//
// Dimensions : 390×844px
//
// Props :
//   statusTime        string      heure status bar
//   groupName         string      nom du groupe (titre de l'histoire)
//   participants      Array<{ characterId, name, color, initials, avatarUrl }>
//   phase             'incoming'|'active'|'ended'
//   activeCharacterId string|null  characterId de qui parle actuellement
//   elapsedSeconds    number
//   onAnswer, onDecline, onHangup  callbacks
//   glassOpacity      number      0=opaque | 0.35|0.50|0.80 incrustation

import { HomeIndicator } from './LockScreen.jsx'
import StatusBar from './StatusBar.jsx'

// ─── Styles ───────────────────────────────────────────────────────────────────

const GROUP_STYLES = `
@keyframes groupPulse {
  0%   { transform: scale(1);   opacity: 0.5; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes groupPulse2 {
  0%   { transform: scale(1);   opacity: 0.3; }
  100% { transform: scale(3);   opacity: 0; }
}
@keyframes waveBarGrp {
  0%, 100% { transform: scaleY(0.2); }
  50%       { transform: scaleY(1); }
}
@keyframes groupFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tileSpeaking {
  0%, 100% { box-shadow: 0 0 0 2px #25D366, 0 0 16px rgba(37,211,102,0.3); }
  50%       { box-shadow: 0 0 0 2px #25D366, 0 0 28px rgba(37,211,102,0.55); }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('wa-group-call-styles')) return
  const el = document.createElement('style')
  el.id      = 'wa-group-call-styles'
  el.textContent = GROUP_STYLES
  document.head.appendChild(el)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── WaveForm mini ────────────────────────────────────────────────────────────

function TileWave() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width:           2.5,
          height:          16,
          borderRadius:    1.5,
          backgroundColor: '#25D366',
          transformOrigin: 'center',
          animation:       `waveBarGrp ${0.45 + (i % 3) * 0.13}s ease-in-out infinite`,
          animationDelay:  `${(i * 0.06).toFixed(2)}s`,
        }} />
      ))}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function GroupAvatar({ participant, size = 56, pulse = false }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {pulse && (
        <>
          <div style={{
            position: 'absolute', inset: -size * 0.25, borderRadius: '50%',
            backgroundColor: participant.color, opacity: 0,
            animation: 'groupPulse 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: -size * 0.15, borderRadius: '50%',
            backgroundColor: participant.color, opacity: 0,
            animation: 'groupPulse2 2s ease-out infinite 0.6s',
          }} />
        </>
      )}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: participant.color,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}>
        {participant.avatarUrl
          ? <img src={participant.avatarUrl} alt={participant.initials}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{
              fontSize: size * 0.36, fontWeight: 700, color: '#fff',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            }}>
              {participant.initials}
            </span>
        }
      </div>
    </div>
  )
}

// ─── Tile participant (phase active) ─────────────────────────────────────────

function ParticipantTile({ participant, isSpeaking, hasActiveSpeaker }) {
  const dim = !hasActiveSpeaker || isSpeaking ? 1 : 0.55

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius:    18,
      padding:         '16px 12px 14px',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             10,
      opacity:         dim,
      transition:      'opacity 0.4s ease',
      animation:       isSpeaking ? 'tileSpeaking 1.6s ease-in-out infinite' : 'none',
      boxShadow:       isSpeaking ? '0 0 0 2px #25D366' : '0 0 0 2px transparent',
      minHeight:       160,
    }}>
      <div style={{ position: 'relative' }}>
        <GroupAvatar participant={participant} size={60} />
        {isSpeaking && (
          <div style={{
            position: 'absolute', bottom: -4, left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <TileWave />
          </div>
        )}
      </div>
      <span style={{
        fontSize:   12,
        fontWeight: isSpeaking ? 600 : 400,
        color:      isSpeaking ? '#ffffff' : 'rgba(255,255,255,0.75)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        textAlign:  'center',
        maxWidth:   140,
        overflow:   'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        letterSpacing: 0.1,
      }}>
        {participant.name}
      </span>
    </div>
  )
}

// ─── Bouton circulaire ────────────────────────────────────────────────────────

function CallBtn({ icon, label, bg, size = 64, onClick, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      background: 'none', border: 'none',
      cursor: disabled ? 'default' : 'pointer',
      padding: 0, opacity: disabled ? 0.4 : 1,
    }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}>
        {icon}
      </div>
      {label && (
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.7)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          textAlign: 'center',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

// ─── Icônes SVG ───────────────────────────────────────────────────────────────

const PhoneDownIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
  </svg>
)

const PhoneIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
)

const MicOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
  </svg>
)

// ─── Phase : Appel de groupe entrant ─────────────────────────────────────────

function IncomingGroupPhase({ groupName, participants, onAnswer, onDecline }) {
  // Avatars empilés (max 4 affichés)
  const shown = participants.slice(0, 4)
  const AVATAR_SIZE = 52
  const OVERLAP     = 18

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: 60, paddingTop: 32,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, flex: 1, justifyContent: 'center',
      }}>
        {/* Label WhatsApp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5,
            backgroundColor: '#25D366',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 32 32" fill="white">
              <path d="M16 2C8.28 2 2 8.28 2 16c0 2.46.65 4.77 1.78 6.78L2 30l7.42-1.74A13.9 13.9 0 0016 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.5a11.44 11.44 0 01-5.83-1.6l-.42-.25-4.35 1.02 1.04-4.24-.28-.43A11.44 11.44 0 014.5 16C4.5 9.6 9.6 4.5 16 4.5S27.5 9.6 27.5 16 22.4 27.5 16 27.5z"/>
              <path d="M22.5 19.1c-.34-.17-2-.98-2.3-1.09-.3-.11-.52-.17-.74.17-.22.34-.85 1.09-1.04 1.31-.19.22-.38.24-.72.08-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.14-.69.15-.15.34-.39.51-.58.17-.2.22-.34.34-.57.11-.22.06-.42-.03-.58-.08-.17-.74-1.79-1.01-2.45-.27-.64-.54-.55-.74-.56-.19 0-.41-.02-.63-.02-.22 0-.57.08-.87.42-.3.34-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.17.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.87.69.78.25 1.5.21 2.06.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.63-.39z"/>
            </svg>
          </div>
          <span style={{
            fontSize: 13, color: 'rgba(255,255,255,0.65)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}>
            Appel vocal de groupe WhatsApp
          </span>
        </div>

        {/* Avatars empilés avec pulse */}
        <div style={{
          display: 'flex', alignItems: 'center',
          width: shown.length * AVATAR_SIZE - (shown.length - 1) * OVERLAP,
        }}>
          {shown.map((p, i) => (
            <div key={p.characterId} style={{
              marginLeft: i === 0 ? 0 : -OVERLAP,
              zIndex: shown.length - i,
            }}>
              <GroupAvatar participant={p} size={AVATAR_SIZE} pulse={i === 0} />
            </div>
          ))}
          {participants.length > 4 && (
            <div style={{
              marginLeft: -OVERLAP, zIndex: 0,
              width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                +{participants.length - 4}
              </span>
            </div>
          )}
        </div>

        {/* Nom du groupe */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 28, fontWeight: 600, color: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            letterSpacing: -0.5, textAlign: 'center', paddingInline: 32,
          }}>
            {groupName}
          </span>
          <span style={{
            fontSize: 14, color: 'rgba(255,255,255,0.55)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}>
            Appel de groupe entrant…
          </span>
          <span style={{
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}>
            {participants.map(p => p.name).join(', ')}
          </span>
        </div>
      </div>

      {/* Boutons */}
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        width: '100%', paddingInline: 48,
      }}>
        <CallBtn icon={<PhoneDownIcon />} label="Refuser"   bg="#FF3B30" onClick={onDecline} />
        <CallBtn icon={<PhoneIcon />}     label="Décrocher" bg="#34C759" onClick={onAnswer} />
      </div>
    </div>
  )
}

// ─── Phase : Appel actif ──────────────────────────────────────────────────────

function ActiveGroupPhase({ groupName, participants, activeCharacterId, elapsedSeconds, onHangup, subtitle }) {
  const hasActive = activeCharacterId !== null

  // Grid : 2 colonnes, largeur fixe
  const PAD       = 16
  const GAP       = 8
  const tileW     = Math.floor((390 - PAD * 2 - GAP) / 2)   // ~175px
  const tileH     = participants.length <= 2 ? 220 : 175

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', paddingBottom: 48,
    }}>
      {/* En-tête groupe */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 16, paddingBottom: 20, gap: 4,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 600, color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          letterSpacing: -0.3,
        }}>
          {groupName}
        </span>
        <span style={{
          fontSize: 13, color: 'rgba(255,255,255,0.5)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}>
          Appel de groupe · {fmtDuration(elapsedSeconds)}
        </span>
      </div>

      {/* Grille participants */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   `repeat(2, ${tileW}px)`,
        gap:                   GAP,
        paddingInline:         PAD,
        flex:                  1,
        alignContent:          'start',
      }}>
        {participants.map(p => (
          <ParticipantTile
            key={p.characterId}
            participant={p}
            isSpeaking={p.characterId === activeCharacterId}
            hasActiveSpeaker={hasActive}
          />
        ))}
      </div>

      {/* Bouton raccrocher */}
      <div style={{ paddingTop: 20 }}>
        <CallBtn
          icon={<PhoneDownIcon size={28} />}
          bg="#FF3B30"
          size={68}
          onClick={onHangup}
        />
      </div>

      {/* Overlay sous-titre */}
      {subtitle && (
        <div style={{
          position: 'absolute', bottom: 110, left: 20, right: 20, zIndex: 20,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: 8, padding: '5px 14px',
          }}>
            <p style={{
              color: '#ffffff', fontSize: 15, lineHeight: 1.4,
              textAlign: 'center', margin: 0,
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            }}>
              {subtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Phase : Appel terminé ────────────────────────────────────────────────────

function EndedGroupPhase({ groupName, elapsedSeconds }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PhoneDownIcon size={32} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        }}>
          Appel terminé
        </span>
        <span style={{
          fontSize: 14, color: 'rgba(255,255,255,0.4)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        }}>
          {groupName} · {fmtDuration(elapsedSeconds)}
        </span>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function WhatsAppGroupCallScreen({
  statusTime       = '9:41',
  groupName        = 'Appel de groupe',
  participants     = [],
  phase            = 'incoming',
  activeCharacterId = null,
  elapsedSeconds   = 0,
  onAnswer         = () => {},
  onDecline        = () => {},
  onHangup         = () => {},
  glassOpacity     = 0,
  subtitle         = '',
}) {
  injectStyles()

  const background = glassOpacity > 0
    ? `rgba(13, 27, 20, ${glassOpacity})`
    : 'linear-gradient(160deg, #0d2b1e 0%, #071a12 40%, #000000 100%)'

  const haloOpacity = glassOpacity > 0 ? '14' : '22'
  const haloColor   = participants[0]?.color ?? '#25D366'

  return (
    <div style={{
      width: 390, height: 844,
      background,
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      {/* Halo ambiant */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${haloColor}${haloOpacity} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      <StatusBar time={statusTime} theme="dark" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', zIndex: 1, position: 'relative' }}>
        {phase === 'incoming' && (
          <IncomingGroupPhase
            groupName={groupName}
            participants={participants}
            onAnswer={onAnswer}
            onDecline={onDecline}
          />
        )}
        {phase === 'active' && (
          <ActiveGroupPhase
            groupName={groupName}
            participants={participants}
            activeCharacterId={activeCharacterId}
            elapsedSeconds={elapsedSeconds}
            onHangup={onHangup}
            subtitle={subtitle}
          />
        )}
        {phase === 'ended' && (
          <EndedGroupPhase
            groupName={groupName}
            elapsedSeconds={elapsedSeconds}
          />
        )}
      </div>

      <HomeIndicator theme="dark" />
    </div>
  )
}
