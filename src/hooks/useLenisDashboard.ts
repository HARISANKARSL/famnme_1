/**
 * useLenisDashboard — Scoped smooth scroll for the dashboard feed container.
 * Initializes Lenis on a specific wrapper element (not global <html>).
 * Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

interface UseLenisOptions {
  wrapper: HTMLElement | null
  enabled?: boolean
}

export function useLenisDashboard({ wrapper, enabled = true }: UseLenisOptions) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!wrapper || !enabled) return

    // Respect user preference for reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const lenis = new Lenis({
      wrapper,
      content: (wrapper.querySelector('.lenis-content') as HTMLElement) || (wrapper.firstElementChild as HTMLElement) || wrapper,
      lerp: 0.1,
      smoothWheel: true,
      touchMultiplier: 1.5,
    })
    lenisRef.current = lenis

    let rafId: number

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [wrapper, enabled])

  return lenisRef
}
