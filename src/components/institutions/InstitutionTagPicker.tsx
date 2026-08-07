/**
 * InstitutionTagPicker — chip-based multi-select tag picker.
 *
 * Renders inline as chips. Clicking a chip toggles it. Replaces the old
 * SetMyTempleModal which forced the user to pick exactly one "connection type"
 * up front. Here, nothing is required — the user can tag later.
 */

import { useCallback } from 'react'
import { Check } from 'lucide-react'
import type { TempleTag } from '@/types'
import { TAG_CONFIG } from './tagConfig'

interface InstitutionTagPickerProps {
  value: TempleTag[]
  onChange: (next: TempleTag[]) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function InstitutionTagPicker({ value, onChange, disabled, size = 'md' }: InstitutionTagPickerProps) {
  const toggle = useCallback((tag: TempleTag) => {
    if (disabled) return
    onChange(value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag])
  }, [value, onChange, disabled])

  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[12px]'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Institution tags">
      {TAG_CONFIG.map(({ value: tag, label, Icon }) => {
        const selected = value.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            disabled={disabled}
            aria-pressed={selected}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all min-h-[32px]',
              pad,
              selected
                ? 'bg-[#2F3E8F] text-white border-[#2F3E8F] shadow-sm'
                : 'bg-white dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#E5E5E5] border-[#E2DBCE] dark:border-[#333] hover:border-[#2F3E8F]/50 hover:bg-[#F2F4FB] dark:hover:bg-[#252525]',
              disabled && 'opacity-50 cursor-not-allowed',
              tag === 'family_main' && selected && 'bg-gradient-to-r from-[#C2A46D] to-[#A0814B] border-[#A0814B]',
            ].filter(Boolean).join(' ')}
          >
            {selected ? <Check className={iconSize} strokeWidth={2.4} /> : <Icon className={iconSize} strokeWidth={1.8} />}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
