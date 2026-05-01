// ─── useCallPlayer — machine à états pour la simulation d'appel WhatsApp ────────
//
// Gère le cycle complet : pré-chargement des blobs → sonnerie → lecture
// des vocaux en séquence → fin d'appel.
//
// Phases :
//   idle      — données pas encore chargées
//   loading   — pré-chargement des blob URLs en cours
//   ready     — prêt à simuler
//   incoming  — sonnerie (INCOMING_DURATION_MS ms) avant décroché automatique
//   active    — vocaux en cours de lecture
//   ended     — conversation terminée

import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { getVocalBlobUrl } from '../lib/supabase.js'

const INCOMING_DURATION_MS = 3200   // durée de la sonnerie entrante
const PAUSE_BETWEEN_MS     = 700    // silence entre deux vocaux consécutifs

/**
 * @param {Array} initialSequence — tableau buildSequence() (items sans blobUrl)
 * @returns hook state + actions
 */
export function useCallPlayer(initialSequence) {
  // ── State ──
  const [phase,           setPhase]           = useState('idle')   // idle|loading|ready|incoming|active|ended
  const [activeSide,      setActiveSide]      = useState(null)     // 'incoming'|'outgoing'|null
  const [currentSubtitle, setCurrentSubtitle] = useState('')       // sous-titre du vocal en cours
  const [elapsed,         setElapsed]         = useState(0)        // secondes depuis décroché
  const [sequence,        setSequence]        = useState(initialSequence ?? [])
  const [blobsReady,      setBlobsReady]      = useState(false)
  const [error,           setError]           = useState(null)

  // ── Refs internes ──
  const seqRef     = useRef(initialSequence ?? [])
  const timerRef   = useRef(null)   // setTimeout / setInterval courant
  const howlRef    = useRef(null)   // Howl en cours de lecture
  const elapsedRef = useRef(0)

  // Met à jour seqRef + state quand initialSequence change
  useEffect(() => {
    if (!initialSequence || initialSequence.length === 0) return
    seqRef.current = initialSequence
    setSequence(initialSequence)
    setBlobsReady(false)
    setPhase('idle')
  }, [initialSequence])

  // Cleanup complet au démontage
  useEffect(() => () => { _stopAll(); _stopTimer() }, [])

  // ── Helpers privés ───────────────────────────────────────────────────────────

  function _stopAll() {
    clearTimeout(timerRef.current)
    clearInterval(timerRef.current)
    if (howlRef.current) {
      howlRef.current.stop()
      howlRef.current.unload()
      howlRef.current = null
    }
  }

  function _startTimer() {
    elapsedRef.current = 0
    setElapsed(0)
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
  }

  function _stopTimer() {
    clearInterval(timerRef.current)
  }

  function _playSequence(idx) {
    const seq = seqRef.current
    if (idx >= seq.length) {
      _stopTimer()
      setActiveSide(null)
      setPhase('ended')
      return
    }

    const item = seq[idx]
    setActiveSide(item.side)
    setCurrentSubtitle(item.subtitle ?? '')

    if (item.blobUrl) {
      const howl = new Howl({
        src:    [item.blobUrl],
        format: ['ogg', 'm4a', 'mp3', 'webm'],
        html5:  true,
        onend:  () => {
          setActiveSide(null)
          setCurrentSubtitle('')
          timerRef.current = setTimeout(() => _playSequence(idx + 1), PAUSE_BETWEEN_MS)
        },
        onstop: () => {},
      })
      howlRef.current = howl
      howl.play()
    } else {
      // Vocal manquant : on saute après la durée estimée
      timerRef.current = setTimeout(() => {
        setActiveSide(null)
        setCurrentSubtitle('')
        setTimeout(() => _playSequence(idx + 1), PAUSE_BETWEEN_MS)
      }, Math.round(item.duration * 1000) || 1000)
    }
  }

  // ── Actions publiques ────────────────────────────────────────────────────────

  /**
   * Pré-charge toutes les blob URLs en parallèle.
   * Met à jour seqRef et state, puis passe en phase 'ready'.
   */
  const preloadBlobs = useCallback(async () => {
    if (seqRef.current.length === 0) return
    setPhase('loading')
    setError(null)
    try {
      const loaded = await Promise.all(
        seqRef.current.map(async item => {
          try {
            const blobUrl = await getVocalBlobUrl(item.storagePath)
            return { ...item, blobUrl }
          } catch {
            return { ...item, blobUrl: null }
          }
        })
      )
      seqRef.current = loaded
      setSequence(loaded)
      setBlobsReady(true)
      setPhase('ready')
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }, [])

  /**
   * Démarre la simulation : sonnerie → décroché → lecture des vocaux.
   * Nécessite phase === 'ready'.
   */
  function startCall() {
    if (phase !== 'ready') return
    _stopAll()
    setElapsed(0)
    setActiveSide(null)
    setPhase('incoming')

    timerRef.current = setTimeout(() => {
      setPhase('active')
      _startTimer()
      _playSequence(0)
    }, INCOMING_DURATION_MS)
  }

  /**
   * Stoppe la lecture et repasse en 'ready'.
   */
  function resetCall() {
    _stopAll()
    _stopTimer()
    setPhase('ready')
    setActiveSide(null)
    setCurrentSubtitle('')
    setElapsed(0)
  }

  // ── Dérivés pratiques ────────────────────────────────────────────────────────

  const isLoading = phase === 'loading'
  const isPlaying = phase === 'incoming' || phase === 'active'
  const isDone    = phase === 'ended'
  const canPlay   = phase === 'ready'

  return {
    // état
    phase, activeSide, currentSubtitle, elapsed, sequence, blobsReady, error,
    // dérivés
    isLoading, isPlaying, isDone, canPlay,
    // actions
    preloadBlobs, startCall, resetCall,
  }
}
