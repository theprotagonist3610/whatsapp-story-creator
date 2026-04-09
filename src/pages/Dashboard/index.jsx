import ResponsiveLayout  from '../../components/ResponsiveLayout.jsx'
import MobileDashboard  from './MobileDashboard.jsx'
import DesktopDashboard from './DesktopDashboard.jsx'

export default function Dashboard() {
  return <ResponsiveLayout mobile={MobileDashboard} desktop={DesktopDashboard} />
}
