import { useNavigate } from 'react-router-dom'
import { BookOpen, PenSquare, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext.jsx'

const CARDS = [
  {
    to:          '/histoires',
    label:       'Bibliothèque',
    description: 'Consulter et gérer toutes les histoires',
    icon:        BookOpen,
    color:       'bg-brand-orange/10 text-brand-orange',
  },
  {
    to:          '/edition',
    label:       'Nouvelle histoire',
    description: 'Créer une conversation WhatsApp animée',
    icon:        PenSquare,
    color:       'bg-brand-red/10 text-brand-red',
  },
  {
    to:          '/histoires',
    label:       'Prévisualiser',
    description: 'Exporter en PNG ou vidéo MP4',
    icon:        Eye,
    color:       'bg-brand-yellow/30 text-brand-orange',
  },
]

export default function DesktopDashboard() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  return (
    <div className="min-h-screen bg-brand-cream px-8 py-12">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
          </h1>
          <p className="text-gray-500 mt-2">Tableau de bord — Les Sandwichs du Docteur</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {CARDS.map(({ to, label, description, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={24} />
              </div>
              <p className="font-semibold text-gray-900 mb-1">{label}</p>
              <p className="text-sm text-gray-500">{description}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
