import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  contentClassName?: string
}

const DISMISS_THRESHOLD = 120

export function BottomSheet({ open, onClose, title, children, contentClassName }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const currentTranslateY = useRef(0)
  const isDragging = useRef(false)

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // Keyboard-aware scrolling: scroll focused input into view when virtual keyboard opens
  useEffect(() => {
    if (!open) return
    const vv = window.visualViewport
    if (!vv) return

    const handleResize = () => {
      const focused = document.activeElement as HTMLElement | null
      if (focused && contentRef.current?.contains(focused)) {
        // Small delay to let the keyboard finish animating
        setTimeout(() => {
          focused.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [open])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    // Only allow drag from the header/drag-handle area, not scrollable content
    if (target.closest('[data-bottom-sheet-handle]') || target.closest('[data-bottom-sheet-header]')) {
      dragStartY.current = e.touches[0].clientY
      isDragging.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null || !isDragging.current) return
    const deltaY = e.touches[0].clientY - dragStartY.current
    // Only allow dragging downward
    if (deltaY < 0) return
    currentTranslateY.current = deltaY
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    dragStartY.current = null

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 200ms ease-out'
      if (currentTranslateY.current > DISMISS_THRESHOLD) {
        sheetRef.current.style.transform = 'translateY(100%)'
        setTimeout(onClose, 200)
      } else {
        sheetRef.current.style.transform = 'translateY(0)'
      }
    }
    currentTranslateY.current = 0
  }, [onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-[fade-in_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#292827] rounded-t-2xl shadow-2xl animate-[slide-up_200ms_ease-out] max-h-[90dvh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab" data-bottom-sheet-handle>
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700" data-bottom-sheet-header>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>
        )}

        {/* Content — min-h-0 is required for flex children to shrink and enable overflow scroll on iOS */}
        <div ref={contentRef} className={`flex-1 min-h-0 overflow-y-auto overscroll-contain touch-scroll ${contentClassName ?? 'px-4 py-3'}`}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}
