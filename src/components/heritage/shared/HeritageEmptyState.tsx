import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface HeritageEmptyStateProps {
  icon: LucideIcon
  title: string
  message: string
  action?: ReactNode
  tone?: 'default' | 'gold'
}

export function HeritageEmptyState({
  icon: Icon,
  title,
  message,
  action,
  tone = 'default',
}: HeritageEmptyStateProps) {
  const iconBg = tone === 'gold' ? 'bg-[#C2A46D]/15 text-[#8B6F3A]' : 'bg-[#2F3E8F]/10 text-[#2F3E8F]'
  return (
    <div className="rounded-2xl bg-gradient-to-br from-white to-[#F6F2EA] dark:from-[#1E1E1E] dark:to-[#241E18] ring-1 ring-[#E2DBCE] dark:ring-[#3A342C] p-6 md:p-8 text-center">
      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-7 h-7" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] md:text-[17px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
