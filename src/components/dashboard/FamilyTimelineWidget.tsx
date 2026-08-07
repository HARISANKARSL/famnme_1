/**
 * FamilyTimelineWidget — Interactive year scrubber timeline
 *
 * Horizontal rail with year nodes. Clicking a year shows events for that year.
 * Falls back to vertical list on very small widths.
 */

import { useMemo, useState } from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import type { Person } from '@/types'
import { buildFamilyTimeline, getTimelineStats } from '@/services/familyTimelineService'
import type { TimelineEvent } from '@/services/familyTimelineService'

interface Props {
  persons: Person[]
  onOpenProfile: (personId: string) => void
}

export function FamilyTimelineWidget({ persons, onOpenProfile }: Props) {
  const events = useMemo(() => buildFamilyTimeline(persons, 40), [persons])
  const stats = useMemo(() => getTimelineStats(persons), [persons])

  // Group by year (only non-historical events for scrubber; include historical for detail)
  const yearMap = useMemo(() => {
    const map = new Map<number, TimelineEvent[]>()
    for (const ev of events) {
      if (!map.has(ev.year)) map.set(ev.year, [])
      map.get(ev.year)!.push(ev)
    }
    return map
  }, [events])

  // Only family events (not historical) for year nodes
  const familyYears = useMemo(() =>
    [...yearMap.keys()]
      .filter(y => yearMap.get(y)!.some(e => e.type !== 'historical'))
      .sort((a, b) => a - b),
    [yearMap]
  )

  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    familyYears.length > 0 ? familyYears[familyYears.length - 1] : null
  )

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Calendar className="w-8 h-8 text-[#E2DBCE] mb-2" strokeWidth={1} />
        <p className="text-sm text-[#8B7355]">No dated events yet</p>
        <p className="text-xs text-[#B8A090] mt-0.5">Add birth dates to see your family timeline</p>
      </div>
    )
  }

  const selectedEvents = selectedYear ? (yearMap.get(selectedYear) || []) : []
  const familySelectedEvents = selectedEvents.filter(e => e.type !== 'historical')

  return (
    <div className="flex flex-col gap-3">
      {/* Span summary */}
      {stats.earliestYear && stats.latestYear && (
        <div className="flex items-center gap-2 text-xs text-[#8B7355]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {stats.spanYears > 0
              ? `${stats.earliestYear} – ${stats.latestYear} · ${stats.spanYears} years of family history`
              : `Since ${stats.earliestYear}`}
          </span>
        </div>
      )}

      {/* Horizontal scrubber rail */}
      {familyYears.length > 1 && (
        <div className="relative">
          {/* Rail line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-[#E2E8F0] dark:bg-[#2a2a2a]" />
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide py-1 relative">
            {familyYears.map(year => {
              const isSelected = year === selectedYear
              const evCount = yearMap.get(year)?.filter(e => e.type !== 'historical').length || 0
              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year === selectedYear ? null : year)}
                  className="relative flex flex-col items-center shrink-0 gap-1 focus:outline-none group"
                >
                  <div
                    className={`rounded-full border-2 border-white dark:border-[#1a1a1a] transition-all duration-150 ${
                      isSelected
                        ? 'w-4 h-4 ring-2 ring-[#2F3E8F]/40'
                        : 'w-2.5 h-2.5 group-hover:w-3.5 group-hover:h-3.5'
                    }`}
                    style={{ background: isSelected ? '#2F3E8F' : evCount > 1 ? '#E8A07A' : '#E2DBCE' }}
                  />
                  {isSelected && (
                    <span className="text-[9px] font-semibold text-[#2F3E8F] tabular-nums">{year}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected year events */}
      {selectedYear && familySelectedEvents.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-[#2F3E8F] uppercase tracking-wider">{selectedYear}</p>
          {familySelectedEvents.map((event, i) => (
            <button
              key={`${event.year}-${event.type}-${i}`}
              onClick={() => event.personId && onOpenProfile(event.personId)}
              disabled={!event.personId}
              className="w-full flex items-start gap-2.5 text-left hover:bg-[#F4F6FA] dark:hover:bg-[#222] rounded-md px-1.5 py-1 -mx-1.5 transition-colors disabled:cursor-default"
            >
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: event.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#3D2E1F] dark:text-[#f5f5f5]">{event.label}</p>
                {event.detail && <p className="text-[11px] text-[#9A8D82]">{event.detail}</p>}
              </div>
              {/* Place chip if available */}
              {(event as TimelineEvent & { place?: string }).place && (
                <span className="flex items-center gap-0.5 text-[10px] text-[#8B7355] shrink-0">
                  <MapPin className="w-2.5 h-2.5" />
                  {(event as TimelineEvent & { place?: string }).place}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Fallback: show latest 6 events as vertical list */
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-[#E2E8F0]" />
          <div className="space-y-3">
            {events.slice(0, 6).map((event, i) => (
              <div key={`${event.year}-${event.type}-${i}`} className="relative flex items-start gap-3">
                <div
                  className="absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#1a1a1a] shrink-0"
                  style={{ background: event.color }}
                />
                {event.type === 'historical' ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#2F3E8F] bg-[#2F3E8F]/10 px-1.5 py-0.5 rounded">{event.year}</span>
                      <span className="text-xs font-medium text-[#2F3E8F]">{event.label}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => event.personId && onOpenProfile(event.personId)}
                    className="flex-1 min-w-0 text-left hover:bg-[#F4F6FA] rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#8B7355] tabular-nums">{event.year}</span>
                      <span className="text-xs text-[#3D2E1F] dark:text-[#f5f5f5]">{event.label}</span>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
