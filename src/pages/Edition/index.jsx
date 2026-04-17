import { useState } from 'react'
import ResponsiveLayout   from '../../components/ResponsiveLayout.jsx'
import MobileEdition      from './MobileEdition.jsx'
import DesktopEdition     from './DesktopEdition.jsx'
import TransparentEdition from './TransparentEdition.jsx'
import ModeDialog         from './ModeDialog.jsx'

export default function Edition() {
  // null  → dialogue de sélection affiché
  // 'normal' | 'transparent' → interface active
  const [mode, setMode] = useState(null)

  const handleChangeMode = () => setMode(null)

  if (mode === null) {
    return <ModeDialog onSelect={setMode} />
  }

  if (mode === 'transparent') {
    return <TransparentEdition onChangeMode={handleChangeMode} />
  }

  // Mode normal : interface existante
  return (
    <ResponsiveLayout
      mobile={MobileEdition}
      desktop={DesktopEdition}
      onChangeMode={handleChangeMode}
    />
  )
}
