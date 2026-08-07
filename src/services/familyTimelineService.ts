/**
 * Family Timeline Service
 *
 * Builds an enriched timeline from person birth/death events
 * overlaid with historical context. Filters events by family's
 * native states for regional relevance.
 */

import type { Person } from '@/types'
import { getEventsInRange, type HistoricalEvent } from '@/data/history'

export interface TimelineEvent {
  year: number
  type: 'birth' | 'death' | 'historical'
  personId?: string
  personName?: string
  label: string
  detail?: string
  color: string
  states?: string[]
}

/**
 * Detect which Indian states the family is connected to
 * (from birthPlace, nativePlace fields).
 */
function detectFamilyStates(persons: Person[]): string[] {
  const stateSet = new Set<string>()

  for (const person of persons) {
    const places = [person.birthPlace, person.nativePlace].filter(Boolean) as string[]
    for (const place of places) {
      // Try to extract state from "City, State" or "City, District, State" format
      const parts = place.split(',').map(s => s.trim())
      if (parts.length >= 2) {
        stateSet.add(parts[parts.length - 1]) // last part is usually state
      }
      // Also try direct match against known state names
      const knownStates = [
        'Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana',
        'Maharashtra', 'Gujarat', 'Goa', 'Rajasthan', 'Punjab', 'Haryana',
        'Uttar Pradesh', 'Madhya Pradesh', 'Bihar', 'West Bengal', 'Odisha',
        'Jharkhand', 'Chhattisgarh', 'Assam', 'Delhi', 'Uttarakhand',
        'Himachal Pradesh', 'Jammu and Kashmir', 'Sikkim', 'Manipur',
      ]
      for (const state of knownStates) {
        if (place.toLowerCase().includes(state.toLowerCase())) {
          stateSet.add(state)
        }
      }
    }
  }

  return [...stateSet]
}

// /**
//  * Build a compact timeline of family events + historical markers.
//  * Prioritizes state-relevant events for the family's home states.
//  */

export function buildFamilyTimeline(persons: Person[], maxEvents: number = 10): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const familyStates = detectFamilyStates(persons)
  const currentYear = new Date().getFullYear()

  for (const person of persons) {
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear()
      if (year > 1800 && year < 2100) {
        events.push({
          year,
          type: 'birth',
          personId: person.personId,
          personName: `${person.firstName} ${person.lastName || ''}`.trim(),
          label: `${person.firstName} born`,
          color: '#6B8E5A',
        })
      }
    }

    if (person.deathDate) {
      const year = new Date(person.deathDate).getFullYear()
      if (year > 1800 && year < 2100) {
        events.push({
          year,
          type: 'death',
          personId: person.personId,
          personName: `${person.firstName} ${person.lastName || ''}`.trim(),
          label: `${person.firstName} passed`,
          color: '#8B7355',
        })
      }
    }
  }

  // Sort and deduplicate
  events.sort((a, b) => a.year - b.year)
  const deduped: TimelineEvent[] = []
  const seenKeys = new Set<string>()
  for (const event of events) {
    const key = `${event.year}-${event.type}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      deduped.push(event)
    }
  }

  // Limit family events
  let selected = deduped
  if (deduped.length > maxEvents) {
    const step = Math.ceil(deduped.length / maxEvents)
    selected = deduped.filter((_, i) => i % step === 0).slice(0, maxEvents)
  }

  // Add historical context — state-aware
  if (selected.length >= 2) {
    const earliest = selected[0].year
    const latest = currentYear

    // Get relevant events in the family's time range, filtered by states
    const relevantHistorical = getEventsInRange(earliest - 5, latest + 5, familyStates.length > 0 ? familyStates : undefined)

    // Pick up to 3 historical events spread across the timeline
    const historicalToAdd: HistoricalEvent[] = []

    // Near the start
    const earlyEvents = relevantHistorical.filter(e => e.year <= earliest + 5)
    if (earlyEvents.length > 0) {
      // Prefer state-relevant events
      const stateEvent = earlyEvents.find(e => e.states && e.states.length > 0)
      historicalToAdd.push(stateEvent || earlyEvents[earlyEvents.length - 1])
    }

    // Near the middle
    const midYear = Math.round((earliest + latest) / 2)
    const midEvents = relevantHistorical.filter(e =>
      Math.abs(e.year - midYear) <= 10 && !historicalToAdd.some(h => h.id === e.id)
    )
    if (midEvents.length > 0) {
      const stateEvent = midEvents.find(e => e.states && e.states.length > 0)
      historicalToAdd.push(stateEvent || midEvents[0])
    }

    // Near the end
    const lateEvents = relevantHistorical.filter(e =>
      e.year >= latest - 5 && !historicalToAdd.some(h => h.id === e.id)
    )
    if (lateEvents.length > 0) {
      const stateEvent = lateEvents.find(e => e.states && e.states.length > 0)
      historicalToAdd.push(stateEvent || lateEvents[0])
    }

    for (const h of historicalToAdd) {
      selected.push({
        year: h.year,
        type: 'historical',
        label: h.title,
        detail: h.description,
        color: '#2F3E8F',
        states: h.states,
      })
    }
  }

  selected.sort((a, b) => a.year - b.year)
  return selected
}

/**
 * Get summary stats from the timeline.
 */
export function getTimelineStats(persons: Person[]): {
  earliestYear: number | null
  latestYear: number | null
  spanYears: number
  birthCount: number
  deathCount: number
} {
  const currentYear = new Date().getFullYear()

  let earliest = Infinity
  let hasAnyValidEvent = false
  let birthCount = 0
  let deathCount = 0

  for (const person of persons) {
    if (person.birthDate) {
      const y = new Date(person.birthDate).getFullYear()
      if (y > 1800 && y < 2100) { earliest = Math.min(earliest, y); hasAnyValidEvent = true; birthCount++ }
    }
    if (person.deathDate) {
      const y = new Date(person.deathDate).getFullYear()
      if (y > 1800 && y < 2100) { earliest = Math.min(earliest, y); hasAnyValidEvent = true; deathCount++ }
    }
  }

  return {
    earliestYear: hasAnyValidEvent ? earliest : null,
    latestYear: hasAnyValidEvent ? currentYear : null,
    spanYears: hasAnyValidEvent ? currentYear - earliest : 0,
    birthCount,
    deathCount,
  }
}

// export function buildFamilyTimeline(persons: Person[], maxEvents: number = 10): TimelineEvent[] {
//   const events: TimelineEvent[] = []
//   const familyStates = detectFamilyStates(persons)

//   for (const person of persons) {
//     if (person.birthDate) {
//       const year = new Date(person.birthDate).getFullYear()
//       if (year > 1800 && year < 2100) {
//         events.push({
//           year,
//           type: 'birth',
//           personId: person.personId,
//           personName: `${person.firstName} ${person.lastName || ''}`.trim(),
//           label: `${person.firstName} born`,
//           color: '#6B8E5A',
//         })
//       }
//     }

//     if (person.deathDate) {
//       const year = new Date(person.deathDate).getFullYear()
//       if (year > 1800 && year < 2100) {
//         events.push({
//           year,
//           type: 'death',
//           personId: person.personId,
//           personName: `${person.firstName} ${person.lastName || ''}`.trim(),
//           label: `${person.firstName} passed`,
//           color: '#8B7355',
//         })
//       }
//     }
//   }

//   // Sort and deduplicate
//   events.sort((a, b) => a.year - b.year)
//   const deduped: TimelineEvent[] = []
//   const seenKeys = new Set<string>()
//   for (const event of events) {
//     const key = `${event.year}-${event.type}`
//     if (!seenKeys.has(key)) {
//       seenKeys.add(key)
//       deduped.push(event)
//     }
//   }

//   // Limit family events
//   let selected = deduped
//   if (deduped.length > maxEvents) {
//     const step = Math.ceil(deduped.length / maxEvents)
//     selected = deduped.filter((_, i) => i % step === 0).slice(0, maxEvents)
//   }

//   // Add historical context — state-aware
//   if (selected.length >= 2) {
//     const earliest = selected[0].year
//     const latest = selected[selected.length - 1].year

//     // Get relevant events in the family's time range, filtered by states
//     const relevantHistorical = getEventsInRange(earliest - 5, latest + 5, familyStates.length > 0 ? familyStates : undefined)

//     // Pick up to 3 historical events spread across the timeline
//     const historicalToAdd: HistoricalEvent[] = []

//     // Near the start
//     const earlyEvents = relevantHistorical.filter(e => e.year <= earliest + 5)
//     if (earlyEvents.length > 0) {
//       // Prefer state-relevant events
//       const stateEvent = earlyEvents.find(e => e.states && e.states.length > 0)
//       historicalToAdd.push(stateEvent || earlyEvents[earlyEvents.length - 1])
//     }

//     // Near the middle
//     const midYear = Math.round((earliest + latest) / 2)
//     const midEvents = relevantHistorical.filter(e =>
//       Math.abs(e.year - midYear) <= 10 && !historicalToAdd.some(h => h.id === e.id)
//     )
//     if (midEvents.length > 0) {
//       const stateEvent = midEvents.find(e => e.states && e.states.length > 0)
//       historicalToAdd.push(stateEvent || midEvents[0])
//     }

//     // Near the end
//     const lateEvents = relevantHistorical.filter(e =>
//       e.year >= latest - 5 && !historicalToAdd.some(h => h.id === e.id)
//     )
//     if (lateEvents.length > 0) {
//       const stateEvent = lateEvents.find(e => e.states && e.states.length > 0)
//       historicalToAdd.push(stateEvent || lateEvents[0])
//     }

//     for (const h of historicalToAdd) {
//       selected.push({
//         year: h.year,
//         type: 'historical',
//         label: h.title,
//         detail: h.description,
//         color: '#2F3E8F',
//         states: h.states,
//       })
//     }
//   }

//   selected.sort((a, b) => a.year - b.year)
//   return selected
// }

// /**
//  * Get summary stats from the timeline.
//  */
// export function getTimelineStats(persons: Person[]): {
//   earliestYear: number | null
//   latestYear: number | null
//   spanYears: number
//   birthCount: number
//   deathCount: number
// }

// {
//   let earliest = Infinity
//   let latest = -Infinity
//   let birthCount = 0
//   let deathCount = 0

//   for (const person of persons) {
//     if (person.birthDate) {
//       const y = new Date(person.birthDate).getFullYear()
//       if (y > 1800) { earliest = Math.min(earliest, y); latest = Math.max(latest, y); birthCount++ }
//     }
//     if (person.deathDate) {
//       const y = new Date(person.deathDate).getFullYear()
//       if (y > 1800) { latest = Math.max(latest, y); deathCount++ }
//     }
//   }

//   return {
//     earliestYear: earliest === Infinity ? null : earliest,
//     latestYear: latest === -Infinity ? null : latest,
//     spanYears: earliest !== Infinity && latest !== -Infinity ? latest - earliest : 0,
//     birthCount,
//     deathCount,
//   }
// }
