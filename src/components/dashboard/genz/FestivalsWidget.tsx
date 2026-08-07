/**
 * FestivalsWidget — Upcoming festivals based on user's faith
 *
 * Shows festivals relevant to the family's religion.
 * Cultural differentiation driver.
 */

import { Star, CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import type { Person } from '@/types'

interface FestivalsWidgetProps {
  persons: Person[]
  onOpenTemples?: () => void
}

// Common Indian festival dates (approximated for 2026)
const HINDU_FESTIVALS: Array<{ name: string; month: number; day: number; description: string }> = [
  { name: 'Makar Sankranti', month: 1, day: 14, description: 'Harvest festival' },
  { name: 'Vasant Panchami', month: 2, day: 2, description: 'Spring celebration' },
  { name: 'Maha Shivaratri', month: 2, day: 26, description: 'Night of Lord Shiva' },
  { name: 'Holi', month: 3, day: 17, description: 'Festival of colors' },
  { name: 'Ugadi / Gudi Padwa', month: 3, day: 29, description: 'New year' },
  { name: 'Ram Navami', month: 4, day: 6, description: 'Birth of Lord Rama' },
  { name: 'Vishu', month: 4, day: 14, description: 'Kerala New Year' },
  { name: 'Akshaya Tritiya', month: 4, day: 26, description: 'Auspicious beginning' },
  { name: 'Rath Yatra', month: 6, day: 28, description: 'Chariot festival' },
  { name: 'Guru Purnima', month: 7, day: 21, description: 'Teacher appreciation' },
  { name: 'Raksha Bandhan', month: 8, day: 20, description: 'Bond of protection' },
  { name: 'Krishna Janmashtami', month: 8, day: 25, description: 'Birth of Lord Krishna' },
  { name: 'Ganesh Chaturthi', month: 9, day: 7, description: 'Lord Ganesha festival' },
  { name: 'Onam', month: 9, day: 12, description: 'Kerala harvest festival' },
  { name: 'Navratri', month: 10, day: 2, description: 'Nine nights of devotion' },
  { name: 'Dussehra', month: 10, day: 11, description: 'Victory of good over evil' },
  { name: 'Diwali', month: 10, day: 30, description: 'Festival of lights' },
  { name: 'Chhath Puja', month: 11, day: 1, description: 'Sun worship' },
  { name: 'Dev Deepavali', month: 11, day: 15, description: 'Festival of the gods' },
]

function detectReligion(persons: Person[]): string | null {
  const counts = new Map<string, number>()
  for (const p of persons) {
    if (p.religion) {
      const r = p.religion.trim().toLowerCase()
      counts.set(r, (counts.get(r) || 0) + 1)
    }
  }
  if (counts.size === 0) return null
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0][1] >= 2 ? sorted[0][0] : null
}

export function FestivalsWidget({
  persons,
  onOpenTemples,
}: FestivalsWidgetProps) {
  const religion = useMemo(() => detectReligion(persons), [persons])

  const upcomingFestivals = useMemo(() => {
    if (!religion || !religion.includes('hindu')) return []
    const today = new Date()
    const todayNum = today.getMonth() * 100 + today.getDate()

    return HINDU_FESTIVALS
      .map(f => {
        const fNum = (f.month - 1) * 100 + f.day
        const diff = fNum - todayNum
        const daysAway = diff >= 0 ? diff : diff + 1200 // wrap to next year
        const festDate = new Date(today.getFullYear(), f.month - 1, f.day)
        if (festDate < today) festDate.setFullYear(festDate.getFullYear() + 1)
        return { ...f, daysAway, date: festDate }
      })
      .filter(f => f.daysAway >= 0 && f.daysAway <= 30) // next 30 days
      .sort((a, b) => a.daysAway - b.daysAway)
      .slice(0, 3)
  }, [religion])

  if (upcomingFestivals.length === 0) return null

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] p-4 shadow-sm ring-1 ring-stone-100 dark:ring-[#333]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Upcoming Festivals</p>
        </div>
        {onOpenTemples && (
          <button onClick={onOpenTemples} className="text-[11px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] hover:underline">
            See all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {upcomingFestivals.map(f => (
          <div key={f.name} className="flex items-center gap-3 py-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/15 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800 dark:text-[#F5F1E8]">{f.name}</p>
              <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{f.description}</p>
            </div>
            <span className={`text-[11px] font-bold shrink-0 ${f.daysAway === 0 ? 'text-amber-600' : 'text-[#8B7355] dark:text-[#999]'}`}>
              {f.daysAway === 0 ? 'Today!' : f.daysAway === 1 ? 'Tomorrow' : `In ${f.daysAway} days`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
