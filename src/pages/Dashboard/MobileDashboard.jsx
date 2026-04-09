import { useNavigate } from 'react-router-dom'
import { BookOpen, PenSquare } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function MobileDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  return (
    <div className="min-h-screen bg-brand-cream px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Que souhaitez-vous faire ?</p>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate('/histoires')}
          className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
            <BookOpen size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Mes histoires</p>
            <p className="text-sm text-gray-500">Consulter la bibliothèque</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/edition')}
          className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
            <PenSquare size={24} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">Nouvelle histoire</p>
            <p className="text-sm text-gray-500">Créer une conversation</p>
          </div>
        </button>
      </div>

      {/* Barre signature */}
      <div className="mt-auto pt-8 text-center text-xs text-gray-400">
        Les Sandwichs du Docteur — Story Creator
      </div>
    </div>
  )
}
