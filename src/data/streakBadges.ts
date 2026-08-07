/**
 * Streak badges (Phase 3 / 6.5).
 *
 * Milestone tiers unlocked by consecutive daily activity. Pure data — logic
 * for "which badges has this user earned?" lives in `useStreak`.
 */

export interface StreakBadge {
  /** Number of consecutive days required. */
  day: number
  /** Short title shown on badge chip. */
  title: string
  /** Longer label for tooltip / profile card. */
  fullTitle: string
  /** Emoji rendered on the badge. */
  emoji: string
  /** Tailwind class bundles for chip styling. */
  chipBg: string
  chipText: string
  chipBorder: string
  /** Copy used for unlock toast. */
  unlockCopy: string
}

export const STREAK_BADGES: StreakBadge[] = [
  {
    day: 3,
    title: 'Sprout',
    fullTitle: 'Sprout — 3-day streak',
    emoji: '🌱',
    chipBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    chipText: 'text-emerald-700 dark:text-emerald-300',
    chipBorder: 'border-emerald-200 dark:border-emerald-800',
    unlockCopy: 'Three days in a row — a sprout is born.',
  },
  {
    day: 7,
    title: 'Seedling',
    fullTitle: 'Seedling — 7-day streak',
    emoji: '🌿',
    chipBg: 'bg-lime-50 dark:bg-lime-950/30',
    chipText: 'text-lime-700 dark:text-lime-300',
    chipBorder: 'border-lime-200 dark:border-lime-800',
    unlockCopy: 'A whole week. The flame appears.',
  },
  {
    day: 14,
    title: 'Tree',
    fullTitle: 'Tree — 14-day streak · first streak-freeze earned',
    emoji: '🌳',
    chipBg: 'bg-green-50 dark:bg-green-950/30',
    chipText: 'text-green-700 dark:text-green-300',
    chipBorder: 'border-green-200 dark:border-green-800',
    unlockCopy: 'Two weeks. You\'ve earned your first streak-freeze.',
  },
  {
    day: 30,
    title: 'Elder Tree',
    fullTitle: 'Elder Tree — 30-day streak · Family Ambassador',
    emoji: '🌳🌳',
    chipBg: 'bg-amber-50 dark:bg-amber-950/30',
    chipText: 'text-amber-700 dark:text-amber-300',
    chipBorder: 'border-amber-200 dark:border-amber-800',
    unlockCopy: '30 days. Family Ambassador unlocked.',
  },
  {
    day: 60,
    title: 'Ancient Oak',
    fullTitle: 'Ancient Oak — 60-day streak',
    emoji: '🌳🌳🌳',
    chipBg: 'bg-yellow-50 dark:bg-yellow-950/30',
    chipText: 'text-yellow-700 dark:text-yellow-300',
    chipBorder: 'border-yellow-200 dark:border-yellow-800',
    unlockCopy: '60 days. A golden flame.',
  },
  {
    day: 100,
    title: 'Legendary Banyan',
    fullTitle: 'Legendary Banyan — 100-day streak',
    emoji: '💎',
    chipBg: 'bg-violet-50 dark:bg-violet-950/30',
    chipText: 'text-violet-700 dark:text-violet-300',
    chipBorder: 'border-violet-200 dark:border-violet-800',
    unlockCopy: '100 days. A diamond badge.',
  },
  {
    day: 365,
    title: 'Generations Champion',
    fullTitle: 'Generations Champion — one full year',
    emoji: '🏆',
    chipBg: 'bg-orange-50 dark:bg-orange-950/30',
    chipText: 'text-orange-700 dark:text-orange-300',
    chipBorder: 'border-orange-200 dark:border-orange-800',
    unlockCopy: 'One full year. Generations Champion.',
  },
]

export function earnedBadges(currentStreak: number, longestStreak: number): StreakBadge[] {
  const peak = Math.max(currentStreak, longestStreak)
  return STREAK_BADGES.filter(b => peak >= b.day)
}

export function nextBadge(currentStreak: number): StreakBadge | null {
  return STREAK_BADGES.find(b => b.day > currentStreak) ?? null
}
