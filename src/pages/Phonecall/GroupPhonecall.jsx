// ─── GroupPhonecall — liste des histoires éligibles à la simulation d'appel de groupe ──
//
// Éligible : 100 % vocal + au moins 2 fils (= ≥ 2 personnages distincts)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersThreeIcon, SpinnerIcon, ClockIcon, PhoneCallIcon } from '@phosphor-icons/react'
import { getStories, getThreads } from '../../lib/supabase.js'
import {
  isGroupCallEligible, getParticipants,
  getInitials, estimateGroupTotalSecs, fmtElapsed,
} from '../../lib/groupCallSequence.js'
import { buildGroupSequence } from '../../lib/groupCallSequence.js'

// ─── Avatar empilé ────────────────────────────────────────────────────────────

function AvatarStack({ participants, size = 32, overlap = 10 }) {
  const shown = participants.slice(0, 4)
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {shown.map((p, i) => (
        <div key={p.characterId} style={{
          marginLeft: i === 0 ? 0 : -overlap,
          zIndex: shown.length - i,
          width: size, height: size, borderRadius: '50%',
          backgroundColor: p.color,
          border: '2px solid white',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {p.avatarUrl
            ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: size * 0.36, fontWeight: 700, color: '#fff' }}>{p.initials}</span>
          }
        </div>
      ))}
      {participants.length > 4 && (
        <div style={{
          marginLeft: -overlap, zIndex: 0,
          width: size, height: size, borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          border: '2px solid white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: size * 0.3, fontWeight: 700, color: '#6b7280' }}>
            +{participants.length - 4}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Card histoire ────────────────────────────────────────────────────────────

function GroupCallCard({ story, threads, onSimulate }) {
  const participants = getParticipants(threads)
  const sequence     = buildGroupSequence(threads)
  const duration     = estimateGroupTotalSecs(sequence)
  const msgCount     = sequence.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Bande en-tête multicolore */}
      <div style={{
        height: 4,
        background: participants.slice(0, 4).map((p, i, arr) =>
          `${p.color} ${Math.round(i * 100 / arr.length)}% ${Math.round((i + 1) * 100 / arr.length)}%`
        ).join(', '),
        backgroundImage: `linear-gradient(90deg, ${
          participants.slice(0, 4).map((p, i, arr) =>
            `${p.color} ${Math.round(i * 100 / arr.length)}%, ${p.color} ${Math.round((i + 1) * 100 / arr.length)}%`
          ).join(', ')
        })`,
      }} />

      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {/* Avatars empilés */}
          <AvatarStack participants={participants} size={36} />

          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{story.title}</p>
            {/* Liste des participants */}
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {participants.map(p => p.name).join(' · ')}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ClockIcon size={12} />
                {fmtElapsed(duration)}
              </span>
              <span className="text-xs text-gray-400">
                {msgCount} vocal{msgCount > 1 ? 'es' : ''}
              </span>
              <span className="text-xs font-medium text-[#5856D6] bg-[#5856D610] px-2 py-0.5 rounded-full">
                {participants.length} participants
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onSimulate(story.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#5856D6' }}
        >
          <UsersThreeIcon size={14} weight="fill" />
          Simuler
        </button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GroupPhonecall() {
  const navigate              = useNavigate()
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
          setEligible(results.filter(({ threads }) => isGroupCallEligible(threads)))
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
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#5856D618' }}>
            <UsersThreeIcon size={20} color="#5856D6" weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Appels de groupe</h1>
        </div>
        <p className="text-sm text-gray-500 ml-13">
          Histoires 100 % vocales avec au moins 2 personnages distincts.
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
            <UsersThreeIcon size={28} color="#9CA3AF" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">Aucune histoire éligible</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Crée une histoire avec plusieurs fils secondaires, dont tous les messages sont des notes vocales.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3 max-w-sm">
            <PhoneCallIcon size={14} />
            Pour un appel simple (2 personnes), utilise l'onglet "Appel simple".
          </div>
        </div>
      )}

      {!loading && !error && eligible.length > 0 && (
        <div className="flex flex-col gap-4">
          {eligible.map(({ story, threads }) => (
            <GroupCallCard
              key={story.id}
              story={story}
              threads={threads}
              onSimulate={(id) => navigate(`/phonecall/group/${id}`)}
            />
          ))}
        </div>
      )}

    </div>
  )
}
