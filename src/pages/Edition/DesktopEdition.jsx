import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  LockScreen,
  HomeScreen,
  WhatsAppDiscussions,
  WhatsAppConversation,
  IOSKeyboard,
  WhatsAppStickerPicker,
} from '../../components/iphone/index.js'
import { SidebarIcon, PlayIcon, BellIcon, XIcon, DownloadSimpleIcon, SpinnerGapIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { actionsForScreen, ACTION_CATEGORIES, getAction, estimateDuration } from '../../engine/actions.js'
import { playSound, playKeyboardClick } from '../../engine/sounds.js'
import { getStory, getVocalBlobUrl } from '../../lib/supabase.js'
import { exportSceneToMp4, exportSceneViaServer } from '../../lib/exportScene.js'
import { LOCAL_STICKERS, getStickerUrl, getLocalUrl } from '../../lib/stickers.js'
import SceneTab from './SceneTab.jsx'

// ─── Helpers date/heure ───────────────────────────────────────────────────────

function formatLockDate(weekDate) {
  if (!weekDate) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date())
      .replace(/^\w/, c => c.toUpperCase())
  }
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(weekDate + 'T12:00:00')) // midi pour éviter les décalages UTC
    .replace(/^\w/, c => c.toUpperCase())
}

function extractFirstTime(steps) {
  for (const step of (steps ?? [])) {
    const t = step.payload?.time
    if (t && /^\d{1,2}:\d{2}$/.test(t)) return t
  }
  return '9:41'
}
import svgWhatsapp  from '../../assets/iphone/icons8-whatsapp-96.svg'
import svgInstagram from '../../assets/iphone/icons8-instagram-96.svg'
import svgFacebook  from '../../assets/iphone/icons8-facebook-96.svg'
import svgTiktok    from '../../assets/iphone/icons8-tiktok-96.svg'
import svgMail      from '../../assets/iphone/mail.svg'

const NAV_H    = 64
const IPHONE_W = 390
const IPHONE_H = 844

// ─── Scene helpers (partagés avec SceneTab) ───────────────────────────────────

function sceneComputeScreens(steps) {
  const out = []
  let cur = 'LockScreen'
  for (const s of steps) {
    out.push(cur)
    const a = getAction(s.actionId)
    if (a?.nextScreen) cur = a.nextScreen
  }
  return out
}

function sceneStepDur(step) {
  return step.durationMs ?? estimateDuration(step.actionId, step.payload ?? {})
}

const TABS = [
  { id: 'LockScreen',           label: 'Écran verrouillé'  },
  { id: 'HomeScreen',           label: 'Accueil'           },
  { id: 'WhatsAppDiscussions',  label: 'Discussions'       },
  { id: 'WhatsAppConversation', label: 'Conversation'      },
  { id: 'WhatsAppKeyboard',     label: 'Clavier'           },
  { id: 'Scene',                label: '🎬 Scène'          },
]

const APP_ICONS = {
  WhatsApp:  { svg: svgWhatsapp,  bg: '#25D366' },
  Instagram: { svg: svgInstagram, bg: '#ffffff' },
  Facebook:  { svg: svgFacebook,  bg: '#ffffff' },
  TikTok:    { svg: svgTiktok,    bg: '#000000' },
  Mail:      { svg: svgMail,      bg: null      },
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

const CLS = 'w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-orange bg-white'

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 block mb-1">{label}</label>
      {children}
    </div>
  )
}

function PlayBtn({ onClick, disabled, label, color = '#d9571d' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all mt-1"
      style={{ backgroundColor: color }}
    >
      <PlayIcon size={13} weight="fill" />
      {disabled ? '…' : label}
    </button>
  )
}

// ─── Bannière de notification ─────────────────────────────────────────────────

function NotificationBanner({ notif, visible }) {
  const appIcon = APP_ICONS[notif?.app]
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      padding: '12px 12px 0',
      transform: visible ? 'translateY(0)' : 'translateY(-130%)',
      transition: 'transform 380ms cubic-bezier(0.4,0,0.2,1)',
      pointerEvents: 'none',
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: 16, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        {appIcon ? (
          <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, backgroundColor: appIcon.bg ?? 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img src={appIcon.svg} alt={notif.app} style={{ width: '80%', height: '80%' }} />
          </div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, backgroundColor: '#8E8E93', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BellIcon size={18} color="#fff" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{notif?.app}</span>
            <span style={{ fontSize: 11, color: '#8E8E93' }}>{notif?.time}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{notif?.sender}</div>
          <div style={{ fontSize: 12, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif?.message}</div>
        </div>
      </div>
    </div>
  )
}

// ─── LockScreen composé ───────────────────────────────────────────────────────

function LockScreenPreview({ unlockPhase, notifPhase, notif, statusTime, lockDate }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (notifPhase === 'visible') {
      setNotifications((p) => p.find((n) => n.id === 'incoming') ? p : [...p, { id: 'incoming', ...notif }])
    }
    if (notifPhase === 'idle') {
      setNotifications((p) => p.filter((n) => n.id !== 'incoming'))
    }
  }, [notifPhase, notif])

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} highlightApp="WhatsApp" />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: (unlockPhase === 'sliding' || unlockPhase === 'done') ? 'translateY(-100%)' : 'translateY(0)',
        transition: unlockPhase === 'sliding' ? 'transform 450ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <LockScreen time={statusTime} date={lockDate} notifications={notifications} statusTime={statusTime} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notif} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

// ─── HomeScreen avec zoom WhatsApp ───────────────────────────────────────────
//
// Position de l'icône WhatsApp dans la grille iOS :
//   paddingInline: 22px → centre colonne 1 : 22 + 30 = 52px
//   statusBar ~50px + searchBar (8+36+16) = 60px → grille à 110px
//   centre ligne 1 : 110 + 30 = 140px
//   → transform-origin: "52px 140px"

const WA_ICON_ORIGIN = '52px 140px'

function HomeScreenPreview({ animState }) {
  const { zoomPhase, notifPhase, notifForm, conversations, statusTime } = animState
  const convList  = conversations ?? DEMO_CONVERSATIONS
  const isZooming = zoomPhase === 'zooming' || zoomPhase === 'done'

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>

      {/* WhatsAppDiscussions en fond — révélé par le zoom */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} />
      </div>

      {/* HomeScreen — zoom out depuis l'icône WhatsApp */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isZooming ? 'scale(3)' : 'scale(1)',
        transformOrigin: WA_ICON_ORIGIN,
        opacity: isZooming ? 0 : 1,
        transition: zoomPhase === 'zooming'
          ? 'transform 550ms cubic-bezier(0.4,0,0.2,1), opacity 400ms ease'
          : 'none',
      }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} highlightApp="WhatsApp" />
      </div>

      {/* Bannière notification */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>

    </div>
  )
}

// ─── WhatsAppDiscussions avec swipe back ─────────────────────────────────────

const DEMO_CONVERSATIONS = [
  { id: 'c1', name: 'Gérante',          avatarColor: '#ffb564', lastMessage: "Docteur, j'ai mal au ventre…",       time: '09:38', unread: 1, isOnline: true  },
  { id: 'c2', name: 'Infirmière Fatou', avatarColor: '#25D366', lastMessage: "La salle d'attente est pleine !",   time: '10:02', unread: 0, isOnline: false },
]

// Hauteur approximative d'une ligne de conversation dans WhatsAppDiscussions
// StatusBar(50) + topActions(36) + titre(48) + recherche(56) + filtres(46) + archivées(64) = ~300
const SCROLL_ROW_OFFSET = 300
const CONV_ROW_H        = 68

// Hauteur du clavier iOS : padding(14) + 4×54px + 3×12px + home(15) = 281px
const KEYBOARD_H = 281

function WhatsAppDiscussionsPreview({ animState }) {
  const {
    swipeBackPhase, notifPhase, notifForm,
    scrollToPhase, scrollToTarget,
    tapConvPhase, tapConvTarget,
    demoBubbles, newBubbleId,
    conversations, statusTime,
  } = animState

  const convList       = conversations ?? DEMO_CONVERSATIONS
  const isSwipeBack    = swipeBackPhase === 'sliding' || swipeBackPhase === 'done'
  const isTapConvOpen  = tapConvPhase   === 'sliding' || tapConvPhase   === 'done'
  const activeContact  = (scrollToPhase === 'scrolling' || scrollToPhase === 'highlighted')
    ? scrollToTarget : null

  const tapConvConv = convList.find((c) => c.name === tapConvTarget) ?? convList[0]

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>

      {/* HomeScreen en fond — révélé par le swipe */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transform: isSwipeBack ? 'translateX(0)' : 'translateX(-30%)',
        transition: swipeBackPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} highlightApp="WhatsApp" />
      </div>

      {/* Discussions — slide vers la droite (swipeBack) ou restent en place */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isSwipeBack ? 'translateX(100%)' : 'translateX(0)',
        transition: swipeBackPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} activeContact={activeContact} />
        {/* Pulse de surbrillance sur la ligne cible (scrollTo) */}
        {(scrollToPhase === 'scrolling' || scrollToPhase === 'highlighted') && (
          <div style={{
            position: 'absolute', left: 0, right: 0, zIndex: 1,
            top: SCROLL_ROW_OFFSET + convList.findIndex((c) => c.name === scrollToTarget) * CONV_ROW_H,
            height: CONV_ROW_H,
            backgroundColor: '#25D366',
            opacity: scrollToPhase === 'highlighted' ? 0.12 : 0,
            transition: scrollToPhase === 'highlighted' ? 'opacity 200ms ease-in' : 'none',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* WhatsApp Conversation — glisse depuis la droite (tapConversation) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        transform: isTapConvOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: tapConvPhase === 'sliding' ? 'transform 350ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={tapConvConv?.name}
          contactColor={tapConvConv?.avatarColor}
          contactOnline={tapConvConv?.isOnline}
          contactFollowers={tapConvConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
        />
      </div>

      {/* Bannière */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>

    </div>
  )
}

// ─── WhatsAppConversation avec swipe back → Discussions ──────────────────────

const INITIAL_BUBBLES = [
  { id: 'b1', side: 'incoming', characterName: 'Gérante', text: "Docteur, j'ai mal au ventre depuis ce matin 😟", time: '09:38', status: 'delivered' },
  { id: 'b2', side: 'outgoing', text: "C'est peut-être lié à ce que vous avez mangé ?",   time: '09:39', status: 'delivered' },
]

function WhatsAppConversationPreview({ animState }) {
  const {
    swipeBackConvPhase, notifPhase, notifForm, tapInputPhase,
    demoBubbles, newBubbleId, tapConvTarget, conversations,
    typingPhase, recordingPhase, statusTime,
  } = animState
  const convList    = conversations ?? DEMO_CONVERSATIONS
  const activeConv  = convList.find(c => c.name === tapConvTarget) ?? convList[0]
  const isSliding   = swipeBackConvPhase === 'sliding' || swipeBackConvPhase === 'done'
  const keyboardOpen = tapInputPhase === 'sliding' || tapInputPhase === 'done'

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>

      {/* Discussions en fond — parallaxe iOS (swipeBack) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transform: isSliding ? 'translateX(0)' : 'translateX(-30%)',
        transition: swipeBackConvPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} />
      </div>

      {/* Conversation — slide vers la droite (swipeBack) */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isSliding ? 'translateX(100%)' : 'translateX(0)',
        transition: swipeBackConvPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={activeConv?.name} contactColor={activeConv?.avatarColor}
          contactOnline={activeConv?.isOnline}
          contactFollowers={activeConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
          keyboardOffset={keyboardOpen ? KEYBOARD_H : 0}
          showTyping={typingPhase === 'visible'}
          showRecording={recordingPhase === 'visible'}
        />
      </div>

      {/* Clavier iOS — glisse depuis le bas */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        transform: keyboardOpen ? 'translateY(0)' : `translateY(${KEYBOARD_H}px)`,
        transition: tapInputPhase === 'sliding' ? `transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)` : 'none',
      }}>
        <IOSKeyboard />
      </div>

      {/* Bannière */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>

    </div>
  )
}

// ─── WhatsAppKeyboard avec dismiss ───────────────────────────────────────────

function WhatsAppKeyboardPreview({ animState }) {
  const {
    dismissKeyboardPhase, notifPhase, notifForm,
    demoBubbles, newBubbleId, inputText, typewriterKeys, typewriterView,
    tapConvTarget, conversations, typingPhase, recordingPhase, statusTime,
  } = animState
  const convList   = conversations ?? DEMO_CONVERSATIONS
  const activeConv = convList.find(c => c.name === tapConvTarget) ?? convList[0]
  const isDismissing   = dismissKeyboardPhase === 'sliding' || dismissKeyboardPhase === 'done'
  const keyboardOffset = isDismissing ? 0 : KEYBOARD_H

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>

      {/* Conversation */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={activeConv?.name} contactColor={activeConv?.avatarColor}
          contactOnline={activeConv?.isOnline}
          contactFollowers={activeConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
          inputText={inputText} keyboardOffset={keyboardOffset}
          showTyping={typingPhase === 'visible'}
          showRecording={recordingPhase === 'visible'}
        />
      </div>

      {/* Clavier — glisse vers le bas au dismiss */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isDismissing ? `translateY(${KEYBOARD_H}px)` : 'translateY(0)',
        transition: dismissKeyboardPhase === 'sliding'
          ? `transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)`
          : 'none',
      }}>
        <IOSKeyboard activeKeys={typewriterKeys} activeView={typewriterView} />
      </div>

      {/* Bannière */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>

    </div>
  )
}

// ─── Preview iPhone ───────────────────────────────────────────────────────────

const TAB_H      = 44   // barre d'onglets
const TIMELINE_H = 200  // timeline scène

function PhonePreview({ screenId, animState, availableHeight, captureRef }) {
  const fallback = window.innerHeight - NAV_H - TAB_H - 48
  const scale    = Math.min((availableHeight ?? fallback) / IPHONE_H, 1)

  const inner = (() => {
    switch (screenId) {
      case 'LockScreen':
        return <LockScreenPreview unlockPhase={animState.unlockPhase} notifPhase={animState.notifPhase} notif={animState.notifForm} statusTime={animState.statusTime} lockDate={animState.lockDate} />
      case 'HomeScreen':
        return <HomeScreenPreview animState={animState} />
      case 'WhatsAppDiscussions':
        return <WhatsAppDiscussionsPreview animState={animState} />
      case 'WhatsAppConversation':
        return <WhatsAppConversationPreview animState={animState} />
      case 'WhatsAppKeyboard':
        return <WhatsAppKeyboardPreview animState={animState} />
      default:
        return null
    }
  })()

  return (
    <div style={{ width: IPHONE_W * scale, height: IPHONE_H * scale, borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
      <div ref={captureRef} style={{ width: IPHONE_W, height: IPHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        {inner}
      </div>
    </div>
  )
}

// ─── WaitPanel ────────────────────────────────────────────────────────────────

function WaitPanel({ animState }) {
  const { waitDuration, setWaitDuration, waitRemaining, setWaitRemaining } = animState
  const isWaiting = waitRemaining > 0
  const pct       = isWaiting ? Math.round((waitRemaining / waitDuration) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-400 leading-relaxed">
        L'interface reste figée pendant la durée configurée. Aucune interaction possible.
      </p>

      <Field label="Durée (ms)">
        <input
          type="number"
          min={100}
          step={100}
          value={waitDuration}
          onChange={(e) => setWaitDuration(Math.max(100, Number(e.target.value)))}
          disabled={isWaiting}
          className={CLS}
        />
      </Field>

      {/* Raccourcis rapides */}
      <div className="flex gap-1.5 flex-wrap">
        {[500, 1000, 2000, 3000].map((v) => (
          <button
            key={v}
            onClick={() => setWaitDuration(v)}
            disabled={isWaiting}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
              waitDuration === v
                ? 'border-gray-400 bg-gray-100 font-semibold text-gray-800'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {v < 1000 ? `${v}ms` : `${v / 1000}s`}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {isWaiting && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>En cours…</span>
            <span>{(waitRemaining / 1000).toFixed(1)}s restantes</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: '#8E8E93' }}
            />
          </div>
        </div>
      )}

      <PlayBtn
        onClick={() => setWaitRemaining(waitDuration)}
        disabled={isWaiting}
        label={`Attendre ${waitDuration < 1000 ? waitDuration + 'ms' : (waitDuration / 1000) + 's'}`}
        color="#8E8E93"
      />
    </div>
  )
}

// ─── Panneau de config (gauche) ───────────────────────────────────────────────

function ActionConfigPanel({ actionId, animState, onClose }) {
  const {
    unlockPhase, setUnlockPhase,
    notifPhase, setNotifPhase, notifForm, setNotifForm,
    scrollToPhase, setScrollToPhase, scrollToTarget, setScrollToTarget,
    tapConvPhase, setTapConvPhase, tapConvTarget, setTapConvTarget,
    tapInputPhase, setTapInputPhase,
    dismissKeyboardPhase, setDismissKeyboardPhase,
    demoBubbles, setDemoBubbles, newBubbleId, setNewBubbleId,
    receiveMessageForm, setReceiveMessageForm,
    markAsReadPhase, setMarkAsReadPhase,
    inputText, setInputText,
    writeMessageForm, setWriteMessageForm, writeMessagePhase, startWriteMessage,
    deleteCharForm, setDeleteCharForm, deleteCharPhase, startDeleteChar,
    sendMessageForm, setSendMessageForm, sendMessagePhase, startSendMessage,
    stickerSendForm, setStickerSendForm,
    receiveStickerForm, setReceiveStickerForm,
    deleteSentIdx, setDeleteSentIdx, deleteReceivedIdx, setDeleteReceivedIdx,
    vocalSendForm, setVocalSendForm, vocalReceiveForm, setVocalReceiveForm,
    isFrozen,
  } = animState

  const renderContent = () => {
    switch (actionId) {

      case 'unlock':
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Le LockScreen glisse vers le haut en 450ms pour révéler l'écran d'accueil.
            </p>
            <PlayBtn
              onClick={() => setUnlockPhase('sliding')}
              disabled={isFrozen || unlockPhase !== 'idle'}
              label="Prévisualiser"
            />
          </div>
        )

      case 'showNotification':
        return (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="App">
                <select value={notifForm.app} onChange={(e) => setNotifForm((f) => ({ ...f, app: e.target.value }))} className={CLS} disabled={isFrozen}>
                  {Object.keys(APP_ICONS).map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Heure">
                <input type="text" value={notifForm.time} onChange={(e) => setNotifForm((f) => ({ ...f, time: e.target.value }))} className={CLS} disabled={isFrozen} />
              </Field>
            </div>
            <Field label="Expéditeur">
              <input type="text" value={notifForm.sender} onChange={(e) => setNotifForm((f) => ({ ...f, sender: e.target.value }))} className={CLS} disabled={isFrozen} />
            </Field>
            <Field label="Message">
              <textarea rows={3} value={notifForm.message} onChange={(e) => setNotifForm((f) => ({ ...f, message: e.target.value }))} className={`${CLS} resize-none`} disabled={isFrozen} />
            </Field>
            <PlayBtn
              onClick={() => { setNotifPhase('visible'); playSound('showNotification') }}
              disabled={isFrozen || notifPhase !== 'idle'}
              label="Prévisualiser"
              color="#FF9500"
            />
          </div>
        )

      case 'swipeBack': {
        // Détermine lequel des deux swipeBack déclencher selon l'onglet actif
        const isConv   = actionId === 'swipeBack' && animState.swipeBackConvPhase !== undefined
        const fromConv = animState.swipeBackConvPhase !== undefined && animState.swipeBackPhase !== undefined

        // On choisit selon l'écran courant — passé via animState.currentScreen
        const isConvScreen = animState.currentScreen === 'WhatsAppConversation'
        const phase        = isConvScreen ? animState.swipeBackConvPhase : animState.swipeBackPhase
        const setPhase     = isConvScreen ? animState.setSwipeBackConvPhase : animState.setSwipeBackPhase
        const target       = isConvScreen ? 'Discussions' : 'Accueil'

        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Geste retour iOS — l'interface glisse vers la droite et révèle <strong>{target}</strong> en dessous.
            </p>
            <PlayBtn
              onClick={() => setPhase('sliding')}
              disabled={isFrozen || phase !== 'idle'}
              label="Prévisualiser"
              color="#007AFF"
            />
          </div>
        )
      }

      case 'tapApp':
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              L'écran d'accueil zoome depuis l'icône WhatsApp et révèle la liste des discussions.
            </p>
            <PlayBtn
              onClick={() => animState.setZoomPhase('zooming')}
              disabled={isFrozen || animState.zoomPhase !== 'idle'}
              label="Prévisualiser"
              color="#25D366"
            />
          </div>
        )

      case 'wait':
        return <WaitPanel animState={animState} />

      case 'typingIndicator': {
        const isVisible = animState.typingPhase === 'visible'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Une bulle avec trois points animés apparaît côté entrant, visible pendant la durée configurée, puis disparaît à l'arrivée du message.
            </p>
            {isVisible && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Indicateur visible…
              </div>
            )}
            <PlayBtn
              onClick={() => animState.setTypingPhase('visible')}
              disabled={isFrozen || isVisible}
              label="Prévisualiser"
              color="#25D366"
            />
            <button
              onClick={() => animState.setTypingPhase('idle')}
              disabled={!isVisible}
              className="text-xs text-gray-400 hover:text-gray-600 text-left transition-colors disabled:opacity-40"
            >
              ↺ Masquer la bulle
            </button>
          </div>
        )
      }

      case 'recordingIndicator': {
        const isVisible = animState.recordingPhase === 'visible'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Une bulle avec icône micro et barres animées apparaît côté entrant, visible pendant la durée configurée, puis disparaît à l'arrivée de la note vocale.
            </p>
            {isVisible && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Enregistrement en cours…
              </div>
            )}
            <PlayBtn
              onClick={() => animState.setRecordingPhase('visible')}
              disabled={isFrozen || isVisible}
              label="Prévisualiser"
              color="#25D366"
            />
            <button
              onClick={() => animState.setRecordingPhase('idle')}
              disabled={!isVisible}
              className="text-xs text-gray-400 hover:text-gray-600 text-left transition-colors disabled:opacity-40"
            >
              ↺ Masquer la bulle
            </button>
          </div>
        )
      }

      case 'scrollTo': {
        const isActive = scrollToPhase !== 'idle'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              La liste défile et met en surbrillance la conversation cible.
            </p>
            <Field label="Conversation cible">
              <select
                value={scrollToTarget}
                onChange={(e) => setScrollToTarget(e.target.value)}
                disabled={isFrozen || isActive}
                className={CLS}
              >
                {DEMO_CONVERSATIONS.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </Field>
            <PlayBtn
              onClick={() => setScrollToPhase('scrolling')}
              disabled={isFrozen || isActive}
              label={`Scroller vers ${scrollToTarget}`}
              color="#007AFF"
            />
          </div>
        )
      }

      case 'receiveMessage': {
        const trigger = () => {
          const id = `b${Date.now()}`
          const bubble = { id, side: 'incoming', ...receiveMessageForm }
          setDemoBubbles((prev) => [...prev, bubble])
          setNewBubbleId(id)
          playSound('receiveMessage')
          setTimeout(() => setNewBubbleId(null), 600)
        }
        return (
          <div className="flex flex-col gap-3">
            <Field label="Texte du message">
              <textarea
                rows={3}
                value={receiveMessageForm.text}
                onChange={(e) => setReceiveMessageForm((f) => ({ ...f, text: e.target.value }))}
                disabled={isFrozen}
                className={`${CLS} resize-none`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Personnage">
                <input
                  type="text"
                  value={receiveMessageForm.characterName}
                  onChange={(e) => setReceiveMessageForm((f) => ({ ...f, characterName: e.target.value }))}
                  disabled={isFrozen}
                  className={CLS}
                />
              </Field>
              <Field label="Heure">
                <input
                  type="text"
                  value={receiveMessageForm.time}
                  onChange={(e) => setReceiveMessageForm((f) => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen}
                  className={CLS}
                />
              </Field>
            </div>
            <button
              onClick={() => setDemoBubbles(INITIAL_BUBBLES)}
              disabled={isFrozen}
              className="text-xs text-gray-400 hover:text-gray-600 text-left transition-colors disabled:opacity-40"
            >
              ↺ Réinitialiser les bulles
            </button>
            <PlayBtn
              onClick={trigger}
              disabled={isFrozen || !receiveMessageForm.text.trim()}
              label="Recevoir le message"
              color="#25D366"
            />
          </div>
        )
      }

      case 'markAsRead': {
        const hasDelivered = demoBubbles.some((b) => b.side === 'outgoing' && b.status !== 'read')
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Les coches des bulles sortantes passent en bleu — le contact a lu les messages.
            </p>
            <div className="flex flex-col gap-1.5">
              {demoBubbles.filter((b) => b.side === 'outgoing').map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: b.status === 'read' ? '#53BDEB' : '#8E8E93' }} />
                  <span className="truncate flex-1">{b.text}</span>
                  <span style={{ color: b.status === 'read' ? '#53BDEB' : '#8E8E93' }}>
                    {b.status === 'read' ? 'lu' : b.status === 'delivered' ? 'livré' : 'envoyé'}
                  </span>
                </div>
              ))}
            </div>
            <PlayBtn
              onClick={() => setMarkAsReadPhase('animating')}
              disabled={isFrozen || markAsReadPhase !== 'idle' || !hasDelivered}
              label="Marquer comme lu"
              color="#53BDEB"
            />
          </div>
        )
      }

      case 'writeMessage': {
        const isTyping = writeMessagePhase !== 'idle'
        const SPEEDS   = [{ v: 'slow', l: 'Lente' }, { v: 'normal', l: 'Normale' }, { v: 'fast', l: 'Rapide' }]
        const delay    = writeMessageForm.speed === 'slow' ? 120 : writeMessageForm.speed === 'fast' ? 30 : 60
        const estMs    = writeMessageForm.text.length * delay
        return (
          <div className="flex flex-col gap-3">
            <Field label="Texte à taper">
              <textarea
                rows={3}
                value={writeMessageForm.text}
                onChange={(e) => setWriteMessageForm((f) => ({ ...f, text: e.target.value }))}
                disabled={isFrozen || isTyping}
                className={`${CLS} resize-none`}
              />
            </Field>
            <Field label="Vitesse de frappe">
              <div className="flex gap-1.5">
                {SPEEDS.map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => setWriteMessageForm((f) => ({ ...f, speed: v }))}
                    disabled={isFrozen || isTyping}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                      writeMessageForm.speed === v
                        ? 'border-brand-orange bg-orange-50 text-brand-orange font-semibold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >{l}</button>
                ))}
              </div>
            </Field>
            {writeMessageForm.text.length > 0 && (
              <p className="text-[10px] text-gray-400">
                Durée estimée : ~{estMs < 1000 ? `${estMs}ms` : `${(estMs / 1000).toFixed(1)}s`}
              </p>
            )}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Frappe en cours…
              </div>
            )}
            <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-semibold text-gray-500">Touches spéciales :</span><br />
              Majuscules → ⇧ + lettre animés<br />
              Espace → touche espace animée<br />
              Accents / chiffres → pas d'animation
            </div>
            <button
              onClick={() => setInputText('')}
              disabled={isFrozen || isTyping || inputText === ''}
              className="text-xs text-gray-400 hover:text-gray-600 text-left transition-colors disabled:opacity-40"
            >
              ↺ Vider le champ
            </button>
            <PlayBtn
              onClick={startWriteMessage}
              disabled={isFrozen || isTyping || !writeMessageForm.text.trim()}
              label="Lancer la frappe"
              color="#25D366"
            />
          </div>
        )
      }

      case 'deleteChar': {
        const isDeleting = deleteCharPhase !== 'idle'
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="clearAll"
                checked={deleteCharForm.clearAll}
                onChange={(e) => setDeleteCharForm((f) => ({ ...f, clearAll: e.target.checked }))}
                disabled={isFrozen || isDeleting}
                className="w-4 h-4 accent-red-500"
              />
              <label htmlFor="clearAll" className="text-xs font-medium text-gray-700 cursor-pointer">
                Effacer toute la saisie
              </label>
            </div>
            {!deleteCharForm.clearAll && (
              <Field label="Nombre de caractères">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={deleteCharForm.count}
                    onChange={(e) => setDeleteCharForm((f) => ({ ...f, count: Math.max(1, Number(e.target.value)) }))}
                    disabled={isFrozen || isDeleting}
                    className={CLS}
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 3, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setDeleteCharForm((f) => ({ ...f, count: n }))}
                        disabled={isFrozen || isDeleting}
                        className={`text-xs px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                          deleteCharForm.count === n
                            ? 'border-red-300 bg-red-50 text-red-600 font-semibold'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              </Field>
            )}
            <p className="text-[10px] text-gray-400">
              Saisie actuelle : <span className="font-mono text-gray-600">«{inputText || '—'}»</span>
            </p>
            <PlayBtn
              onClick={startDeleteChar}
              disabled={isFrozen || isDeleting || inputText === ''}
              label={deleteCharForm.clearAll ? `Effacer ${inputText.length || 0} car.` : `Effacer ${deleteCharForm.count} car.`}
              color="#FF3B30"
            />
          </div>
        )
      }

      case 'sendMessage': {
        const isSending = sendMessagePhase !== 'idle'
        const STATUSES  = [
          { v: 'sent',      l: '✓ Envoyé',   c: '#8E8E93' },
          { v: 'delivered', l: '✓✓ Livré',    c: '#8E8E93' },
          { v: 'read',      l: '✓✓ Lu',       c: '#53BDEB' },
        ]
        return (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Envoie le texte saisi, bulle sortante — clavier reste ouvert.
            </p>
            <div className="p-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-600 break-all min-h-8">
              {inputText || <span className="text-gray-300 italic font-sans">champ vide</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Heure">
                <input
                  type="text"
                  value={sendMessageForm.time}
                  onChange={(e) => setSendMessageForm((f) => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen || isSending}
                  className={CLS}
                />
              </Field>
              <Field label="Statut initial">
                <select
                  value={sendMessageForm.status}
                  onChange={(e) => setSendMessageForm((f) => ({ ...f, status: e.target.value }))}
                  disabled={isFrozen || isSending}
                  className={CLS}
                >
                  {STATUSES.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>
            <PlayBtn
              onClick={startSendMessage}
              disabled={isFrozen || isSending || !inputText.trim()}
              label="Envoyer"
              color="#25D366"
            />
          </div>
        )
      }

      case 'dismissKeyboard': {
        const isActive = dismissKeyboardPhase !== 'idle'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Le clavier se rétracte vers le bas, la conversation revient à sa position.
            </p>
            <PlayBtn
              onClick={() => setDismissKeyboardPhase('sliding')}
              disabled={isFrozen || isActive}
              label="Fermer le clavier"
              color="#007AFF"
            />
          </div>
        )
      }

      case 'tapInput': {
        const isActive = tapInputPhase !== 'idle'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Tap sur la barre de saisie — le clavier iOS monte depuis le bas en 300ms.
            </p>
            <PlayBtn
              onClick={() => setTapInputPhase('sliding')}
              disabled={isFrozen || isActive}
              label="Ouvrir le clavier"
              color="#007AFF"
            />
          </div>
        )
      }

      case 'tapConversation': {
        const isActive = tapConvPhase !== 'idle'
        return (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Tap sur une ligne — la conversation glisse depuis la droite.
            </p>
            <Field label="Conversation à ouvrir">
              <select
                value={tapConvTarget}
                onChange={(e) => setTapConvTarget(e.target.value)}
                disabled={isFrozen || isActive}
                className={CLS}
              >
                {DEMO_CONVERSATIONS.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </Field>
            <PlayBtn
              onClick={() => setTapConvPhase('sliding')}
              disabled={isFrozen || isActive}
              label={`Ouvrir ${tapConvTarget}`}
              color="#007AFF"
            />
          </div>
        )
      }

      case 'selectAndSendSticker': {
        const STATUSES = [
          { v: 'sent',      l: '✓ Envoyé'   },
          { v: 'delivered', l: '✓✓ Livré'    },
          { v: 'read',      l: '✓✓ Lu'       },
        ]
        return (
          <div className="flex flex-col gap-3">
            <Field label="Sticker à envoyer">
              <StickerStrip
                value={stickerSendForm.filename}
                onChange={fn => setStickerSendForm(f => ({ ...f, filename: fn }))}
                disabled={isFrozen}
              />
            </Field>
            {stickerSendForm.filename && (
              <div className="flex justify-center py-1">
                <img
                  src={getLocalUrl(stickerSendForm.filename) ?? ''}
                  alt="aperçu"
                  style={{ width: 72, height: 72, objectFit: 'contain' }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Heure">
                <input type="text" value={stickerSendForm.time}
                  onChange={e => setStickerSendForm(f => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
              <Field label="Statut initial">
                <select value={stickerSendForm.status}
                  onChange={e => setStickerSendForm(f => ({ ...f, status: e.target.value }))}
                  disabled={isFrozen} className={CLS}>
                  {STATUSES.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>
            <button
              onClick={() => setDemoBubbles(INITIAL_BUBBLES)}
              disabled={isFrozen}
              className="text-xs text-gray-400 hover:text-gray-600 text-left transition-colors disabled:opacity-40"
            >
              ↺ Réinitialiser les bulles
            </button>
            <PlayBtn
              onClick={() => {
                if (!stickerSendForm.filename) return
                const id = `b${Date.now()}`
                setDemoBubbles(prev => [...prev, { id, side: 'outgoing', text: `[sticker:${stickerSendForm.filename}]`, time: stickerSendForm.time, status: stickerSendForm.status }])
                setNewBubbleId(id)
                playSound('sendMessage')
                setTimeout(() => setNewBubbleId(null), 600)
              }}
              disabled={isFrozen || !stickerSendForm.filename}
              label="Envoyer le sticker"
              color="#25D366"
            />
          </div>
        )
      }

      case 'receiveSticker': {
        return (
          <div className="flex flex-col gap-3">
            <Field label="Sticker reçu">
              <StickerStrip
                value={receiveStickerForm.filename}
                onChange={fn => setReceiveStickerForm(f => ({ ...f, filename: fn }))}
                disabled={isFrozen}
              />
            </Field>
            {receiveStickerForm.filename && (
              <div className="flex justify-center py-1">
                <img
                  src={getStickerUrl(receiveStickerForm.filename)}
                  onError={e => { e.currentTarget.src = getLocalUrl(receiveStickerForm.filename) ?? '' }}
                  alt="aperçu"
                  style={{ width: 72, height: 72, objectFit: 'contain' }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Personnage">
                <input type="text" value={receiveStickerForm.characterName}
                  onChange={e => setReceiveStickerForm(f => ({ ...f, characterName: e.target.value }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
              <Field label="Heure">
                <input type="text" value={receiveStickerForm.time}
                  onChange={e => setReceiveStickerForm(f => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
            </div>
            <PlayBtn
              onClick={() => {
                if (!receiveStickerForm.filename) return
                const id = `b${Date.now()}`
                const bubble = { id, side: 'incoming', text: `[sticker:${receiveStickerForm.filename}]`, time: receiveStickerForm.time, status: 'read', characterName: receiveStickerForm.characterName }
                setDemoBubbles(prev => [...prev, bubble])
                setNewBubbleId(id)
                playSound('receiveMessage')
                setTimeout(() => setNewBubbleId(null), 600)
              }}
              disabled={isFrozen || !receiveStickerForm.filename}
              label="Recevoir le sticker"
              color="#25D366"
            />
          </div>
        )
      }

      case 'deleteSentMessage': {
        const outgoing = demoBubbles.map((b, i) => ({ ...b, _absIdx: i })).filter(b => b.side === 'outgoing' && !b.deleted)
        const selIdx   = deleteSentIdx === -1 ? outgoing.length - 1 : Math.min(deleteSentIdx, outgoing.length - 1)
        return (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Sélectionne la bulle sortante à marquer comme supprimée.
            </p>
            {outgoing.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Aucune bulle sortante</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {outgoing.map((b, filtIdx) => (
                  <button
                    key={b.id}
                    onClick={() => setDeleteSentIdx(filtIdx)}
                    disabled={isFrozen}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                      selIdx === filtIdx
                        ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {b.text?.startsWith('[sticker:') ? '🖼 Sticker' : (b.text?.slice(0, 48) || '—')}
                  </button>
                ))}
              </div>
            )}
            <PlayBtn
              onClick={() => {
                setDemoBubbles(prev => {
                  const idxs = prev.reduce((acc, b, i) => (!b.deleted && b.side === 'outgoing' ? [...acc, i] : acc), [])
                  const target = idxs[selIdx] ?? idxs[idxs.length - 1]
                  if (target == null) return prev
                  const next = [...prev]
                  next[target] = { ...next[target], deleted: true }
                  return next
                })
              }}
              disabled={isFrozen || outgoing.length === 0}
              label="Supprimer le message"
              color="#FF3B30"
            />
          </div>
        )
      }

      case 'deleteReceivedMessage': {
        const incoming = demoBubbles.map((b, i) => ({ ...b, _absIdx: i })).filter(b => b.side === 'incoming' && !b.deleted)
        const selIdx   = deleteReceivedIdx === -1 ? incoming.length - 1 : Math.min(deleteReceivedIdx, incoming.length - 1)
        return (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Sélectionne la bulle entrante à marquer comme supprimée.
            </p>
            {incoming.length === 0 ? (
              <p className="text-xs text-gray-300 italic">Aucune bulle entrante</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {incoming.map((b, filtIdx) => (
                  <button
                    key={b.id}
                    onClick={() => setDeleteReceivedIdx(filtIdx)}
                    disabled={isFrozen}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
                      selIdx === filtIdx
                        ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {b.text?.startsWith('[sticker:') ? '🖼 Sticker' : (b.text?.slice(0, 48) || '—')}
                  </button>
                ))}
              </div>
            )}
            <PlayBtn
              onClick={() => {
                setDemoBubbles(prev => {
                  const idxs = prev.reduce((acc, b, i) => (!b.deleted && b.side === 'incoming' ? [...acc, i] : acc), [])
                  const target = idxs[selIdx] ?? idxs[idxs.length - 1]
                  if (target == null) return prev
                  const next = [...prev]
                  next[target] = { ...next[target], deleted: true }
                  return next
                })
              }}
              disabled={isFrozen || incoming.length === 0}
              label="Supprimer le message"
              color="#FF3B30"
            />
          </div>
        )
      }

      case 'sendVocal': {
        const STATUSES = [
          { v: 'sent',      l: '✓ Envoyé'   },
          { v: 'delivered', l: '✓✓ Livré'    },
          { v: 'read',      l: '✓✓ Lu'       },
        ]
        return (
          <div className="flex flex-col gap-3">
            <Field label="Chemin dans le bucket vocals">
              <input
                type="text"
                value={vocalSendForm.storagePath}
                onChange={e => setVocalSendForm(f => ({ ...f, storagePath: e.target.value }))}
                disabled={isFrozen}
                placeholder="user_id/story_ts.ogg"
                className={CLS}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Durée (s)">
                <input type="number" min={0} step={0.1}
                  value={vocalSendForm.duration}
                  onChange={e => setVocalSendForm(f => ({ ...f, duration: parseFloat(e.target.value) || 0 }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
              <Field label="Heure">
                <input type="text"
                  value={vocalSendForm.time}
                  onChange={e => setVocalSendForm(f => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
            </div>
            <Field label="Statut">
              <select value={vocalSendForm.status}
                onChange={e => setVocalSendForm(f => ({ ...f, status: e.target.value }))}
                disabled={isFrozen} className={CLS}>
                {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <PlayBtn
              onClick={async () => {
                if (!vocalSendForm.storagePath) return
                const blobUrl = await getVocalBlobUrl(vocalSendForm.storagePath).catch(() => null)
                const id = `b${Date.now()}`
                const bubble = {
                  id, side: 'outgoing',
                  text: `[vocal:${vocalSendForm.storagePath}:${vocalSendForm.duration.toFixed(1)}]`,
                  time: vocalSendForm.time, status: vocalSendForm.status,
                  blobUrl,
                }
                setDemoBubbles(prev => [...prev, bubble])
                setNewBubbleId(id)
                playSound('message_sent')
                setTimeout(() => setNewBubbleId(null), 600)
              }}
              disabled={isFrozen || !vocalSendForm.storagePath}
              label="Envoyer la note vocale"
              color="#25D366"
            />
          </div>
        )
      }

      case 'receiveVocal': {
        return (
          <div className="flex flex-col gap-3">
            <Field label="Chemin dans le bucket vocals">
              <input
                type="text"
                value={vocalReceiveForm.storagePath}
                onChange={e => setVocalReceiveForm(f => ({ ...f, storagePath: e.target.value }))}
                disabled={isFrozen}
                placeholder="user_id/story_ts.ogg"
                className={CLS}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Durée (s)">
                <input type="number" min={0} step={0.1}
                  value={vocalReceiveForm.duration}
                  onChange={e => setVocalReceiveForm(f => ({ ...f, duration: parseFloat(e.target.value) || 0 }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
              <Field label="Heure">
                <input type="text"
                  value={vocalReceiveForm.time}
                  onChange={e => setVocalReceiveForm(f => ({ ...f, time: e.target.value }))}
                  disabled={isFrozen} className={CLS} />
              </Field>
            </div>
            <Field label="Personnage">
              <input type="text"
                value={vocalReceiveForm.characterName}
                onChange={e => setVocalReceiveForm(f => ({ ...f, characterName: e.target.value }))}
                disabled={isFrozen} className={CLS} />
            </Field>
            <PlayBtn
              onClick={async () => {
                if (!vocalReceiveForm.storagePath) return
                const blobUrl = await getVocalBlobUrl(vocalReceiveForm.storagePath).catch(() => null)
                const id = `b${Date.now()}`
                const bubble = {
                  id, side: 'incoming',
                  text: `[vocal:${vocalReceiveForm.storagePath}:${vocalReceiveForm.duration.toFixed(1)}]`,
                  time: vocalReceiveForm.time, status: 'read',
                  characterName: vocalReceiveForm.characterName,
                  blobUrl,
                }
                setDemoBubbles(prev => [...prev, bubble])
                setNewBubbleId(id)
                playSound('message_received')
                setTimeout(() => setNewBubbleId(null), 600)
              }}
              disabled={isFrozen || !vocalReceiveForm.storagePath}
              label="Recevoir la note vocale"
              color="#25D366"
            />
          </div>
        )
      }

      default:
        return (
          <p className="text-xs text-gray-400">
            Panneau de configuration pour <strong>{actionId}</strong> — à construire.
          </p>
        )
    }
  }

  const allActions = Object.values(
    [...actionsForScreen('LockScreen'), ...actionsForScreen('HomeScreen'),
     ...actionsForScreen('WhatsAppDiscussions'), ...actionsForScreen('WhatsAppConversation'),
     ...actionsForScreen('WhatsAppKeyboard')]
    .reduce((acc, a) => { acc[a.id] = a; return acc }, {})
  )
  const action = allActions.find((a) => a.id === actionId) ?? { label: actionId, category: 'system' }

  const color = ACTION_CATEGORIES[action.category]?.color ?? '#8E8E93'

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <p className="text-xs font-bold text-gray-700">{action.label}</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-300 hover:text-gray-500 rounded-lg transition-colors">
          <XIcon size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </aside>
  )
}

// ─── Catalogue d'actions (droite) ─────────────────────────────────────────────

function ActionsSidebar({ screenId, selectedAction, onSelect }) {
  if (screenId === 'Scene') {
    return (
      <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</p>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-300 text-sm px-4 text-center">
          Sélectionnez un onglet d'interface
        </div>
      </aside>
    )
  }

  const actions = actionsForScreen(screenId)
  const grouped = actions.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {Object.entries(grouped).map(([cat, acts]) => {
          const { label, color } = ACTION_CATEGORIES[cat]
          return (
            <div key={cat}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
              </div>
              <div className="flex flex-col gap-1">
                {acts.map((a) => {
                  const isSelected = selectedAction === a.id
                  return (
                    <button
                      key={a.id}
                      onClick={() => onSelect(isSelected ? null : a.id)}
                      className={`text-left rounded-xl px-3 py-2.5 border transition-all ${
                        isSelected
                          ? 'border-gray-300 bg-white shadow-sm'
                          : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                      style={isSelected ? { borderColor: color + '66' } : {}}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: color + '22', color }}>
                          {a.id}
                        </span>
                        {a.nextScreen && (
                          <span className="text-[10px] text-gray-400">→ {a.nextScreen.replace('WhatsApp', 'WA ')}</span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-gray-800">{a.label}</div>
                      <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{a.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ─── Sélecteur de sticker (bande horizontale aléatoire) ──────────────────────

function StickerStrip({ value, onChange, disabled }) {
  const [shuffled] = useState(() => [...LOCAL_STICKERS].sort(() => Math.random() - 0.5))
  const selectedRef = useRef(null)

  useEffect(() => {
    if (value && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [value])

  return (
    <div style={{ overflowX: 'auto', display: 'flex', gap: 6, padding: '6px 2px', scrollbarWidth: 'thin' }}>
      {shuffled.map(s => {
        const selected = value === s.name
        return (
          <button
            key={s.name}
            ref={selected ? selectedRef : null}
            onClick={() => !disabled && onChange(s.name)}
            disabled={disabled}
            style={{
              flexShrink: 0,
              width: 60, height: 60,
              borderRadius: 10,
              border: `2px solid ${selected ? '#d9571d' : 'transparent'}`,
              backgroundColor: selected ? '#fff5ee' : 'transparent',
              padding: 3,
              cursor: disabled ? 'default' : 'pointer',
              transition: 'border-color 120ms',
              outline: 'none',
            }}
          >
            <img
              src={s.url}
              alt={s.name}
              onError={e => { e.currentTarget.src = getLocalUrl(s.name) ?? '' }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
          </button>
        )
      })}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DesktopEdition({ onChangeMode }) {
  const { id: storyId } = useParams()
  const [activeTab,      setActiveTab]      = useState('LockScreen')
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [selectedAction, setSelectedAction] = useState(null)
  const [storyMeta,      setStoryMeta]      = useState(null) // { week_date }

  useEffect(() => {
    if (!storyId) return
    getStory(storyId).then(setStoryMeta).catch(() => {})
  }, [storyId])

  // ── États d'animation partagés ───────────────────────────────────────────
  const [unlockPhase, setUnlockPhase] = useState('idle')
  const [notifPhase,  setNotifPhase]  = useState('idle')
  const [notifForm,   setNotifForm]   = useState({
    app: 'WhatsApp', sender: 'Gérante',
    message: "Docteur, j'ai mal au ventre depuis ce matin 😟",
    time: 'maint.',
  })
  const [zoomPhase,          setZoomPhase]          = useState('idle')
  const [swipeBackPhase,     setSwipeBackPhase]     = useState('idle')
  const [swipeBackConvPhase, setSwipeBackConvPhase] = useState('idle')
  const [scrollToPhase,      setScrollToPhase]      = useState('idle')
  const [scrollToTarget,     setScrollToTarget]     = useState('Gérante')
  const [tapConvPhase,       setTapConvPhase]       = useState('idle')
  const [tapConvTarget,      setTapConvTarget]      = useState('Gérante')
  const [tapInputPhase,         setTapInputPhase]         = useState('idle')
  const [dismissKeyboardPhase,  setDismissKeyboardPhase]  = useState('idle')
  const [demoBubbles,           setDemoBubbles]           = useState(INITIAL_BUBBLES)
  const [newBubbleId,           setNewBubbleId]           = useState(null)
  const [receiveMessageForm,    setReceiveMessageForm]    = useState({ text: "Vous êtes sûr ?", characterName: 'Gérante', time: '09:41' })
  const [markAsReadPhase,       setMarkAsReadPhase]       = useState('idle')
  const [typingPhase,           setTypingPhase]           = useState('idle') // idle | visible
  const [recordingPhase,        setRecordingPhase]        = useState('idle') // idle | visible
  const [inputText,             setInputText]             = useState('')
  const [writeMessageForm,      setWriteMessageForm]      = useState({ text: "Ah bon, c'est grave ?", speed: 'normal' })
  const [sendMessageForm,       setSendMessageForm]       = useState({ time: '09:41', status: 'sent' })
  const [sendMessagePhase,      setSendMessagePhase]      = useState('idle') // idle | sending | done
  const [writeMessagePhase,     setWriteMessagePhase]     = useState('idle') // idle | typing | done
  const [deleteCharForm,        setDeleteCharForm]        = useState({ count: 1, clearAll: false })
  const [deleteCharPhase,       setDeleteCharPhase]       = useState('idle') // idle | deleting | done
  const [stickerSendForm,       setStickerSendForm]       = useState({ filename: null, time: '09:41', status: 'sent' })
  const [receiveStickerForm,    setReceiveStickerForm]    = useState({ filename: null, characterName: '', time: '09:41' })
  const [deleteSentIdx,         setDeleteSentIdx]         = useState(-1)
  const [deleteReceivedIdx,     setDeleteReceivedIdx]     = useState(-1)
  const [vocalSendForm,         setVocalSendForm]         = useState({ storagePath: '', duration: 0, time: '09:41', status: 'sent' })
  const [vocalReceiveForm,      setVocalReceiveForm]      = useState({ storagePath: '', duration: 0, characterName: '', time: '09:41' })
  const [typewriterKeys,        setTypewriterKeys]        = useState(new Set())
  const [typewriterView,        setTypewriterView]        = useState(null) // null = laisse le clavier gérer
  const typewriterRef  = useRef(null)
  const deleteRef      = useRef(null)
  const sceneTimerRef  = useRef(null)
  const captureRef     = useRef(null)

  // ── Export MP4 ───────────────────────────────────────────────────────────────
  const [isExporting,      setIsExporting]      = useState(false)
  const [exportProgress,   setExportProgress]   = useState({ message: '' })
  const [exportModalOpen,  setExportModalOpen]  = useState(false)
  const [exportMode,       setExportMode]       = useState(null) // 'browser' | 'server'
  const [serverStatus,     setServerStatus]     = useState('unknown') // 'unknown' | 'checking' | 'online' | 'offline'
  // Refs toujours à jour pour éviter les closures périmées dans startScenePlay
  const sceneFnRef          = useRef({ startWriteMessage: null, startSendMessage: null, startDeleteChar: null })
  const writeMessagePhaseRef = useRef('idle')
  const inputTextRef         = useRef('')     // miroir de inputText pour fireSend
  // Map contactName → bulles : isoler les conversations pendant la lecture
  const convBubblesRef        = useRef({})
  const currentSceneContactRef = useRef(null) // contact ouvert pendant la lecture

  // ── État scène ───────────────────────────────────────────────────────────────
  const [sceneSteps,         setSceneSteps]         = useState([])
  const [sceneSelIdx,        setSceneSelIdx]        = useState(null)
  const [scenePlayIdx,       setScenePlayIdx]       = useState(null)
  const [sceneIsPlaying,     setSceneIsPlaying]     = useState(false)
  const [sceneConversations, setSceneConversations] = useState(DEMO_CONVERSATIONS)

  // Mappe un caractère vers { view, keys }
  const charToKeyInfo = (char) => {
    if (/[a-z]/.test(char))     return { view: 'ABC',  keys: new Set([char]) }
    if (/[A-Z]/.test(char))     return { view: 'ABC',  keys: new Set(['⇧', char.toLowerCase()]) }
    if (char === ' ')            return { view: null,   keys: new Set([' ']) }
    // Vue 123
    const keys123 = new Set(['1','2','3','4','5','6','7','8','9','0','-','/',':', ';','(',')',  '€','&','@','"','.',',','?','!','\''])
    if (keys123.has(char))       return { view: '123',  keys: new Set([char]) }
    // Vue #+=
    const keysSharp = new Set(['[',']','{','}','#','%','^','*','+','=','_','\\','|','~','<','>','$','£','¥','•'])
    if (keysSharp.has(char))     return { view: '#+=',  keys: new Set([char]) }
    return { view: null, keys: new Set() }
  }

  const [waitDuration,  setWaitDuration]  = useState(2000)
  const [waitRemaining, setWaitRemaining] = useState(0)
  const [currentTime,   setCurrentTime]   = useState(() => extractFirstTime([]))

  // Resync sur chargement initial des steps (ex: depuis Supabase)
  useEffect(() => {
    setCurrentTime(extractFirstTime(sceneSteps))
  }, [sceneSteps])

  // ── Date et heure ─────────────────────────────────────────────────────────────
  const lockDate   = formatLockDate(storyMeta?.week_date)
  const statusTime = currentTime


  useEffect(() => {
    if (zoomPhase === 'idle') return
    const t = []
    if (zoomPhase === 'zooming') t.push(setTimeout(() => setZoomPhase('done'),  550))
    if (zoomPhase === 'done')    t.push(setTimeout(() => setZoomPhase('idle'), 1500))
    return () => t.forEach(clearTimeout)
  }, [zoomPhase])

  useEffect(() => {
    if (swipeBackPhase === 'idle') return
    const t = []
    if (swipeBackPhase === 'sliding') t.push(setTimeout(() => setSwipeBackPhase('done'),  380))
    if (swipeBackPhase === 'done')    t.push(setTimeout(() => setSwipeBackPhase('idle'), 1200))
    return () => t.forEach(clearTimeout)
  }, [swipeBackPhase])

  useEffect(() => {
    if (swipeBackConvPhase === 'idle') return
    const t = []
    if (swipeBackConvPhase === 'sliding') t.push(setTimeout(() => setSwipeBackConvPhase('done'),  380))
    if (swipeBackConvPhase === 'done')    t.push(setTimeout(() => setSwipeBackConvPhase('idle'), 1200))
    return () => t.forEach(clearTimeout)
  }, [swipeBackConvPhase])

  // Countdown dans le parent — fiable entre plusieurs appels
  useEffect(() => {
    if (waitRemaining <= 0) return
    const t = setTimeout(() => setWaitRemaining((r) => Math.max(0, r - 100)), 100)
    return () => clearTimeout(t)
  }, [waitRemaining])

  useEffect(() => {
    if (unlockPhase === 'idle') return
    const t = []
    if (unlockPhase === 'sliding') t.push(setTimeout(() => setUnlockPhase('done'),  450))
    if (unlockPhase === 'done')    t.push(setTimeout(() => setUnlockPhase('idle'), 1500))
    return () => t.forEach(clearTimeout)
  }, [unlockPhase])

  useEffect(() => {
    if (notifPhase === 'idle') return
    const t = []
    if (notifPhase === 'visible') t.push(setTimeout(() => setNotifPhase('hiding'), 2800))
    if (notifPhase === 'hiding')  t.push(setTimeout(() => setNotifPhase('idle'),    400))
    return () => t.forEach(clearTimeout)
  }, [notifPhase])

  useEffect(() => {
    if (scrollToPhase === 'idle') return
    const t = []
    if (scrollToPhase === 'scrolling')   t.push(setTimeout(() => setScrollToPhase('highlighted'), 400))
    if (scrollToPhase === 'highlighted') t.push(setTimeout(() => setScrollToPhase('idle'),       1800))
    return () => t.forEach(clearTimeout)
  }, [scrollToPhase])

  useEffect(() => {
    if (tapConvPhase === 'idle') return
    const t = []
    if (tapConvPhase === 'sliding') t.push(setTimeout(() => setTapConvPhase('done'),  350))
    if (tapConvPhase === 'done')    t.push(setTimeout(() => setTapConvPhase('idle'), 1800))
    return () => t.forEach(clearTimeout)
  }, [tapConvPhase])

  useEffect(() => {
    if (tapInputPhase === 'idle') return
    const t = []
    if (tapInputPhase === 'sliding') t.push(setTimeout(() => setTapInputPhase('done'),  300))
    if (tapInputPhase === 'done')    t.push(setTimeout(() => setTapInputPhase('idle'), 2000))
    return () => t.forEach(clearTimeout)
  }, [tapInputPhase])

  useEffect(() => {
    if (dismissKeyboardPhase === 'idle') return
    const t = []
    if (dismissKeyboardPhase === 'sliding') t.push(setTimeout(() => setDismissKeyboardPhase('done'),  300))
    if (dismissKeyboardPhase === 'done')    t.push(setTimeout(() => setDismissKeyboardPhase('idle'), 1200))
    return () => t.forEach(clearTimeout)
  }, [dismissKeyboardPhase])

  useEffect(() => {
    if (markAsReadPhase === 'idle') return
    if (markAsReadPhase === 'animating') {
      setDemoBubbles((prev) => prev.map((b) => b.side === 'outgoing' ? { ...b, status: 'read' } : b))
      const t = setTimeout(() => setMarkAsReadPhase('idle'), 400)
      return () => clearTimeout(t)
    }
  }, [markAsReadPhase])

  // Typewriter — caractère par caractère avec gestion des vues et animations
  const startWriteMessage = useCallback((overText, overSpeed) => {
    if (writeMessagePhase !== 'idle') return
    const text  = overText  !== undefined ? overText  : writeMessageForm.text
    const speed = overSpeed !== undefined ? overSpeed : writeMessageForm.speed
    const delay    = speed === 'slow' ? 120 : speed === 'fast' ? 30 : 60
    const popDur   = Math.min(delay - 5, 160)

    // Précalcule la séquence complète d'étapes
    // Pour chaque caractère : si changement de vue → intercaler une étape "transition"
    const steps = []
    let currentView = 'ABC'
    for (let i = 0; i < text.length; i++) {
      const { view, keys } = charToKeyInfo(text[i])
      const targetView = view ?? currentView
      if (targetView !== currentView) {
        // Étape transition : anime la touche switch (ex. '123')
        const switchKey = currentView === 'ABC' ? '123'
          : targetView === 'ABC' ? 'ABC'
          : targetView === '#+=.' ? '#+=.' : '#+='
        steps.push({ type: 'switch', switchKey, toView: targetView, char: null, keys: new Set([switchKey]) })
        currentView = targetView
      }
      steps.push({ type: 'char', char: text[i], view: currentView, keys, charIndex: i + 1 })
    }
    // Retour à ABC à la fin si nécessaire
    if (currentView !== 'ABC') {
      steps.push({ type: 'switch', switchKey: 'ABC', toView: 'ABC', keys: new Set(['ABC']) })
    }

    let si = 0
    setWriteMessagePhase('typing')
    setTypewriterView('ABC')

    const tick = () => {
      if (si >= steps.length) {
        setTypewriterKeys(new Set())
        setTypewriterView(null)
        setWriteMessagePhase('done')
        setTimeout(() => setWriteMessagePhase('idle'), 500)
        return
      }
      const step = steps[si]
      si++

      if (step.type === 'switch') {
        // Anime la touche de changement de vue, puis change la vue
        setTypewriterKeys(step.keys)
        setTimeout(() => {
          setTypewriterView(step.toView)
          setTypewriterKeys(new Set())
          typewriterRef.current = setTimeout(tick, delay)
        }, popDur)
      } else {
        // Anime la touche du caractère + ajoute le caractère au texte + son clavier
        setTypewriterKeys(step.keys)
        setInputText(text.slice(0, step.charIndex))
        playKeyboardClick()
        setTimeout(() => setTypewriterKeys(new Set()), popDur)
        typewriterRef.current = setTimeout(tick, delay)
      }
    }

    typewriterRef.current = setTimeout(tick, 0)
  }, [writeMessageForm, writeMessagePhase])

  useEffect(() => () => clearTimeout(typewriterRef.current), [])

  // sendMessage — envoie inputText comme bulle sortante, vide le champ, ferme le clavier
  const startSendMessage = useCallback((overTime, overStatus) => {
    if (sendMessagePhase !== 'idle' || !inputText.trim()) return
    const bubble = {
      id: `b${Date.now()}`,
      side: 'outgoing',
      text: inputText.trim(),
      time:   overTime   !== undefined ? overTime   : sendMessageForm.time,
      status: overStatus !== undefined ? overStatus : sendMessageForm.status,
    }
    setSendMessagePhase('sending')
    setDemoBubbles((prev) => {
      const next = [...prev, bubble]
      if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
      return next
    })
    setNewBubbleId(bubble.id)
    playSound('sendMessage')
    setTimeout(() => setNewBubbleId(null), 400)
    setInputText('')
    setTypewriterKeys(new Set())
    setSendMessagePhase('done')
    setTimeout(() => setSendMessagePhase('idle'), 600)
  }, [sendMessagePhase, inputText, sendMessageForm])

  // DeleteChar — toujours caractère par caractère
  const startDeleteChar = useCallback((overCount, overClearAll) => {
    if (deleteCharPhase !== 'idle') return
    const clearAll = overClearAll !== undefined ? overClearAll : deleteCharForm.clearAll
    const count    = clearAll
      ? inputText.length
      : Math.max(1, overCount !== undefined ? overCount : deleteCharForm.count)
    if (count === 0) return
    let remaining = count
    setDeleteCharPhase('deleting')
    setTypewriterKeys(new Set(['⌫']))
    deleteRef.current = setInterval(() => {
      setInputText((prev) => prev.slice(0, -1))
      remaining--
      if (remaining <= 0) {
        clearInterval(deleteRef.current)
        setTypewriterKeys(new Set())
        setDeleteCharPhase('done')
        setTimeout(() => setDeleteCharPhase('idle'), 300)
      }
    }, 80)
  }, [deleteCharForm, deleteCharPhase, inputText])

  useEffect(() => () => clearInterval(deleteRef.current), [])

  // Sync des fonctions dans le ref partagé — évite les closures périmées dans playNext
  useEffect(() => {
    sceneFnRef.current = { startWriteMessage, startSendMessage, startDeleteChar }
  }, [startWriteMessage, startSendMessage, startDeleteChar])

  // Sync de writeMessagePhase dans un ref — lu par le guard sendMessage dans startScenePlay
  useEffect(() => {
    writeMessagePhaseRef.current = writeMessagePhase
  }, [writeMessagePhase])

  // Miroir inputText → ref pour lecture dans les callbacks asynchrones
  useEffect(() => {
    inputTextRef.current = inputText
  }, [inputText])

  // Ferme le panneau config si on change d'onglet
  const handleTabChange = (id) => {
    setActiveTab(id)
    setSelectedAction(null)
  }

  // ── Moteur de lecture Scène ───────────────────────────────────────────────

  useEffect(() => () => clearTimeout(sceneTimerRef.current), [])

  const sceneScreens      = sceneComputeScreens(sceneSteps)
  const scenePreviewScreen = sceneIsPlaying && scenePlayIdx !== null
    ? (sceneScreens[scenePlayIdx] ?? 'LockScreen')
    : sceneSelIdx !== null
      ? (sceneScreens[sceneSelIdx] ?? 'LockScreen')
      : 'LockScreen'

  const sceneReset = useCallback(() => {
    clearTimeout(sceneTimerRef.current)
    setSceneIsPlaying(false)
    setScenePlayIdx(null)
    setSceneSelIdx(null)
    // Réinitialise tous les états d'animation
    convBubblesRef.current = {}
    currentSceneContactRef.current = null
    setDemoBubbles(INITIAL_BUBBLES)
    setTypingPhase('idle')
    setInputText('')
    setUnlockPhase('idle')
    setZoomPhase('idle')
    setTapConvPhase('idle')
    setTapInputPhase('idle')
    setDismissKeyboardPhase('idle')
    setScrollToPhase('idle')
    setNotifPhase('idle')
    setMarkAsReadPhase('idle')
    setWaitRemaining(0)
    setTypewriterKeys(new Set())
    setTypewriterView(null)
    setWriteMessagePhase('idle')
    setDeleteCharPhase('idle')
    setSendMessagePhase('idle')
    setRecordingPhase('idle')
    setCurrentTime(extractFirstTime(sceneSteps))
    // Remet à zéro le dernier message de tous les fils (principal + secondaire)
    setSceneConversations(prev => prev.map(c =>
      ({ ...c, lastMessage: '', time: '' })
    ))
  }, [sceneSteps])

  const startScenePlay = useCallback((onComplete) => {
    if (sceneIsPlaying) {
      clearTimeout(sceneTimerRef.current)
      setSceneIsPlaying(false)
      setScenePlayIdx(null)
      return
    }
    if (sceneSteps.length === 0) return

    const stepsSnap = sceneSteps
    const startIdx  = scenePlayIdx ?? 0

    // Réinitialise la map des bulles par conversation
    convBubblesRef.current = {}
    currentSceneContactRef.current = null
    setSceneIsPlaying(true)

    const playNext = (idx) => {
      if (idx >= stepsSnap.length) {
        setSceneIsPlaying(false)
        setScenePlayIdx(null)
        onComplete?.()
        return
      }
      const step             = stepsSnap[idx]
      const { actionId, payload: p = {} } = step

      setScenePlayIdx(idx)
      setSceneSelIdx(idx)

      // Déclenche l'animation correspondante
      switch (actionId) {
        case 'unlock':
        case 'faceID':
          setUnlockPhase('sliding'); break
        case 'tapApp':
          setZoomPhase('zooming'); break
        case 'scrollTo':
          setScrollToTarget(p.contactName ?? 'Gérante')
          setScrollToPhase('scrolling'); break
        case 'tapConversation': {
          const contact = p.contactName ?? 'Gérante'
          currentSceneContactRef.current = contact
          setTapConvTarget(contact)
          setTapConvPhase('sliding')
          // Charge les bulles de CETTE conversation (vide si première ouverture)
          setDemoBubbles(convBubblesRef.current[contact] ?? [])
          // Efface le badge non-lu pour ce contact
          setSceneConversations(prev => prev.map(c =>
            c.name === contact ? { ...c, unread: 0 } : c
          ))
          break
        }
        case 'tapNotification': {
          const contact = p.contactName ?? ''
          currentSceneContactRef.current = contact
          setTapConvTarget(contact)
          setTapConvPhase('sliding')
          setDemoBubbles(convBubblesRef.current[contact] ?? [])
          setSceneConversations(prev => prev.map(c =>
            c.name === contact ? { ...c, unread: 0 } : c
          ))
          break
        }
        case 'tapInput':
          setTapInputPhase('sliding'); break
        case 'dismissKeyboard':
          setDismissKeyboardPhase('sliding'); break
        case 'swipeBack': {
          const screensSnap = sceneComputeScreens(stepsSnap)
          const curScreen   = screensSnap[idx] ?? 'LockScreen'
          if (curScreen === 'WhatsAppConversation' || curScreen === 'WhatsAppKeyboard') {
            setSwipeBackConvPhase('sliding')
          } else {
            setSwipeBackPhase('sliding')
          }
          break
        }
        case 'typingIndicator':
          setTypingPhase('visible')
          break
        case 'recordingIndicator':
          setRecordingPhase('visible')
          break
        case 'receiveMessage':
          setTypingPhase('idle')
          if (p.time) setCurrentTime(p.time)
          if (p.text) {
            const b = { id: `b${Date.now()}`, side: 'incoming', text: p.text, time: p.time ?? '09:41', status: 'read', characterName: p.characterName }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const recvContact = currentSceneContactRef.current
            if (recvContact) {
              setSceneConversations(prev => prev.map(c =>
                c.name === recvContact
                  ? { ...c, lastMessage: p.text, time: p.time ?? '09:41', isOutgoing: false, outgoingStatus: undefined }
                  : c
              ))
            }
          }
          break
        case 'selectAndSendSticker': {
          if (p.filename) {
            if (p.time) setCurrentTime(p.time)
            const b = { id: `b${Date.now()}`, side: 'outgoing', text: `[sticker:${p.filename}]`, time: p.time ?? '09:41', status: p.status ?? 'sent' }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('sendMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentSceneContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '🖼 Sticker', time: p.time ?? '09:41', isOutgoing: true, outgoingStatus: p.status ?? 'sent' } : cv
            ))
          }
          break
        }
        case 'receiveSticker': {
          setTypingPhase('idle')
          if (p.filename) {
            const b = { id: `b${Date.now()}`, side: 'incoming', text: `[sticker:${p.filename}]`, time: p.time ?? '09:41', status: 'read', characterName: p.characterName ?? '' }
            if (p.time) setCurrentTime(p.time)
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentSceneContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '🖼 Sticker', time: p.time ?? '09:41', isOutgoing: false, outgoingStatus: undefined } : cv
            ))
          }
          break
        }
        case 'deleteSentMessage':
          setDemoBubbles(prev => {
            const idxs = prev.reduce((acc, b, i) => (!b.deleted && b.side === 'outgoing' ? [...acc, i] : acc), [])
            const target = (p.bubbleIndex ?? -1) === -1 ? idxs[idxs.length - 1] : idxs[p.bubbleIndex]
            if (target == null) return prev
            const next = [...prev]
            next[target] = { ...next[target], deleted: true }
            return next
          })
          break
        case 'deleteReceivedMessage':
          setDemoBubbles(prev => {
            const idxs = prev.reduce((acc, b, i) => (!b.deleted && b.side === 'incoming' ? [...acc, i] : acc), [])
            const target = (p.bubbleIndex ?? -1) === -1 ? idxs[idxs.length - 1] : idxs[p.bubbleIndex]
            if (target == null) return prev
            const next = [...prev]
            next[target] = { ...next[target], deleted: true }
            return next
          })
          break
        case 'sendVocal': {
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            getVocalBlobUrl(p.storagePath).catch(() => null).then(blobUrl => {
              const b = {
                id: `b${Date.now()}`, side: 'outgoing',
                text: `[vocal:${p.storagePath}:${(p.duration ?? 0).toFixed(1)}]`,
                time: p.time ?? '09:41', status: p.status ?? 'sent',
                blobUrl,
              }
              setDemoBubbles(prev => {
                const next = [...prev, b]
                if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
                return next
              })
              setNewBubbleId(b.id)
              playSound('message_sent')
              setTimeout(() => setNewBubbleId(null), 600)
              const c = currentSceneContactRef.current
              if (c) setSceneConversations(prev => prev.map(cv =>
                cv.name === c ? { ...cv, lastMessage: '🎤 Note vocale', time: p.time ?? '09:41', isOutgoing: true, outgoingStatus: p.status ?? 'sent' } : cv
              ))
            })
          }
          break
        }
        case 'receiveVocal': {
          setTypingPhase('idle')
          setRecordingPhase('idle')
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            getVocalBlobUrl(p.storagePath).catch(() => null).then(blobUrl => {
              const b = {
                id: `b${Date.now()}`, side: 'incoming',
                text: `[vocal:${p.storagePath}:${(p.duration ?? 0).toFixed(1)}]`,
                time: p.time ?? '09:41', status: 'read',
                characterName: p.characterName ?? '',
                blobUrl,
              }
              setDemoBubbles(prev => {
                const next = [...prev, b]
                if (currentSceneContactRef.current) convBubblesRef.current[currentSceneContactRef.current] = next
                return next
              })
              setNewBubbleId(b.id)
              playSound('message_received')
              setTimeout(() => setNewBubbleId(null), 600)
              const c = currentSceneContactRef.current
              if (c) setSceneConversations(prev => prev.map(cv =>
                cv.name === c ? { ...cv, lastMessage: '🎤 Note vocale', time: p.time ?? '09:41', isOutgoing: false, outgoingStatus: undefined } : cv
              ))
            })
          }
          break
        }
        case 'markAsRead':
          setMarkAsReadPhase('animating'); break
        case 'writeMessage':
          sceneFnRef.current.startWriteMessage(p.text, p.speed); break
        case 'deleteChar':
          sceneFnRef.current.startDeleteChar(p.count, p.clearAll); break
        case 'sendMessage': {
          const fireSend = () => {
            if (writeMessagePhaseRef.current !== 'idle') {
              sceneTimerRef.current = setTimeout(fireSend, 60)
              return
            }
            // Capture le texte avant que startSendMessage vide inputText
            const sentText    = inputTextRef.current.trim()
            const sendContact = currentSceneContactRef.current
            if (p.time) setCurrentTime(p.time)
            sceneFnRef.current.startSendMessage(p.time, p.status)
            // Mise à jour dynamique de la ligne dans la liste des discussions
            if (sentText && sendContact) {
              setSceneConversations(prev => prev.map(c =>
                c.name === sendContact
                  ? { ...c, lastMessage: sentText, time: p.time ?? '09:41', isOutgoing: true, outgoingStatus: p.status ?? 'sent' }
                  : c
              ))
            }
            sceneTimerRef.current = setTimeout(() => playNext(idx + 1), sceneStepDur(step))
          }
          fireSend()
          return // court-circuite le setTimeout normal en bas
        }
        case 'showNotification':
          if (p.time && /^\d{1,2}:\d{2}$/.test(p.time)) setCurrentTime(p.time)
          setNotifForm({ app: p.app ?? 'WhatsApp', sender: p.sender ?? '', message: p.message ?? '', time: p.time ?? 'maint.' })
          setNotifPhase('visible')
          playSound('showNotification')
          // Met à jour le preview du contact dans la liste discussions (fil secondaire)
          if (p.sender) {
            setSceneConversations(prev => prev.map(c =>
              c.name === p.sender
                ? { ...c, lastMessage: p.message ?? '', time: p.time ?? '', unread: (c.unread ?? 0) + 1 }
                : c
            ))
          }
          break
        case 'wait':
          setWaitRemaining(p.duration ?? 1000); break
        case 'playSound':
          playSound(p.sound); break
        default: break
      }

      const dur = sceneStepDur(step)
      sceneTimerRef.current = setTimeout(() => playNext(idx + 1), dur)
    }

    playNext(startIdx)
  }, [sceneSteps, sceneIsPlaying, scenePlayIdx])

  const startExport = useCallback(async () => {
    if (isExporting || sceneSteps.length === 0) return
    setExportModalOpen(false)
    // Reset puis attendre que React rende le LockScreen initial
    sceneReset()
    await new Promise(r => setTimeout(r, 300))
    setIsExporting(true)
    setExportMode('browser')
    setExportProgress({ message: 'Démarrage…' })
    try {
      const blob = await exportSceneToMp4({
        captureRef,
        // playScene : lance la lecture et retourne une Promise qui résout à la fin
        playScene: () => new Promise(resolve => startScenePlay(resolve)),
        onProgress: (message) => setExportProgress({ message }),
      })
      // Téléchargement automatique
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `scene-${storyId ?? 'export'}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      console.error('[export]', err)
      setExportProgress({ message: `Erreur : ${err.message}` })
    } finally {
      setIsExporting(false)
      setExportMode(null)
      sceneReset()
    }
  }, [isExporting, sceneSteps, sceneReset, startScenePlay, storyId])

  // ── Export Mode 2 — Puppeteer serveur ────────────────────────────────────────
  const startExportServer = useCallback(async () => {
    if (isExporting || sceneSteps.length === 0) return
    setExportModalOpen(false)
    setIsExporting(true)
    setExportMode('server')
    setExportProgress({ message: 'Connexion au serveur…' })
    try {
      await exportSceneViaServer({
        steps:         sceneSteps,
        conversations: sceneConversations,
        storyMeta,
        baseName:      `scene-${storyId ?? 'export'}`,
        onProgress:    (message) => setExportProgress({ message }),
      })
    } catch (err) {
      console.error('[export-server]', err)
      setExportProgress({ message: `Erreur : ${err.message}` })
    } finally {
      setIsExporting(false)
      setExportMode(null)
    }
  }, [isExporting, sceneSteps, sceneConversations, storyMeta, storyId])

  // Vérifie la disponibilité du serveur quand le modal s'ouvre
  useEffect(() => {
    if (!exportModalOpen) return
    setServerStatus('checking')
    const ctrl = new AbortController()
    fetch('http://localhost:3001/health', { signal: ctrl.signal })
      .then(r => setServerStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setServerStatus('offline'))
    return () => ctrl.abort()
  }, [exportModalOpen])

  const isFrozen = waitRemaining > 0

  const animState = {
    unlockPhase, setUnlockPhase,
    notifPhase,  setNotifPhase, notifForm, setNotifForm,
    zoomPhase,      setZoomPhase,
    swipeBackPhase,     setSwipeBackPhase,
    swipeBackConvPhase, setSwipeBackConvPhase,
    scrollToPhase,  setScrollToPhase,  scrollToTarget,  setScrollToTarget,
    tapConvPhase,   setTapConvPhase,   tapConvTarget,   setTapConvTarget,
    tapInputPhase,        setTapInputPhase,
    dismissKeyboardPhase, setDismissKeyboardPhase,
    demoBubbles, setDemoBubbles, newBubbleId, setNewBubbleId,
    receiveMessageForm, setReceiveMessageForm,
    markAsReadPhase, setMarkAsReadPhase,
    typingPhase, setTypingPhase,
    recordingPhase, setRecordingPhase,
    inputText, setInputText,
    writeMessageForm, setWriteMessageForm, writeMessagePhase, startWriteMessage,
    deleteCharForm, setDeleteCharForm, deleteCharPhase, startDeleteChar,
    sendMessageForm, setSendMessageForm, sendMessagePhase, startSendMessage,
    stickerSendForm, setStickerSendForm, receiveStickerForm, setReceiveStickerForm,
    deleteSentIdx, setDeleteSentIdx, deleteReceivedIdx, setDeleteReceivedIdx,
    vocalSendForm, setVocalSendForm, vocalReceiveForm, setVocalReceiveForm,
    typewriterKeys, typewriterView,
    currentScreen: activeTab,
    waitDuration, setWaitDuration, waitRemaining, setWaitRemaining,
    isFrozen,
    conversations: sceneConversations,
    lockDate,
    statusTime,
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: `calc(100vh - ${NAV_H}px)` }}>

      {/* ── Barre d'onglets ── */}
      <div className="flex items-stretch border-b border-gray-200 bg-white shrink-0 px-4">
        <div className="flex flex-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pl-4 border-l border-gray-100 ml-2">
          {onChangeMode && (
            <button
              onClick={onChangeMode}
              title="Changer de mode d'édition"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <ArrowsClockwiseIcon size={13} />
              Mode
            </button>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`p-2 rounded-lg transition-colors ${sidebarOpen ? 'bg-brand-orange/10 text-brand-orange' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
          >
            <SidebarIcon size={18} />
          </button>
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="flex flex-1 overflow-hidden">

        {activeTab === 'Scene' ? (
          <div className="flex flex-1 overflow-hidden">
            <SceneTab
              storyId={storyId}
              sceneSteps={sceneSteps}
              setSceneSteps={setSceneSteps}
              sceneSelIdx={sceneSelIdx}
              setSceneSelIdx={setSceneSelIdx}
              scenePlayIdx={scenePlayIdx}
              sceneIsPlaying={sceneIsPlaying}
              onPlay={startScenePlay}
              onReset={sceneReset}
              onConversationsChange={setSceneConversations}
            />
            <div
              className="bg-gray-100 flex flex-col items-center justify-center shrink-0 border-l border-gray-200 gap-4"
              style={{ width: 440, padding: '32px 40px' }}
            >
              <PhonePreview
                screenId={scenePreviewScreen}
                animState={{ ...animState, currentScreen: scenePreviewScreen }}
                availableHeight={window.innerHeight - NAV_H - TAB_H - TIMELINE_H - 64 - 52}
                captureRef={captureRef}
              />
              {/* Bouton export */}
              <button
                onClick={() => setExportModalOpen(true)}
                disabled={isExporting || sceneSteps.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#1c1c1e' }}
              >
                {isExporting
                  ? <SpinnerGapIcon size={15} className="animate-spin" />
                  : <DownloadSimpleIcon size={15} weight="bold" />
                }
                {isExporting ? (exportProgress.message || '…') : 'Exporter en MP4'}
              </button>
            </div>

            {/* ── Modal sélection du mode d'export ── */}
            {exportModalOpen && !isExporting && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setExportModalOpen(false)}
              >
                <div
                  style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 24px', width: 440, boxShadow: '0 24px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 20 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* En-tête */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', marginBottom: 2 }}>Exporter en MP4</p>
                      <p style={{ fontSize: 12, color: '#8E8E93' }}>Choisissez le moteur d'encodage</p>
                    </div>
                    <button onClick={() => setExportModalOpen(false)} style={{ color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <XIcon size={18} />
                    </button>
                  </div>

                  {/* Carte Mode 1 — Navigateur */}
                  <button
                    onClick={() => { setExportModalOpen(false); startExport() }}
                    style={{
                      textAlign: 'left', padding: '16px 18px', borderRadius: 14,
                      border: '1.5px solid #e5e7eb', background: '#fafafa',
                      cursor: 'pointer', transition: 'border-color 120ms, background 120ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#d9571d'; e.currentTarget.style.background = '#fff5ee' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fafafa' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>🌐</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e' }}>Navigateur</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#34c759', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 8px' }}>Toujours disponible</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                      Capture le DOM en temps réel via MediaRecorder, puis convertit en MP4.
                      Si le serveur local est démarré, la conversion est accélérée par ffmpeg natif.
                    </p>
                  </button>

                  {/* Carte Mode 2 — Serveur Puppeteer */}
                  <button
                    onClick={() => serverStatus === 'online' && startExportServer()}
                    disabled={serverStatus !== 'online'}
                    style={{
                      textAlign: 'left', padding: '16px 18px', borderRadius: 14,
                      border: '1.5px solid #e5e7eb', background: serverStatus === 'online' ? '#fafafa' : '#f9fafb',
                      cursor: serverStatus === 'online' ? 'pointer' : 'not-allowed',
                      transition: 'border-color 120ms, background 120ms',
                      opacity: serverStatus === 'offline' ? 0.55 : 1,
                    }}
                    onMouseEnter={e => { if (serverStatus === 'online') { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f5f3ff' } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = serverStatus === 'online' ? '#fafafa' : '#f9fafb' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>🎬</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1c1e' }}>Serveur Puppeteer</span>
                      {serverStatus === 'checking' && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#8E8E93', background: '#f2f2f7', borderRadius: 6, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <SpinnerGapIcon size={10} className="animate-spin" /> Vérification…
                        </span>
                      )}
                      {serverStatus === 'online' && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, padding: '2px 8px' }}>Serveur actif</span>
                      )}
                      {serverStatus === 'offline' && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '2px 8px' }}>Serveur arrêté</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                      Chrome headless (Puppeteer) rejoue la scène et capture frame par frame.
                      Meilleure qualité, sans limite de performance navigateur.
                    </p>
                    {serverStatus === 'offline' && (
                      <p style={{ fontSize: 11, color: '#ef4444', marginTop: 8, marginBottom: 0, fontFamily: 'monospace', background: '#fef2f2', borderRadius: 6, padding: '4px 8px' }}>
                        cd d:/lsd/server &amp;&amp; npm start
                      </p>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Modal progression export ── */}
            {isExporting && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                backgroundColor: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: '#fff', borderRadius: 20, padding: '32px 40px',
                  width: 360, display: 'flex', flexDirection: 'column', gap: 16,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SpinnerGapIcon size={22} className="animate-spin shrink-0" style={{ color: exportMode === 'server' ? '#6366f1' : '#d9571d' }} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 2 }}>
                        {exportMode === 'server' ? 'Export Puppeteer…' : 'Export navigateur…'}
                      </p>
                      <p style={{ fontSize: 12, color: '#8E8E93' }}>{exportProgress.message || '…'}</p>
                    </div>
                  </div>
                  <div style={{ height: 4, background: '#f2f2f7', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: exportMode === 'server'
                        ? 'linear-gradient(90deg, #6366f1, #a855f7)'
                        : 'linear-gradient(90deg, #d9571d, #ff9500)',
                      width: '100%',
                      animation: 'indeterminate 1.4s ease infinite',
                    }} />
                  </div>
                  <style>{`@keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
                  <p style={{ fontSize: 11, color: '#aeaeb2', textAlign: 'center' }}>
                    {exportMode === 'server'
                      ? 'Puppeteer rejoue la scène côté serveur — ne pas fermer le serveur'
                      : "La scène se joue en temps réel — ne pas fermer ni changer d'onglet"
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Config panel (gauche) */}
            {selectedAction && (
              <ActionConfigPanel
                actionId={selectedAction}
                animState={animState}
                onClose={() => setSelectedAction(null)}
              />
            )}

            {/* Preview (centre) */}
            <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
              <PhonePreview screenId={activeTab} animState={animState} />
            </div>

            {/* Catalogue actions (droite) */}
            {sidebarOpen && (
              <ActionsSidebar
                screenId={activeTab}
                selectedAction={selectedAction}
                onSelect={setSelectedAction}
              />
            )}
          </>
        )}

      </div>

    </div>
  )
}
