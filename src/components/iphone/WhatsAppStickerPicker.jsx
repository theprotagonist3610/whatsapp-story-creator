import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { LOCAL_STICKERS, getLocalUrl } from '../../lib/stickers.js'

// ─── WhatsAppStickerPicker ────────────────────────────────────────────────────
// Picker sticker natif-style, rendu à l'intérieur du téléphone.
// Props :
//   value    {string|null}  filename du sticker sélectionné (mis en évidence)
//   onSelect {function}     (filename) => void
//   height   {number}       hauteur du panneau (= KEYBOARD_H)

const COLS = 4

// Ordre aléatoire fixé une seule fois au chargement du module
const SHUFFLED_STICKERS = [...LOCAL_STICKERS].sort(() => Math.random() - 0.5)

export default function WhatsAppStickerPicker({ value, onSelect, height = 296 }) {
  const [query,    setQuery]    = useState('')
  const selectedRef             = useRef(null)

  const filtered = query.trim()
    ? SHUFFLED_STICKERS.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : SHUFFLED_STICKERS

  // Scroll automatique vers le sticker sélectionné
  useEffect(() => {
    if (value && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [value])

  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: '#F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        borderTop: '0.5px solid #C6C6C8',
      }}
    >
      {/* ── Barre de recherche ── */}
      <div style={{ padding: '8px 10px 4px', flexShrink: 0 }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        >
          <MagnifyingGlassIcon size={13} color="#8E8E93" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              backgroundColor: 'transparent',
              color: '#000000',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <XIcon size={13} color="#8E8E93" />
            </button>
          )}
        </div>
      </div>

      {/* ── Grille ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 8px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 12, color: '#8E8E93' }}>Aucun résultat</span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gap: 2,
            }}
          >
            {filtered.map(s => {
              const selected = value === s.name
              return (
                <button
                  key={s.name}
                  ref={selected ? selectedRef : null}
                  onClick={() => onSelect(s.name)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    backgroundColor: selected ? 'rgba(37,211,102,0.18)' : 'transparent',
                    border: `1.5px solid ${selected ? '#25D366' : 'transparent'}`,
                    padding: 4,
                    cursor: 'pointer',
                    transition: 'background-color 100ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                  }}
                >
                  <img
                    src={s.url}
                    alt={s.name}
                    onError={e => { e.currentTarget.src = getLocalUrl(s.name) ?? '' }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                    }}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
