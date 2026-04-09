import ResponsiveLayout  from '../../components/ResponsiveLayout.jsx'
import MobilePreview   from './MobilePreview.jsx'
import DesktopPreview  from './DesktopPreview.jsx'

export default function Preview() {
  return <ResponsiveLayout mobile={MobilePreview} desktop={DesktopPreview} />
}
