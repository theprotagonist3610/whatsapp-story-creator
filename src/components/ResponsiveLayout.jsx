import useBreakpoint from '../hooks/useBreakpoint.js'

/**
 * ResponsiveLayout
 *
 * Wrapper générique utilisé par chaque page pour switcher entre
 * la version mobile et la version desktop selon le breakpoint actif.
 *
 * Usage dans une page :
 *
 *   // pages/Stories/index.jsx
 *   import ResponsiveLayout from '../../components/ResponsiveLayout.jsx'
 *   import MobileStories   from './MobileStories.jsx'
 *   import DesktopStories  from './DesktopStories.jsx'
 *
 *   export default function Stories() {
 *     return <ResponsiveLayout mobile={MobileStories} desktop={DesktopStories} />
 *   }
 *
 * Props :
 *   mobile   {React.ComponentType}  — composant rendu si isMobile
 *   desktop  {React.ComponentType}  — composant rendu si isDesktop
 *   ...props                        — toutes les props supplémentaires sont
 *                                     transmises au composant sélectionné
 *
 * Le hook useBreakpoint est appelé UNE seule fois ici ; les composants
 * Mobile/Desktop n'ont pas besoin de le ré-appeler sauf s'ils ont besoin
 * de détails supplémentaires (orientation, width…).
 */
export default function ResponsiveLayout({ mobile: Mobile, desktop: Desktop, ...props }) {
  const { isMobile } = useBreakpoint()
  return isMobile ? <Mobile {...props} /> : <Desktop {...props} />
}
