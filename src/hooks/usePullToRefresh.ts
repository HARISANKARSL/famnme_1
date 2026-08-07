/**
 * usePullToRefresh — Mobile pull-to-refresh via touch events.
 * Only activates when scrolled to top and on touch devices.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
  containerRef: React.RefObject<HTMLElement | null>
  onRefresh: () => Promise<void>
  enabled?: boolean
  threshold?: number
}

export function usePullToRefresh({
  containerRef,
  onRefresh,
  enabled = true,
  threshold = 80,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current
    if (!el || el.scrollTop > 0 || isRefreshing) return
    startYRef.current = e.touches[0].clientY
    pullingRef.current = true
  }, [containerRef, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pullingRef.current) return
    const el = containerRef.current
    if (!el || el.scrollTop > 0) {
      pullingRef.current = false
      setPullDistance(0)
      return
    }

    const currentY = e.touches[0].clientY
    const diff = currentY - startYRef.current
    if (diff > 0) {
      // Apply resistance: pull distance decays after threshold
      const distance = diff > threshold ? threshold + (diff - threshold) * 0.3 : diff
      setPullDistance(distance)
      if (diff > 10) e.preventDefault()
    }
  }, [containerRef, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return
    pullingRef.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Hold at threshold during refresh
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { pullDistance, isRefreshing }
}
