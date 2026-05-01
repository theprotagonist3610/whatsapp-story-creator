// ─── useDiscussionPlayer — machine à états pour la lecture de discussion ──────
//
// Phases : idle → loading → ready → active → ended
//
// Options :
//   transitionDuration — durée du fondu au noir entre répliques (ms, 0 = désactivé)
//
// La transition se décompose en :
//   1. Overlay fade-in (TRANS_FADE_MS = 300 ms)
//   2. Noir maintenu (transitionDuration ms)
//   3. Overlay fade-out (TRANS_FADE_MS = 300 ms)

import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { getVocalBlobUrl } from '../lib/supabase.js'

const PAUSE_BETWEEN_MS = 700
const TRANS_FADE_MS    = 300   // durée CSS du fondu de l'overlay

/**
 * @param {Array} initialSequence — tableau buildSequence() enrichi de speakerName
 * @param {{ transitionDuration?: number }} options
 */
export function useDiscussionPlayer(initialSequence, { transitionDuration = 0 } = {}) {
  const [phase,              setPhase]              = useState('idle')
  const [currentSubtitle,    setCurrentSubtitle]    = useState('')
  const [currentSpeakerName, setCurrentSpeakerName] = useState('')
  const [transitioning,      setTransitioning]      = useState(false)
  const [elapsed,            setElapsed]            = useState(0)
  const [sequence,           setSequence]           = useState(initialSequence ?? [])
  const [blobsReady,         setBlobsReady]         = useState(false)
  const [error,              setError]              = useState(null)

  const seqRef      = useRef(initialSequence ?? [])
  const timerRef    = useRef(null)
  const howlRef     = useRef(null)
  const elapsedRef  = useRef(0)
  const transDurRef = useRef(transitionDuration)

  useEffect(() => { transDurRef.current = transitionDuration }, [transitionDuration])

  useEffect(() => {
    if (!initialSequence || initialSequence.length === 0) return
    seqRef.current = initialSequence
    setSequence(initialSequence)
    setBlobsReady(false)
    setPhase('idle')
  }, [initialSequence])

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

  // Lance la transition scénique (fondu au noir) avant le prochain item,
  // puis appelle _playSequence(nextIdx) une fois la transition terminée.
  function _afterItem(nextIdx) {
    const td = transDurRef.current
    if (td > 0 && nextIdx < seqRef.current.length) {
      // 1. Fade-in de l'overlay
      setTransitioning(true)
      timerRef.current = setTimeout(() => {
        // 2. Hold + fade-out
        setTransitioning(false)
        timerRef.current = setTimeout(() => _playSequence(nextIdx), TRANS_FADE_MS)
      }, TRANS_FADE_MS + td)
    } else {
      timerRef.current = setTimeout(() => _playSequence(nextIdx), PAUSE_BETWEEN_MS)
    }
  }

  function _playSequence(idx) {
    const seq = seqRef.current
    if (idx >= seq.length) {
      _stopTimer()
      setCurrentSubtitle('')
      setCurrentSpeakerName('')
      setPhase('ended')
      return
    }

    const item = seq[idx]
    setCurrentSubtitle(item.subtitle ?? '')
    setCurrentSpeakerName(item.speakerName ?? '')

    if (item.blobUrl) {
      const howl = new Howl({
        src:    [item.blobUrl],
        format: ['ogg', 'm4a', 'mp3', 'webm'],
        html5:  true,
        onend: () => {
          setCurrentSubtitle('')
          setCurrentSpeakerName('')
          _afterItem(idx + 1)
        },
        onstop: () => {},
      })
      howlRef.current = howl
      howl.play()
    } else {
      timerRef.current = setTimeout(() => {
        setCurrentSubtitle('')
        setCurrentSpeakerName('')
        _afterItem(idx + 1)
      }, Math.round(item.duration * 1000) || 1000)
    }
  }

  // ── Actions publiques ────────────────────────────────────────────────────────

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

  function startDiscussion() {
    if (phase !== 'ready') return
    _stopAll()
    setElapsed(0)
    setCurrentSubtitle('')
    setCurrentSpeakerName('')
    setTransitioning(false)
    setPhase('active')
    _startTimer()
    _playSequence(0)
  }

  function resetDiscussion() {
    _stopAll()
    _stopTimer()
    setPhase('ready')
    setCurrentSubtitle('')
    setCurrentSpeakerName('')
    setTransitioning(false)
    setElapsed(0)
  }

  // ── Dérivés ──────────────────────────────────────────────────────────────────

  const isLoading = phase === 'loading'
  const isPlaying = phase === 'active'
  const isDone    = phase === 'ended'
  const canPlay   = phase === 'ready'

  return {
    phase, currentSubtitle, currentSpeakerName, transitioning,
    elapsed, sequence, blobsReady, error,
    isLoading, isPlaying, isDone, canPlay,
    preloadBlobs, startDiscussion, resetDiscussion,
  }
}
