// ─── DesktopPhonecall — liste des histoires éligibles à la simulation d'appel ──
//
// Une histoire est éligible si et seulement si 100 % de ses messages
// sont des notes vocales ([vocal:...]).

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCallIcon, SpinnerIcon, ClockIcon, UserCircleIcon } from '@phosphor-icons/react'
import { getStories, getThreads } from '../../lib/supabase.js'
import { isVocalText, vocalDuration } from '../Histoires/DesktopHistoireDetail.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCallEligible(threads) {
  const all = threads.flatMap(t => t.messages ?? [])
  return all.length > 0 && all.every(m => isVocalText(m.text))
}

function getCallerInfo(threads) {
  for (const t of threads) {
    if (t.character_name && t.character_name !== 'Dr KA') {
      return {
        name:      t.character_name,
        color:     t.character_color  ?? '#25D366',
        initials:  getInitials(t.character_name),
        avatarUrl: t.character_avatar_url ?? null,
      }
    }
  }
  return { name: 'Inconnu', color: '#8E8E93', initials: '?', avatarUrl: null }
}

function getInitials(name) {
  return (name ?? '')
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

function estimateTotalSecs(threads) {
  const msgs = threads.flatMap(t => t.messages ?? [])
  const vocal = msgs.reduce((s, m) => s + vocalDuration(m.text), 0)
  return Math.round(3 + vocal + (msgs.length - 1) * 0.6)   // ring 3s + vocaux + pauses
}

function fmtDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s < 10 ? '0' : ''}${s}s` : `${s}s`
}

// ─── Avatar coloré ────────────────────────────────────────────────────────────

function Avatar({ name, color, avatarUrl, size = 40 }) {
  const initials = getInitials(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.38, fontWeight: 700, color: '#fff' }}>{initials}</span>
      }
    </div>
  )
}

// ─── Card histoire ────────────────────────────────────────────────────────────

function CallCard({ story, threads, onSimulate }) {
  const caller   = getCallerInfo(threads)
  const duration = estimateTotalSecs(threads)
  const msgCount = threads.flatMap(t => t.messages ?? []).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">

      {/* Bande colorée en haut */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${caller.color}, ${caller.color}88)` }} />

      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={caller.name} color={caller.color} avatarUrl={caller.avatarUrl} size={44} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{story.title}</p>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <UserCircleIcon size={13} />
              {caller.name} appelle Dr KA
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ClockIcon size={12} />
                {fmtDuration(duration)}
              </span>
              <span className="text-xs text-gray-400">
                {msgCount} vocal{msgCount > 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSimulate(story.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#25D366' }}
        >
          <PhoneCallIcon size={14} weight="fill" />
          Simuler
        </button>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DesktopPhonecall() {
  const navigate                 = useNavigate()
  const [eligible, setEligible]  = useState([])   // [{ story, threads }]
  const [loading,  setLoading]   = useState(true)
  const [error,    setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const stories = await getStories()
        // Charge les threads de toutes les histoires en parallèle
        const results = await Promise.all(
          stories.map(async story => {
            try {
              const threads = await getThreads(story.id)
              return { story, threads: threads ?? [] }
            } catch {
              return { story, threads: [] }
            }
          })
        )
        if (!cancelled) {
          setEligible(results.filter(({ threads }) => isCallEligible(threads)))
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Rendu ──

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#25D36618' }}>
            <PhoneCallIcon size={20} color="#25D366" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Appels WhatsApp</h1>
        </div>
        <p className="text-sm text-gray-500 ml-13">
          Histoires composées uniquement de notes vocales — simulées en appel vocal.
        </p>
      </div>

      {/* États */}
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <SpinnerIcon size={20} className="animate-spin" />
          <span className="text-sm">Chargement des histoires…</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && eligible.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <PhoneCallIcon size={28} color="#9CA3AF" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Aucune histoire éligible</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Crée une histoire dont tous les messages sont des notes vocales pour simuler un appel.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && eligible.length > 0 && (
        <div className="flex flex-col gap-4">
          {eligible.map(({ story, threads }) => (
            <CallCard
              key={story.id}
              story={story}
              threads={threads}
              onSimulate={(id) => navigate(`/phonecall/${id}`)}
            />
          ))}
        </div>
      )}

    </div>
  )
}
