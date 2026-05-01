import ResponsiveLayout      from '../../components/ResponsiveLayout.jsx'
import DesktopPhonecall     from './DesktopPhonecall.jsx'

export default function Phonecall() {
  return <ResponsiveLayout mobile={DesktopPhonecall} desktop={DesktopPhonecall} />
}
