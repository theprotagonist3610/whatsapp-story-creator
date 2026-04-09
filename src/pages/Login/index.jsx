import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signIn } from '../../lib/supabase.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import ResponsiveLayout from '../../components/ResponsiveLayout.jsx'
import MobileLogin from './MobileLogin.jsx'
import DesktopLogin from './DesktopLogin.jsx'

/**
 * Login — page point d'entrée.
 *
 * Toute la logique métier (signIn, redirect, état du formulaire) vit ici.
 * MobileLogin et DesktopLogin sont de pures vues qui reçoivent des props.
 */
export default function Login() {
  const { isAuthenticated } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname ?? '/stories'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  // Redirect immédiate si déjà connecté
  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getReadableError(err))
    } finally {
      setLoading(false)
    }
  }

  const viewProps = {
    email, setEmail,
    password, setPassword,
    error,
    loading,
    onSubmit: handleSubmit,
  }

  return <ResponsiveLayout mobile={MobileLogin} desktop={DesktopLogin} {...viewProps} />
}

// ─── Messages d'erreur lisibles ───────────────────────────────────────────────

function getReadableError(err) {
  const msg = err?.message ?? ''
  if (msg.includes('Invalid login credentials'))
    return 'Email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed'))
    return 'Adresse email non confirmée. Vérifie ta boîte mail.'
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Erreur réseau. Vérifie ta connexion internet.'
  return 'Une erreur est survenue. Réessaie.'
}
