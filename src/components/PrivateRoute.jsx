import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

/**
 * Protège une route : redirige vers /login si non authentifié.
 * Pendant le chargement initial de la session, affiche un écran vide
 * pour éviter un flash de redirection.
 */
export default function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream">
        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Mémorise la route demandée pour y revenir après connexion
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
