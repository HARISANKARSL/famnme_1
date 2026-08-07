import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, Keyboard } from 'lucide-react'

interface Shortcut {
  keys: string[]  // e.g. ['Ctrl', 'K'] — rendered as individual <kbd>
  description: string
}

interface Group {
  title: string
  items: Shortcut[]
}

const GROUPS: Group[] = [
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open Spotlight Search' },
      { keys: ['Ctrl', ','],  description: 'Open Settings' },
      { keys: ['?'],          description: 'Show this help' },
      { keys: ['Esc'],        description: 'Close any modal / panel' },
      { keys: ['Ctrl', '/'],  description: 'Show this help' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { keys: ['G', 'H'], description: 'Go to Home' },
      { keys: ['G', 'F'], description: 'Go to Family Tree' },
      { keys: ['G', 'M'], description: 'Go to Memories' },
      { keys: ['G', 'N'], description: 'Go to Notifications' },
    ],
  },
  {
    title: 'Tree canvas',
    items: [
      { keys: ['↑', '↓'],     description: 'Move between generations' },
      { keys: ['←', '→'],     description: 'Move between siblings / spouse' },
      { keys: ['Enter'],       description: 'Open person details' },
      { keys: ['+'],           description: 'Add a relative to selected card' },
      { keys: ['Ctrl', '0'],  description: 'Reset zoom & center home person' },
    ],
  },
  {
    title: 'Accessibility',
    items: [
      { keys: ['Ctrl', 'Shift', 'L'], description: 'Toggle dark / light mode' },
      { keys: ['Tab'],                 description: 'Move focus forward' },
      { keys: ['Shift', 'Tab'],        description: 'Move focus backward' },
    ],
  },
]

/**
 * Keyboard shortcuts help overlay (4.2 / 4.7).
 * - `?` opens (unless user is typing in an input/textarea/contenteditable).
 * - `Ctrl+/` also opens.
 * - Esc closes.
 * - Focus traps inside the panel; returns focus on close.
 */
export function KeyboardShortcutsPanel() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Toggle with `?` — but only when not typing
      if (e.key === '?' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      // Also Ctrl+/ (universal help convention)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      // Ctrl+, (or ⌘,) opens Settings — B6
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setOpen(false)
        navigate('/settings')
        return
      }
      // Esc closes when open
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, navigate])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9996] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.40)' }}
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-heading"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl bg-white"
        style={{ boxShadow: 'var(--elevation-modal)' }}
      >
        <div className="sticky top-0 bg-white border-b border-[#EEE8DC] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#2F3E8F14', color: '#2F3E8F' }}
            >
              <Keyboard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 id="shortcuts-heading" className="font-display font-bold text-[18px]" style={{ color: '#1E293B' }}>
                Keyboard shortcuts
              </h2>
              <p className="text-[12px]" style={{ color: '#64748B' }}>
                Get around faster without leaving the keyboard.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F6F2EA] transition-colors"
          >
            <X className="w-4 h-4" style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3
                className="text-[11px] font-bold uppercase tracking-wider mb-2.5"
                style={{ color: '#8B7355', letterSpacing: '0.08em' }}
              >
                {g.title}
              </h3>
              <ul className="divide-y divide-[#F1ECE3]">
                {g.items.map((s, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <span className="text-[13px]" style={{ color: '#3D2E1F' }}>
                      {s.description}
                    </span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border"
                          style={{
                            background: '#F6F2EA',
                            borderColor: '#E2DBCE',
                            color: '#3D2E1F',
                            boxShadow: 'inset 0 -1px 0 #D4CBBE',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="sticky bottom-0 bg-[#F6F2EA] border-t border-[#EEE8DC] px-6 py-3 text-[11px] text-center" style={{ color: '#8B7355' }}>
          Tip: Press <kbd className="px-1 py-0.5 rounded bg-white border border-[#E2DBCE] font-mono font-semibold">?</kbd> any time to reopen this list.
        </div>
      </div>
    </div>,
    document.body
  )
}
