// ─── Moteur sonore léger ──────────────────────────────────────────────────────
// Usage : import { playSound } from '../engine/sounds.js'
//         playSound('receiveMessage')

import sndIncome        from '../assets/iphone/tones/income.mp3'
import sndNotification  from '../assets/iphone/tones/notification.mp3'
import sndSent          from '../assets/iphone/tones/sent.mp3'
import sndKeyboard1     from '../assets/iphone/tones/keyboard_1.mp3'
import sndKeyboard2     from '../assets/iphone/tones/keyboard_2.mp3'

// Catalogue : id → { src, volume }
const CATALOG = {
  receiveMessage:   { src: sndIncome,       volume: 1.0 },
  showNotification: { src: sndNotification, volume: 1.0 },
  sendMessage:      { src: sndSent,         volume: 1.0  },
  keyboard1:        { src: sndKeyboard1,    volume: 0.6 },
  keyboard2:        { src: sndKeyboard2,    volume: 0.6 },
}

// Joue un son sans bloquer — crée un Audio éphémère à chaque appel
export function playSound(id) {
  const entry = CATALOG[id]
  if (!entry) return
  try {
    const audio   = new Audio(entry.src)
    audio.volume  = entry.volume
    audio.play().catch(() => {}) // ignore les erreurs autoplay
  } catch {}
}

// Alternance clavier : keyboard1 / keyboard2 pour varier le timbre
let _kbToggle = false
export function playKeyboardClick() {
  _kbToggle = !_kbToggle
  playSound(_kbToggle ? 'keyboard1' : 'keyboard2')
}
