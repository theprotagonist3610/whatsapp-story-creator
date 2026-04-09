import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'

/**
 * DesktopLogin — vue pure, pas de logique métier.
 * Optimisée pour les écrans >= 768px.
 * Layout deux colonnes : branding à gauche, formulaire à droite.
 */
export default function DesktopLogin({ email, setEmail, password, setPassword, error, loading, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex bg-brand-cream">

      {/* ── Colonne gauche — branding ── */}
      <aside className="w-1/2 bg-brand-orange flex flex-col items-center justify-center gap-8 p-12">
        <div className="w-28 h-28 rounded-3xl bg-white/20 flex items-center justify-center text-5xl font-bold text-white">
          SD
        </div>
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Les Histoires du Docteur
          </h1>
          <p className="text-white/80 text-lg">Story Creator</p>
        </div>
        <div className="max-w-xs text-center text-white/70 text-sm leading-relaxed">
          Créez vos stories WhatsApp animées pour TikTok et Facebook.
        </div>

        {/* Bande décorative de marque */}
        <div className="flex gap-3 mt-4">
          {['#ffe8c9', '#ffb564', '#d9571d', '#a41624'].map((c) => (
            <div key={c} className="w-8 h-8 rounded-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </aside>

      {/* ── Colonne droite — formulaire ── */}
      <main className="w-1/2 flex flex-col items-center justify-center px-16">
        <div className="w-full max-w-sm">

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-8">Accès réservé à l'équipe.</p>

          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email-desktop" className="text-sm font-medium text-gray-700">
                Adresse email
              </label>
              <input
                id="email-desktop"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="drka@lsd.com"
                className="
                  w-full px-4 py-2.5 rounded-lg border border-gray-300
                  bg-white text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                  disabled:opacity-50
                  text-sm
                "
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password-desktop" className="text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password-desktop"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300
                    bg-white text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                    disabled:opacity-50
                    text-sm
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="
                w-full flex items-center justify-center gap-2
                bg-brand-orange hover:bg-brand-red text-white
                py-2.5 rounded-lg font-semibold text-sm
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                mt-1
              "
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>

          </form>
        </div>
      </main>

    </div>
  )
}
