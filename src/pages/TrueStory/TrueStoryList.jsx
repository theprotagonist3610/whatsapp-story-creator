// ─── TrueStoryList — liste des histoires éligibles à la True Story ────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpenIcon, SpinnerIcon, ClockIcon, UserCircleIcon } from '@phosphor-icons/react'
import { getStories, getThreads } from '../../lib/supabase.js'
import {
  isTrueStoryEligible, buildTrueStoryPairs, getHistorienInfo,
  estimateTrueStorySecs, fmtElapsed,
} from '../../lib/trueStorySequence.js'

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, color, avatarUrl, size = 44 }) {
  const initials = (name ?? '')
    .split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.36, fontWeight: 700, color: '#fff' }}>{initials}</span>
      }
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function TrueStoryCard({ story, threads, onOpen }) {
  const historien = getHistorienInfo(threads)
  const pairs     = buildTrueStoryPairs(threads)
  const duration  = estimateTrueStorySecs(pairs)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div style={{ height: 4, background: 'linear-gradient(90deg, #d9571d, #a41624)' }} />
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={historien.name} color={historien.color} avatarUrl={historien.avatarUrl} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{story.title}</p>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <UserCircleIcon size={13} />
              {historien.name} × Dr KA
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ClockIcon size={12} />
                {fmtElapsed(duration)}
              </span>
              <span className="text-xs text-gray-400">
                {pairs.length} paire{pairs.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onOpen(story.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#d9571d' }}
        >
          <BookOpenIcon size={14} weight="fill" />
          Ouvrir
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrueStoryList() {
  const navigate                = useNavigate()
  const [eligible, setEligible] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const stories = await getStories()
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
          setEligible(results.filter(({ threads }) => isTrueStoryEligible(threads)))
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: '#d9571d18' }}>
              <BookOpenIcon size={20} color="#d9571d" weight="fill" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">True Story</h1>
          </div>
          <p className="text-sm text-gray-500 ml-13">
            Narration alternée image + sous-titre — Historien → Dr KA → Historien…
          </p>
        </div>

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
              <BookOpenIcon size={28} color="#9CA3AF" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Aucune histoire éligible</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Crée une histoire avec exactement 2 personnages : Historien (vocaux) et Dr KA (sous-titres).
                L'Historien doit toujours commencer.
              </p>
            </div>
          </div>
        )}

        {!loading && !error && eligible.length > 0 && (
          <div className="flex flex-col gap-4">
            {eligible.map(({ story, threads }) => (
              <TrueStoryCard
                key={story.id}
                story={story}
                threads={threads}
                onOpen={(id) => navigate(`/true-story/${id}`)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
