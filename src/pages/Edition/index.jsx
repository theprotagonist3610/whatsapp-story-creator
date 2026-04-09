import ResponsiveLayout  from '../../components/ResponsiveLayout.jsx'
import MobileEdition   from './MobileEdition.jsx'
import DesktopEdition  from './DesktopEdition.jsx'

export default function Edition() {
  return <ResponsiveLayout mobile={MobileEdition} desktop={DesktopEdition} />
}
