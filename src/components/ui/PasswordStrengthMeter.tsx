import { useMemo } from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password: string
  /** Show the per-requirement checklist in addition to the bar. Default true. */
  showRequirements?: boolean
}

type Level = 0 | 1 | 2 | 3 | 4

function scorePassword(pw: string): Level {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  // Normalize to 0..4
  return Math.min(4, score) as Level
}

const LABELS: Record<Level, string> = {
  0: 'Too short',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

const COLORS: Record<Level, string> = {
  0: '#E5E7EB',
  1: '#DC2626',
  2: '#F59E0B',
  3: '#10B981',
  4: '#059669',
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const level = useMemo(() => scorePassword(password), [password])

  const requirements = useMemo(() => ([
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase and lowercase letters', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'A number', met: /\d/.test(password) },
    { label: 'A symbol (e.g. !@#$)', met: /[^A-Za-z0-9]/.test(password) },
  ]), [password])

  if (!password) return null

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {/* Segmented bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: level >= i ? COLORS[level] : '#E5E7EB' }}
            />
          ))}
        </div>
        <span
          className="text-[11px] font-semibold tabular-nums"
          style={{ color: level >= 3 ? '#059669' : level >= 2 ? '#92400E' : level >= 1 ? '#B91C1C' : '#6B7280' }}
        >
          {LABELS[level]}
        </span>
      </div>

      {showRequirements && (
        <ul className="space-y-1">
          {requirements.map(req => (
            <li key={req.label} className="flex items-center gap-1.5 text-[11px]">
              {req.met ? (
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#10B981' }} />
              ) : (
                <X className="w-3 h-3 flex-shrink-0" style={{ color: '#9CA3AF' }} />
              )}
              <span style={{ color: req.met ? '#047857' : '#6B7280' }}>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
