import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  BookOpenIcon,
  PencilIcon,
  TrashIcon,
  ChatCircleIcon,
  FilmSlateIcon,
  CalendarIcon,
  SpinnerIcon,
} from '@phosphor-icons/react'
import { getStories, createStory, updateStory, deleteStory } from '../../lib/supabase.js'

// ─── Modale création ──────────────────────────────────────────────────────────

function HistoireModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial ?? { title: '', description: '' }
  )
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-120 overflow-hidden">

        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {initial ? 'Modifier l\'histoire' : 'Nouvelle histoire'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Titre *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="ex. Le sandwich au thon"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Résumé de l'histoire (optionnel)"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Annuler
          </button>
          <button
            onClick={() => { if (form.title.trim()) onSave(form) }}
            disabled={!form.title.trim()}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#d9571d' }}
          >
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Avatar mini ─────────────────────────────────────────────────────────────

function CharacterAvatar({ character, size = 24 }) {
  const initials = character.name
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('')

  if (character.avatarUrl) {
    return (
      <img
        src={character.avatarUrl}
        alt={character.name}
        title={character.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }}
      />
    )
  }
  return (
    <div
      title={character.name}
      style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: character.bubbleColor ?? '#8E8E93',
        border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: size * 0.38, fontWeight: 700,
      }}
    >
      {initials}
    </div>
  )
}

// ─── Carte histoire ───────────────────────────────────────────────────────────

function HistoireCard({ histoire, onEdit, onDelete, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group overflow-hidden"
    >
      {/* Bande couleur */}
      <div className="h-1.5 w-full" style={{ backgroundColor: '#d9571d' }} />

      <div className="p-5">
        {/* Titre + actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 flex-1">{histoire.title}</h3>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(histoire)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
              <PencilIcon size={13} />
            </button>
            <button onClick={() => onDelete(histoire.id)}
              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
              <TrashIcon size={13} />
            </button>
          </div>
        </div>

        {/* Description */}
        {histoire.description ? (
          <p className="text-sm text-gray-400 line-clamp-2 mb-3">{histoire.description}</p>
        ) : (
          <p className="text-sm text-gray-300 italic mb-3">Aucune description</p>
        )}

        {/* Personnages */}
        <div className="flex items-center gap-1.5 mb-4">
          {/* Dr KA toujours en premier */}
          <div
            title="Dr KA"
            style={{
              width: 24, height: 24, borderRadius: '50%',
              backgroundColor: '#d9571d',
              border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 8.5, fontWeight: 700,
            }}
          >
            DK
          </div>
          {histoire.characters.map((c) => (
            <CharacterAvatar key={c.id} character={c} size={24} />
          ))}
          {histoire.characters.length === 0 && (
            <span className="text-xs text-gray-300 italic">Aucun personnage</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <ChatCircleIcon size={13} />
            {histoire.threadCount} fil{histoire.threadCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <FilmSlateIcon size={13} />
            {histoire.stepCount} step{histoire.stepCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <CalendarIcon size={13} />
            {histoire.updatedAt}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DesktopHistoires() {
  const navigate = useNavigate()
  const [histoires, setHistoires] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [modal,     setModal]     = useState(null) // null | 'new' | { histoire }

  // Chargement initial
  useEffect(() => {
    getStories()
      .then((data) => setHistoires(data.map(dbToHistoire)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Mappe les colonnes Supabase vers le format UI
  const dbToHistoire = (row) => ({
    id:          row.id,
    title:       row.title,
    description: row.debrief ?? '',
    threadCount: Number(row.thread_count  ?? 0),
    stepCount:   Number(row.message_count ?? 0),
    createdAt:   row.created_at?.slice(0, 10) ?? '',
    updatedAt:   row.updated_at?.slice(0, 10) ?? '',
    status:      row.status,
    characters:  row.characters ?? [],
  })

  const save = async (data) => {
    try {
      if (modal === 'new') {
        const row = await createStory({ title: data.title, debrief: data.description || null })
        setHistoires((p) => [dbToHistoire(row), ...p])
      } else {
        const row = await updateStory(modal.id, { title: data.title, debrief: data.description || null })
        setHistoires((p) => p.map((x) => x.id === modal.id ? { ...x, ...dbToHistoire(row) } : x))
      }
      setModal(null)
    } catch (e) {
      setError(e.message)
    }
  }

  const remove = async (id) => {
    try {
      await deleteStory(id)
      setHistoires((p) => p.filter((x) => x.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      <SpinnerIcon size={28} className="animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Erreur */}
      {error && (
        <div className="mx-8 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Histoires</h1>
          <p className="text-sm text-gray-400 mt-0.5">{histoires.length} histoire{histoires.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
          style={{ backgroundColor: '#d9571d' }}
        >
          <PlusIcon size={15} weight="bold" /> Nouvelle histoire
        </button>
      </div>

      {/* Grille */}
      <div className="p-8">
        {histoires.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <BookOpenIcon size={48} weight="thin" />
            <p className="mt-4 text-sm">Aucune histoire — créez-en une !</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5 max-w-5xl">
            {histoires.map((h) => (
              <HistoireCard
                key={h.id}
                histoire={h}
                onEdit={(x)  => setModal(x)}
                onDelete={remove}
                onClick={() => navigate(`/histoires/${h.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale */}
      {modal && (
        <HistoireModal
          initial={modal === 'new' ? null : modal}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  )
}
