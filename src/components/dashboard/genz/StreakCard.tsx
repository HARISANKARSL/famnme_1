/**
 * StreakCard — Gamified streak + progress + achievements
 *
 * Compact card showing streak flame, progress ring, current quest,
 * and achievement badges. Replaces ProgressCard + RewardCard + UnlockCard.
 */

import { ArrowRight, Trophy } from 'lucide-react'
import type { Achievement } from '@/hooks/useAchievements'

interface StreakCardProps {
  streakDays: number
  completenessPercent?: number
  topSuggestion?: { personId: string; personName: string; type: string } | null
  recentAchievement?: Achievement | null
  onFixSuggestion?: () => void
}

function getSuggestionLabel(type: string): string {
  switch (type) {
    case 'missing-parents': return 'needs parents added'
    case 'missing-birth-date': return 'needs a birth date'
    case 'missing-birth-place': return 'needs a birth place'
    case 'missing-photo': return 'needs a photo'
    case 'missing-spouse': return 'may need a spouse'
    default: return 'needs more info'
  }
}

export function StreakCard({
  streakDays,
  completenessPercent = 0,
  topSuggestion,
  recentAchievement,
  onFixSuggestion,
}: StreakCardProps) {
  const ringSize = 52
  const strokeWidth = 4
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ringColor = completenessPercent > 70 ? '#6B8E5A' : '#2F3E8F'

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 md:p-5 shadow-sm ring-1 ring-stone-100 dark:ring-[#333] animate-stagger-3">
      <div className="flex items-center gap-4">
        {/* Streak flame */}
        <div className="flex flex-col items-center shrink-0">
          <div className={`text-2xl ${streakDays > 0 ? 'animate-streak-pop' : ''}`}>
            {streakDays > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
          </div>
          <span className="text-lg font-bold text-stone-800 dark:text-[#F5F1E8] leading-none mt-0.5">{streakDays}</span>
          <span className="text-[9px] text-[#8B7355] dark:text-[#999] uppercase tracking-wider font-semibold">day{streakDays !== 1 ? 's' : ''}</span>
        </div>

        <div className="w-px h-12 bg-stone-100 dark:bg-[#333]" />

        {/* Progress ring */}
        <div className="relative shrink-0">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="#F0EBE3" strokeWidth={strokeWidth} className="dark:stroke-[#333]" />
            <circle
              cx={ringSize / 2} cy={ringSize / 2} r={radius}
              fill="none" stroke={ringColor} strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - completenessPercent / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
            style={{ color: ringColor }}
          >
            {completenessPercent}%
          </span>
        </div>

        {/* Quest / Suggestion */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F] dark:text-[#5A6BFF] mb-0.5">
            {topSuggestion ? 'Quick Win' : 'Tree Progress'}
          </p>
          {topSuggestion ? (
            <p className="text-sm text-stone-700 dark:text-[#ccc] leading-snug truncate">
              <span className="font-semibold">{topSuggestion.personName}</span>{' '}
              {getSuggestionLabel(topSuggestion.type)}
            </p>
          ) : (
            <p className="text-sm text-stone-700 dark:text-[#ccc] leading-snug">
              {completenessPercent < 30 ? 'Just getting started' : completenessPercent < 60 ? 'Making progress!' : completenessPercent < 85 ? 'Almost there!' : 'Looking great!'}
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-3">
        {topSuggestion && onFixSuggestion && (
          <button
            onClick={onFixSuggestion}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-white bg-[#2F3E8F] hover:brightness-110 active:scale-[0.97] transition-all"
          >
            Fix it now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {recentAchievement && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200/50 dark:ring-amber-700/30 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{recentAchievement.title}</span>
          </div>
        )}
      </div>
    </div>
  )
}
