/**
 * SmartDiscoveryWidget — "Did You Know?" insights derived from graph data
 *
 * Computes interesting facts from the family tree: oldest member, most children,
 * longest marriage, common names, geographic spread, etc.
 * Auto-rotates every 8 seconds; manual navigation via chevrons.
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Lightbulb, MapPin, Users, Heart, Calendar, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Person, Union } from '@/types'

interface Props {
  persons: Person[]
  unions: Union[]
  onOpenProfile: (personId: string) => void
  onOpenPeople?: (filter?: { sort?: string; order?: string; gender?: string }) => void
}

interface Insight {
  icon: typeof Lightbulb
  color: string
  text: string
  personId?: string
  action?: () => void
}

function computeInsights(persons: Person[], unions: Union[], onOpenPeople?: Props['onOpenPeople']): Insight[] {
  const insights: Insight[] = []

  // 1. Oldest living person
  const livingWithBirth = persons.filter(p => p.isLiving !== false && !p.deathDate && p.birthDate)
  if (livingWithBirth.length > 0) {
    const oldest = livingWithBirth.reduce((a, b) =>
      new Date(a.birthDate!).getTime() < new Date(b.birthDate!).getTime() ? a : b
    )
    const age = new Date().getFullYear() - new Date(oldest.birthDate!).getFullYear()
    if (age > 0) {
      insights.push({
        icon: Award,
        color: '#2F3E8F',
        text: `${oldest.firstName} ${oldest.lastName || ''} is the oldest living member at ~${age} years old.`,
        personId: oldest.personId,
        action: onOpenPeople ? () => onOpenPeople({ sort: 'birthDate', order: 'asc' }) : undefined,
      })
    }
  }

  // 2. Most common surname
  const surnameCounts = new Map<string, number>()
  for (const p of persons) {
    if (p.lastName) {
      const s = p.lastName.trim()
      surnameCounts.set(s, (surnameCounts.get(s) || 0) + 1)
    }
  }
  if (surnameCounts.size > 0) {
    const sorted = [...surnameCounts.entries()].sort((a, b) => b[1] - a[1])
    if (sorted[0][1] >= 3) {
      insights.push({
        icon: Users,
        color: '#5A7E8E',
        text: `The surname "${sorted[0][0]}" appears ${sorted[0][1]} times in your tree${sorted.length > 1 ? `, followed by "${sorted[1][0]}" (${sorted[1][1]})` : ''}.`,
        action: onOpenPeople ? () => onOpenPeople({}) : undefined,
      })
    }
  }

  // 3. Most common birthplace
  const placeCounts = new Map<string, number>()
  for (const p of persons) {
    if (p.birthPlace) {
      const place = p.birthPlace.trim()
      placeCounts.set(place, (placeCounts.get(place) || 0) + 1)
    }
  }
  if (placeCounts.size > 0) {
    const sorted = [...placeCounts.entries()].sort((a, b) => b[1] - a[1])
    if (sorted[0][1] >= 2) {
      insights.push({
        icon: MapPin,
        color: '#6B8E5A',
        text: `${sorted[0][1]} family members were born in ${sorted[0][0]}${placeCounts.size > 1 ? `. Your family spans ${placeCounts.size} different locations.` : '.'}`,
        action: onOpenPeople ? () => onOpenPeople({}) : undefined,
      })
    }
  }

  // 4. Total marriages
  if (unions.length > 0) {
    insights.push({
      icon: Heart,
      color: '#2F3E8F',
      text: `Your family tree records ${unions.length} marriage${unions.length !== 1 ? 's' : ''} across all generations.`,
      action: onOpenPeople ? () => onOpenPeople({}) : undefined,
    })
  }

  // 5. Youngest member
  const withBirth = persons.filter(p => p.birthDate)
  if (withBirth.length > 0) {
    const youngest = withBirth.reduce((a, b) =>
      new Date(a.birthDate!).getTime() > new Date(b.birthDate!).getTime() ? a : b
    )
    const birthYear = new Date(youngest.birthDate!).getFullYear()
    if (birthYear > 2000) {
      insights.push({
        icon: Calendar,
        color: '#8B6B8E',
        text: `${youngest.firstName} ${youngest.lastName || ''} (born ${birthYear}) is the youngest member in your tree.`,
        personId: youngest.personId,
        action: onOpenPeople ? () => onOpenPeople({ sort: 'birthDate', order: 'desc' }) : undefined,
      })
    }
  }

  // 6. Gender ratio
  const males = persons.filter(p => p.gender === 'male').length
  const females = persons.filter(p => p.gender === 'female').length
  if (males > 0 && females > 0) {
    const ratio = males > females
      ? `${Math.round((males / females) * 10) / 10}:1 male-to-female`
      : `${Math.round((females / males) * 10) / 10}:1 female-to-male`
    insights.push({
      icon: Users,
      color: '#8E8B5A',
      text: `Your family has a ${ratio} ratio (${males} male, ${females} female).`,
      action: onOpenPeople ? () => onOpenPeople({ gender: 'male' }) : undefined,
    })
  }

  return insights
}

export function SmartDiscoveryWidget({ persons, unions, onOpenProfile, onOpenPeople }: Props) {
  const insights = useMemo(() => computeInsights(persons, unions, onOpenPeople), [persons, unions, onOpenPeople])

  const [currentIdx, setCurrentIdx] = useState(() => {
    if (insights.length === 0) return 0
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return dayOfYear % insights.length
  })
  const [fading, setFading] = useState(false)

  // Keep index in bounds if insights change
  useEffect(() => {
    if (insights.length > 0 && currentIdx >= insights.length) {
      setCurrentIdx(0)
    }
  }, [insights.length, currentIdx])

  const navigate = useCallback((direction: 1 | -1) => {
    if (insights.length === 0) return
    setFading(true)
    setTimeout(() => {
      setCurrentIdx(idx => (idx + direction + insights.length) % insights.length)
      setFading(false)
    }, 120)
  }, [insights.length])

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (insights.length <= 1) return
    const timer = setInterval(() => navigate(1), 8000)
    return () => clearInterval(timer)
  }, [insights.length, navigate])

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Lightbulb className="w-8 h-8 text-[#E2DBCE] mb-2" strokeWidth={1} />
        <p className="text-sm text-[#8B7355]">Add more family details to unlock insights</p>
      </div>
    )
  }

  const insight = insights[currentIdx]
  const Icon = insight.icon

  return (
    <div className="flex flex-col gap-3">
      {/* Insight card */}
      <div
        className={`flex items-start gap-3 p-3 rounded-lg transition-opacity duration-100 ${fading ? 'opacity-0' : 'opacity-100'} ${(insight.personId || insight.action) ? 'cursor-pointer hover:bg-[#F4F6FA] dark:hover:bg-[#222]' : ''}`}
        onClick={() => {
          if (insight.personId) onOpenProfile(insight.personId)
          else if (insight.action) insight.action()
        }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${insight.color}15` }}>
          <Icon className="w-4 h-4" style={{ color: insight.color }} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-[#3D2E1F] dark:text-[#f5f5f5] leading-relaxed flex-1">{insight.text}</p>
      </div>

      {/* Navigation row */}
      {insights.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-md text-[#B8A090] hover:text-[#3D2E1F] hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {insights.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setFading(true)
                  setTimeout(() => { setCurrentIdx(i); setFading(false) }, 120)
                }}
                className={`rounded-full transition-all duration-200 ${i === currentIdx ? 'w-4 h-1.5 bg-[#2F3E8F]' : 'w-1.5 h-1.5 bg-[#E2DBCE] hover:bg-[#2F3E8F]/50'}`}
              />
            ))}
          </div>

          <button
            onClick={() => navigate(1)}
            className="p-1 rounded-md text-[#B8A090] hover:text-[#3D2E1F] hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
