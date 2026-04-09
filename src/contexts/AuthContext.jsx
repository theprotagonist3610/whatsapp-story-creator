import { createContext, useContext, useEffect, useState } from 'react'
import { getSession, onAuthStateChange, getProfile } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = chargement initial
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  // Charge le profil Supabase enrichi dès que la session est disponible
  async function loadProfile(userId) {
    try {
      const data = await getProfile(userId)
      setProfile(data)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    // Lecture de la session existante au montage
    getSession()
      .then((s) => {
        setSession(s)
        if (s?.user) loadProfile(s.user.id)
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false))

    // Abonnement aux changements d'état auth (login / logout / refresh token)
    const unsubscribe = onAuthStateChange((s) => {
      setSession(s)
      if (s?.user) {
        loadProfile(s.user.id)
      } else {
        setProfile(null)
      }
    })

    return unsubscribe
  }, [])

  const value = {
    session,          // null | Session
    user: session?.user ?? null,
    profile,          // null | { id, display_name, avatar_url, role }
    loading,          // true pendant le chargement initial
    isAuthenticated: !!session,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
