import { useState, useEffect, useMemo } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export type Orientation = 'portrait' | 'landscape'

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  breakpoint: Breakpoint
  isTouchDevice: boolean
  orientation: Orientation
  /** True when mobile device is in landscape orientation */
  isMobileLandscape: boolean
  viewportWidth: number
  viewportHeight: number
}

const MOBILE_MAX = 767
const TABLET_MAX = 1023

function getBreakpointFromWidth(width: number): Breakpoint {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

function getOrientation(): Orientation {
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
}

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
}

function getState(): ResponsiveState {
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint = getBreakpointFromWidth(width)
  const orientation = getOrientation()
  return {
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    breakpoint,
    isTouchDevice: detectTouchDevice(),
    orientation,
    isMobileLandscape: breakpoint === 'mobile' && orientation === 'landscape',
    viewportWidth: width,
    viewportHeight: height,
  }
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(getState)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleChange = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setState(getState())
      }, 150)
    }

    // Use matchMedia listeners for breakpoint boundaries (more efficient than resize)
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const tabletQuery = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`)
    const orientationQuery = window.matchMedia('(orientation: portrait)')
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)')

    mobileQuery.addEventListener('change', handleChange)
    tabletQuery.addEventListener('change', handleChange)
    orientationQuery.addEventListener('change', handleChange)
    touchQuery.addEventListener('change', handleChange)

    // Also listen to resize for viewport dimensions
    window.addEventListener('resize', handleChange)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      mobileQuery.removeEventListener('change', handleChange)
      tabletQuery.removeEventListener('change', handleChange)
      orientationQuery.removeEventListener('change', handleChange)
      touchQuery.removeEventListener('change', handleChange)
      window.removeEventListener('resize', handleChange)
    }
  }, [])

  return useMemo(() => state, [
    state.breakpoint,
    state.orientation,
    state.viewportWidth,
    state.viewportHeight,
    state.isTouchDevice,
  ])
}
