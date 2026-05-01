// ─── useTrueStoryPlayer — lecteur de paires True Story ───────────────────────
//
// Gère la lecture alternée : image Historien → sous-titre Dr KA → image suivante…
// Chaque paire dure autant que le vocal de l'Historien.
//
// Phase par paire :
//   1. L'image de la paire courante apparaît
//   2. Le vocal Historien est joué
//   3. Le sous-titre Dr KA est affiché
//   4. Transition optionnelle (fondu au noir)
//   5. Paire suivante

import { useState, useEffect, useRef, useCallback } from 'react'
import { getPhotoBlobUrl, getVocalBlobUrl } from '../lib/supabase.js'

const PAUSE_BETWEEN_MS = 700
const TRANS_FADE_MS    = 300
const SUBTITLE_DELAY_MS = 300  // délai avant affichage sous-titre après début vocal

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrueStoryPlayer(pairs, imageConfigs, { transitionDuration = 0 } = {}) {
  const [status,           setStatus]           = useState('idle')   // idle | loading | playing | done
  const [currentPairIdx,   setCurrentPairIdx]   = useState(-1)
  const [currentSubtitle,  setCurrentSubtitle]  = useState('')
  const [currentImageSrc,  setCurrentImageSrc]  = useState(null)
  const [transitioning,    setTransitioning]     = useState(false)
  const [elapsed,          setElapsed]          = useState(0)
  const [error,            setError]            = useState(null)
  const [blobsReady,       setBlobsReady]       = useState(false)

  // Refs pour éviter les stale closures dans les timers
  const pairsRef      = useRef(pairs)
  const imgConfsRef   = useRef(imageConfigs)
  const transDurRef   = useRef(transitionDuration)
  const timerRef      = useRef(null)
  const audioRef      = useRef(null)
  const elapsedRef    = useRef(0)
  const elapsedTimer  = useRef(null)
  const isRunning     = useRef(false)

  useEffect(() => { pairsRef.current    = pairs        }, [pairs])
  useEffect(() => { imgConfsRef.current = imageConfigs }, [imageConfigs])
  useEffect(() => { transDurRef.current = transitionDuration }, [transitionDuration])

  // ── Chargement des blobs ────────────────────────────────────────────────────

  const preloadBlobs = useCallback(async () => {
    if (blobsReady) return
    setStatus('loading')
    setError(null)
    try {
      const enriched = await Promise.all(
        pairsRef.current.map(async pair => {
          const hist = pair.historien
          const vocal = hist.storagePath ? await getVocalBlobUrl(hist.storagePath) : null
          return { ...pair, historien: { ...hist, blobUrl: vocal } }
        })
      )
      pairsRef.current = enriched
      setBlobsReady(true)
      setStatus('idle')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }, [blobsReady])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function _clearTimers() {
    clearTimeout(timerRef.current)
    clearInterval(elapsedTimer.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }

  function _startElapsedTimer() {
    clearInterval(elapsedTimer.current)
    elapsedTimer.current = setInterval(() => {
      elapsedRef.current += 0.1
      setElapsed(Math.round(elapsedRef.current * 10) / 10)
    }, 100)
  }

  // ── Lecture d'une paire ───────────────────────────────────────────────────

  function _playPair(idx) {
    if (!isRunning.current) return

    const allPairs = pairsRef.current
    if (idx >= allPairs.length) {
      // Terminé
      setCurrentSubtitle('')
      setCurrentImageSrc(null)
      setCurrentPairIdx(-1)
      clearInterval(elapsedTimer.current)
      setStatus('done')
      isRunning.current = false
      return
    }

    const pair    = allPairs[idx]
    const imgConf = imgConfsRef.current?.[idx]
    const imgPath = imgConf?.imageStoragePath ?? null

    // Afficher l'image de cette paire
    setCurrentPairIdx(idx)
    setCurrentSubtitle('')

    // Résoudre l'image (blob déjà chargé ou public URL injecté depuis player)
    const imgSrc = imgConf?._blobUrl ?? null
    setCurrentImageSrc(imgSrc)

    // Durée du vocal
    const duration = Math.max(500, Math.round((pair.historien.duration ?? 1) * 1000))

    // Jouer le vocal
    if (pair.historien.blobUrl) {
      const audio = new Audio(pair.historien.blobUrl)
      audioRef.current = audio
      audio.play().catch(() => {})
    }

    // Afficher le sous-titre après un court délai
    timerRef.current = setTimeout(() => {
      if (!isRunning.current) return
      setCurrentSubtitle(pair.drka?.subtitle ?? '')
    }, SUBTITLE_DELAY_MS)

    // Fin de la paire
    timerRef.current = setTimeout(() => {
      if (!isRunning.current) return
      setCurrentSubtitle('')
      setCurrentImageSrc(null)
      _afterPair(idx + 1)
    }, duration)
  }

  function _afterPair(nextIdx) {
    if (!isRunning.current) return
    const td = transDurRef.current
    if (td > 0 && nextIdx < pairsRef.current.length) {
      setTransitioning(true)
      timerRef.current = setTimeout(() => {
        if (!isRunning.current) return
        setTransitioning(false)
        timerRef.current = setTimeout(() => _playPair(nextIdx), TRANS_FADE_MS)
      }, TRANS_FADE_MS + td)
    } else {
      timerRef.current = setTimeout(() => _playPair(nextIdx), PAUSE_BETWEEN_MS)
    }
  }

  // ── API publique ─────────────────────────────────────────────────────────────

  const startPlaying = useCallback(() => {
    if (!blobsReady) return
    _clearTimers()
    elapsedRef.current = 0
    setElapsed(0)
    setStatus('playing')
    isRunning.current = true
    setCurrentPairIdx(-1)
    setCurrentSubtitle('')
    setCurrentImageSrc(null)
    setTransitioning(false)
    _startElapsedTimer()
    _playPair(0)
  }, [blobsReady])

  const reset = useCallback(() => {
    isRunning.current = false
    _clearTimers()
    elapsedRef.current = 0
    setElapsed(0)
    setStatus('idle')
    setCurrentPairIdx(-1)
    setCurrentSubtitle('')
    setCurrentImageSrc(null)
    setTransitioning(false)
  }, [])

  // Nettoyage au démontage
  useEffect(() => () => {
    isRunning.current = false
    _clearTimers()
  }, [])

  return {
    status,
    currentPairIdx,
    currentSubtitle,
    currentImageSrc,
    transitioning,
    elapsed,
    error,
    blobsReady,
    isLoading:  status === 'loading',
    isPlaying:  status === 'playing',
    isDone:     status === 'done',
    canPlay:    blobsReady && status === 'idle',
    pairs:      pairsRef.current,
    preloadBlobs,
    startPlaying,
    reset,
  }
}
