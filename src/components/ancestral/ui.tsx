import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SectionProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
}

export function Section({ title, icon, children, defaultOpen = true, collapsible = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const body = (
    <div className="rounded-2xl bg-white/90 dark:bg-[#1F1C18]/80 border border-[#E2DBCE] dark:border-[#3A342C] overflow-hidden">
      <div
        className={`flex items-center gap-2.5 px-4 md:px-5 pt-4 pb-2 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
      >
        {icon && <div className="text-[#8B5E3C]">{icon}</div>}
        <h3 className="flex-1 text-[15px] md:text-[16px] font-semibold text-[#3D2E1F] dark:text-[#F3E9DC]">
          {title}
        </h3>
        {collapsible && (
          open
            ? <ChevronUp className="w-4 h-4 text-[#8B7355]" />
            : <ChevronDown className="w-4 h-4 text-[#8B7355]" />
        )}
      </div>
      {(!collapsible || open) && (
        <div className="px-4 md:px-5 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  )
  return body
}

interface ChipProps {
  children: ReactNode
  variant?: 'default' | 'gold' | 'earth' | 'green'
}

export function Chip({ children, variant = 'default' }: ChipProps) {
  const styles: Record<string, string> = {
    default: 'bg-[#F6F2EA] text-[#3D2E1F] border-[#E2DBCE]',
    gold: 'bg-[#C2A46D]/[0.12] text-[#8B6914] border-[#C2A46D]/40',
    earth: 'bg-[#8B5E3C]/[0.10] text-[#8B5E3C] border-[#8B5E3C]/30',
    green: 'bg-[#2A5F4B]/[0.10] text-[#2A5F4B] border-[#2A5F4B]/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] md:text-[12px] font-medium border ${styles[variant]}`}
    >
      {children}
    </span>
  )
}

interface FactRowProps {
  label: string
  value: ReactNode
}

export function FactRow({ label, value }: FactRowProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#E2DBCE]/50 dark:border-[#3A342C]/50 last:border-0">
      <div className="shrink-0 text-[11px] md:text-[12px] uppercase tracking-wide text-[#8B7355] w-28">
        {label}
      </div>
      <div className="flex-1 text-[13px] md:text-[14px] text-[#3D2E1F] dark:text-[#F3E9DC]">
        {value}
      </div>
    </div>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] text-[#8B7355] dark:text-[#A8A19A] italic">
      {children}
    </p>
  )
}
