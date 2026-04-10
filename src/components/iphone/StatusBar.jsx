// ─── StatusBar — barre de statut iOS (iPhone 13 Pro Max) ─────────────────────
// Hauteur totale : 50px (zone notch incluse)
// La notch est centrée, le contenu se répartit de chaque côté.
// theme : 'light' (icônes sombres) | 'dark' (icônes claires)

export default function StatusBar({ time = '9:41', theme = 'dark', batteryPercent = 82, wifi = true }) {
  const color = theme === 'dark' ? '#ffffff' : '#000000'

  return (
    <div
      style={{
        width: '100%',
        height: 50,
        display: 'flex',
        alignItems: 'flex-end',
        paddingBottom: 4,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* ── Notch ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 126,
          height: 34,
          backgroundColor: '#000000',
          borderRadius: '0 0 20px 20px',
          zIndex: 10,
        }}
      />

      {/* ── Heure (gauche) ── */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 6,
          color,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          letterSpacing: -0.3,
          zIndex: 5,
        }}
      >
        {time}
      </div>

      {/* ── Icônes droite (signal, wifi, batterie) ── */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 7,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 5,
        }}
      >
        {/* Signal réseau */}
        <SignalIcon color={color} />

        {/* Wifi */}
        {wifi && <WifiIcon color={color} />}

        {/* Batterie */}
        <BatteryIcon color={color} percent={batteryPercent} />
      </div>
    </div>
  )
}

// ─── Icône réseau ─────────────────────────────────────────────────────────────

function SignalIcon({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
      {[0.4, 0.6, 0.8, 1].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 10 * h,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Icône Wifi ───────────────────────────────────────────────────────────────

function WifiIcon({ color }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path
        d="M8 9.5C8.83 9.5 9.5 10.17 9.5 11S8.83 12.5 8 12.5 6.5 11.83 6.5 11 7.17 9.5 8 9.5z"
        fill={color}
      />
      <path
        d="M8 6c1.66 0 3.16.67 4.24 1.76L13.66 6.34C12.22 4.9 10.21 4 8 4s-4.22.9-5.66 2.34l1.42 1.42C4.84 6.67 6.34 6 8 6z"
        fill={color}
        opacity="0.6"
      />
      <path
        d="M8 2C5.22 2 2.73 3.11 0.93 4.93L2.35 6.35C3.79 4.9 5.79 4 8 4s4.21.9 5.65 2.35L15.07 4.93C13.27 3.11 10.78 2 8 2z"
        fill={color}
        opacity="0.3"
      />
    </svg>
  )
}

// ─── Icône Batterie ───────────────────────────────────────────────────────────

function BatteryIcon({ color, percent }) {
  const fillColor = percent <= 20 ? '#FF3B30' : color
  const fillWidth = Math.round((22 * Math.min(percent, 100)) / 100)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Corps batterie */}
      <div
        style={{
          width: 25,
          height: 12,
          border: `1.5px solid ${color}`,
          borderRadius: 3,
          padding: 1.5,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: fillWidth,
            height: '100%',
            backgroundColor: fillColor,
            borderRadius: 1.5,
          }}
        />
      </div>
      {/* Terminal + */}
      <div
        style={{
          width: 2,
          height: 5,
          backgroundColor: color,
          borderRadius: '0 1px 1px 0',
          opacity: 0.5,
        }}
      />
    </div>
  )
}
