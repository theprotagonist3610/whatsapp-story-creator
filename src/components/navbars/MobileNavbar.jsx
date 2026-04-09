import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, LayoutDashboard, BookOpen, PenSquare, Users, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/histoires',   label: 'Histoires',   icon: BookOpen        },
  { to: '/edition',     label: 'Édition',     icon: PenSquare       },
  { to: '/personnages', label: 'Personnages', icon: Users           },
]

export default function MobileNavbar() {
  const [open, setOpen]   = useState(false)
  const { profile }       = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()
  const sidebarRef        = useRef(null)

  // Ferme le sidebar à chaque changement de route
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Ferme le sidebar sur Échap
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Empêche le scroll du body quand le sidebar est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Focus trap : maintient le focus dans le sidebar
  useEffect(() => {
    if (!open || !sidebarRef.current) return
    const focusable = sidebarRef.current.querySelectorAll(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length) focusable[0].focus()
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Top bar ── */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-4">

        {/* Logo */}
        <NavLink
          to="/stories"
          className="flex items-center gap-2 select-none"
          aria-label="Accueil"
        >
          <span className="w-7 h-7 rounded-md bg-brand-orange flex items-center justify-center text-white text-xs font-bold">
            SD
          </span>
          <span
            className="text-base font-bold tracking-tight leading-none"
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

        {/* Bouton hamburger */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          aria-controls="mobile-sidebar"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu size={22} />
        </button>

      </header>

      {/* ── Overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar drawer ── */}
      <aside
        id="mobile-sidebar"
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        className={`
          fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* En-tête du sidebar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {profile?.display_name ?? 'Mon compte'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Story Creator</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Liens */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1" aria-label="Navigation principale">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-brand-orange/10 text-brand-orange'
                  : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Barre de marque + déconnexion */}
        <div className="border-t border-gray-100 px-3 py-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
        <div className="h-1 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-red" />

      </aside>
    </>
  )
}
