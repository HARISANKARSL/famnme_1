/**
 * TodayInFamilyHistoryWidget — Shows births, deaths, anniversaries on today's date
 */

import { useMemo, useState } from 'react'
import { Cake, Heart, CloudRain, Calendar, Send, Loader2, X, Check } from 'lucide-react'
import type { Person, Union } from '@/types'
import { resolveBackendUrl } from '@/config/api'
import { sendBirthdayWish } from '@/services/collaborationApiService'

interface WidgetRelationship {
  fromId: string
  toId: string
  type: string
}

interface Props {
  persons: Person[]
  unions: Union[]
  relationships?: WidgetRelationship[]
  onOpenProfile: (personId: string) => void
}

interface FamilyEvent {
  personId: string
  name: string
  photoUrl: string | null
  type: 'birthday' | 'death_anniversary' | 'marriage_anniversary'
  year: number
  yearsAgo: number
}

export function TodayInFamilyHistoryWidget({ persons, unions, relationships = [], onOpenProfile }: Props) {
  const events = useMemo(() => {
    const today = new Date()
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    const currentYear = today.getFullYear()
    const result: FamilyEvent[] = []

    for (const person of persons) {
      // Birthday match
      if (person.birthDate) {
        const [birthYear, birthMonth, birthDay] = person.birthDate.split('-').map(Number)
        if (birthMonth === todayMonth && birthDay === todayDay) {
          result.push({
            personId: person.personId,
            name: `${person.firstName} ${person.lastName || ''}`.trim(),
            photoUrl: person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null,
            type: 'birthday',
            year: birthYear,
            yearsAgo: currentYear - birthYear,
          })
        }
      }

      // Death anniversary match
      if (person.deathDate) {
        const [deathYear, deathMonth, deathDay] = person.deathDate.split('-').map(Number)
        if (deathMonth === todayMonth && deathDay === todayDay) {
          result.push({
            personId: person.personId,
            name: `${person.firstName} ${person.lastName || ''}`.trim(),
            photoUrl: person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null,
            type: 'death_anniversary',
            year: deathYear,
            yearsAgo: currentYear - deathYear,
          })
        }
      }
    }

    // Marriage anniversaries
    for (const union of unions) {
      if (union.startDate) {
        const [unionYear, unionMonth, unionDay] = union.startDate.split('-').map(Number)
        if (unionMonth === todayMonth && unionDay === todayDay) {
          // Derive partner IDs from PARTNER_IN relationships
          const partnerIds = relationships
            .filter((r: WidgetRelationship) => r.type === 'PARTNER_IN' && r.toId === union.unionId)
            .map((r: WidgetRelationship) => r.fromId)
          const partnerNames = partnerIds
            .map((id: string) => persons.find((p: Person) => p.personId === id))
            .filter(Boolean)
            .map((p: Person | undefined) => p!.firstName)
            .join(' & ')
          if (partnerNames) {
            result.push({
              personId: partnerIds[0] || '',
              name: partnerNames,
              photoUrl: null,
              type: 'marriage_anniversary',
              year: unionYear,
              yearsAgo: currentYear - unionYear,
            })
          }
        }
      }
    }

    return result
  }, [persons, unions])

  const eventConfig = {
    birthday: { icon: Cake, color: '#2F3E8F', label: 'Birthday' },
    death_anniversary: { icon: CloudRain, color: '#7A6D62', label: 'Remembrance' },
    marriage_anniversary: { icon: Heart, color: '#2F3E8F', label: 'Anniversary' },
  }

  const [wishTarget, setWishTarget] = useState<string | null>(null)
  const [wishEmail, setWishEmail] = useState('')
  const [wishMessage, setWishMessage] = useState('')
  const [wishSending, setWishSending] = useState(false)
  const [wishSent, setWishSent] = useState<Set<string>>(new Set())
  const [wishError, setWishError] = useState<string | null>(null)

  const handleSendWish = async (personId: string) => {
    if (!wishEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wishEmail)) {
      setWishError('Please enter a valid email address')
      return
    }
    setWishSending(true)
    setWishError(null)
    try {
      await sendBirthdayWish(personId, wishEmail, wishMessage || undefined)
      setWishSent(prev => new Set(prev).add(personId))
      setWishTarget(null)
      setWishEmail('')
      setWishMessage('')
    } catch {
      setWishError('Failed to send. Please try again.')
    } finally {
      setWishSending(false)
    }
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Calendar className="w-8 h-8 text-[#E2DBCE] mb-2" strokeWidth={1} />
        <p className="text-sm text-[#8B7355]">No family events today</p>
        <p className="text-xs text-[#B8A090] mt-0.5">Check back tomorrow!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, i) => {
        const config = eventConfig[event.type]
        const Icon = config.icon
        const isWishOpen = wishTarget === event.personId
        const alreadySent = wishSent.has(event.personId)
        return (
          <div key={`${event.personId}-${event.type}-${i}`}>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F4F6FA] dark:hover:bg-[#222] transition-colors">
              <button
                onClick={() => onOpenProfile(event.personId)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                {event.photoUrl ? (
                  <img src={event.photoUrl} alt={event.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${config.color}20` }}>
                    <Icon className="w-4 h-4" style={{ color: config.color }} strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{event.name}</p>
                  <p className="text-xs text-[#8B7355]">
                    {config.label} — {event.yearsAgo > 0 ? `${event.yearsAgo} year${event.yearsAgo !== 1 ? 's' : ''} (${event.year})` : 'Today!'}
                  </p>
                </div>
              </button>
              {event.type === 'birthday' && (
                alreadySent ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium shrink-0">
                    <Check className="w-3 h-3" /> Sent
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setWishTarget(isWishOpen ? null : event.personId); setWishEmail(''); setWishMessage(''); setWishError(null) }}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#2F3E8F] hover:bg-[#2F3E8F]/10 rounded-md transition-colors shrink-0"
                    title="Send birthday wish email"
                  >
                    <Send className="w-3 h-3" />
                    Send Wish
                  </button>
                )
              )}
            </div>

            {/* Inline email form */}
            {isWishOpen && (
              <div className="ml-11 mt-1.5 p-3 rounded-lg bg-[#E8EDFF] dark:bg-[#2a2010] border border-[#E2E8F0] dark:border-[#333] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">Send birthday wish to {event.name}</p>
                  <button onClick={() => setWishTarget(null)} className="p-0.5 text-[#8B7355] hover:text-[#3D2E1F]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="email"
                  placeholder="Enter their email address"
                  value={wishEmail}
                  onChange={e => setWishEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E2DBCE] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
                  onKeyDown={e => e.key === 'Enter' && handleSendWish(event.personId)}
                />
                <textarea
                  placeholder="Add a personal message (optional)"
                  value={wishMessage}
                  onChange={e => setWishMessage(e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-sm rounded-md border border-[#E2DBCE] dark:border-[#444] bg-white dark:bg-[#1a1a1a] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] focus:outline-none focus:ring-1 focus:ring-[#2F3E8F] resize-none"
                />
                {wishError && <p className="text-xs text-red-500">{wishError}</p>}
                <button
                  onClick={() => handleSendWish(event.personId)}
                  disabled={wishSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#2F3E8F] hover:bg-[#3B4DA6] disabled:opacity-50 rounded-md transition-colors"
                >
                  {wishSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {wishSending ? 'Sending...' : 'Send Birthday Wish'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
