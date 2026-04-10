import { useState } from 'react'
import {
  LockScreen,
  HomeScreen,
  WhatsAppDiscussions,
  WhatsAppConversation,
  IOSKeyboard,
} from '../../components/iphone/index.js'

// ─── Données de démo (identiques au desktop) ──────────────────────────────────

const DEMO_BUBBLES = [
  { id: '1', side: 'incoming', characterName: 'Gérante', text: 'Docteur, j\'ai mal au ventre depuis ce matin 😟', time: '09:38', status: 'read' },
  { id: '2', side: 'outgoing', text: 'C\'est peut-être lié à ce que vous avez mangé hier soir ?', time: '09:39', status: 'read' },
  { id: '3', side: 'incoming', characterName: 'Gérante', text: 'J\'ai mangé un sandwich au thon que vous m\'avez préparé 🥪', time: '09:40', status: 'read' },
  { id: '4', side: 'outgoing', text: 'Ah… Je vais vérifier la date de péremption du thon 👀', time: '09:41', status: 'delivered' },
]

const DEMO_NOTIFICATIONS = [
  { id: '1', app: 'WhatsApp',  sender: 'Gérante',         message: "Docteur, j'ai mal au ventre depuis ce matin 😟", time: 'maint.' },
  { id: '2', app: 'Instagram', sender: 'dr.ka.stories',   message: 'a aimé votre publication',                       time: '2 min'  },
  { id: '3', app: 'Mail',      sender: 'CHU de Dakar',    message: 'Convocation — réunion de service vendredi 8h30', time: '14 min' },
  { id: '4', app: 'TikTok',    sender: 'TikTok',          message: '🎬 Votre vidéo a atteint 1 000 vues !',          time: '1 h'    },
  { id: '5', app: 'Facebook',  sender: 'Groupe Médecins', message: 'Ibrahim Diallo a posté dans le groupe',          time: '2 h'    },
]

const DEMO_CONVERSATIONS = [
  { id: '1', name: 'Gérante', avatarColor: '#ffb564', lastMessage: 'Docteur, j\'ai mal au ventre…', time: '09:38', unread: 2, isOnline: true },
  { id: '2', name: 'Dr KA', avatarColor: '#d9571d', lastMessage: 'Ah… Je vais vérifier ✓✓', time: '09:41', unread: 0, isOnline: false },
  { id: '3', name: 'Patient Archives', avatarColor: '#8E8E93', lastMessage: 'Merci docteur !', time: 'lun.', unread: 0, isOnline: false },
]

const SCREENS = [
  {
    id: 'LockScreen',
    label: '🔒 Écran verrouillé',
    render: () => <LockScreen time="9:41" date="Jeudi 10 avril" notifications={DEMO_NOTIFICATIONS} />,
  },
  {
    id: 'HomeScreen',
    label: '📱 Accueil',
    render: () => <HomeScreen statusTime="9:41" badges={{ whatsapp: 2, mail: 4, instagram: 7, facebook: 3 }} highlightApp="WhatsApp" />,
  },
  {
    id: 'WhatsAppDiscussions',
    label: '💬 WA Discussions',
    render: () => <WhatsAppDiscussions statusTime="9:41" conversations={DEMO_CONVERSATIONS} activeContact="Gérante" />,
  },
  {
    id: 'WhatsAppConversation',
    label: '🗨️ WA Conversation',
    render: () => (
      <WhatsAppConversation
        statusTime="9:41"
        contactName="Gérante"
        contactColor="#ffb564"
        contactOnline={true}
        bubbles={DEMO_BUBBLES}
      />
    ),
  },
  {
    id: 'Keyboard',
    label: '⌨️ Clavier iOS',
    render: () => (
      <div style={{ position: 'relative', width: 390, height: 844, backgroundColor: '#e5ddd5', overflow: 'hidden' }}>
        <WhatsAppConversation
          statusTime="9:41"
          contactName="Gérante"
          contactColor="#ffb564"
          contactOnline={true}
          bubbles={DEMO_BUBBLES.slice(0, 3)}
          inputText="Oui je vais vérifier"
          showKeyboard={true}
        />
        <IOSKeyboard inputText="Oui je vais vérifier" />
      </div>
    ),
  },
]

// ─── Composant principal ──────────────────────────────────────────────────────

export default function MobileEdition() {
  const [activeId, setActiveId] = useState(null)
  const active = SCREENS.find((s) => s.id === activeId)

  // Vue plein écran d'une interface
  if (active) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
          <span className="text-white font-medium text-sm">{active.label}</span>
          <button
            onClick={() => setActiveId(null)}
            className="text-gray-400 hover:text-white text-sm border border-gray-700 rounded-full px-3 py-1"
          >
            ← Retour
          </button>
        </div>

        {/* Écran centré + scrollable si trop grand */}
        <div className="flex-1 flex items-start justify-center overflow-auto p-4">
          <MobileScaledScreen render={active.render} />
        </div>
      </div>
    )
  }

  // Liste des interfaces
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-900">Aperçu des interfaces</h1>
        <p className="text-xs text-gray-500 mt-0.5">Appuyez pour agrandir</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {SCREENS.map((screen) => (
          <MobileScreenCard
            key={screen.id}
            screen={screen}
            onClick={() => setActiveId(screen.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Miniature mobile (2 colonnes) ───────────────────────────────────────────

const IPHONE_W  = 390
const IPHONE_H  = 844
const MOBILE_THUMB_W = 155

function MobileScreenCard({ screen, onClick }) {
  const scale  = MOBILE_THUMB_W / IPHONE_W
  const thumbH = IPHONE_H * scale

  return (
    <div onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform">
      <div
        style={{
          width: MOBILE_THUMB_W,
          height: thumbH,
          overflow: 'hidden',
          borderRadius: 10,
          border: '1.5px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: '#000',
        }}
      >
        <div
          style={{
            width: IPHONE_W,
            height: IPHONE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          {screen.render()}
        </div>
      </div>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">
        {screen.label}
      </span>
    </div>
  )
}

// ─── Vue plein écran scalée pour mobile ──────────────────────────────────────

function MobileScaledScreen({ render }) {
  // Calcule la scale pour tenir dans la largeur du viewport mobile
  const viewportW = Math.min(window.innerWidth, 390)
  const scale     = viewportW / IPHONE_W

  return (
    <div
      style={{
        width: IPHONE_W * scale,
        height: IPHONE_H * scale,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div
        style={{
          width: IPHONE_W,
          height: IPHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        {render()}
      </div>
    </div>
  )
}
