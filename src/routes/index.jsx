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
const HeadlessExport       = lazy(() => import('../pages/HeadlessExport/index.jsx'))
const HeadlessTransparent  = lazy(() => import('../pages/HeadlessTransparent/index.jsx'))
const HeadlessCall                    = lazy(() => import('../pages/HeadlessCall/index.jsx'))
const HeadlessCallTransparent         = lazy(() => import('../pages/HeadlessCallTransparent/index.jsx'))
const HeadlessGroupCall               = lazy(() => import('../pages/HeadlessGroupCall/index.jsx'))
const HeadlessGroupCallTransparent    = lazy(() => import('../pages/HeadlessGroupCallTransparent/index.jsx'))
const HeadlessDiscussion              = lazy(() => import('../pages/HeadlessDiscussion/index.jsx'))
const HeadlessDiscussionTransparent   = lazy(() => import('../pages/HeadlessDiscussionTransparent/index.jsx'))
const HeadlessTrueStory               = lazy(() => import('../pages/HeadlessTrueStory/index.jsx'))
const HeadlessTrueStoryTransparent    = lazy(() => import('../pages/HeadlessTrueStoryTransparent/index.jsx'))
const PhonecallHub            = lazy(() => import('../pages/Phonecall/PhonecallHub.jsx'))
const DesktopPhonecall        = lazy(() => import('../pages/Phonecall/DesktopPhonecall.jsx'))
const GroupPhonecall          = lazy(() => import('../pages/Phonecall/GroupPhonecall.jsx'))
const PhonecallPlayer         = lazy(() => import('../pages/Phonecall/PhonecallPlayer.jsx'))
const GroupPhonecallPlayer    = lazy(() => import('../pages/Phonecall/GroupPhonecallPlayer.jsx'))
const DiscussionList          = lazy(() => import('../pages/Discussion/DiscussionList.jsx'))
const DiscussionPlayer        = lazy(() => import('../pages/Discussion/DiscussionPlayer.jsx'))
const TrueStoryList           = lazy(() => import('../pages/TrueStory/TrueStoryList.jsx'))
const TrueStoryPlayer         = lazy(() => import('../pages/TrueStory/TrueStoryPlayer.jsx'))

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

        {/* ── Publiques ── */}
        <Route path="/login"           element={<Login />} />
        {/* Routes publiques pour l'export Puppeteer — pas d'auth, pas de navbar */}
        <Route path="/headless-export"       element={<HeadlessExport />} />
        <Route path="/headless-transparent"  element={<HeadlessTransparent />} />
        <Route path="/headless-call"                         element={<HeadlessCall />} />
        <Route path="/headless-call-transparent"          element={<HeadlessCallTransparent />} />
        <Route path="/headless-group-call"               element={<HeadlessGroupCall />} />
        <Route path="/headless-group-call-transparent"   element={<HeadlessGroupCallTransparent />} />
        <Route path="/headless-discussion"               element={<HeadlessDiscussion />} />
        <Route path="/headless-discussion-transparent"   element={<HeadlessDiscussionTransparent />} />
        <Route path="/headless-true-story"               element={<HeadlessTrueStory />} />
        <Route path="/headless-true-story-transparent"   element={<HeadlessTrueStoryTransparent />} />

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
          <Route path="/phonecall" element={<PhonecallHub />}>
            <Route index element={<Navigate to="simple-phone-call" replace />} />
            <Route path="simple-phone-call" element={<DesktopPhonecall />} />
            <Route path="group-phone-call"  element={<GroupPhonecall />} />
          </Route>
          <Route path="/phonecall/:id"         element={<PhonecallPlayer />} />
          <Route path="/phonecall/group/:id"  element={<GroupPhonecallPlayer />} />
          <Route path="/discussion"           element={<DiscussionList />} />
          <Route path="/discussion/:id"       element={<DiscussionPlayer />} />
          <Route path="/true-story"           element={<TrueStoryList />} />
          <Route path="/true-story/:id"       element={<TrueStoryPlayer />} />
        </Route>

        {/* ── Redirections ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </Suspense>
  )
}
