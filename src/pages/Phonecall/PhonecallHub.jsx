// ─── PhonecallHub — layout partagé des sous-routes /phonecall ─────────────────

import { NavLink, Outlet } from 'react-router-dom'
import { PhoneCallIcon, UsersThreeIcon } from '@phosphor-icons/react'

const TABS = [
  {
    to:    '/phonecall/simple-phone-call',
    label: 'Appel simple',
    icon:  PhoneCallIcon,
  },
  {
    to:    '/phonecall/group-phone-call',
    label: 'Appel de groupe',
    icon:  UsersThreeIcon,
  },
]

export default function PhonecallHub() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Barre d'onglets ── */}
      <div className="bg-white border-b border-gray-100 px-6 pt-4 shrink-0">
        <div className="flex gap-1 max-w-2xl mx-auto">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'text-[#25D366] border-[#25D366] bg-[#25D36608]'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={15} weight="fill" />
              {label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ── Contenu de la sous-route active ── */}
      <div className="flex-1">
        <Outlet />
      </div>

    </div>
  )
}
