import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from '../components/PrivateRoute.jsx'
import AppLayout   from '../layouts/AppLayout.jsx'

// ─── Chargement paresseux des pages ──────────────────────────────────────────
// Convention : chaque page vit dans son dossier pages/Xxx/
//   index.jsx        → switcher ResponsiveLayout (logique partagée)
//   MobileXxx.jsx    → vue mobile pure
//   DesktopXxx.jsx   → vue desktop pure
//
// Pour ajouter une nouvelle page :
//   1. Créer pages/MaPage/ avec les 3 fichiers
//   2. Ajouter le lazy() ici
//   3. Ajouter un <Route> dans le groupe "Privées" ci-dessous

const Login           = lazy(() => import('../pages/Login/index.jsx'))
const Dashboard       = lazy(() => import('../pages/Dashboard/index.jsx'))
const Histoires       = lazy(() => import('../pages/Histoires/index.jsx'))
const HistoireDetail  = lazy(() => import('../pages/Histoires/HistoireDetail.jsx'))
const Edition         = lazy(() => import('../pages/Edition/index.jsx'))
const Preview         = lazy(() => import('../pages/Preview/index.jsx'))
const Personnages     = lazy(() => import('../pages/Personnages/index.jsx'))

// ─── Fallback de chargement commun ───────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Table de routage ─────────────────────────────────────────────────────────
//
//  Publique (sans navbar) :
//    /login
//
//  Privées (dans AppLayout — navbar + Outlet) :
//    /dashboard
//    /histoires
//    /edition
//    /edition/:id
//    /preview/:id
//    /personnages
//
//  Redirections :
//    /  →  /dashboard
//    *  →  /dashboard

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Publique ── */}
        <Route path="/login" element={<Login />} />

        {/* ── Privées (navbar via AppLayout + Outlet) ── */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/histoires"         element={<Histoires />} />
          <Route path="/histoires/:id"    element={<HistoireDetail />} />
          <Route path="/edition"        element={<Edition />} />
          <Route path="/edition/:id"    element={<Edition />} />
          <Route path="/preview/:id"    element={<Preview />} />
          <Route path="/personnages"    element={<Personnages />} />
        </Route>

        {/* ── Redirections ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </Suspense>
  )
}
