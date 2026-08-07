/**
 * ScrollToTopButton — Floating action button that appears after scrolling 600px.
 * Positioned above mobile bottom nav. Uses Lenis scrollTo if available, else native.
 */

import { useState, useEffect, useCallback } from 'react'
import { ChevronUp } from 'lucide-react'
import { AppTooltip } from '@/components/ui/AppTooltip'
import type Lenis from 'lenis'

interface ScrollToTopButtonProps {
  scrollRef: React.RefObject<HTMLElement | null>
  lenis?: Lenis | null
}

export function ScrollToTopButton({ scrollRef, lenis }: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      setVisible(el.scrollTop > 600)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [scrollRef])

  const scrollToTop = useCallback(() => {
    if (lenis) {
      lenis.scrollTo(0)
    } else {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [lenis, scrollRef])

  return (
    <AppTooltip content="Back to top" side="left">
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`
          fixed bottom-20 right-4 z-30
          w-11 h-11 rounded-full
          bg-[#2F3E8F] text-white
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:bg-[#253175] active:scale-95
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    </AppTooltip>
  )
}
