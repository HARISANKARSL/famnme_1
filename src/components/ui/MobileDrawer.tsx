import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const SWIPE_CLOSE_THRESHOLD = 80

export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef<number | null>(null)
  const currentTranslateX = useRef(0)

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartX.current === null) return
    const deltaX = e.touches[0].clientX - dragStartX.current
    // Only allow dragging left (to close)
    if (deltaX > 0) return
    currentTranslateX.current = deltaX
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${deltaX}px)`
      drawerRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    dragStartX.current = null
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 200ms ease-out'
      if (Math.abs(currentTranslateX.current) > SWIPE_CLOSE_THRESHOLD) {
        drawerRef.current.style.transform = 'translateX(-100%)'
        setTimeout(onClose, 200)
      } else {
        drawerRef.current.style.transform = 'translateX(0)'
      }
    }
    currentTranslateX.current = 0
  }, [onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[55] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] bg-white dark:bg-[#292827] shadow-2xl animate-[slide-in-left_200ms_ease-out] overflow-y-auto overscroll-contain"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}
