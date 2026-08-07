import { AlertTriangle, WifiOff, Search, Lock, ServerCrash, RefreshCcw, Flag } from 'lucide-react'

type ErrorKind = 'network' | 'not-found' | 'permission' | 'server' | 'unknown'

interface ErrorStateProps {
  /** Standard error variants — picks icon + color. */
  icon?: ErrorKind
  /** One-sentence title in plain language (no error codes). */
  title: string
  /** One-sentence explanation. No stack traces. */
  subtitle?: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** For Report this — attach a non-sensitive correlation id. */
  errorId?: string
  className?: string
}

/**
 * Standardized error surface (design-recommendations 4.5).
 * Never shows `error.message` or stack traces — just plain language + next action.
 */
export function ErrorState({
  icon = 'unknown',
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  errorId,
  className = '',
}: ErrorStateProps) {
  const Icon = ICON_MAP[icon]
  const accent = ACCENT_MAP[icon]

  return (
    <div className={`flex flex-col items-center text-center py-10 px-6 ${className}`} role="alert">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ background: `${accent}14` }}
      >
        <Icon className="w-7 h-7" style={{ color: accent }} strokeWidth={2} />
      </div>
      <h3
        className="font-display font-semibold text-[19px]"
        style={{ color: 'var(--color-text-primary, #1E293B)', lineHeight: 1.25 }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          className="mt-1.5 text-[13px] max-w-[360px]"
          style={{ color: 'var(--color-text-secondary, #64748B)', lineHeight: 1.5 }}
        >
          {subtitle}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-5">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-white"
              style={{
                background: `linear-gradient(180deg, ${accent} 0%, ${accent}cc 100%)`,
                boxShadow: `0 4px 14px ${accent}40`,
              }}
            >
              <RefreshCcw className="w-4 h-4" />
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:underline"
              style={{ color: accent }}
            >
              <Flag className="w-3.5 h-3.5" />
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {errorId && (
        <p className="mt-4 text-[10px] font-mono tabular-nums" style={{ color: '#94A3B8' }}>
          Reference: {errorId}
        </p>
      )}
    </div>
  )
}

const ICON_MAP: Record<ErrorKind, typeof AlertTriangle> = {
  network: WifiOff,
  'not-found': Search,
  permission: Lock,
  server: ServerCrash,
  unknown: AlertTriangle,
}

const ACCENT_MAP: Record<ErrorKind, string> = {
  network: '#F59E0B',     // amber — connection wobble
  'not-found': '#8B7355', // muted warm — "we looked, not here"
  permission: '#4B2C5E',  // heritage purple
  server: '#DC2626',      // red — something broke
  unknown: '#64748B',     // slate — generic
}
