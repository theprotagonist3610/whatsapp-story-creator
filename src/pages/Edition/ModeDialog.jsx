import { DeviceMobileIcon, FrameCornersIcon, XIcon } from '@phosphor-icons/react'

// ─── Modes disponibles ────────────────────────────────────────────────────────

const MODES = [
  {
    id:          'normal',
    icon:        DeviceMobileIcon,
    label:       'Normal',
    description: 'Interface complète avec aperçu iPhone, palette d\'actions et timeline de scène.',
    color:       '#d9571d',
    bg:          '#fff5ee',
    border:      '#f9c09a',
  },
  {
    id:          'transparent',
    icon:        FrameCornersIcon,
    label:       'Transparent',
    description: 'Interface épurée pensée pour la capture d\'écran sans chrome visible.',
    color:       '#5856D6',
    bg:          '#f2f2ff',
    border:      '#c5c4f7',
  },
]

// ─── Dialogue de sélection de mode ───────────────────────────────────────────

export default function ModeDialog({ onSelect }) {
  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          9999,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backdropFilter:  'blur(4px)',
      }}
    >
      <div
        style={{
          background:   '#fff',
          borderRadius: 24,
          padding:      '32px 32px 28px',
          width:        480,
          boxShadow:    '0 32px 96px rgba(0,0,0,0.28)',
          display:      'flex',
          flexDirection:'column',
          gap:          24,
        }}
      >
        {/* En-tête */}
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', marginBottom: 4 }}>
            Mode d'édition
          </p>
          <p style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.5 }}>
            Choisissez comment vous souhaitez éditer votre histoire.
          </p>
        </div>

        {/* Cartes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MODES.map(({ id, icon: Icon, label, description, color, bg, border }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           16,
                textAlign:     'left',
                padding:       '18px 20px',
                borderRadius:  14,
                border:        `1.5px solid ${border}`,
                backgroundColor: bg,
                cursor:        'pointer',
                transition:    'transform 120ms, box-shadow 120ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform  = 'translateY(-1px)'
                e.currentTarget.style.boxShadow  = '0 6px 24px rgba(0,0,0,0.10)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform  = 'none'
                e.currentTarget.style.boxShadow  = 'none'
              }}
            >
              {/* Icône */}
              <div style={{
                width:           44,
                height:          44,
                borderRadius:    12,
                backgroundColor: color,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                flexShrink:      0,
              }}>
                <Icon size={22} color="#fff" weight="bold" />
              </div>

              {/* Texte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1c1c1e', marginBottom: 3 }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, color: '#636366', lineHeight: 1.5 }}>
                  {description}
                </p>
              </div>

              {/* Flèche */}
              <span style={{ fontSize: 18, color: color, fontWeight: 300, opacity: 0.7 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
