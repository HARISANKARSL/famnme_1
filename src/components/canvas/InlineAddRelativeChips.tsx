/**
 * InlineAddRelativeChips — C3 / Phase 2 weeks 8-9
 *
 * Compact chip picker that appears next to the + button on a PersonCard.
 * Shows the four common relationships as one-tap targets, shortening the
 * path from "right-click or open full modal" to a single chip click.
 *
 * Dismisses on outside click or Escape.
 */
import { useEffect, useRef } from 'react'
import { UserPlus, Heart, Baby, UsersRound } from 'lucide-react'

interface InlineAddRelativeChipsProps {
  onAddParent?: () => void
  onAddSpouse?: () => void
  onAddChild?: () => void
  onAddSibling?: () => void
  onClose: () => void
}

interface Chip {
  id: string
  label: string
  icon: typeof UserPlus
  action?: () => void
}

export function InlineAddRelativeChips({
  onAddParent, onAddSpouse, onAddChild, onAddSibling, onClose,
}: InlineAddRelativeChipsProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const chips: Chip[] = [
    { id: 'parent',  label: 'Parent',  icon: UserPlus,    action: onAddParent },
    { id: 'spouse',  label: 'Spouse',  icon: Heart,       action: onAddSpouse },
    { id: 'child',   label: 'Child',   icon: Baby,        action: onAddChild },
    { id: 'sibling', label: 'Sibling', icon: UsersRound,  action: onAddSibling },
  ].filter(c => !!c.action)

  if (chips.length === 0) return null

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label="Add a relative"
      className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-[#E2DBCE]/70 dark:border-[#2a2a2a]"
    >
      {chips.map(chip => {
        const Icon = chip.icon
        return (
          <button
            key={chip.id}
            type="button"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); chip.action?.(); onClose() }}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-[#3D2E1F] dark:text-[#F3F2F1] bg-[#F4F6F9] dark:bg-[#2a2a2a] hover:bg-[#2F3E8F] hover:text-white dark:hover:bg-[#2F3E8F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]/40 min-h-[32px]"
            title={`Add ${chip.label.toLowerCase()}`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
