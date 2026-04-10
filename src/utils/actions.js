// ============================================================
// actions.js
// Registre de toutes les actions disponibles dans l'éditeur.
//
// Une action = une transition ou modification d'état.
// Chaque action définit :
//   - l'interface source (où elle peut être déclenchée)
//   - l'interface cible (où on arrive après)
//   - le schéma du payload (données configurables par l'utilisateur)
//   - la durée d'animation par défaut (ms)
// ============================================================

import { INTERFACE_IDS } from './interfaces.js'

const {
  LOCK_SCREEN,
  HOME_SCREEN,
  WHATSAPP_DISCUSSIONS,
  WHATSAPP_CONVERSATION,
  KEYBOARD,
} = INTERFACE_IDS

// ─── Identifiants des actions ─────────────────────────────────────────────────

export const ACTION_IDS = {
  // Depuis le noir / veille
  WAKE_UP:                 'wakeUp',

  // LockScreen
  RECEIVE_NOTIFICATION:    'receiveNotification',
  UNLOCK:                  'unlock',
  OPEN_FROM_NOTIFICATION:  'openFromNotification',

  // HomeScreen
  NAVIGATE_TO_WHATSAPP:    'navigateToWhatsapp',

  // WhatsAppDiscussions
  OPEN_CONVERSATION:       'openConversation',

  // WhatsAppConversation
  OPEN_KEYBOARD:           'openKeyboard',
  RECEIVE_MESSAGE:         'receiveMessage',
  READ_MESSAGE:            'readMessage',
  NAVIGATE_BACK:           'navigateBack',

  // Keyboard
  WRITE_MESSAGE:           'writeMessage',
  DELETE_MESSAGE:          'deleteMessage',
  SEND_MESSAGE:            'sendMessage',
  CLOSE_KEYBOARD:          'closeKeyboard',

  // Transversaux
  PLAY_SOUND:              'playSound',
  SCREEN_OFF:              'screenOff',
  PAUSE:                   'pause',
}

// ─── Schémas de payload ───────────────────────────────────────────────────────
// Chaque champ définit : type, label, défaut, options (si enum)

const PAYLOAD_SCHEMAS = {
  notification: [
    { key: 'app',     type: 'enum',   label: 'App',     default: 'WhatsApp', options: ['WhatsApp', 'SMS', 'Mail'] },
    { key: 'sender',  type: 'string', label: 'Expéditeur', default: 'Dr KA' },
    { key: 'preview', type: 'string', label: 'Aperçu du message', default: 'Bonjour !' },
  ],
  message: [
    { key: 'characterId',   type: 'character', label: 'Personnage',  default: null },
    { key: 'characterName', type: 'string',    label: 'Nom affiché', default: '' },
    { key: 'text',          type: 'string',    label: 'Texte',       default: '' },
    { key: 'side',          type: 'enum',      label: 'Côté',        default: 'incoming', options: ['incoming', 'outgoing'] },
    { key: 'time',          type: 'time',      label: 'Heure',       default: '08:42' },
    { key: 'status',        type: 'enum',      label: 'Statut',      default: 'sent', options: ['sent', 'delivered', 'read'] },
  ],
  writeText: [
    { key: 'text',          type: 'string', label: 'Texte à saisir',        default: '' },
    { key: 'typingSpeed',   type: 'number', label: 'Vitesse (ms/caractère)', default: 80 },
  ],
  sound: [
    { key: 'sound',   type: 'enum',    label: 'Son',     default: 'message_received', options: ['message_received', 'message_sent', 'notification', 'vibration'] },
    { key: 'visible', type: 'boolean', label: 'Afficher indicateur', default: true },
  ],
  pause: [
    { key: 'duration', type: 'number', label: 'Durée (ms)', default: 1000 },
  ],
  conversation: [
    { key: 'contactName',   type: 'string', label: 'Nom du contact',   default: 'Dr KA' },
    { key: 'contactAvatar', type: 'string', label: 'Avatar URL',        default: null },
    { key: 'lastMessage',   type: 'string', label: 'Dernier message',   default: '' },
    { key: 'unreadCount',   type: 'number', label: 'Messages non lus',  default: 1 },
  ],
}

// ─── Registre des actions ─────────────────────────────────────────────────────

export const ACTIONS = {

  // ── Depuis le noir ──────────────────────────────────────────────────────────
  [ACTION_IDS.WAKE_UP]: {
    id:            ACTION_IDS.WAKE_UP,
    label:         'Allumer l\'écran',
    description:   'L\'écran s\'allume depuis le noir sur le LockScreen',
    icon:          '☀️',
    sourceInterfaces: ['__black__'],
    targetInterface:  LOCK_SCREEN,
    payloadSchema: [],
    defaultDuration:  600,
    animationType: 'fade',
  },

  // ── LockScreen ──────────────────────────────────────────────────────────────
  [ACTION_IDS.RECEIVE_NOTIFICATION]: {
    id:            ACTION_IDS.RECEIVE_NOTIFICATION,
    label:         'Recevoir une notification',
    description:   'Une notification apparaît sur le LockScreen',
    icon:          '🔔',
    sourceInterfaces: [LOCK_SCREEN],
    targetInterface:  LOCK_SCREEN,
    payloadSchema: PAYLOAD_SCHEMAS.notification,
    defaultDuration:  800,
    animationType: 'slideDown',
  },

  [ACTION_IDS.UNLOCK]: {
    id:            ACTION_IDS.UNLOCK,
    label:         'Déverrouiller',
    description:   'Swipe up → passe à l\'écran d\'accueil',
    icon:          '🔓',
    sourceInterfaces: [LOCK_SCREEN],
    targetInterface:  HOME_SCREEN,
    payloadSchema: [],
    defaultDuration:  500,
    animationType: 'slideUp',
  },

  [ACTION_IDS.OPEN_FROM_NOTIFICATION]: {
    id:            ACTION_IDS.OPEN_FROM_NOTIFICATION,
    label:         'Ouvrir depuis la notification',
    description:   'Tap sur la notification → ouvre directement la conversation',
    icon:          '👆',
    sourceInterfaces: [LOCK_SCREEN],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: PAYLOAD_SCHEMAS.conversation,
    defaultDuration:  400,
    animationType: 'slideUp',
  },

  // ── HomeScreen ──────────────────────────────────────────────────────────────
  [ACTION_IDS.NAVIGATE_TO_WHATSAPP]: {
    id:            ACTION_IDS.NAVIGATE_TO_WHATSAPP,
    label:         'Ouvrir WhatsApp',
    description:   'Tap sur l\'icône WhatsApp → liste des discussions',
    icon:          '💬',
    sourceInterfaces: [HOME_SCREEN],
    targetInterface:  WHATSAPP_DISCUSSIONS,
    payloadSchema: [],
    defaultDuration:  400,
    animationType: 'zoomIn',
  },

  // ── WhatsAppDiscussions ─────────────────────────────────────────────────────
  [ACTION_IDS.OPEN_CONVERSATION]: {
    id:            ACTION_IDS.OPEN_CONVERSATION,
    label:         'Ouvrir une conversation',
    description:   'Tap sur une discussion → ouvre le chat',
    icon:          '🗨️',
    sourceInterfaces: [WHATSAPP_DISCUSSIONS],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: PAYLOAD_SCHEMAS.conversation,
    defaultDuration:  350,
    animationType: 'slideLeft',
  },

  // ── WhatsAppConversation ────────────────────────────────────────────────────
  [ACTION_IDS.OPEN_KEYBOARD]: {
    id:            ACTION_IDS.OPEN_KEYBOARD,
    label:         'Ouvrir le clavier',
    description:   'Tap sur la barre de saisie → clavier apparaît',
    icon:          '⌨️',
    sourceInterfaces: [WHATSAPP_CONVERSATION],
    targetInterface:  KEYBOARD,
    payloadSchema: [],
    defaultDuration:  300,
    animationType: 'slideUp',
  },

  [ACTION_IDS.RECEIVE_MESSAGE]: {
    id:            ACTION_IDS.RECEIVE_MESSAGE,
    label:         'Recevoir un message',
    description:   'Une bulle entrante apparaît dans la conversation',
    icon:          '📩',
    sourceInterfaces: [WHATSAPP_CONVERSATION],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: PAYLOAD_SCHEMAS.message,
    defaultDuration:  600,
    animationType: 'bubbleIn',
  },

  [ACTION_IDS.READ_MESSAGE]: {
    id:            ACTION_IDS.READ_MESSAGE,
    label:         'Marquer comme lu',
    description:   'Les coches passent de gris à bleu (✓✓ → 🔵✓✓)',
    icon:          '✅',
    sourceInterfaces: [WHATSAPP_CONVERSATION],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: [],
    defaultDuration:  400,
    animationType: 'tickBlue',
  },

  [ACTION_IDS.NAVIGATE_BACK]: {
    id:            ACTION_IDS.NAVIGATE_BACK,
    label:         'Retour aux discussions',
    description:   'Flèche retour → liste des conversations',
    icon:          '←',
    sourceInterfaces: [WHATSAPP_CONVERSATION],
    targetInterface:  WHATSAPP_DISCUSSIONS,
    payloadSchema: [],
    defaultDuration:  350,
    animationType: 'slideRight',
  },

  // ── Keyboard ────────────────────────────────────────────────────────────────
  [ACTION_IDS.WRITE_MESSAGE]: {
    id:            ACTION_IDS.WRITE_MESSAGE,
    label:         'Écrire un message',
    description:   'Texte apparaît dans la barre de saisie caractère par caractère',
    icon:          '✍️',
    sourceInterfaces: [KEYBOARD],
    targetInterface:  KEYBOARD,
    payloadSchema: PAYLOAD_SCHEMAS.writeText,
    defaultDuration:  null, // calculée dynamiquement selon la longueur du texte
    animationType: 'typing',
  },

  [ACTION_IDS.DELETE_MESSAGE]: {
    id:            ACTION_IDS.DELETE_MESSAGE,
    label:         'Effacer (backspace)',
    description:   'Supprime le dernier caractère de la saisie',
    icon:          '⌫',
    sourceInterfaces: [KEYBOARD],
    targetInterface:  KEYBOARD,
    payloadSchema: [
      { key: 'count', type: 'number', label: 'Nombre de caractères à effacer', default: 1 },
    ],
    defaultDuration:  200,
    animationType: 'backspace',
  },

  [ACTION_IDS.SEND_MESSAGE]: {
    id:            ACTION_IDS.SEND_MESSAGE,
    label:         'Envoyer le message',
    description:   'Tape sur Envoyer → bulle sortante + fermeture clavier',
    icon:          '📤',
    sourceInterfaces: [KEYBOARD],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: PAYLOAD_SCHEMAS.message,
    defaultDuration:  500,
    animationType: 'sendBubble',
  },

  [ACTION_IDS.CLOSE_KEYBOARD]: {
    id:            ACTION_IDS.CLOSE_KEYBOARD,
    label:         'Fermer le clavier',
    description:   'Swipe down ou tap hors clavier → clavier se ferme',
    icon:          '⬇️',
    sourceInterfaces: [KEYBOARD],
    targetInterface:  WHATSAPP_CONVERSATION,
    payloadSchema: [],
    defaultDuration:  300,
    animationType: 'slideDown',
  },

  // ── Transversaux ────────────────────────────────────────────────────────────
  [ACTION_IDS.PLAY_SOUND]: {
    id:            ACTION_IDS.PLAY_SOUND,
    label:         'Jouer un son',
    description:   'Indicateur sonore ou de vibration à l\'écran',
    icon:          '🔊',
    sourceInterfaces: '__all__',
    targetInterface:  null, // reste sur la même interface
    payloadSchema: PAYLOAD_SCHEMAS.sound,
    defaultDuration:  800,
    animationType: 'soundWave',
  },

  [ACTION_IDS.SCREEN_OFF]: {
    id:            ACTION_IDS.SCREEN_OFF,
    label:         'Éteindre l\'écran',
    description:   'L\'écran s\'assombrit jusqu\'au noir complet',
    icon:          '⬛',
    sourceInterfaces: '__all__',
    targetInterface:  '__black__',
    payloadSchema: [],
    defaultDuration:  400,
    animationType: 'fadeOut',
  },

  [ACTION_IDS.PAUSE]: {
    id:            ACTION_IDS.PAUSE,
    label:         'Pause',
    description:   'Attendre un moment sans rien faire',
    icon:          '⏸️',
    sourceInterfaces: '__all__',
    targetInterface:  null,
    payloadSchema: PAYLOAD_SCHEMAS.pause,
    defaultDuration:  1000,
    animationType: 'none',
  },
}

/** Tableau de toutes les actions */
export const ACTIONS_LIST = Object.values(ACTIONS)

/**
 * Retourne les actions disponibles pour une interface source donnée.
 * @param {string} interfaceId
 * @returns {Array}
 */
export function getActionsForInterface(interfaceId) {
  return ACTIONS_LIST.filter(
    (a) =>
      a.sourceInterfaces === '__all__' ||
      a.sourceInterfaces.includes(interfaceId)
  )
}

/**
 * Retourne les types d'animation utilisés (utile pour les imports CSS/Framer).
 */
export const ANIMATION_TYPES = [
  'fade', 'fadeOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight',
  'zoomIn', 'bubbleIn', 'sendBubble', 'tickBlue', 'typing', 'backspace',
  'soundWave', 'none',
]
