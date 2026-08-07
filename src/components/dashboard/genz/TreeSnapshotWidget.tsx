/**
 * TreeSnapshotWidget — Emotionally engaging family tree spotlight
 *
 * Picks a family member each session and highlights them with an emotional hook.
 * Uses AI-generated ancestor insights when available, falls back to rich
 * client-side prompts based on birthdays, occupations, places, and milestones.
 */

import { ArrowRight, Heart, MapPin, Briefcase, Calendar, Gem, Users } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import type { Person } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { resolveBackendUrl } from '@/config/api'
import { getBloodRelativeIds } from '@/utils/bloodRelatives'

interface TreeSnapshotWidgetProps {
  persons: Person[]
  relationships: Relationship[]
  familyName: string
  memberCount: number
  generationDepth: number
  rootAncestorName?: string | null
  onNavigateToTree: () => void
  onOpenProfile?: (personId: string) => void
}

// ── Emotional prompt generators based on real family data ──

interface Spotlight {
  icon: typeof Heart
  iconColor: string
  label: string
  headline: string
  detail: string
  person?: Person
  cta: string
}

function getUpcomingBirthdays(persons: Person[]): Person[] {
  const today = new Date()
  const todayMD = (today.getMonth() + 1) * 100 + today.getDate()
  return persons
    .filter(p => p.birthDate && p.isLiving && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    .map(p => {
      const d = new Date(p.birthDate!)
      const pMD = (d.getMonth() + 1) * 100 + d.getDate()
      const diff = pMD - todayMD
      return { person: p, daysAway: diff < 0 ? diff + 365 : diff }
    })
    .filter(x => x.daysAway >= 0 && x.daysAway <= 30)
    .sort((a, b) => a.daysAway - b.daysAway)
    .map(x => x.person)
}

function getAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age
}

function getEldest(persons: Person[]): Person | undefined {
  return persons
    .filter(p => p.birthDate && p.isLiving && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    .sort((a, b) => new Date(a.birthDate!).getTime() - new Date(b.birthDate!).getTime())[0]
}

function getMissingProfileCount(persons: Person[]): number {
  return persons.filter(p => !p.profilePhotoUrl && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length
}

function getUniquePlaces(persons: Person[]): string[] {
  const places = new Set<string>()
  for (const p of persons) {
    if (p.birthPlace && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))) places.add(p.birthPlace)
    if (p.nativePlace && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))) places.add(p.nativePlace)
  }
  return [...places]
}

function buildSpotlights(persons: Person[], familyName: string, generationDepth: number): Spotlight[] {
  const spotlights: Spotlight[] = []
  const living = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))

  // 1. Upcoming birthday
  const bdays = getUpcomingBirthdays(living)
  if (bdays.length > 0) {
    const p = bdays[0]
    const d = new Date(p.birthDate!)
    const age = getAge(p.birthDate!) + 1
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    const dayName = `${dd}-${mm}-${yy}`
    spotlights.push({
      icon: Calendar,
      iconColor: 'text-[#C2A46D]',
      label: 'Upcoming Birthday',
      headline: `${p.firstName} turns ${age} on ${dayName}!`,
      detail: `Don't forget to wish ${p.gender === 'female' ? 'her' : 'him'}. Add a memory or a message to make it special.`,
      person: p,
      cta: 'See their profile',
    })
  }

  // 2. Eldest living member
  const eldest = getEldest(living)
  if (eldest && eldest.birthDate) {
    const age = getAge(eldest.birthDate)
    if (age >= 60) {
      spotlights.push({
        icon: Heart,
        iconColor: 'text-rose-500',
        label: 'Living Legacy',
        headline: `${eldest.firstName} is ${age} years old`,
        detail: `${eldest.gender === 'female' ? 'She' : 'He'} carries ${age} years of your family's stories. Have you recorded ${eldest.gender === 'female' ? 'her' : 'his'} memories yet?`,
        person: eldest,
        cta: 'Preserve their story',
      })
    }
  }

  // 3. Ancestral places
  const places = getUniquePlaces(living)
  if (places.length >= 2) {
    spotlights.push({
      icon: MapPin,
      iconColor: 'text-[#2F3E8F]',
      label: 'Family Roots',
      headline: `Your family spans ${places.length} places`,
      detail: `From ${places[0]} to ${places[places.length - 1]} — your roots tell a story of journeys, courage, and new beginnings.`,
      cta: 'Explore your tree',
    })
  }

  // 4. Missing photos prompt
  const missingPhotos = getMissingProfileCount(living)
  if (missingPhotos > 3) {
    spotlights.push({
      icon: Users,
      iconColor: 'text-[#8B7355]',
      label: 'Incomplete Profiles',
      headline: `${missingPhotos} members are waiting for their photo`,
      detail: `Faces make the tree come alive. Adding photos helps future generations remember who came before them.`,
      cta: 'Complete your tree',
    })
  }

  // 5. Occupations diversity
  const occupations = [...new Set(living.filter(p => p.occupation).map(p => p.occupation!))]
  if (occupations.length >= 3) {
    spotlights.push({
      icon: Briefcase,
      iconColor: 'text-[#4B2C5E]',
      label: 'Family Legacy',
      headline: `${occupations.length} different professions in your family`,
      detail: `Teachers, engineers, doctors, artists — every career choice shaped the ${familyName} story. What will the next generation be?`,
      cta: 'See the full tree',
    })
  }

  // 6. Generation depth pride
  if (generationDepth >= 3) {
    spotlights.push({
      icon: Gem,
      iconColor: 'text-[#C2A46D]',
      label: 'Deep Roots',
      headline: `${generationDepth} generations and counting`,
      detail: `The ${familyName} family tree reaches back ${generationDepth} generations. Each generation added a new chapter to your story.`,
      cta: 'Explore the tree',
    })
  }

  return spotlights
}

// ── Fetch AI insight for a random ancestor ──
async function fetchAIInsight(personId: string): Promise<string | null> {
  try {
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${resolveBackendUrl('/api')}/person/${personId}/ai-ancestor-insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ generation: 2, descendantCount: 5 }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.insight || null
  } catch {
    return null
  }
}

export function TreeSnapshotWidget({
  persons,
  relationships,
  familyName,
  memberCount,
  generationDepth,
  rootAncestorName,
  onNavigateToTree,
  onOpenProfile,
}: TreeSnapshotWidgetProps) {
  // Filter to blood relatives only (excludes in-laws)
  const bloodPersons = useMemo(() => {
    const bloodIds = getBloodRelativeIds(persons, relationships)
    return persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')) && bloodIds.has(p.personId))
  }, [persons, relationships])

  // Build spotlights from blood relatives
  const spotlights = useMemo(
    () => buildSpotlights(bloodPersons, familyName, generationDepth),
    [bloodPersons, familyName, generationDepth],
  )

  // Pick a daily spotlight (rotates by day-of-year)
  const dayOfYear = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    return Math.floor((now.getTime() - start.getTime()) / 86400000)
  }, [])

  const spotlight = spotlights.length > 0 ? spotlights[dayOfYear % spotlights.length] : null

  // AI-generated insight for a random person
  const [aiInsight, setAiInsight] = useState<{ text: string; person: Person } | null>(null)

  useEffect(() => {
    const candidates = bloodPersons.filter(p => !p.isHomePerson && p.birthDate && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    if (candidates.length === 0) return

    const pick = candidates[dayOfYear % candidates.length]
    fetchAIInsight(pick.personId).then(text => {
      if (text) setAiInsight({ text, person: pick })
    })
  }, [persons, dayOfYear])

  // Preview persons for avatar row
  const previewPersons = useMemo(() => {
    const home = persons.find(p => p.isHomePerson && !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
    const withPhotos = persons.filter(p => p.profilePhotoUrl && !p.isDeleted && !p.isHomePerson && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).slice(0, 4)
    return home ? [home, ...withPhotos] : withPhotos.slice(0, 5)
  }, [persons])

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F] dark:text-[#5A6BFF]">Your Family Tree</p>
        <button
          onClick={onNavigateToTree}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] hover:underline"
        >
          View full tree <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Avatar row + stats */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <div className="flex -space-x-2">
          {previewPersons.map((p) => {
            const url = p.profilePhotoUrl ? resolveBackendUrl(p.profilePhotoUrl) : null
            const init = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase()
            return (
              <div
                key={p.personId}
                className={`w-9 h-9 rounded-full border-2 border-white dark:border-[#242424] overflow-hidden shrink-0 ${p.isHomePerson ? 'ring-2 ring-[#C2A46D]' : ''}`}
              >
                {url ? (
                  <img src={url} alt={p.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2F3E8F] flex items-center justify-center">
                    <span className="text-white text-[10px] font-semibold">{init}</span>
                  </div>
                )}
              </div>
            )
          })}
          {memberCount > 5 && (
            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-[#242424] bg-stone-100 dark:bg-[#333] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-stone-500 dark:text-[#999]">+{memberCount - 5}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800 dark:text-[#F5F1E8]">The {familyName} Family</p>
          <p className="text-[11px] text-[#8B7355] dark:text-[#999]">
            {memberCount} members · {generationDepth} generation{generationDepth !== 1 ? 's' : ''}
            {rootAncestorName ? ` · from ${rootAncestorName}` : ''}
          </p>
        </div>
      </div>

      {/* ── AI Ancestor Spotlight ── */}
      {aiInsight && (
        <div
          className="mx-4 mb-3 p-3 rounded-xl bg-gradient-to-r from-[#4B2C5E]/[0.06] to-[#2F3E8F]/[0.06] dark:from-[#4B2C5E]/[0.15] dark:to-[#2F3E8F]/[0.15] cursor-pointer hover:from-[#4B2C5E]/[0.1] hover:to-[#2F3E8F]/[0.1] transition-all"
          onClick={() => onOpenProfile?.(aiInsight.person.personId)}
        >
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-[#4B2C5E]/20">
              {aiInsight.person.profilePhotoUrl ? (
                <img src={resolveBackendUrl(aiInsight.person.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#4B2C5E] flex items-center justify-center">
                  <span className="text-white text-[11px] font-bold">
                    {aiInsight.person.firstName?.[0]}{aiInsight.person.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Gem className="w-3 h-3 text-[#4B2C5E]" />
                <span className="text-[10px] font-semibold text-[#4B2C5E] dark:text-[#9B7BB0] uppercase tracking-wide">Spotlight</span>
              </div>
              <p className="text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0] leading-snug italic">
                &ldquo;{aiInsight.text}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Emotional Spotlight Card ── */}
      {spotlight && (
        <div className="mx-4 mb-3">
          <div
            className="p-3 rounded-xl bg-[#F6F2EA] dark:bg-[#1E1E1E] cursor-pointer hover:bg-[#EDE8DF] dark:hover:bg-[#252525] transition-colors"
            onClick={() => spotlight.person && onOpenProfile ? onOpenProfile(spotlight.person.personId) : onNavigateToTree()}
          >
            <div className="flex items-start gap-2.5">
              <div className={`w-8 h-8 rounded-full bg-white dark:bg-[#2a2a2a] flex items-center justify-center shrink-0 shadow-sm`}>
                <spotlight.icon className={`w-4 h-4 ${spotlight.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#8B7355] dark:text-[#888] uppercase tracking-wide mb-0.5">
                  {spotlight.label}
                </p>
                <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#e0e0e0] leading-snug">
                  {spotlight.headline}
                </p>
                <p className="text-[12px] text-[#8B7355] dark:text-[#888] mt-1 leading-relaxed">
                  {spotlight.detail}
                </p>
                <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF]">
                  {spotlight.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              {spotlight.person?.profilePhotoUrl && (
                <img
                  src={resolveBackendUrl(spotlight.person.profilePhotoUrl)}
                  alt=""
                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer stats bar */}
      <div className="px-4 py-2.5 bg-[#F8F6F1] dark:bg-[#1a1a1a] border-t border-stone-100 dark:border-[#333]">
        <button
          onClick={onNavigateToTree}
          className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] hover:text-[#253175] transition-colors"
        >
          Open your family tree <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
