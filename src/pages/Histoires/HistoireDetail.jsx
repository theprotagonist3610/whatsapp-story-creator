import ResponsiveLayout from '../../components/ResponsiveLayout.jsx'
import DesktopHistoireDetail from './DesktopHistoireDetail.jsx'

// Mobile à construire plus tard
function MobileHistoireDetail() {
  return <DesktopHistoireDetail />
}

export default function HistoireDetail() {
  return <ResponsiveLayout mobile={MobileHistoireDetail} desktop={DesktopHistoireDetail} />
}
