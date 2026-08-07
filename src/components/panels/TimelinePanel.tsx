/**
 * TimelinePanel Component (Phase 2.5)
 *
 * Chronological timeline view showing life events and major dates
 * for persons in the family tree.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Calendar, Filter, MapPin, User, Loader2 } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'
import type { Person, LifeEvent } from '@/types'
import { getLifeEvents } from '@/services/phase1ApiService'

interface TimelinePanelProps {
  persons: Person[]
  treeId: string
  onClose: () => void
  onPersonSelect?: (personId: string) => void
}

/** Unified timeline entry combining birth/death/life events */
interface TimelineEntry {
  id: string
  date: string
  sortDate: string // ISO date for sorting
  eventType: string
  category: 'birth' | 'death' | 'ceremony' | 'career' | 'education' | 'military' | 'move' | 'achievement' | 'other'
  personId: string
  personName: string
  location?: string | null
  description?: string | null
}

const CATEGORY_COLORS: Record<TimelineEntry['category'], { bg: string; border: string; dot: string; text: string }> = {
  birth: { bg: 'bg-green-50', border: 'border-green-300', dot: 'bg-green-500', text: 'text-green-700' },
  death: { bg: 'bg-gray-50', border: 'border-gray-400', dot: 'bg-gray-500', text: 'text-gray-600' },
  ceremony: { bg: 'bg-[#E8EDFF]', border: 'border-blue-300', dot: 'bg-[#E8EDFF]0', text: 'text-[#2F3E8F]' },
  career: { bg: 'bg-[#E8EDFF]', border: 'border-[#E8D5C4]', dot: 'bg-[#2F3E8F]', text: 'text-[#25327A]' },
  education: { bg: 'bg-[#F3E8DE]', border: 'border-[#D4B89C]', dot: 'bg-[#8B7355]', text: 'text-[#6B5B47]' },
  military: { bg: 'bg-red-50', border: 'border-red-300', dot: 'bg-red-500', text: 'text-red-700' },
  move: { bg: 'bg-[#E8EDFF]', border: 'border-[#E8D5C4]', dot: 'bg-[#2F3E8F]', text: 'text-[#25327A]' },
  achievement: { bg: 'bg-purple-50', border: 'border-purple-300', dot: 'bg-purple-500', text: 'text-purple-700' },
  other: { bg: 'bg-slate-50', border: 'border-slate-300', dot: 'bg-slate-400', text: 'text-slate-600' },
}

const CEREMONY_TYPES = new Set([
  'Namkaran (Naming)', 'Annaprashana (First Rice)', 'Mundan (First Haircut)',
  'Upanayana (Thread Ceremony)', 'Vidyarambham (Education Initiation)',
  'Engagement', 'Haldi', 'Mehndi', 'Vivah (Wedding)', 'Grihapravesh (Housewarming)',
  'Vanaprastha (Retirement)', 'Antim Sanskar (Last Rites)',
  'Aqiqah', 'Bismillah', 'Nikah', 'Walima',
  'Dastar Bandhi (Turban Tying)', 'Anand Karaj (Wedding)',
  'Baptism', 'Confirmation', 'First Communion',
])

function categorizeEvent(eventType: string): TimelineEntry['category'] {
  if (eventType === 'Birth') return 'birth'
  if (eventType === 'Death') return 'death'
  if (eventType === 'Career' || eventType === 'Retirement') return 'career'
  if (eventType === 'Education') return 'education'
  if (eventType === 'Military Service') return 'military'
  if (eventType === 'Move/Relocation' || eventType === 'Immigration' || eventType === 'Naturalization') return 'move'
  if (eventType === 'Achievement') return 'achievement'
  if (CEREMONY_TYPES.has(eventType)) return 'ceremony'
  return 'other'
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr
  }
}

function getPersonFullName(person: Person): string {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ')
}

const ALL_CATEGORIES: TimelineEntry['category'][] = [
  'birth', 'death', 'ceremony', 'career', 'education', 'military', 'move', 'achievement', 'other',
]

export function TimelinePanel({ persons, treeId: _treeId, onClose, onPersonSelect }: TimelinePanelProps) {
  const { isMobile } = useResponsive()
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<Set<TimelineEntry['category']>>(new Set(ALL_CATEGORIES))
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Load life events for all persons
  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      setLoading(true)
      setError(null)

      try {
        const allEvents: LifeEvent[] = []
        // Fetch life events for each person (batched)
        const results = await Promise.allSettled(
          persons.map(p => getLifeEvents(p.personId))
        )
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            allEvents.push(...result.value)
          }
        })
        if (!cancelled) {
          setLifeEvents(allEvents)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load life events')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (persons.length > 0) {
      loadEvents()
    } else {
      setLoading(false)
    }

    return () => { cancelled = true }
  }, [persons])

  // Build unified timeline entries
  const allEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = []
    const personMap = new Map(persons.map(p => [p.personId, p]))

    // Birth events from person data
    persons.forEach(p => {
      if (p.birthDate) {
        entries.push({
          id: `birth-${p.personId}`,
          date: p.birthDate,
          sortDate: p.birthDate,
          eventType: 'Birth',
          category: 'birth',
          personId: p.personId,
          personName: getPersonFullName(p),
          location: p.birthPlace,
          description: null,
        })
      }
    })

    // Death events from person data
    persons.forEach(p => {
      if (p.deathDate) {
        entries.push({
          id: `death-${p.personId}`,
          date: p.deathDate,
          sortDate: p.deathDate,
          eventType: 'Death',
          category: 'death',
          personId: p.personId,
          personName: getPersonFullName(p),
          location: p.deathPlace,
          description: null,
        })
      }
    })

    // Life events from API
    lifeEvents.forEach(le => {
      if (le.eventDate) {
        const person = personMap.get(le.personId)
        entries.push({
          id: `event-${le.eventId}`,
          date: le.eventDate,
          sortDate: le.eventDate,
          eventType: le.eventType,
          category: categorizeEvent(le.eventType),
          personId: le.personId,
          personName: person ? getPersonFullName(person) : 'Unknown',
          location: le.location,
          description: le.description,
        })
      }
    })

    // Sort chronologically
    entries.sort((a, b) => a.sortDate.localeCompare(b.sortDate))

    return entries
  }, [persons, lifeEvents])

  // Apply filters
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      if (selectedPersonId && entry.personId !== selectedPersonId) return false
      if (!selectedCategories.has(entry.category)) return false
      if (dateFrom && entry.sortDate < dateFrom) return false
      if (dateTo && entry.sortDate > dateTo) return false
      return true
    })
  }, [allEntries, selectedPersonId, selectedCategories, dateFrom, dateTo])

  const toggleCategory = useCallback((cat: TimelineEntry['category']) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }, [])

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50' : 'w-96 h-full border-l border-gray-200 shadow-lg'} bg-white flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#8B7355]" />
          <h2 className="text-sm font-semibold text-gray-800">Timeline</h2>
          <span className="text-xs text-gray-500">({filteredEntries.length} events)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded hover:bg-gray-200 ${showFilters ? 'bg-gray-200' : ''}`}
            title="Toggle filters"
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-200" title="Close">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-3">
          {/* Person filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Person</label>
            <select
              value={selectedPersonId}
              onChange={e => setSelectedPersonId(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 bg-white"
            >
              <option value="">All persons</option>
              {persons
                .slice()
                .sort((a, b) => getPersonFullName(a).localeCompare(getPersonFullName(b)))
                .map(p => (
                  <option key={p.personId} value={p.personId}>
                    {getPersonFullName(p)}
                  </option>
                ))}
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Event Types</label>
            <div className="flex flex-wrap gap-1">
              {ALL_CATEGORIES.map(cat => {
                const colors = CATEGORY_COLORS[cat]
                const isActive = selectedCategories.has(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize transition-colors ${
                      isActive
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
              />
            </div>
          </div>

          {/* Clear filters */}
          <button
            onClick={() => {
              setSelectedPersonId('')
              setSelectedCategories(new Set(ALL_CATEGORIES))
              setDateFrom('')
              setDateTo('')
            }}
            className="text-xs text-[#2F3E8F] hover:text-[#8B5E3C] underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Timeline Content */}
      <div className={`flex-1 overflow-y-auto px-4 py-3 ${isMobile ? 'pb-16' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Loading timeline events...</span>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 text-xs py-8">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-8">
            No events found.
            {showFilters && ' Try adjusting your filters.'}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />

            {/* Timeline entries */}
            <div className="space-y-3">
              {filteredEntries.map((entry, _index) => {
                const colors = CATEGORY_COLORS[entry.category]
                return (
                  <div key={entry.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 border-white shadow-sm ${colors.dot}`}
                    />

                    {/* Event card */}
                    <div
                      className={`${colors.bg} border ${colors.border} rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
                      onClick={() => onPersonSelect?.(entry.personId)}
                    >
                      {/* Date & Type */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {formatDate(entry.date)}
                        </span>
                        <span className={`text-xs font-semibold ${colors.text} capitalize`}>
                          {entry.eventType}
                        </span>
                      </div>

                      {/* Person name */}
                      <div className="flex items-center gap-1 mb-1">
                        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {entry.personName}
                        </span>
                      </div>

                      {/* Location */}
                      {entry.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 truncate">{entry.location}</span>
                        </div>
                      )}

                      {/* Description */}
                      {entry.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
