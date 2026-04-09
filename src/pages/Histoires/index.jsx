import ResponsiveLayout   from '../../components/ResponsiveLayout.jsx'
import MobileHistoires   from './MobileHistoires.jsx'
import DesktopHistoires  from './DesktopHistoires.jsx'

export default function Histoires() {
  return <ResponsiveLayout mobile={MobileHistoires} desktop={DesktopHistoires} />
}
