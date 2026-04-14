// ─── Catalogue des actions ─────────────────────────────────────────────────────
//
// Chaque action décrit :
//   id          identifiant unique (camelCase)
//   label       nom affiché dans l'éditeur
//   description explication courte
//   category    'navigation' | 'message' | 'notification' | 'sound' | 'system'
//   color       couleur badge dans l'éditeur
//   screens     interfaces où l'action est disponible
//   nextScreen  interface cible (navigation) — null si aucun changement d'écran
//   animation   type et durée indicative de la transition
//   params      schéma des paramètres : { key: { type, label, default, required, options?, min?, step? } }
//   sound       son automatiquement joué (null = pas de son)

// ─── Identifiants d'interfaces ────────────────────────────────────────────────

export const SCREEN_IDS = [
  'LockScreen',
  'HomeScreen',
  'WhatsAppDiscussions',
  'WhatsAppConversation',
  'WhatsAppKeyboard',
]

export const SCREEN_LABELS = {
  LockScreen:           'Écran verrouillé',
  HomeScreen:           'Accueil',
  WhatsAppDiscussions:  'WA Discussions',
  WhatsAppConversation: 'WA Conversation',
  WhatsAppKeyboard:     'WA + Clavier',
}

// ─── Catégories d'actions ─────────────────────────────────────────────────────

export const ACTION_CATEGORIES = {
  navigation:   { label: 'Navigation',   color: '#007AFF' },
  message:      { label: 'Message',      color: '#25D366' },
  notification: { label: 'Notification', color: '#FF9500' },
  sound:        { label: 'Son',          color: '#AF52DE' },
  system:       { label: 'Système',      color: '#8E8E93' },
}

// ─── Bibliothèque de sons ─────────────────────────────────────────────────────

export const SOUNDS = {
  notification:     { label: 'Notification entrante' },
  message_sent:     { label: 'Message envoyé'        },
  message_received: { label: 'Message reçu'          },
  unlock:           { label: 'Déverrouillage'        },
  keyboard_click:   { label: 'Clic clavier'          },
}

// ─── Types d'animations ───────────────────────────────────────────────────────

export const ANIMATION_TYPES = {
  slideUp:           { label: 'Slide haut',              description: 'L\'écran monte vers le haut'            },
  slideLeft:         { label: 'Slide gauche',            description: 'Nouvelle vue glisse depuis la droite'   },
  slideRight:        { label: 'Slide droite',            description: 'Vue actuelle sort par la droite'        },
  slideUpKeyboard:   { label: 'Clavier monte',           description: 'Clavier iOS apparaît par le bas'        },
  slideDownKeyboard: { label: 'Clavier descend',         description: 'Clavier iOS disparaît par le bas'       },
  slideDownBanner:   { label: 'Bannière descend',        description: 'Notification glisse depuis le haut'     },
  zoomIn:            { label: 'Zoom ouverture app',      description: 'L\'icône s\'agrandit jusqu\'au plein écran' },
  faceIDThenSlideUp: { label: 'Face ID + déverrouillage',description: 'Scan puis slide haut'                   },
  popIn:             { label: 'Pop bulle',               description: 'Bulle apparaît avec léger rebond'       },
  typewriter:        { label: 'Machine à écrire',        description: 'Texte s\'affiche lettre par lettre'     },
  backspace:         { label: 'Retour arrière',          description: 'Caractère(s) effacé(s) un par un'       },
  sendBubble:        { label: 'Envoi message',           description: 'Bulle part vers le haut, clavier ferme' },
  tickBlue:          { label: 'Coches bleues',           description: 'Double coche passe du gris au bleu'     },
  none:              { label: 'Aucune',                  description: 'Changement instantané'                  },
}

// ─── Catalogue complet ────────────────────────────────────────────────────────

export const ACTIONS = [

  // ── Navigation ──────────────────────────────────────────────────────────────

  {
    id:          'unlock',
    label:       'Déverrouiller',
    description: 'Swipe up → transition vers l\'écran d\'accueil',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['LockScreen'],
    nextScreen:  'HomeScreen',
    animation:   { type: 'slideUp', duration: 450 },
    params:      {},
    sound:       'unlock',
  },

  {
    id:          'faceID',
    label:       'Face ID',
    description: 'Animation scan Face ID puis déverrouillage automatique',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['LockScreen'],
    nextScreen:  'HomeScreen',
    animation:   { type: 'faceIDThenSlideUp', duration: 900 },
    params:      {},
    sound:       'unlock',
  },

  {
    id:          'tapNotification',
    label:       'Tap notification',
    description: 'Tap sur une bannière → ouvre directement la conversation',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['LockScreen'],
    nextScreen:  'WhatsAppConversation',
    animation:   { type: 'slideLeft', duration: 350 },
    params: {
      contactName: { type: 'string', label: 'Contact cible', default: 'Gérante', required: true },
    },
    sound: null,
  },

  {
    id:          'tapApp',
    label:       'Ouvrir WhatsApp',
    description: 'Tap sur l\'icône WhatsApp → liste des discussions',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['HomeScreen'],
    nextScreen:  'WhatsAppDiscussions',
    animation:   { type: 'zoomIn', duration: 350 },
    params:      {},
    sound:       null,
  },

  {
    id:          'scrollTo',
    label:       'Scroller vers',
    description: 'L\'écran défile jusqu\'à mettre en évidence une conversation',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['WhatsAppDiscussions'],
    nextScreen:  null,
    animation:   { type: 'scroll', duration: 400 },
    params: {
      contactName: { type: 'string', label: 'Conversation cible', default: 'Gérante', required: true },
    },
    sound: null,
  },

  {
    id:          'tapConversation',
    label:       'Ouvrir discussion',
    description: 'Tap sur une ligne → ouvre la conversation',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['WhatsAppDiscussions'],
    nextScreen:  'WhatsAppConversation',
    animation:   { type: 'slideLeft', duration: 350 },
    params: {
      contactName: { type: 'string', label: 'Contact', default: 'Gérante', required: true },
    },
    sound: null,
  },

  {
    id:          'tapInput',
    label:       'Ouvrir clavier',
    description: 'Tap sur la barre de saisie → clavier iOS monte',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['WhatsAppConversation'],
    nextScreen:  'WhatsAppKeyboard',
    animation:   { type: 'slideUpKeyboard', duration: 300 },
    params:      {},
    sound:       null,
  },

  {
    id:          'dismissKeyboard',
    label:       'Fermer clavier',
    description: 'Swipe down ou tap extérieur → clavier se rétracte',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['WhatsAppKeyboard'],
    nextScreen:  'WhatsAppConversation',
    animation:   { type: 'slideDownKeyboard', duration: 300 },
    params:      {},
    sound:       null,
  },

  {
    id:          'swipeBack',
    label:       'Retour (swipe)',
    description: 'Geste retour iOS → écran précédent dans la navigation',
    category:    'navigation',
    color:       '#007AFF',
    screens:     ['WhatsAppConversation', 'WhatsAppDiscussions', 'WhatsAppKeyboard'],
    nextScreen:  null, // résolu dynamiquement selon l'historique
    animation:   { type: 'slideRight', duration: 350 },
    params:      {},
    sound:       null,
  },

  // ── Messages ─────────────────────────────────────────────────────────────────

  {
    id:          'typingIndicator',
    label:       'Est en train d\'écrire',
    description: 'Bulle animée avec trois points — visible N secondes, disparaît à l\'arrivée du message',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: null },
    params: {
      duration: { type: 'number', label: 'Durée (ms)', default: 2000, required: true, min: 500, step: 500 },
    },
    sound: null,
  },

  {
    id:          'recordingIndicator',
    label:       'Enregistrement…',
    description: 'Bulle animée avec icône micro — visible N secondes, disparaît à l\'arrivée de la note vocale',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: null },
    params: {
      duration: { type: 'number', label: 'Durée (ms)', default: 2000, required: true, min: 500, step: 500 },
    },
    sound: null,
  },

  {
    id:          'receiveMessage',
    label:       'Recevoir message',
    description: 'Une bulle entrante apparaît dans la conversation avec un son',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: 250 },
    params: {
      text:          { type: 'textarea', label: 'Texte du message',  default: '',       required: true  },
      characterName: { type: 'string',   label: 'Nom du personnage', default: '',       required: false },
      time:          { type: 'string',   label: 'Heure',             default: '09:41',  required: false },
    },
    sound: 'message_received',
  },

  {
    id:          'writeMessage',
    label:       'Écrire message',
    description: 'Texte s\'affiche progressivement dans la barre de saisie (typewriter)',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'typewriter', duration: null }, // calculé : nb_lettres × speed_ms
    params: {
      text:  { type: 'textarea', label: 'Texte à taper',     default: '',       required: true  },
      speed: {
        type: 'select', label: 'Vitesse de frappe', default: 'normal', required: false,
        options: [
          { value: 'slow',   label: 'Lente  — 120 ms / lettre' },
          { value: 'normal', label: 'Normale —  60 ms / lettre' },
          { value: 'fast',   label: 'Rapide  —  30 ms / lettre' },
        ],
      },
    },
    sound: null,
  },

  {
    id:          'deleteChar',
    label:       'Effacer caractère(s)',
    description: 'Supprime N caractères depuis la fin du texte saisi (backspace animé)',
    category:    'message',
    color:       '#FF3B30',
    screens:     ['WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'backspace', duration: null }, // calculé : count × 80ms
    params: {
      count: { type: 'number', label: 'Nombre de caractères', default: 1, required: false, min: 1, step: 1 },
    },
    sound: null,
  },

  {
    id:          'sendMessage',
    label:       'Envoyer message',
    description: 'Envoie le texte saisi : bulle sortante + son + clavier se ferme',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppKeyboard'],
    nextScreen:  'WhatsAppConversation',
    animation:   { type: 'sendBubble', duration: 300 },
    params: {
      time:   { type: 'string', label: 'Heure d\'envoi', default: '09:41', required: false },
      status: {
        type: 'select', label: 'Statut initial', default: 'sent', required: false,
        options: [
          { value: 'sent',      label: 'Envoyé (1 coche grise)'    },
          { value: 'delivered', label: 'Livré  (2 coches grises)'   },
          { value: 'read',      label: 'Lu     (2 coches bleues)'   },
        ],
      },
    },
    sound: 'message_sent',
  },

  {
    id:          'selectAndSendSticker',
    label:       'Envoyer un sticker',
    description: 'Sélectionne un sticker dans le picker et l\'envoie comme bulle sortante',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: 300 },
    params: {
      filename: { type: 'sticker', label: 'Sticker',         default: '',       required: true  },
      time:     { type: 'string',  label: 'Heure d\'envoi',  default: '09:41',  required: false },
      status: {
        type: 'select', label: 'Statut initial', default: 'sent', required: false,
        options: [
          { value: 'sent',      label: 'Envoyé (1 coche grise)'  },
          { value: 'delivered', label: 'Livré  (2 coches grises)' },
          { value: 'read',      label: 'Lu     (2 coches bleues)' },
        ],
      },
    },
    sound: 'message_sent',
  },

  {
    id:          'receiveSticker',
    label:       'Recevoir un sticker',
    description: 'Reçoit un sticker entrant dans la conversation',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: 250 },
    params: {
      filename:      { type: 'sticker', label: 'Sticker',           default: '',      required: true  },
      characterName: { type: 'string',  label: 'Nom du personnage',  default: '',      required: false },
      time:          { type: 'string',  label: 'Heure',              default: '09:41', required: false },
    },
    sound: 'message_received',
  },

  {
    id:          'deleteSentMessage',
    label:       'Supprimer message envoyé',
    description: 'Remplace une bulle sortante par "Ce message a été supprimé"',
    category:    'message',
    color:       '#FF3B30',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'none', duration: 300 },
    params: {
      bubbleIndex: { type: 'number', label: 'Index (−1 = dernier)', default: -1, required: false, min: -1, step: 1 },
    },
    sound: null,
  },

  {
    id:          'deleteReceivedMessage',
    label:       'Supprimer message reçu',
    description: 'Remplace une bulle entrante par "Ce message a été supprimé"',
    category:    'message',
    color:       '#FF3B30',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'none', duration: 300 },
    params: {
      bubbleIndex: { type: 'number', label: 'Index (−1 = dernier)', default: -1, required: false, min: -1, step: 1 },
    },
    sound: null,
  },

  {
    id:          'sendVocal',
    label:       'Envoyer une note vocale',
    description: 'Ajoute une bulle note vocale sortante et la joue automatiquement',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: 300 },
    params: {
      storagePath: { type: 'string',  label: 'Chemin bucket vocals', default: '',      required: true  },
      duration:    { type: 'number',  label: 'Durée (secondes)',      default: 0,       required: false, min: 0, step: 0.1 },
      time:        { type: 'string',  label: 'Heure d\'envoi',        default: '09:41', required: false },
      status: {
        type: 'select', label: 'Statut initial', default: 'sent', required: false,
        options: [
          { value: 'sent',      label: 'Envoyé (1 coche grise)'  },
          { value: 'delivered', label: 'Livré  (2 coches grises)' },
          { value: 'read',      label: 'Lu     (2 coches bleues)' },
        ],
      },
    },
    sound: 'message_sent',
  },

  {
    id:          'receiveVocal',
    label:       'Recevoir une note vocale',
    description: 'Ajoute une bulle note vocale entrante et la joue automatiquement',
    category:    'message',
    color:       '#25D366',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'popIn', duration: 250 },
    params: {
      storagePath:   { type: 'string',  label: 'Chemin bucket vocals', default: '',      required: true  },
      duration:      { type: 'number',  label: 'Durée (secondes)',      default: 0,       required: false, min: 0, step: 0.1 },
      characterName: { type: 'string',  label: 'Nom du personnage',     default: '',      required: false },
      time:          { type: 'string',  label: 'Heure',                 default: '09:41', required: false },
    },
    sound: 'message_received',
  },

  {
    id:          'markAsRead',
    label:       'Marquer comme lu',
    description: 'Les coches des bulles sortantes passent du gris au bleu',
    category:    'message',
    color:       '#53BDEB',
    screens:     ['WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'tickBlue', duration: 200 },
    params:      {},
    sound:       null,
  },

  // ── Notifications ────────────────────────────────────────────────────────────

  {
    id:          'showNotification',
    label:       'Notification entrante',
    description: 'Bannière de notification glisse depuis le haut de l\'écran',
    category:    'notification',
    color:       '#FF9500',
    screens:     ['LockScreen', 'HomeScreen', 'WhatsAppDiscussions', 'WhatsAppConversation'],
    nextScreen:  null,
    animation:   { type: 'slideDownBanner', duration: 350 },
    params: {
      app:     { type: 'string',   label: 'Application',    default: 'WhatsApp', required: true  },
      sender:  { type: 'string',   label: 'Expéditeur',     default: '',         required: true  },
      message: { type: 'textarea', label: 'Aperçu message', default: '',         required: true  },
      time:    { type: 'string',   label: 'Heure',          default: 'maint.',   required: false },
    },
    sound: 'notification',
  },

  // ── Sons ─────────────────────────────────────────────────────────────────────

  {
    id:          'playSound',
    label:       'Jouer un son',
    description: 'Joue un son sans modifier l\'interface visuelle',
    category:    'sound',
    color:       '#AF52DE',
    screens:     ['LockScreen', 'HomeScreen', 'WhatsAppDiscussions', 'WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'none', duration: 0 },
    params: {
      sound: {
        type: 'select', label: 'Son à jouer', default: 'notification', required: true,
        options: Object.entries(SOUNDS).map(([value, s]) => ({ value, label: s.label })),
      },
    },
    sound: null, // le son est dans les params, pas automatique
  },

  // ── Système ──────────────────────────────────────────────────────────────────

  {
    id:          'wait',
    label:       'Attendre',
    description: 'Pause : l\'interface reste figée pendant N millisecondes',
    category:    'system',
    color:       '#8E8E93',
    screens:     ['LockScreen', 'HomeScreen', 'WhatsAppDiscussions', 'WhatsAppConversation', 'WhatsAppKeyboard'],
    nextScreen:  null,
    animation:   { type: 'none', duration: null },
    params: {
      duration: { type: 'number', label: 'Durée (ms)', default: 1000, required: true, min: 100, step: 100 },
    },
    sound: null,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Actions disponibles pour un écran donné, triées par catégorie */
export function actionsForScreen(screenId) {
  return ACTIONS.filter((a) => a.screens.includes(screenId))
}

/** Trouve une action par son id */
export function getAction(actionId) {
  return ACTIONS.find((a) => a.id === actionId) ?? null
}

/** Génère les params par défaut d'une action */
export function defaultParams(actionId) {
  const action = getAction(actionId)
  if (!action) return {}
  return Object.fromEntries(
    Object.entries(action.params).map(([key, schema]) => [key, schema.default ?? ''])
  )
}

/** Durée estimée d'une action en ms (pour le playback) */
export function estimateDuration(actionId, params = {}) {
  const action = getAction(actionId)
  if (!action) return 1000

  switch (actionId) {
    case 'writeMessage': {
      const speeds = { slow: 120, normal: 60, fast: 30 }
      const ms     = speeds[params.speed ?? 'normal'] ?? 60
      return (params.text?.length ?? 0) * ms + 300
    }
    case 'deleteChar':
      return (params.count ?? 1) * 80 + 200
    case 'wait':
    case 'typingIndicator':
      return params.duration ?? 1000
    default:
      return action.animation.duration ?? 500
  }
}
