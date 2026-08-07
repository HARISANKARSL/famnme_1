import { type ReactNode } from 'react'

interface HeritageCardShellProps {
  children: ReactNode
  className?: string
  tone?: 'default' | 'gold' | 'warm'
}

export function HeritageCardShell({ children, className = '', tone = 'default' }: HeritageCardShellProps) {
  const ring =
    tone === 'gold'
      ? 'ring-1 ring-[#C2A46D]/40 hover:ring-[#C2A46D]/60'
      : tone === 'warm'
      ? 'ring-1 ring-[#E2DBCE] dark:ring-[#3A342C] hover:ring-[#C2A46D]/40'
      : 'ring-1 ring-stone-100 dark:ring-[#2A2A2A] hover:ring-[#C2A46D]/30'

  return (
    <section
      className={`rounded-2xl bg-white dark:bg-[#1E1E1E] ${ring} transition-all p-5 md:p-6 ${className}`}
    >
      {children}
    </section>
  )
}
