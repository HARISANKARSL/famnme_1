/**
 * LayoutModeSwitcher — Tree layout control.
 *
 * Rendered in two variants:
 *  - "floating" — HUD overlay on the tree canvas (legacy placement).
 *  - "inline"   — embedded in the top bar center slot.
 */
import { useTreeStore } from '@/store/treeStore'
import type { LayoutMode } from '@/store/treeStore'
import { Network, GitBranch, PieChart, ScrollText } from 'lucide-react'

interface Option {
  value: LayoutMode
  label: string
  short: string
  icon: typeof Network
}

const OPTIONS: Option[] = [
  { value: 'tree',               label: 'Vertical Tree',   short: 'Vertical',   icon: Network },
  { value: 'ancestry-pedigree',  label: 'Horizontal Tree', short: 'Horizontal', icon: GitBranch },
  { value: 'fan',                label: 'Fan Chart',       short: 'Fan',        icon: PieChart },
];



interface LayoutModeSwitcherProps {
  variant?: 'floating' | 'inline'
}

const CONTAINER_CLASSES: Record<NonNullable<LayoutModeSwitcherProps['variant']>, string> = {
  floating:
    'absolute top-3 right-4 z-10 hidden md:flex items-center gap-0.5 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md rounded-xl p-0.5 border border-[#E2E8F0]/70 dark:border-[#2a2a2a] shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
  inline:
    'hidden md:flex items-center gap-0.5 bg-[#F4F6F9] dark:bg-[#2a2a2a] rounded-xl p-0.5 border border-[#E2E8F0]/70 dark:border-[#333]',
}

export function LayoutModeSwitcher({ variant = 'floating' }: LayoutModeSwitcherProps = {}) {
  const layoutMode = useTreeStore((s) => s.layoutMode)
  const setLayoutMode = useTreeStore((s) => s.setLayoutMode)

  return (
    <div role="group" aria-label="Tree layout" className={CONTAINER_CLASSES[variant]}>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = layoutMode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLayoutMode(opt.value)}
            title={opt.label}
            aria-pressed={active}
            aria-label={opt.label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all duration-150 ${
              active
                ? 'bg-[#2F3E8F] text-white shadow-sm'
                : 'text-[#5B5449] dark:text-[#A8A8A8] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-[#2F3E8F] dark:hover:text-[#e6e6e6]'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{opt.short}</span>
          </button>
        )
      })}
    </div>
  )
}
