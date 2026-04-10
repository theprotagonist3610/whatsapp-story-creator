// ============================================================
// interfaces.js
// Registre des 5 interfaces simulées (écrans iPhone 13 Pro Max)
// Format : 390×844px (ratio 9:19.5, points logiques iOS)
// ============================================================

export const INTERFACE_IDS = {
  LOCK_SCREEN:            'LockScreen',
  HOME_SCREEN:            'HomeScreen',
  WHATSAPP_DISCUSSIONS:   'WhatsAppDiscussions',
  WHATSAPP_CONVERSATION:  'WhatsAppConversation',
  KEYBOARD:               'Keyboard',
}

/**
 * Métadonnées de chaque interface.
 *
 * - id          : identifiant unique (correspond au nom du composant)
 * - label       : nom affiché dans l'éditeur
 * - description : description courte
 * - icon        : emoji représentatif (pour l'UI éditeur)
 * - layer       : 'base' = interface principale | 'overlay' = se superpose à une autre
 * - overlayOver : liste des interfaces sur lesquelles cet écran peut se superposer
 */
export const INTERFACES = {
  [INTERFACE_IDS.LOCK_SCREEN]: {
    id:          INTERFACE_IDS.LOCK_SCREEN,
    label:       'Écran verrouillé',
    description: 'Écran de verrouillage iOS — heure, date, notifications',
    icon:        '🔒',
    layer:       'base',
    overlayOver: [],
  },

  [INTERFACE_IDS.HOME_SCREEN]: {
    id:          INTERFACE_IDS.HOME_SCREEN,
    label:       'Accueil',
    description: 'Grille d\'apps iOS — écran d\'accueil iPhone',
    icon:        '📱',
    layer:       'base',
    overlayOver: [],
  },

  [INTERFACE_IDS.WHATSAPP_DISCUSSIONS]: {
    id:          INTERFACE_IDS.WHATSAPP_DISCUSSIONS,
    label:       'WhatsApp — Discussions',
    description: 'Liste des conversations WhatsApp',
    icon:        '💬',
    layer:       'base',
    overlayOver: [],
  },

  [INTERFACE_IDS.WHATSAPP_CONVERSATION]: {
    id:          INTERFACE_IDS.WHATSAPP_CONVERSATION,
    label:       'WhatsApp — Conversation',
    description: 'Chat ouvert avec les bulles de messages',
    icon:        '🗨️',
    layer:       'base',
    overlayOver: [],
  },

  [INTERFACE_IDS.KEYBOARD]: {
    id:          INTERFACE_IDS.KEYBOARD,
    label:       'Clavier iOS',
    description: 'Clavier AZERTY iOS superposé à la conversation',
    icon:        '⌨️',
    layer:       'overlay',
    overlayOver: [INTERFACE_IDS.WHATSAPP_CONVERSATION],
  },
}

/** Tableau ordonné des interfaces (ordre logique d'apparition) */
export const INTERFACES_LIST = [
  INTERFACES[INTERFACE_IDS.LOCK_SCREEN],
  INTERFACES[INTERFACE_IDS.HOME_SCREEN],
  INTERFACES[INTERFACE_IDS.WHATSAPP_DISCUSSIONS],
  INTERFACES[INTERFACE_IDS.WHATSAPP_CONVERSATION],
  INTERFACES[INTERFACE_IDS.KEYBOARD],
]

/** Dimensions logiques de l'écran iPhone 13 Pro Max (en px CSS) */
export const IPHONE_DIMENSIONS = {
  width:  390,
  height: 844,
  ratio:  390 / 844,
}
