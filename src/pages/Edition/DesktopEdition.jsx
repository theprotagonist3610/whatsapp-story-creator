import { useState } from 'react'
import {
  LockScreen,
  HomeScreen,
  WhatsAppDiscussions,
  WhatsAppConversation,
  IOSKeyboard,
} from '../../components/iphone/index.js'

// ─── Données de démo ──────────────────────────────────────────────────────────

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

// ─── Liste des interfaces à prévisualiser ─────────────────────────────────────

const SCREENS = [
  {
    id: 'LockScreen',
    label: 'Écran verrouillé',
    render: () => (
      <LockScreen
        time="9:41"
        date="Jeudi 10 avril"
        notifications={DEMO_NOTIFICATIONS}
      />
    ),
  },
  {
    id: 'HomeScreen',
    label: 'Accueil',
    render: () => (
      <HomeScreen
        statusTime="9:41"
        badges={{ whatsapp: 2, mail: 4, instagram: 7, facebook: 3 }}
        highlightApp="WhatsApp"
      />
    ),
  },
  {
    id: 'WhatsAppDiscussions',
    label: 'WhatsApp — Discussions',
    render: () => (
      <WhatsAppDiscussions
        statusTime="9:41"
        conversations={DEMO_CONVERSATIONS}
        activeContact="Gérante"
      />
    ),
  },
  {
    id: 'WhatsAppConversation',
    label: 'WhatsApp — Conversation',
    render: () => (
      <WhatsAppConversation
        statusTime="9:41"
        contactName="Gérante"
        contactColor="#ffb564"
        contactOnline={true}
        bubbles={DEMO_BUBBLES}
        inputText=""
      />
    ),
  },
  {
    id: 'Keyboard',
    label: 'Clavier iOS',
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

export default function DesktopEdition() {
  const [activeId, setActiveId] = useState(null)
  const active = SCREENS.find((s) => s.id === activeId)

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Aperçu des interfaces</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cliquez sur une interface pour l'agrandir</p>
        </div>
        <span className="text-xs bg-brand-orange/10 text-brand-orange font-medium px-3 py-1.5 rounded-full">
          Phase B — Validation visuelle
        </span>
      </div>

      <div className="flex h-[calc(100vh-73px)]">

        {/* ── Grille des écrans ── */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-5 gap-6 min-w-0">
            {SCREENS.map((screen) => (
              <ScreenCard
                key={screen.id}
                screen={screen}
                active={activeId === screen.id}
                onClick={() => setActiveId(activeId === screen.id ? null : screen.id)}
              />
            ))}
          </div>

          {/* ── Vue agrandie ── */}
          {active && (
            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">{active.label}</h2>
                <button
                  onClick={() => setActiveId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full px-3 py-1"
                >
                  Fermer ×
                </button>
              </div>
              <div
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
              >
                {active.render()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Carte d'un écran (miniature scalée) ─────────────────────────────────────

const IPHONE_W = 390
const IPHONE_H = 844
const THUMB_W  = 160  // largeur de la miniature

function ScreenCard({ screen, active, onClick }) {
  const scale      = THUMB_W / IPHONE_W
  const thumbH     = IPHONE_H * scale

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer group"
    >
      {/* Miniature scalée */}
      <div
        style={{
          width: THUMB_W,
          height: thumbH,
          overflow: 'hidden',
          borderRadius: 10,
          border: active ? '2.5px solid #d9571d' : '2px solid #e5e7eb',
          boxShadow: active
            ? '0 0 0 3px rgba(217,87,29,0.2), 0 8px 24px rgba(0,0,0,0.12)'
            : '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'all 0.15s',
          flexShrink: 0,
          position: 'relative',
          backgroundColor: '#000',
        }}
        className="group-hover:shadow-lg"
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

      {/* Label */}
      <span
        className={`text-xs text-center font-medium leading-tight ${
          active ? 'text-brand-orange' : 'text-gray-600 group-hover:text-gray-900'
        }`}
        style={{ maxWidth: THUMB_W }}
      >
        {screen.label}
      </span>
    </div>
  )
}
