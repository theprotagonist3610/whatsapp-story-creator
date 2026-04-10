import {
  CaretLeftIcon,
  VideoCameraIcon,
  PhoneIcon,
  PlusIcon,
  PaperclipIcon,
  CameraIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  CheckIcon,
  ChecksIcon,
} from '@phosphor-icons/react'
import StatusBar from './StatusBar.jsx'
import { HomeIndicator } from './LockScreen.jsx'

// ─── WhatsAppConversation — chat WhatsApp iOS ─────────────────────────────────
// Dimensions : 390×844px
// Props :
//   statusTime    {string}   heure StatusBar
//   contactName   {string}   nom du contact en haut
//   contactColor  {string}   couleur avatar contact
//   contactOnline {boolean}  "en ligne" sous le nom
//   bubbles       {Array}    [{id, side, text, time, status, characterName}]
//   inputText     {string}   texte dans la barre de saisie (vide = placeholder)
//   showKeyboard  {boolean}  réduit la zone de chat pour laisser place au clavier

// Fond WhatsApp (motif SVG simplifié, couleur exacte)
const WA_BG_COLOR = '#e5ddd5'

// Couleurs des coches
const TICK_COLORS = { sent: '#8E8E93', delivered: '#8E8E93', read: '#53BDEB' }

// Nombre aléatoire entre 51 et 200 (stable au montage)
const randomFollowers = () => Math.floor(Math.random() * 150) + 51

export default function WhatsAppConversation({
  statusTime       = '9:41',
  contactName      = 'Dr KA',
  contactColor     = '#d9571d',
  contactOnline    = true,
  contactFollowers = randomFollowers(),
  bubbles          = [],
  inputText        = '',
  showKeyboard     = false,
}) {
  // Quand le clavier est visible, la zone chat est réduite
  const chatHeight = showKeyboard ? 844 - 50 - 56 - 44 - 280 : 844 - 50 - 56 - 44 - 34

  return (
    <div
      style={{
        width: 390,
        height: 844,
        backgroundColor: WA_BG_COLOR,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* ── Fond motif WhatsApp ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9bbae' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          zIndex: 0,
        }}
      />

      {/* ── StatusBar sur fond vert WhatsApp ── */}
      <div style={{ backgroundColor: '#075E54', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <StatusBar time={statusTime} theme="dark" />
      </div>

      {/* ── Header conversation ── */}
      <div
        style={{
          backgroundColor: '#075E54',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          paddingInline: 8,
          gap: 8,
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Flèche retour + nombre abonnés */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CaretLeftIcon size={22} color="#ffffff" weight="bold" />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
            {contactFollowers}
          </span>
        </div>

        {/* Avatar */}
        <ContactAvatar name={contactName} color={contactColor} size={38} />

        {/* Nom + statut */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
            {contactName}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.2 }}>
            {contactOnline ? 'en ligne' : 'vu récemment'}
          </div>
        </div>

        {/* Icônes droite */}
        <div style={{ display: 'flex', gap: 18, paddingRight: 4, alignItems: 'center' }}>
          <VideoCameraIcon size={22} color="#ffffff" weight="regular" />
          <PhoneIcon size={22} color="#ffffff" weight="regular" />
        </div>
      </div>

      {/* ── Zone de chat (bulles) ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: chatHeight,
          overflowY: 'hidden',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 3,
        }}
      >
        {bubbles.map((bubble) => (
          <ChatBubble key={bubble.id} {...bubble} />
        ))}
      </div>

      {/* ── Barre de saisie ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          backgroundColor: '#F0F0F0',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        {/* + */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PlusIcon size={26} color="#8E8E93" weight="regular" />
        </div>

        {/* Champ de saisie + trombonne + caméra + dictaphone */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            borderRadius: 22,
            padding: '6px 8px 6px 14px',
            fontSize: 15,
            color: inputText ? '#000000' : '#8E8E93',
            minHeight: 38,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            gap: 6,
          }}
        >
          <span style={{ flex: 1 }}>{inputText || 'Message'}</span>
          <PaperclipIcon size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
          <CameraIcon    size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
          <MicrophoneIcon size={20} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />
        </div>

        {/* Bouton envoyer (si texte) */}
        {inputText ? (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PaperPlaneTiltIcon size={20} color="#ffffff" weight="fill" />
          </div>
        ) : null}
      </div>

      {/* ── Home indicator ── */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2, backgroundColor: '#F0F0F0' }}>
        <HomeIndicator theme="light" />
      </div>
    </div>
  )
}

// ─── Bulle de chat ────────────────────────────────────────────────────────────

function ChatBubble({ side = 'incoming', text = '', time = '', status = 'sent', characterName = '' }) {
  const isOutgoing = side === 'outgoing'
  const tickColor  = TICK_COLORS[status] ?? TICK_COLORS.sent

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 4,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          maxWidth: 280,
          backgroundColor: isOutgoing ? '#DCF8C6' : '#ffffff',
          borderRadius: isOutgoing
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          padding: '6px 10px 4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          position: 'relative',
        }}
      >
        {/* Nom de l'expéditeur (dans les groupes ou pour les entrants) */}
        {!isOutgoing && characterName && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#d9571d',
              marginBottom: 2,
              lineHeight: 1.2,
            }}
          >
            {characterName}
          </div>
        )}

        {/* Texte */}
        <span
          style={{
            fontSize: 15,
            color: '#000000',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </span>

        {/* Heure + statut */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 3,
            marginTop: 2,
          }}
        >
          <span style={{ fontSize: 11, color: '#8E8E93' }}>{time}</span>
          {isOutgoing && <Ticks status={status} color={tickColor} />}
        </div>
      </div>
    </div>
  )
}

// ─── Coches de statut ─────────────────────────────────────────────────────────

function Ticks({ status, color }) {
  if (status === 'sent') {
    return <CheckIcon size={14} color={color} weight="regular" />
  }
  return <ChecksIcon size={14} color={color} weight="regular" />
}

// ─── Avatar contact (header) ──────────────────────────────────────────────────

function ContactAvatar({ name, color, size = 38 }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color ?? '#8E8E93',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: size * 0.38,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
