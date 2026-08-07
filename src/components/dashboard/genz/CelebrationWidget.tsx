/**
 * CelebrationWidget — Birthday, anniversary, and remembrance celebrations
 *
 * Appears only when there are events today.
 * Festive gradient card with one-tap wish sending.
 */

import { useState, useMemo } from 'react'
import { Cake, Heart, CloudRain, X, Send, Check, PartyPopper } from 'lucide-react'
import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'

interface CelebrationWidgetProps {
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  onOpenProfile?: (personId: string) => void
  onSendWish?: (personId: string) => void
}

interface CelebrationEvent {
  name: string
  type: 'birthday' | 'anniversary' | 'remembrance'
  years: number
  personId: string
}

function getSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

export function CelebrationWidget({
  persons,
  unions,
  relationships,
  onOpenProfile,
  onSendWish,
}: CelebrationWidgetProps) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem(`genz_celebration_${todayKey}`) === '1'
  )
  const [sentWishes, setSentWishes] = useState<Set<string>>(new Set())

  const celebrations = useMemo(() => {
    const today = new Date()
    const m = today.getMonth() + 1
    const d = today.getDate()
    const yr = today.getFullYear()
    const items: CelebrationEvent[] = []

    for (const p of persons) {
      if (p.isDeleted) continue
      if (p.birthDate) {
        const bd = new Date(p.birthDate)
        if (bd.getMonth() + 1 === m && bd.getDate() === d) {
          items.push({
            name: `${p.firstName} ${p.lastName || ''}`.trim(),
            type: 'birthday',
            years: yr - bd.getFullYear(),
            personId: p.personId,
          })
        }
      }
      if (p.deathDate) {
        const dd = new Date(p.deathDate)
        if (dd.getMonth() + 1 === m && dd.getDate() === d) {
          items.push({
            name: `${p.firstName} ${p.lastName || ''}`.trim(),
            type: 'remembrance',
            years: yr - dd.getFullYear(),
            personId: p.personId,
          })
        }
      }
    }

    for (const u of unions) {
      if (u.startDate) {
        const ad = new Date(u.startDate)
        if (ad.getMonth() + 1 === m && ad.getDate() === d) {
          const partnerRels = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId)
          const names = partnerRels
            .map(r => persons.find(p => p.personId === r.fromId)?.firstName)
            .filter(Boolean)
            .join(' & ')
          if (names) {
            items.push({
              name: names,
              type: 'anniversary',
              years: yr - ad.getFullYear(),
              personId: partnerRels[0]?.fromId || '',
            })
          }
        }
      }
    }

    return items
  }, [persons, unions, relationships])

  if (dismissed || celebrations.length === 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(`genz_celebration_${todayKey}`, '1')
  }

  const handleSendWish = (personId: string) => {
    setSentWishes(prev => new Set(prev).add(personId))
    onSendWish?.(personId)
  }

  const bgGradient = celebrations.some(e => e.type === 'birthday')
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : celebrations.some(e => e.type === 'anniversary')
    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'

  return (
    <div
      className="rounded-2xl p-5 shadow-sm text-white relative overflow-hidden animate-stagger-5"
      style={{ background: bgGradient }}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Decorative elements */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.08]" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/[0.06]" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3 relative">
        <PartyPopper className="w-5 h-5" />
        <p className="text-sm font-bold">Today&apos;s Celebrations</p>
      </div>

      {/* Events */}
      <div className="space-y-2.5 relative">
        {celebrations.map((event, i) => {
          const Icon = event.type === 'birthday' ? Cake : event.type === 'anniversary' ? Heart : CloudRain
          const label = event.type === 'birthday'
            ? `${event.name}'s ${event.years > 0 ? event.years + getSuffix(event.years) + ' ' : ''}birthday!`
            : event.type === 'anniversary'
            ? `${event.name} — ${event.years > 0 ? event.years + getSuffix(event.years) + ' ' : ''}anniversary!`
            : `Remembering ${event.name}${event.years > 0 ? ` — ${event.years} year${event.years !== 1 ? 's' : ''}` : ''}`
          const sent = sentWishes.has(event.personId)

          return (
            <div key={`${event.personId}-${event.type}-${i}`} className="flex items-center gap-3">
              <button
                onClick={() => onOpenProfile?.(event.personId)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium truncate">{label}</p>
              </button>

              {event.type === 'birthday' && onSendWish && (
                sent ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium shrink-0">
                    <Check className="w-3 h-3" /> Sent
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendWish(event.personId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/20 hover:bg-white/30 active:scale-95 transition-all shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    Wish
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
