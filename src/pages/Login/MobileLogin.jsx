import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import useBreakpoint from '../../hooks/useBreakpoint.js'

/**
 * MobileLogin — vue pure, pas de logique métier.
 * Optimisée pour les écrans < 768px, portrait et paysage.
 */
export default function MobileLogin({ email, setEmail, password, setPassword, error, loading, onSubmit }) {
  const [showPassword, setShowPassword] = useState(false)
  const { isLandscape } = useBreakpoint()

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">

      {/* ── En-tête logo ── */}
      <header
        className={`
          flex flex-col items-center justify-center gap-2
          bg-brand-orange text-white
          ${isLandscape ? 'py-4' : 'py-10'}
        `}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
          SD
        </div>
        {!isLandscape && (
          <>
            <h1 className="text-xl font-bold tracking-tight">Les Histoires du Docteur</h1>
            <p className="text-sm text-white/80">Story Creator</p>
          </>
        )}
      </header>

      {/* ── Formulaire ── */}
      <main className="flex-1 flex flex-col justify-center px-6 py-8">
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-mobile" className="text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <input
              id="email-mobile"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="drka@lsd.com"
              className="
                w-full px-4 py-3 rounded-xl border border-gray-300
                bg-white text-gray-900 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                disabled:opacity-50
                text-base
              "
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-mobile" className="text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password-mobile"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full px-4 py-3 pr-12 rounded-xl border border-gray-300
                  bg-white text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                  disabled:opacity-50
                  text-base
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="
              w-full flex items-center justify-center gap-2
              bg-brand-orange text-white
              py-3.5 rounded-xl font-semibold text-base
              active:scale-95 transition-transform
              disabled:opacity-50 disabled:cursor-not-allowed
              mt-2
            "
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Se connecter
              </>
            )}
          </button>

        </form>
      </main>

      {/* ── Pied de page marque ── */}
      <footer className="py-4 text-center text-xs text-gray-400">
        Accès réservé à l'équipe Les Histoires du Docteur
      </footer>

    </div>
  )
}
