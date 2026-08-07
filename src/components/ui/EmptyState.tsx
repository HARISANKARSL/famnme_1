import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  /** Optional Lucide icon or custom SVG element. */
  icon?: LucideIcon | React.ReactNode
  /** One-sentence heading, e.g. "Your first memory starts here" */
  heading: string
  /** One-sentence subtext explaining what this area is for. */
  subtext?: string
  /** Primary CTA config. Omit for pure "happy state" empties (e.g. "All caught up"). */
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  /** Optional secondary link ("Learn more →") */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Optional sample content node — e.g. preview tiles with "sample" watermark. */
  sampleContent?: React.ReactNode
  /** Accent color for icon + primary CTA. Default brand primary. */
  accent?: string
  /** Visual density — tight (inline) · regular (card) · large (hero). Default 'regular'. */
  size?: 'tight' | 'regular' | 'large'
  className?: string
}

/**
 * Design-recommendations 4.3 — Empty states as activation opportunities.
 * Always has: illustration · one-sentence heading · subtext · primary CTA.
 * Per Intercom research, sample content + clear CTA = 4.5× engagement.
 */
export function EmptyState({
  icon,
  heading,
  subtext,
  primaryAction,
  secondaryAction,
  sampleContent,
  accent = '#2F3E8F',
  size = 'regular',
  className = '',
}: EmptyStateProps) {
  const isTight = size === 'tight'
  const isLarge = size === 'large'

  const IconEl = icon as any
  const iconNode = icon ? (
    typeof icon === 'string' ? (
      <span className={isLarge ? 'text-4xl' : 'text-2xl'}>{icon}</span>
    ) : (
      <IconEl
        className={isLarge ? 'w-10 h-10' : isTight ? 'w-5 h-5' : 'w-7 h-7'}
        style={{ color: accent }}
      />
    )
  ) : null

  return (
    <div
      className={`flex flex-col items-center text-center ${isTight ? 'py-6 px-4' : isLarge ? 'py-16 px-6' : 'py-10 px-6'} ${className}`}
    >
      {iconNode && (
        <div
          className={`rounded-full flex items-center justify-center ${isLarge ? 'w-20 h-20 mb-5' : isTight ? 'w-10 h-10 mb-3' : 'w-14 h-14 mb-4'}`}
          style={{ background: `${accent}14` }}
        >
          {iconNode}
        </div>
      )}

      <h3
        className={`font-display font-semibold ${isLarge ? 'text-[26px]' : isTight ? 'text-[15px]' : 'text-[19px]'}`}
        style={{ color: 'var(--color-text-primary, #1E293B)', lineHeight: 1.25 }}
      >
        {heading}
      </h3>

      {subtext && (
        <p
          className={`mt-1.5 ${isLarge ? 'text-[15px] max-w-[480px]' : isTight ? 'text-[12px]' : 'text-[13px] max-w-[360px]'}`}
          style={{ color: 'var(--color-text-secondary, #64748B)', lineHeight: 1.5 }}
        >
          {subtext}
        </p>
      )}

      {sampleContent && (
        <div className="mt-5 w-full opacity-60" aria-hidden="true">
          {sampleContent}
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className={`flex flex-col sm:flex-row items-center gap-2 ${isLarge ? 'mt-7' : 'mt-5'}`}>
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`inline-flex items-center gap-2 px-5 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isLarge ? 'py-3 text-[15px]' : 'py-2.5 text-[13px]'}`}
              style={{
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`,
                color: 'white',
                boxShadow: `0 4px 14px ${accent}40`,
              }}
            >
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="text-[13px] font-medium transition-colors hover:underline"
              style={{ color: accent }}
            >
              {secondaryAction.label} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
