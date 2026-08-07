import { useRef, useEffect, useCallback } from 'react'

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  minVelocity?: number
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
}

export function useSwipeGesture<T extends HTMLElement = HTMLElement>(
  options: SwipeGestureOptions
) {
  const ref = useRef<T>(null)
  const touchState = useRef<TouchState | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    }
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchState.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY
    const elapsed = Date.now() - touchState.current.startTime
    const opts = optionsRef.current
    const threshold = opts.threshold ?? 50
    const minVelocity = opts.minVelocity ?? 0.3

    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const velocity = Math.max(absX, absY) / elapsed

    if (velocity < minVelocity) {
      touchState.current = null
      return
    }

    // Determine primary direction
    if (absX > absY && absX > threshold) {
      if (deltaX < 0) opts.onSwipeLeft?.()
      else opts.onSwipeRight?.()
    } else if (absY > absX && absY > threshold) {
      if (deltaY < 0) opts.onSwipeUp?.()
      else opts.onSwipeDown?.()
    }

    touchState.current = null
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])

  return ref
}
