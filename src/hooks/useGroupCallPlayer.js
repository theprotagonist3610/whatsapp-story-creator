// ─── useGroupCallPlayer — machine à états pour la simulation d'appel de groupe ──
//
// Identique à useCallPlayer mais expose activeCharacterId au lieu de activeSide,
// ce qui permet à WhatsAppGroupCallScreen de savoir quel tile mettre en avant.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { getVocalBlobUrl } from '../lib/supabase.js'

const INCOMING_DURATION_MS = 3200
const PAUSE_BETWEEN_MS     = 700

export function useGroupCallPlayer(initialSequence) {
  const [phase,              setPhase]              = useState('idle')
  const [activeCharacterId,  setActiveCharacterId]  = useState(null)
  const [currentSubtitle,    setCurrentSubtitle]    = useState('')
  const [elapsed,            setElapsed]            = useState(0)
  const [sequence,           setSequence]           = useState(initialSequence ?? [])
  const [blobsReady,         setBlobsReady]         = useState(false)
  const [error,              setError]              = useState(null)

  const seqRef     = useRef(initialSequence ?? [])
  const timerRef   = useRef(null)
  const howlRef    = useRef(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (!initialSequence || initialSequence.length === 0) return
    seqRef.current = initialSequence
    setSequence(initialSequence)
    setBlobsReady(false)
    setPhase('idle')
  }, [initialSequence])

  useEffect(() => () => { _stopAll(); _stopTimer() }, [])

  // ── Privés ──────────────────────────────────────────────────────────────────

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
      setActiveCharacterId(null)
      setPhase('ended')
      return
    }

    const item = seq[idx]
    setActiveCharacterId(item.characterId)
    setCurrentSubtitle(item.subtitle ?? '')

    const next = () => {
      setActiveCharacterId(null)
      setCurrentSubtitle('')
      timerRef.current = setTimeout(() => _playSequence(idx + 1), PAUSE_BETWEEN_MS)
    }

    if (item.blobUrl) {
      const howl = new Howl({
        src:    [item.blobUrl],
        format: ['ogg', 'm4a', 'mp3', 'webm'],
        html5:  true,
        onend:  next,
        onstop: () => {},
      })
      howlRef.current = howl
      howl.play()
    } else {
      timerRef.current = setTimeout(next, Math.round(item.duration * 1000) || 1000)
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

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

  function startCall() {
    if (phase !== 'ready') return
    _stopAll()
    setElapsed(0)
    setActiveCharacterId(null)
    setPhase('incoming')

    timerRef.current = setTimeout(() => {
      setPhase('active')
      _startTimer()
      _playSequence(0)
    }, INCOMING_DURATION_MS)
  }

  function resetCall() {
    _stopAll()
    _stopTimer()
    setPhase('ready')
    setActiveCharacterId(null)
    setCurrentSubtitle('')
    setElapsed(0)
  }

  const isLoading = phase === 'loading'
  const isPlaying = phase === 'incoming' || phase === 'active'
  const isDone    = phase === 'ended'
  const canPlay   = phase === 'ready'

  return {
    phase, activeCharacterId, currentSubtitle, elapsed, sequence, blobsReady, error,
    isLoading, isPlaying, isDone, canPlay,
    preloadBlobs, startCall, resetCall,
  }
}
