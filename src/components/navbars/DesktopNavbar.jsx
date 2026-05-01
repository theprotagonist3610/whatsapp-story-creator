import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, PenSquare, Users, Phone, MessageSquare, BookMarked, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/histoires',   label: 'Histoires',   icon: BookOpen        },
  { to: '/edition',     label: 'Édition',     icon: PenSquare       },
  { to: '/personnages', label: 'Personnages', icon: Users           },
  { to: '/phonecall',   label: 'Appels',      icon: Phone           },
  { to: '/discussion',  label: 'Discussion',  icon: MessageSquare   },
  { to: '/true-story',  label: 'True Story',  icon: BookMarked      },
]

export default function DesktopNavbar() {
  const { profile } = useAuth()
  const navigate    = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-full max-w-screen-xl mx-auto px-6 flex items-center justify-between">

        {/* ── Logo ── */}
        <NavLink
          to="/stories"
          className="flex items-center gap-2 shrink-0 select-none"
          aria-label="Accueil"
        >
          {/* Badge SD */}
          <span className="w-8 h-8 rounded-lg bg-brand-orange flex items-center justify-center text-white text-xs font-bold shrink-0">
            SD
          </span>
          {/* Texte en dégradé */}
          <span
            className="text-lg font-bold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #d9571d 0%, #a41624 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Les Histoires du Docteur
          </span>
        </NavLink>

        {/* ── Liens de navigation ── */}
        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-brand-orange/10 text-brand-orange'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── Profil + déconnexion ── */}
        <div className="flex items-center gap-3 shrink-0">
          {profile?.display_name && (
            <span className="text-sm text-gray-500 hidden lg:block">
              {profile.display_name}
            </span>
          )}
          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150"
          >
            <LogOut size={16} />
            <span className="hidden lg:block">Déconnexion</span>
          </button>
        </div>

      </div>
    </header>
  )
}
