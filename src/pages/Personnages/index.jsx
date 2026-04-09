import ResponsiveLayout    from '../../components/ResponsiveLayout.jsx'
import MobilePersonnages  from './MobilePersonnages.jsx'
import DesktopPersonnages from './DesktopPersonnages.jsx'

export default function Personnages() {
  return <ResponsiveLayout mobile={MobilePersonnages} desktop={DesktopPersonnages} />
}
