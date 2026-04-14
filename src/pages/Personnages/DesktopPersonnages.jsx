import { useState, useRef, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, UserIcon, CameraIcon, SpinnerIcon } from '@phosphor-icons/react'
import { getCharacters, createCharacter, updateCharacter, deleteCharacter } from '../../lib/supabase.js'

// ─── Couleurs avatar prédéfinies ──────────────────────────────────────────────

const AVATAR_COLORS = [
  '#d9571d', '#ffb564', '#25D366', '#007AFF',
  '#AF52DE', '#FF3B30', '#FF9500', '#34C759',
  '#5AC8FA', '#FF2D55', '#8E8E93', '#1C1C1E',
]

const SEXES = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
]

// ─── Mapper DB → UI ───────────────────────────────────────────────────────────

const dbToPersonnage = (row) => ({
  id:          row.id,
  nom:         row.name,
  sexe:        row.gender      ?? 'autre',
  avatarColor: row.bubble_color ?? '#8E8E93',
  avatarImage: row.avatar_url  ?? null,
  isDefault:   row.is_default  ?? false,
  followers:   row.followers   ?? 0,
})

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ personnage, size = 56 }) {
  const initials = personnage.nom
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('')

  if (personnage.avatarImage) {
    return (
      <img
        src={personnage.avatarImage}
        alt={personnage.nom}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: personnage.avatarColor ?? '#8E8E93',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>
      {initials || <UserIcon size={size * 0.45} color="#fff" />}
    </div>
  )
}

// ─── Modale création / édition ────────────────────────────────────────────────

const EMPTY = { nom: '', sexe: 'homme', avatarColor: '#d9571d', avatarImage: null, followers: 0 }

function PersonnageModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial ? { nom: initial.nom, sexe: initial.sexe, avatarColor: initial.avatarColor, avatarImage: initial.avatarImage, followers: initial.followers ?? 0 }
            : EMPTY
  )
  const [tab,     setTab]     = useState(initial?.avatarImage ? 'image' : 'color')
  const [saving,  setSaving]  = useState(false)
  const fileRef               = useRef()

  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => patch({ avatarImage: ev.target.result })
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!form.nom.trim() || saving) return
    setSaving(true)
    await onSave(tab === 'color'
      ? { ...form, avatarImage: null }
      : { ...form }
    )
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[440px] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {initial ? 'Modifier le personnage' : 'Nouveau personnage'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 flex flex-col gap-5">

          {/* Aperçu */}
          <div className="flex items-center gap-4">
            <Avatar personnage={{ ...form, avatarImage: tab === 'image' ? form.avatarImage : null }} size={64} />
            <div>
              <div className="font-semibold text-gray-900">{form.nom || 'Prénom Nom'}</div>
              <div className="text-sm text-gray-400">{SEXES.find(s => s.value === form.sexe)?.label}</div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Nom *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => patch({ nom: e.target.value })}
              placeholder="ex. Gérante"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>

          {/* Sexe */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Sexe</label>
            <div className="flex gap-2">
              {SEXES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => patch({ sexe: s.value })}
                  className={`flex-1 py-2 text-sm rounded-xl border transition-colors ${
                    form.sexe === s.value
                      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange font-semibold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Abonnés WhatsApp */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Abonnés WhatsApp
              <span className="text-gray-400 font-normal ml-1">— affiché dans l'en-tête de conversation</span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.followers}
              onChange={(e) => patch({ followers: Math.max(0, Number(e.target.value)) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>

          {/* Avatar — onglets */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Avatar</label>
            <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1">
              {[{ id: 'color', label: 'Couleur' }, { id: 'image', label: 'Photo' }].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'color' ? (
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => patch({ avatarColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.avatarColor === c ? 'ring-2 ring-offset-2 ring-brand-orange scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileRef.current.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-brand-orange hover:bg-brand-orange/5 transition-colors"
              >
                {form.avatarImage ? (
                  <img src={form.avatarImage} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <>
                    <CameraIcon size={28} color="#8E8E93" />
                    <span className="text-xs text-gray-400">Cliquer pour choisir une photo</span>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!form.nom.trim() || saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-40 flex items-center gap-2"
            style={{ backgroundColor: '#d9571d' }}
          >
            {saving && <SpinnerIcon size={14} className="animate-spin" />}
            {initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Carte personnage ─────────────────────────────────────────────────────────

function PersonnageCard({ personnage, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 group">
      <Avatar personnage={personnage} size={52} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{personnage.nom}</div>
        <div className="text-sm text-gray-400">{SEXES.find(s => s.value === personnage.sexe)?.label ?? 'Autre'}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{personnage.followers ?? 0} abonnés</div>
        {personnage.isDefault && (
          <div className="text-[10px] text-amber-500 font-medium mt-0.5">Personnage principal</div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(personnage)}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors">
          <PencilIcon size={15} />
        </button>
        {!personnage.isDefault && (
          <button onClick={() => onDelete(personnage.id)}
            className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
            <TrashIcon size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DesktopPersonnages() {
  const [personnages, setPersonnages] = useState([])
  const [modal,       setModal]       = useState(null) // null | 'new' | { personnage }
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    getCharacters()
      .then((rows) => setPersonnages(rows.map(dbToPersonnage)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const save = async (data) => {
    try {
      if (modal === 'new') {
        const row = await createCharacter({
          name:        data.nom,
          bubbleColor: data.avatarColor,
          avatarUrl:   data.avatarImage ?? null,
          gender:      data.sexe,
          followers:   data.followers ?? 0,
        })
        setPersonnages((p) => [...p, dbToPersonnage(row)])
      } else {
        const row = await updateCharacter(modal.id, {
          name:        data.nom,
          bubbleColor: data.avatarColor,
          avatarUrl:   data.avatarImage ?? null,
          gender:      data.sexe,
          followers:   data.followers ?? 0,
        })
        setPersonnages((p) => p.map((x) => x.id === modal.id ? dbToPersonnage(row) : x))
      }
      setModal(null)
    } catch (e) { setError(e.message) }
  }

  const remove = async (id) => {
    try {
      await deleteCharacter(id)
      setPersonnages((p) => p.filter((x) => x.id !== id))
    } catch (e) { setError(e.message) }
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
          <h1 className="text-xl font-bold text-gray-900">Personnages</h1>
          <p className="text-sm text-gray-400 mt-0.5">{personnages.length} personnage{personnages.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
          style={{ backgroundColor: '#d9571d' }}
        >
          <PlusIcon size={15} weight="bold" /> Nouveau personnage
        </button>
      </div>

      {/* Grille */}
      <div className="p-8">
        {personnages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <UserIcon size={48} weight="thin" />
            <p className="mt-4 text-sm">Aucun personnage — créez-en un !</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 max-w-3xl">
            {personnages.map((p) => (
              <PersonnageCard key={p.id} personnage={p} onEdit={(x) => setModal(x)} onDelete={remove} />
            ))}
          </div>
        )}
      </div>

      {/* Modale */}
      {modal && (
        <PersonnageModal
          initial={modal === 'new' ? null : modal}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  )
}
