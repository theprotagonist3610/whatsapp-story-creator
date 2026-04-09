import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import AppRoutes from './routes/index.jsx'

/**
 * Shell de l'application.
 * Responsabilités : fournir le contexte auth et le routeur.
 * La logique de routage est dans src/routes/index.jsx.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
