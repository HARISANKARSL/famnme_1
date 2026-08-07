/**
 * BadgeShelf — Phase 3 / 6.5
 *
 * Shows all unlocked streak badges plus the next goal. Designed for the
 * settings > account panel or a profile tab. Compact and keyboard-accessible.
 */
import { Lock } from 'lucide-react'
import { STREAK_BADGES, earnedBadges, nextBadge, type StreakBadge } from '@/data/streakBadges'

interface BadgeShelfProps {
  currentStreak: number
  longestStreak: number
  /** Compact layout for inline cards; default=false shows heading + next-goal hint. */
  compact?: boolean
}

export function BadgeShelf({ currentStreak, longestStreak, compact = false }: BadgeShelfProps) {
  const earned = new Set(earnedBadges(currentStreak, longestStreak).map(b => b.day))
  const next = nextBadge(currentStreak)

  return (
    <section aria-label="Streak badges">
      {!compact && (
        <header className="mb-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8B7355] dark:text-[#888]">
            Badges
          </h3>
          {next ? (
            <p className="text-[12px] text-[#5B5449] dark:text-[#B8B8B8] mt-0.5">
              {next.day - currentStreak} more day{next.day - currentStreak === 1 ? '' : 's'} until <span className="font-semibold">{next.title}</span>.
            </p>
          ) : (
            <p className="text-[12px] text-[#5B5449] dark:text-[#B8B8B8] mt-0.5">You have every badge. Legendary.</p>
          )}
        </header>
      )}
      <ul className="flex flex-wrap gap-2" role="list">
        {STREAK_BADGES.map(badge => {
          const unlocked = earned.has(badge.day)
          return <li key={badge.day}>{renderBadge(badge, unlocked)}</li>
        })}
      </ul>
    </section>
  )
}

// Tier-specific emoji animations (6.5 — custom flame per milestone)
function tierAnimationClass(day: number): string {
  if (day >= 365) return 'streak-anim-legend'    // diamond glow
  if (day >= 100) return 'streak-anim-golden'    // golden pulse
  if (day >=  60) return 'streak-anim-burn'      // big flame flicker
  if (day >=  30) return 'streak-anim-glow'      // ambient glow
  if (day >=  14) return 'streak-anim-flicker'   // gentle flicker
  if (day >=   7) return 'streak-anim-spark'     // spark
  return 'streak-anim-sparkle'                    // small sparkle
}

function renderBadge(badge: StreakBadge, unlocked: boolean) {
  const chip = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${
    unlocked
      ? `${badge.chipBg} ${badge.chipText} ${badge.chipBorder}`
      : 'bg-black/[0.04] dark:bg-white/[0.04] text-[#8B7355] dark:text-[#888] border-[#E2DBCE]/60 dark:border-[#2a2a2a]'
  }`
  return (
    <span
      className={chip}
      role="img"
      aria-label={`${badge.fullTitle}${unlocked ? ' — unlocked' : ' — locked'}`}
      title={unlocked ? badge.fullTitle : `Unlock at ${badge.day}-day streak`}
    >
      {unlocked ? (
        <span aria-hidden="true" className={`inline-block ${tierAnimationClass(badge.day)}`}>
          {badge.emoji}
        </span>
      ) : (
        <Lock className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
      )}
      <span>{badge.title}</span>
      {!unlocked && <span className="opacity-70">· {badge.day}d</span>}
    </span>
  )
}
