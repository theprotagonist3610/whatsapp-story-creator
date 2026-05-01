// ─── HeadlessExport ──────────────────────────────────────────────────────────
//
// Page publique (pas d'auth) utilisée par le serveur Puppeteer pour capturer
// la scène en vidéo.
//
// Flux :
//   1. Le serveur stocke les données de scène via POST /export
//   2. Puppeteer ouvre /headless-export?id=<sceneId>
//   3. Cette page récupère les données depuis GET http://localhost:3001/scene/:id
//   4. Elle joue la scène automatiquement dès le chargement
//   5. Quand la scène est terminée : window.__sceneFinished = true
//   6. Puppeteer détecte ce flag → arrête le screencast → encode le MP4

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LockScreen,
  HomeScreen,
  WhatsAppDiscussions,
  WhatsAppConversation,
  IOSKeyboard,
} from '../../components/iphone/index.js'
import { BellIcon } from '@phosphor-icons/react'
import { getAction, estimateDuration } from '../../engine/actions.js'
import { playSound, playKeyboardClick } from '../../engine/sounds.js'

import svgWhatsapp  from '../../assets/iphone/icons8-whatsapp-96.svg'
import svgInstagram from '../../assets/iphone/icons8-instagram-96.svg'
import svgFacebook  from '../../assets/iphone/icons8-facebook-96.svg'
import svgTiktok    from '../../assets/iphone/icons8-tiktok-96.svg'
import svgMail      from '../../assets/iphone/mail.svg'

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVER_BASE  = 'http://localhost:3001'
const IPHONE_W     = 390
const IPHONE_H     = 844
const KEYBOARD_H   = 281

// ─── Dimensions de sortie (Instagram Reels / Stories — 9:16) ─────────────────
// Le ScenePlayer est rendu à IPHONE_W×IPHONE_H puis upscalé via CSS transform
// pour que Puppeteer capture nativement du 1080×1920. Aucun traitement ffmpeg.
// Scale par la hauteur → iPhone entier visible (887×1920), centré dans 1080px.
const EXPORT_W     = 1080
const EXPORT_H     = 1920
const EXPORT_SCALE = EXPORT_H / IPHONE_H   // 1920/844 ≈ 2.2749

const SCROLL_ROW_OFFSET = 300
const CONV_ROW_H        = 68

const DEMO_CONVERSATIONS = [
  { id: 'c1', name: 'Gérante',          avatarColor: '#ffb564', lastMessage: '', time: '',     unread: 0, isOnline: true  },
  { id: 'c2', name: 'Infirmière Fatou', avatarColor: '#25D366', lastMessage: '', time: '',     unread: 0, isOnline: false },
]

const APP_ICONS = {
  WhatsApp:  { svg: svgWhatsapp,  bg: '#25D366' },
  Instagram: { svg: svgInstagram, bg: '#ffffff' },
  Facebook:  { svg: svgFacebook,  bg: '#ffffff' },
  TikTok:    { svg: svgTiktok,    bg: '#000000' },
  Mail:      { svg: svgMail,      bg: null      },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function stepDur(step) {
  return step.durationMs ?? estimateDuration(step.actionId, step.payload ?? {})
}

function formatLockDate(weekDate) {
  if (!weekDate) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date())
      .replace(/^\w/, c => c.toUpperCase())
  }
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(weekDate + 'T12:00:00'))
    .replace(/^\w/, c => c.toUpperCase())
}

function extractFirstTime(steps) {
  for (const step of (steps ?? [])) {
    const t = step.payload?.time
    if (t && /^\d{1,2}:\d{2}$/.test(t)) return t
  }
  return '9:41'
}

function charToKeyInfo(char) {
  if (/[a-z]/.test(char))     return { view: 'ABC',  keys: new Set([char]) }
  if (/[A-Z]/.test(char))     return { view: 'ABC',  keys: new Set(['⇧', char.toLowerCase()]) }
  if (char === ' ')            return { view: null,   keys: new Set([' ']) }
  const keys123 = new Set(['1','2','3','4','5','6','7','8','9','0','-','/',':', ';','(',')', '€','&','@','"','.',',','?','!','\''])
  if (keys123.has(char))       return { view: '123',  keys: new Set([char]) }
  const keysSharp = new Set(['[',']','{','}','#','%','^','*','+','=','_','\\','|','~','<','>','$','£','¥','•'])
  if (keysSharp.has(char))     return { view: '#+=',  keys: new Set([char]) }
  return { view: null, keys: new Set() }
}

// ─── Composants de preview (repris de DesktopEdition) ─────────────────────────

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

function LockScreenPreview({ unlockPhase, notifPhase, notifForm, statusTime, lockDate }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (notifPhase === 'visible') {
      setNotifications(p => p.find(n => n.id === 'incoming') ? p : [...p, { id: 'incoming', ...notifForm }])
    }
    if (notifPhase === 'idle') {
      setNotifications(p => p.filter(n => n.id !== 'incoming'))
    }
  }, [notifPhase, notifForm])

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: (unlockPhase === 'sliding' || unlockPhase === 'done') ? 'translateY(-100%)' : 'translateY(0)',
        transition: unlockPhase === 'sliding' ? 'transform 450ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <LockScreen time={statusTime} date={lockDate} notifications={notifications} statusTime={statusTime} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

function HomeScreenPreview({ animState }) {
  const { zoomPhase, notifPhase, notifForm, conversations, statusTime } = animState
  const convList  = conversations ?? DEMO_CONVERSATIONS
  const isZooming = zoomPhase === 'zooming' || zoomPhase === 'done'

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isZooming ? 'scale(3)' : 'scale(1)',
        transformOrigin: '52px 140px',
        opacity: isZooming ? 0 : 1,
        transition: zoomPhase === 'zooming'
          ? 'transform 550ms cubic-bezier(0.4,0,0.2,1), opacity 400ms ease'
          : 'none',
      }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} highlightApp="WhatsApp" />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

function WhatsAppDiscussionsPreview({ animState }) {
  const {
    swipeBackPhase, notifPhase, notifForm,
    scrollToPhase, scrollToTarget,
    tapConvPhase, tapConvTarget,
    demoBubbles, newBubbleId,
    conversations, statusTime,
  } = animState

  const convList      = conversations ?? DEMO_CONVERSATIONS
  const isSwipeBack   = swipeBackPhase === 'sliding' || swipeBackPhase === 'done'
  const isTapConvOpen = tapConvPhase === 'sliding' || tapConvPhase === 'done'
  const activeContact = (scrollToPhase === 'scrolling' || scrollToPhase === 'highlighted') ? scrollToTarget : null
  const tapConvConv   = convList.find(c => c.name === tapConvTarget) ?? convList[0]

  return (
    <div style={{ position: 'relative', width: IPHONE_W, height: IPHONE_H, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transform: isSwipeBack ? 'translateX(0)' : 'translateX(-30%)',
        transition: swipeBackPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <HomeScreen statusTime={statusTime} badges={{ whatsapp: 1 }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isSwipeBack ? 'translateX(100%)' : 'translateX(0)',
        transition: swipeBackPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} activeContact={activeContact} />
        {(scrollToPhase === 'scrolling' || scrollToPhase === 'highlighted') && (
          <div style={{
            position: 'absolute', left: 0, right: 0, zIndex: 1,
            top: SCROLL_ROW_OFFSET + convList.findIndex(c => c.name === scrollToTarget) * CONV_ROW_H,
            height: CONV_ROW_H,
            backgroundColor: '#25D366',
            opacity: scrollToPhase === 'highlighted' ? 0.12 : 0,
            transition: scrollToPhase === 'highlighted' ? 'opacity 200ms ease-in' : 'none',
            pointerEvents: 'none',
          }} />
        )}
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        transform: isTapConvOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: tapConvPhase === 'sliding' ? 'transform 350ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={tapConvConv?.name} contactColor={tapConvConv?.avatarColor}
          contactOnline={tapConvConv?.isOnline} contactFollowers={tapConvConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
        />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

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
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transform: isSliding ? 'translateX(0)' : 'translateX(-30%)',
        transition: swipeBackConvPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        <WhatsAppDiscussions statusTime={statusTime} conversations={convList} />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isSliding ? 'translateX(100%)' : 'translateX(0)',
        transition: swipeBackConvPhase === 'sliding' ? 'transform 380ms cubic-bezier(0.4,0,0.2,1)' : 'none',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
      }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={activeConv?.name} contactColor={activeConv?.avatarColor}
          contactOnline={activeConv?.isOnline} contactFollowers={activeConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
          keyboardOffset={keyboardOpen ? KEYBOARD_H : 0}
          showTyping={typingPhase === 'visible'}
          showRecording={recordingPhase === 'visible'}
        />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 4,
        transform: keyboardOpen ? 'translateY(0)' : `translateY(${KEYBOARD_H}px)`,
        transition: tapInputPhase === 'sliding' ? 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
      }}>
        <IOSKeyboard />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

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
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <WhatsAppConversation
          statusTime={statusTime}
          contactName={activeConv?.name} contactColor={activeConv?.avatarColor}
          contactOnline={activeConv?.isOnline} contactFollowers={activeConv?.followers ?? 0}
          bubbles={demoBubbles} newBubbleId={newBubbleId}
          inputText={inputText} keyboardOffset={keyboardOffset}
          showTyping={typingPhase === 'visible'}
          showRecording={recordingPhase === 'visible'}
        />
      </div>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        transform: isDismissing ? `translateY(${KEYBOARD_H}px)` : 'translateY(0)',
        transition: dismissKeyboardPhase === 'sliding'
          ? 'transform 300ms cubic-bezier(0.25,0.46,0.45,0.94)'
          : 'none',
      }}>
        <IOSKeyboard activeKeys={typewriterKeys} activeView={typewriterView} />
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        <NotificationBanner notif={notifForm} visible={notifPhase === 'visible'} />
      </div>
    </div>
  )
}

// ─── ScenePlayer ──────────────────────────────────────────────────────────────

function ScenePlayer({ steps = [], conversations: initConvs, storyMeta }) {
  // Conversations initiales (depuis le serveur ou fallback démo)
  const initConversations = initConvs?.length ? initConvs : DEMO_CONVERSATIONS

  // ── États d'animation ─────────────────────────────────────────────────────
  const [currentScreen,         setCurrentScreen]         = useState('LockScreen')
  const [unlockPhase,           setUnlockPhase]           = useState('idle')
  const [notifPhase,            setNotifPhase]            = useState('idle')
  const [notifForm,             setNotifForm]             = useState({ app: 'WhatsApp', sender: '', message: '', time: 'maint.' })
  const [zoomPhase,             setZoomPhase]             = useState('idle')
  const [swipeBackPhase,        setSwipeBackPhase]        = useState('idle')
  const [swipeBackConvPhase,    setSwipeBackConvPhase]    = useState('idle')
  const [scrollToPhase,         setScrollToPhase]         = useState('idle')
  const [scrollToTarget,        setScrollToTarget]        = useState('')
  const [tapConvPhase,          setTapConvPhase]          = useState('idle')
  const [tapConvTarget,         setTapConvTarget]         = useState(initConversations[0]?.name ?? '')
  const [tapInputPhase,         setTapInputPhase]         = useState('idle')
  const [dismissKeyboardPhase,  setDismissKeyboardPhase]  = useState('idle')
  const [demoBubbles,           setDemoBubbles]           = useState([])
  const [newBubbleId,           setNewBubbleId]           = useState(null)
  const [markAsReadPhase,       setMarkAsReadPhase]       = useState('idle')
  const [typingPhase,           setTypingPhase]           = useState('idle')
  const [recordingPhase,        setRecordingPhase]        = useState('idle')
  const [inputText,             setInputText]             = useState('')
  const [writeMessagePhase,     setWriteMessagePhase]     = useState('idle')
  const [deleteCharPhase,       setDeleteCharPhase]       = useState('idle')
  const [sendMessagePhase,      setSendMessagePhase]      = useState('idle')
  const [typewriterKeys,        setTypewriterKeys]        = useState(new Set())
  const [typewriterView,        setTypewriterView]        = useState(null)
  const [waitRemaining,         setWaitRemaining]         = useState(0)
  const [currentTime,           setCurrentTime]           = useState(() => extractFirstTime(steps))
  const [sceneConversations,    setSceneConversations]    = useState(initConversations)

  const timerRef            = useRef(null)
  const typewriterRef       = useRef(null)
  const deleteRef           = useRef(null)
  const sceneFnRef          = useRef({ startWriteMessage: null, startSendMessage: null, startDeleteChar: null })
  const writeMessagePhaseRef = useRef('idle')
  const inputTextRef         = useRef('')
  const convBubblesRef       = useRef({})
  const currentContactRef    = useRef(null)
  // Guard anti-double-play : React StrictMode monte les composants deux fois en dev
  const hasStarted           = useRef(false)

  const lockDate = formatLockDate(storyMeta?.week_date)

  // ── Effets de phase d'animation ──────────────────────────────────────────

  useEffect(() => {
    if (unlockPhase === 'idle') return
    const t = []
    if (unlockPhase === 'sliding') t.push(setTimeout(() => setUnlockPhase('done'),  450))
    if (unlockPhase === 'done')    t.push(setTimeout(() => setUnlockPhase('idle'), 1500))
    return () => t.forEach(clearTimeout)
  }, [unlockPhase])

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
    if (notifPhase === 'idle') return
    const t = []
    if (notifPhase === 'visible') t.push(setTimeout(() => setNotifPhase('hiding'), 2800))
    if (notifPhase === 'hiding')  t.push(setTimeout(() => setNotifPhase('idle'),    400))
    return () => t.forEach(clearTimeout)
  }, [notifPhase])

  useEffect(() => {
    if (markAsReadPhase === 'idle') return
    if (markAsReadPhase === 'animating') {
      setDemoBubbles(prev => prev.map(b => b.side === 'outgoing' ? { ...b, status: 'read' } : b))
      const t = setTimeout(() => setMarkAsReadPhase('idle'), 400)
      return () => clearTimeout(t)
    }
  }, [markAsReadPhase])

  useEffect(() => {
    if (waitRemaining <= 0) return
    const t = setTimeout(() => setWaitRemaining(r => Math.max(0, r - 100)), 100)
    return () => clearTimeout(t)
  }, [waitRemaining])

  useEffect(() => { writeMessagePhaseRef.current = writeMessagePhase }, [writeMessagePhase])
  useEffect(() => { inputTextRef.current = inputText }, [inputText])

  // Cleanup
  useEffect(() => () => { clearTimeout(timerRef.current) }, [])
  useEffect(() => () => { clearTimeout(typewriterRef.current) }, [])
  useEffect(() => () => { clearInterval(deleteRef.current)  }, [])

  // ── Typewriter (writeMessage) ─────────────────────────────────────────────

  const startWriteMessage = useCallback((text, speed) => {
    if (writeMessagePhaseRef.current !== 'idle') return
    const delay  = speed === 'slow' ? 120 : speed === 'fast' ? 30 : 60
    const popDur = Math.min(delay - 5, 160)

    const steps2 = []
    let currentView = 'ABC'
    for (let i = 0; i < text.length; i++) {
      const { view, keys } = charToKeyInfo(text[i])
      const targetView = view ?? currentView
      if (targetView !== currentView) {
        const switchKey = currentView === 'ABC' ? '123'
          : targetView === 'ABC' ? 'ABC'
          : targetView === '#+=.' ? '#+=.' : '#+='
        steps2.push({ type: 'switch', switchKey, toView: targetView, char: null, keys: new Set([switchKey]) })
        currentView = targetView
      }
      steps2.push({ type: 'char', char: text[i], view: currentView, keys, charIndex: i + 1 })
    }
    if (currentView !== 'ABC') {
      steps2.push({ type: 'switch', switchKey: 'ABC', toView: 'ABC', keys: new Set(['ABC']) })
    }

    let si = 0
    setWriteMessagePhase('typing')
    setTypewriterView('ABC')

    const tick = () => {
      if (si >= steps2.length) {
        setTypewriterKeys(new Set())
        setTypewriterView(null)
        setWriteMessagePhase('done')
        setTimeout(() => setWriteMessagePhase('idle'), 500)
        return
      }
      const s = steps2[si++]
      if (s.type === 'switch') {
        setTypewriterKeys(s.keys)
        setTimeout(() => {
          setTypewriterView(s.toView)
          setTypewriterKeys(new Set())
          typewriterRef.current = setTimeout(tick, delay)
        }, popDur)
      } else {
        setTypewriterKeys(s.keys)
        setInputText(text.slice(0, s.charIndex))
        playKeyboardClick()
        setTimeout(() => setTypewriterKeys(new Set()), popDur)
        typewriterRef.current = setTimeout(tick, delay)
      }
    }
    typewriterRef.current = setTimeout(tick, 0)
  }, [])

  // ── sendMessage ───────────────────────────────────────────────────────────

  const startSendMessage = useCallback((overTime, overStatus) => {
    if (sendMessagePhase !== 'idle') return
    const text = inputTextRef.current.trim()
    if (!text) return
    const bubble = {
      id: `b${Date.now()}`,
      side: 'outgoing',
      text,
      time:   overTime   ?? '09:41',
      status: overStatus ?? 'sent',
    }
    setSendMessagePhase('sending')
    setDemoBubbles(prev => {
      const next = [...prev, bubble]
      if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
      return next
    })
    setNewBubbleId(bubble.id)
    playSound('sendMessage')
    setTimeout(() => setNewBubbleId(null), 400)
    setInputText('')
    setTypewriterKeys(new Set())
    setSendMessagePhase('done')
    setTimeout(() => setSendMessagePhase('idle'), 600)
  }, [sendMessagePhase])

  // ── deleteChar ────────────────────────────────────────────────────────────

  const startDeleteChar = useCallback((count, clearAll) => {
    if (deleteCharPhase !== 'idle') return
    const n = clearAll ? inputTextRef.current.length : Math.max(1, count ?? 1)
    if (n === 0) return
    let remaining = n
    setDeleteCharPhase('deleting')
    setTypewriterKeys(new Set(['⌫']))
    deleteRef.current = setInterval(() => {
      setInputText(prev => prev.slice(0, -1))
      remaining--
      if (remaining <= 0) {
        clearInterval(deleteRef.current)
        setTypewriterKeys(new Set())
        setDeleteCharPhase('done')
        setTimeout(() => setDeleteCharPhase('idle'), 300)
      }
    }, 80)
  }, [deleteCharPhase])

  // Sync sceneFnRef
  useEffect(() => {
    sceneFnRef.current = { startWriteMessage, startSendMessage, startDeleteChar }
  }, [startWriteMessage, startSendMessage, startDeleteChar])

  // ── Moteur de lecture de la scène ─────────────────────────────────────────

  const playScene = useCallback(() => {
    if (!steps.length) return

    const screens = sceneComputeScreens(steps)
    convBubblesRef.current = {}
    currentContactRef.current = null

    const playNext = (idx) => {
      if (idx >= steps.length) {
        // Scène terminée — signal pour Puppeteer
        window.__sceneFinished = true
        return
      }

      const step               = steps[idx]
      const { actionId, payload: p = {} } = step

      // Met à jour l'écran courant
      setCurrentScreen(screens[idx] ?? 'LockScreen')

      switch (actionId) {
        case 'unlock':
        case 'faceID':
          setUnlockPhase('sliding')
          break
        case 'tapApp':
          setZoomPhase('zooming')
          break
        case 'scrollTo':
          setScrollToTarget(p.contactName ?? '')
          setScrollToPhase('scrolling')
          break
        case 'tapConversation':
        case 'tapNotification': {
          const contact = p.contactName ?? ''
          currentContactRef.current = contact
          setTapConvTarget(contact)
          setTapConvPhase('sliding')
          setDemoBubbles(convBubblesRef.current[contact] ?? [])
          setSceneConversations(prev => prev.map(c =>
            c.name === contact ? { ...c, unread: 0 } : c
          ))
          break
        }
        case 'tapInput':
          setTapInputPhase('sliding')
          break
        case 'dismissKeyboard':
          setDismissKeyboardPhase('sliding')
          break
        case 'swipeBack': {
          const cur = screens[idx] ?? 'LockScreen'
          if (cur === 'WhatsAppConversation' || cur === 'WhatsAppKeyboard') {
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
          setRecordingPhase('idle')
          if (p.text) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'incoming',
              text: p.text, time: p.time ?? '09:41',
              status: 'delivered', characterName: p.characterName ?? '',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c
                ? { ...cv, lastMessage: p.text, time: p.time ?? '09:41', isOutgoing: false }
                : cv
            ))
          }
          break
        case 'receiveSticker':
          setTypingPhase('idle')
          setRecordingPhase('idle')
          if (p.filename) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'incoming',
              text: `[sticker:${p.filename}]`, time: p.time ?? '09:41',
              status: 'delivered', characterName: p.characterName ?? '',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
          }
          break
        case 'selectAndSendSticker': {
          if (p.filename) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'outgoing',
              text: `[sticker:${p.filename}]`, time: p.time ?? '09:41',
              status: p.status ?? 'sent',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('sendMessage')
            setTimeout(() => setNewBubbleId(null), 400)
          }
          break
        }
        case 'writeMessage':
          sceneFnRef.current.startWriteMessage(p.text, p.speed)
          break
        case 'deleteChar':
          sceneFnRef.current.startDeleteChar(p.count, p.clearAll)
          break
        case 'sendMessage': {
          const fireSend = () => {
            if (writeMessagePhaseRef.current !== 'idle') {
              timerRef.current = setTimeout(fireSend, 60)
              return
            }
            const sentText    = inputTextRef.current.trim()
            const sendContact = currentContactRef.current
            if (p.time) setCurrentTime(p.time)
            sceneFnRef.current.startSendMessage(p.time, p.status)
            if (sentText && sendContact) {
              setSceneConversations(prev => prev.map(c =>
                c.name === sendContact
                  ? { ...c, lastMessage: sentText, time: p.time ?? '09:41', isOutgoing: true, outgoingStatus: p.status ?? 'sent' }
                  : c
              ))
            }
            timerRef.current = setTimeout(() => playNext(idx + 1), stepDur(step))
          }
          fireSend()
          return // court-circuite le setTimeout normal
        }
        case 'deleteSentMessage': {
          const tgt = p.bubbleIndex ?? -1
          setDemoBubbles(prev => {
            const next = [...prev]
            const idx2 = tgt === -1
              ? [...next].reverse().findIndex(b => b.side === 'outgoing')
              : tgt
            const real = tgt === -1 ? (next.length - 1 - idx2) : idx2
            if (real >= 0 && next[real]) next[real] = { ...next[real], deleted: true }
            if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
            return next
          })
          break
        }
        case 'deleteReceivedMessage': {
          const tgt = p.bubbleIndex ?? -1
          setDemoBubbles(prev => {
            const next = [...prev]
            const idx2 = tgt === -1
              ? [...next].reverse().findIndex(b => b.side === 'incoming')
              : tgt
            const real = tgt === -1 ? (next.length - 1 - idx2) : idx2
            if (real >= 0 && next[real]) next[real] = { ...next[real], deleted: true }
            if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
            return next
          })
          break
        }
        case 'sendVocal': {
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'outgoing',
              text: `[vocal:${p.storagePath}:${(p.duration ?? 0).toFixed(1)}]`,
              time: p.time ?? '09:41', status: p.status ?? 'sent',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('sendMessage')
            setTimeout(() => setNewBubbleId(null), 400)
            const c = currentContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '🎤 Note vocale', time: p.time ?? '09:41', isOutgoing: true, outgoingStatus: p.status ?? 'sent' } : cv
            ))
          }
          break
        }
        case 'receiveVocal': {
          setTypingPhase('idle')
          setRecordingPhase('idle')
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'incoming',
              text: `[vocal:${p.storagePath}:${(p.duration ?? 0).toFixed(1)}]`,
              time: p.time ?? '09:41', status: 'read',
              characterName: p.characterName ?? '',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '🎤 Note vocale', time: p.time ?? '09:41', isOutgoing: false } : cv
            ))
          }
          break
        }
        case 'receivePhoto': {
          setTypingPhase('idle')
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'incoming',
              text: `[photo:${p.storagePath}]`,
              time: p.time ?? '09:41', status: 'read',
              characterName: p.characterName ?? '',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('receiveMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '📷 Photo', time: p.time ?? '09:41', isOutgoing: false } : cv
            ))
          }
          break
        }
        case 'sendPhoto': {
          if (p.storagePath) {
            if (p.time) setCurrentTime(p.time)
            const b = {
              id: `b${Date.now()}`, side: 'outgoing',
              text: `[photo:${p.storagePath}]`,
              time: p.time ?? '09:41', status: p.status ?? 'sent',
            }
            setDemoBubbles(prev => {
              const next = [...prev, b]
              if (currentContactRef.current) convBubblesRef.current[currentContactRef.current] = next
              return next
            })
            setNewBubbleId(b.id)
            playSound('sendMessage')
            setTimeout(() => setNewBubbleId(null), 600)
            const c = currentContactRef.current
            if (c) setSceneConversations(prev => prev.map(cv =>
              cv.name === c ? { ...cv, lastMessage: '📷 Photo', time: p.time ?? '09:41', isOutgoing: true } : cv
            ))
          }
          break
        }
        case 'markAsRead':
          setMarkAsReadPhase('animating')
          break
        case 'showNotification':
          if (p.time && /^\d{1,2}:\d{2}$/.test(p.time)) setCurrentTime(p.time)
          setNotifForm({ app: p.app ?? 'WhatsApp', sender: p.sender ?? '', message: p.message ?? '', time: p.time ?? 'maint.' })
          setNotifPhase('visible')
          playSound('showNotification')
          break
        case 'wait':
          setWaitRemaining(p.duration ?? 1000)
          break
        case 'playSound':
          playSound(p.sound)
          break
        default:
          break
      }

      timerRef.current = setTimeout(() => playNext(idx + 1), stepDur(step))
    }

    // Petite pause pour que React monte les composants avant de lancer
    setTimeout(() => playNext(0), 300)
  }, [steps])

  // Lance la lecture automatiquement — guard hasStarted bloque le double-mount StrictMode
  useEffect(() => {
    if (steps.length === 0 || hasStarted.current) return
    hasStarted.current = true
    window.__sceneFinished = false
    window.__sceneStartTime = Date.now()   // timestamp Unix ms — lu par le serveur pour calculer l'offset audio
    playScene()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rendu iPhone preview ──────────────────────────────────────────────────

  const animState = {
    unlockPhase, notifPhase, notifForm,
    zoomPhase,
    swipeBackPhase, swipeBackConvPhase,
    scrollToPhase, scrollToTarget,
    tapConvPhase, tapConvTarget,
    tapInputPhase, dismissKeyboardPhase,
    demoBubbles, newBubbleId,
    markAsReadPhase, typingPhase, recordingPhase,
    inputText, typewriterKeys, typewriterView,
    waitRemaining,
    conversations: sceneConversations,
    statusTime: currentTime,
    lockDate,
  }

  const preview = (() => {
    switch (currentScreen) {
      case 'LockScreen':
        return <LockScreenPreview unlockPhase={unlockPhase} notifPhase={notifPhase} notifForm={notifForm} statusTime={currentTime} lockDate={lockDate} />
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
    <div style={{ width: IPHONE_W, height: IPHONE_H, overflow: 'hidden', position: 'relative' }}>
      {preview}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HeadlessExport() {
  const [searchParams]       = useSearchParams()
  const sceneId              = searchParams.get('id')
  const [sceneData, setSceneData] = useState(null)
  const [error,    setError]      = useState(null)

  useEffect(() => {
    if (!sceneId) {
      setError('Paramètre ?id= manquant')
      return
    }
    fetch(`${SERVER_BASE}/scene/${sceneId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Scène introuvable (${r.status})`)
        return r.json()
      })
      .then(setSceneData)
      .catch(e => setError(e.message))
  }, [sceneId])

  if (error) {
    return (
      <div style={{ width: EXPORT_W, height: EXPORT_H, background: '#000', color: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 20, textAlign: 'center' }}>
        {error}
      </div>
    )
  }

  if (!sceneData) {
    return <div style={{ width: EXPORT_W, height: EXPORT_H, background: '#000' }} />
  }

  return (
    // Viewport Puppeteer : 1080×1920 (9:16 Instagram)
    // Le ScenePlayer (390×844) est mis à l'échelle via CSS transform scale.
    // transformOrigin 'top left' : le contenu part du coin supérieur gauche,
    // le viewport clippe naturellement ce qui dépasse en bas (les ~151px du bas
    // de l'iPhone, hors cadre 9:16). Aucun post-traitement ffmpeg.
    <div style={{ width: EXPORT_W, height: EXPORT_H, background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width:           IPHONE_W,
        height:          IPHONE_H,
        transform:       `scale(${EXPORT_SCALE})`,
        transformOrigin: 'center center',
        flexShrink:      0,
      }}>
        <ScenePlayer
          steps={sceneData.steps ?? []}
          conversations={sceneData.conversations}
          storyMeta={sceneData.storyMeta}
        />
      </div>
    </div>
  )
}
