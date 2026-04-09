import { Outlet } from 'react-router-dom'
import useBreakpoint from '../hooks/useBreakpoint.js'
import MobileNavbar  from '../components/navbars/MobileNavbar.jsx'
import DesktopNavbar from '../components/navbars/DesktopNavbar.jsx'

/**
 * AppLayout — layout principal de l'application.
 *
 * Affiche la navbar adaptée (mobile ou desktop) puis le contenu
 * de la route active via <Outlet>.
 *
 * La navbar desktop est fixed h-16, la mobile est fixed h-14.
 * Un padding-top est appliqué au contenu pour compenser la navbar fixed.
 */
export default function AppLayout() {
  const { isMobile } = useBreakpoint()

  return (
    <div className="min-h-screen bg-gray-50">

      {isMobile ? <MobileNavbar /> : <DesktopNavbar />}

      {/* Décalage du contenu sous la navbar fixed */}
      <main className={isMobile ? 'pt-14' : 'pt-16'}>
        <Outlet />
      </main>

    </div>
  )
}
