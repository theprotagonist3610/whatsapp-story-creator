import {
  DotsThreeIcon,
  CameraIcon,
  PencilSimpleLineIcon,
  MagnifyingGlassIcon,
  ChecksIcon,
  CheckIcon,
  ArchiveIcon,
  CaretRightIcon,
  NewspaperIcon,
  PhoneIcon,
  UsersThreeIcon,
  ChatsCircleIcon,
  UserCircleIcon,
  BellSlashIcon,
} from '@phosphor-icons/react'
import StatusBar from './StatusBar.jsx'
import { HomeIndicator } from './LockScreen.jsx'

// ─── WhatsAppDiscussions — liste des conversations WhatsApp iOS ───────────────
// Dimensions : 390×844px

// ─── Structure d'une conversation ────────────────────────────────────────────
// {
//   id            {string}   identifiant unique
//   name          {string}   titre de la discussion
//   lastMessage   {string}   aperçu du dernier message
//   time          {string}   heure ou jour affiché
//   unread        {number}   nombre de messages non lus (0 = aucun badge)
//   avatarColor   {string}   couleur du cercle avatar (si pas d'image)
//   avatarImage   {string}   URL/import d'image — remplace le cercle lettre
//   isOnline      {boolean}  point vert "en ligne"
//   isOutgoing    {boolean}  dernier message envoyé par l'utilisateur
//   outgoingStatus {string}  'sent' | 'delivered' | 'read'
//   isMuted       {boolean}  icône muet + badge gris
//   isGroup       {boolean}  discussion de groupe
// }

const DEFAULT_CONVERSATIONS = [
  {
    id: '1',
    name: 'Gérante',
    avatarColor: '#ffb564',
    lastMessage: 'Docteur, j\'ai mal au ventre depuis ce matin…',
    time: '09:41',
    unread: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Dr KA',
    avatarColor: '#d9571d',
    lastMessage: 'Ah… Je vais vérifier la date de péremption',
    time: 'hier',
    unread: 0,
    isOutgoing: true,
    outgoingStatus: 'read',
  },
  {
    id: '3',
    name: 'Patient Archives',
    avatarColor: '#8E8E93',
    lastMessage: 'Merci beaucoup docteur !',
    time: 'lun.',
    unread: 0,
    isMuted: true,
  },
  {
    id: '4',
    name: 'Famille',
    avatarColor: '#34C759',
    lastMessage: 'Tu viens ce soir ?',
    time: 'dim.',
    unread: 3,
  },
  {
    id: '5',
    name: 'Collègues CHU',
    avatarColor: '#5856D6',
    lastMessage: 'Réunion annulée demain matin',
    time: 'sam.',
    unread: 0,
    isGroup: true,
  },
]

const FILTER_TABS = ['Toutes', 'Non lues', 'Favoris', 'Groupes']

const NAV_ITEMS = [
  { id: 'actus',        label: 'Actus',        Icon: NewspaperIcon    },
  { id: 'appels',       label: 'Appels',        Icon: PhoneIcon        },
  { id: 'communautes',  label: 'Communautés',   Icon: UsersThreeIcon   },
  { id: 'discussions',  label: 'Discussions',   Icon: ChatsCircleIcon  },
  { id: 'vous',         label: 'Vous',          Icon: UserCircleIcon   },
]

export default function WhatsAppDiscussions({
  statusTime      = '9:41',
  conversations   = DEFAULT_CONVERSATIONS,
  activeContact   = null,
  activeFilter    = 'Toutes',
  activeNav       = 'discussions',
  archivedCount   = 3,
  favoritesCount  = 5,
  missedCalls     = 2,
}) {
  // Calculé automatiquement depuis les données réelles
  const unreadCount  = conversations.filter((c) => (c.unread ?? 0) > 0).length
  const filterBadges = { 'Non lues': unreadCount, 'Favoris': favoritesCount }
  const navBadges    = { discussions: unreadCount, appels: missedCalls }
  return (
    <div
      style={{
        width: 390,
        height: 844,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* ── StatusBar ── */}
      <div style={{ backgroundColor: '#ffffff', flexShrink: 0 }}>
        <StatusBar time={statusTime} theme="light" />
      </div>

      {/* ── Top actions (au-dessus du titre) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingInline: 16,
          paddingTop: 4,
          paddingBottom: 2,
          flexShrink: 0,
        }}
      >
        {/* Gauche : trois points */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DotsThreeIcon size={26} color="#25D366" weight="bold" />
        </div>

        {/* Droite : caméra + nouvelle discussion */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <CameraIcon size={24} color="#25D366" weight="regular" />
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: '#E8F9F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <PencilSimpleLineIcon size={17} color="#25D366" weight="regular" />
          </div>
        </div>
      </div>

      {/* ── Titre "Discussions" ── */}
      <div style={{ paddingInline: 16, paddingBottom: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: '#000', letterSpacing: -0.5 }}>
          Discussions
        </span>
      </div>

      {/* ── Barre de recherche ── */}
      <div style={{ paddingInline: 16, paddingBottom: 10, flexShrink: 0 }}>
        <div
          style={{
            backgroundColor: '#F2F2F7',
            borderRadius: 12,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            paddingInline: 10,
            gap: 6,
          }}
        >
          <MagnifyingGlassIcon size={15} color="#8E8E93" weight="regular" />
          <span style={{ fontSize: 15, color: '#8E8E93' }}>Rechercher</span>
        </div>
      </div>

      {/* ── Filtres ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          paddingInline: 16,
          paddingBottom: 10,
          flexShrink: 0,
          overflowX: 'hidden',
        }}
      >
        {FILTER_TABS.map((tab) => {
          const active  = tab === activeFilter
          const badge   = filterBadges[tab] ?? 0
          return (
            <div
              key={tab}
              style={{
                paddingInline: 14,
                paddingBlock: 6,
                borderRadius: 20,
                backgroundColor: active ? '#E8F9F0' : '#F2F2F7',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#25D366' : '#3C3C43',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {tab}
              {badge > 0 && (
                <span
                  style={{
                    backgroundColor: active ? '#25D366' : '#8E8E93',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingInline: 3,
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Archivées ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingInline: 16,
          paddingBlock: 10,
          gap: 14,
          borderBottom: '0.5px solid #E5E5EA',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: '50%',
            backgroundColor: '#F2F2F7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArchiveIcon size={22} color="#8E8E93" weight="regular" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#000' }}>Archivées</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {archivedCount > 0 && (
            <div
              style={{
                backgroundColor: '#8E8E93',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 4,
              }}
            >
              {archivedCount}
            </div>
          )}
          <CaretRightIcon size={14} color="#C7C7CC" weight="bold" />
        </div>
      </div>

      {/* ── Liste des conversations ── */}
      <div style={{ flex: 1, overflowY: 'hidden' }}>
        {conversations.map((conv, i) => (
          <ConversationRow
            key={conv.id}
            {...conv}
            highlighted={activeContact === conv.name}
            showDivider={i < conversations.length - 1}
          />
        ))}
      </div>

      {/* ── Barre de navigation bas ── */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: '#ffffff',
          borderTop: '0.5px solid #E5E5EA',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = id === activeNav
            const badge  = navBadges[id] ?? 0
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  flex: 1,
                  opacity: active ? 1 : 0.65,
                  position: 'relative',
                }}
              >
                {/* Icône + badge */}
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={24} color={active ? '#25D366' : '#8E8E93'} weight={active ? 'fill' : 'regular'} />
                  {badge > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -7,
                        backgroundColor: '#FF3B30',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingInline: 3,
                        border: '1.5px solid #ffffff',
                      }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: active ? '#25D366' : '#8E8E93',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
        <HomeIndicator theme="light" />
      </div>
    </div>
  )
}

// ─── Ligne de conversation ────────────────────────────────────────────────────

function ConversationRow({ name, avatarColor, avatarImage, lastMessage, time, unread = 0, isOnline, isOutgoing, outgoingStatus, isMuted, isGroup, highlighted, showDivider }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        paddingBlock: 9,
        backgroundColor: highlighted ? '#F2F2F7' : '#ffffff',
      }}
    >
      {/* Avatar */}
      <div style={{ paddingLeft: 16, paddingRight: 12, flexShrink: 0 }}>
        <Avatar name={name} color={avatarColor} image={avatarImage} isOnline={isOnline} />
      </div>

      {/* Contenu + séparateur */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          paddingRight: 16,
          paddingBottom: 9,
          borderBottom: showDivider ? '0.5px solid #E5E5EA' : 'none',
          alignSelf: 'stretch',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {/* Nom + heure */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
            {isMuted && <BellSlashIcon size={13} color="#8E8E93" weight="regular" style={{ flexShrink: 0 }} />}
            <span
              style={{
                fontSize: 16,
                fontWeight: unread > 0 ? 600 : 400,
                color: '#000',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: unread > 0 ? '#25D366' : '#8E8E93',
              fontWeight: unread > 0 ? 500 : 400,
              flexShrink: 0,
            }}
          >
            {time}
          </span>
        </div>

        {/* Aperçu + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
            {isOutgoing && (
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {outgoingStatus === 'read'
                  ? <ChecksIcon size={14} color="#53BDEB" weight="regular" />
                  : <CheckIcon size={14} color="#8E8E93" weight="regular" />
                }
              </span>
            )}
            <span
              style={{
                fontSize: 14,
                color: '#8E8E93',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {lastMessage}
            </span>
          </div>

          {unread > 0 && (
            <div
              style={{
                backgroundColor: isMuted ? '#8E8E93' : '#25D366',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 4,
                flexShrink: 0,
              }}
            >
              {unread}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color, image, isOnline }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {image ? (
        <img
          src={image}
          alt={name}
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: color ?? '#8E8E93',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <div
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 13,
            height: 13,
            borderRadius: '50%',
            backgroundColor: '#25D366',
            border: '2px solid #fff',
          }}
        />
      )}
    </div>
  )
}
