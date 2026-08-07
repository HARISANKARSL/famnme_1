/**
 * Feed Engine Service
 *
 * Generates an ordered list of FeedCards from graph data.
 * Pure computation — no API calls.
 *
 * Strict zone ordering:
 *   TOP    → SnapshotCard, ProgressCard
 *   MIDDLE → AncestorCard, InsightCard, TimelineCard
 *   BOTTOM → PromptCard, UnlockCard, filler
 */

import type { Person, Union } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { buildFamilyTimeline } from '@/services/familyTimelineService'
import { getActiveFestivalBundle } from '@/data/festivals'
import { INTERVIEW_TEMPLATES } from '@/data/interviewTemplates'
import { detectFamilyReligion } from '@/services/religionDetectionService'

// ── Card type definitions ──────────────────────────────────────────────────

export interface SnapshotCardData {
  kind: 'snapshot'
  id: string
  familyName: string
  memberCount: number
  generationDepth: number
  rootAncestorName: string | null
  rootAncestorYear: number | null
  treeName: string
  narrativeLine: string | null
  dynamicInsight: string | null
}

export interface InsightCardData {
  kind: 'insight'
  id: string
  headline: string
  subtext: string
  icon: 'tree' | 'generations' | 'marriages' | 'span'
  whyItMatters?: string
  chain?: string[]
  actionLabel?: string
  actionType?: 'navigate-tree' | 'open-people'
}

export interface ProgressCardData {
  kind: 'progress'
  id: string
  percent: number
  topSuggestionName?: string
  topSuggestionType?: string
  topSuggestionPersonId?: string
  ctaLabel: string
  ctaAction: 'open-suggestions' | 'open-profile' | 'navigate-tree'
}

export interface AncestorCardData {
  kind: 'ancestor'
  id: string
  person: Person
  generationLabel: string
  lifespan: string | null
  descendantCount: number
  contextNote?: string
}

export interface TimelineCardData {
  kind: 'timeline'
  id: string
  year: number
  label: string
  detail?: string
  eventType: 'birth' | 'death' | 'historical'
  personId?: string
  personName?: string
  activeMemberCount?: number
  activeMemberNames?: string[]
}

export interface PromptCardData {
  kind: 'prompt'
  id: string
  emoji: string
  title: string
  question: string
  ctaLabel: string
  ctaAction: 'open-memories' | 'navigate-tree'
  dismissKey: string
}

export interface UnlockCardData {
  kind: 'unlock'
  id: string
  message: string
  ctaLabel: string
  ctaAction: 'navigate-tree'
}

export interface RewardCardData {
  kind: 'reward'
  id: string
  emoji: string
  headline: string
  subtext?: string
}

export interface YouPositionCardData {
  kind: 'you-position'
  id: string
  yourGeneration: number
  totalGenerations: number
  generationsAbove: number
  generationsBelow: number
  branchCompleteness: 'high' | 'medium' | 'low'
}

export interface DiscoveryCardData {
  kind: 'discovery'
  id: string
  question: string
  hook: string
  ctaLabel: string
  ctaPersonId?: string
}

export interface SurpriseCardData {
  kind: 'surprise'
  id: string
  badge: string
  stat: string
  context: string
}

export type FeedCard =
  | SnapshotCardData
  | InsightCardData
  | ProgressCardData
  | AncestorCardData
  | TimelineCardData
  | PromptCardData
  | UnlockCardData
  | RewardCardData
  | YouPositionCardData
  | DiscoveryCardData
  | SurpriseCardData

// ── Input ──────────────────────────────────────────────────────────────────

export interface FeedParams {
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  completenessPercent?: number
  topSuggestion?: { personId: string; personName: string; type: string } | null
  focusPersonId?: string | null
  treeName?: string
  treeId?: string
  sessionRotation?: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

function computeGenerationDepth(persons: Person[], relationships: Relationship[]): number {
  const home = persons.find(p => p.isHomePerson)
  if (!home) return Math.max(1, Math.ceil(Math.log2(persons.length + 1)))

  const visited = new Set<string>([home.personId])
  let queue: string[] = [home.personId]
  let depth = 0
  while (queue.length > 0) {
    const next: string[] = []
    for (const pid of queue) {
      const parentUnions = relationships.filter(r => r.type === 'HAS_CHILD' && r.toId === pid).map(r => r.fromId)
      for (const uid of parentUnions) {
        const parents = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === uid).map(r => r.fromId)
        for (const parentId of parents) {
          if (!visited.has(parentId)) { visited.add(parentId); next.push(parentId) }
        }
      }
    }
    if (next.length > 0) depth++
    queue = next
  }

  queue = [home.personId]
  const visitedDown = new Set<string>([home.personId])
  let downDepth = 0
  while (queue.length > 0) {
    const next: string[] = []
    for (const pid of queue) {
      const childUnions = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === pid).map(r => r.toId)
      for (const uid of childUnions) {
        const children = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === uid).map(r => r.toId)
        for (const childId of children) {
          if (!visitedDown.has(childId)) { visitedDown.add(childId); next.push(childId) }
        }
      }
    }
    if (next.length > 0) downDepth++
    queue = next
  }

  return depth + downDepth + 1
}

function collectAncestors(
  homePersonId: string,
  persons: Person[],
  relationships: Relationship[]
): Array<{ person: Person; generation: number }> {
  const personMap = new Map(persons.map(p => [p.personId, p]))
  const ancestors: Array<{ person: Person; generation: number }> = []
  const visited = new Set<string>([homePersonId])
  const queue: Array<[string, number]> = [[homePersonId, 0]]

  while (queue.length > 0) {
    const [personId, gen] = queue.shift()!
    const parentUnions = relationships.filter(r => r.type === 'HAS_CHILD' && r.toId === personId).map(r => r.fromId)
    for (const uid of parentUnions) {
      const parentIds = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === uid).map(r => r.fromId)
      for (const parentId of parentIds) {
        if (visited.has(parentId)) continue
        visited.add(parentId)
        const parent = personMap.get(parentId)
        if (!parent) continue
        ancestors.push({ person: parent, generation: gen + 1 })
        queue.push([parentId, gen + 1])
      }
    }
  }
  return ancestors
}

function countDescendants(personId: string, relationships: Relationship[]): number {
  const visited = new Set<string>([personId])
  const queue: string[] = [personId]
  let count = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    const unionIds = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === current).map(r => r.toId)
    for (const uid of unionIds) {
      const childIds = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === uid).map(r => r.toId)
      for (const childId of childIds) {
        if (!visited.has(childId)) { visited.add(childId); count++; queue.push(childId) }
      }
    }
  }
  return count
}

function getGenerationLabel(generation: number, gender: string): string {
  const isMale = gender === 'male'
  switch (generation) {
    case 1: return isMale ? 'Your father' : 'Your mother'
    case 2: return isMale ? 'Your grandfather' : 'Your grandmother'
    case 3: return isMale ? 'Your great-grandfather' : 'Your great-grandmother'
    default: return `Your ${generation - 2}x great-${isMale ? 'grandfather' : 'grandmother'}`
  }
}

function getLifespan(person: Person): string | null {
  const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : null
  const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null
  if (!birth) return null
  return `${birth}–${death || (person.isLiving !== false ? 'Present' : '?')}`
}

/** Detect if an ancestor has no recorded parents (root of their branch) */
function hasNoParents(personId: string, relationships: Relationship[]): boolean {
  return !relationships.some(r => r.type === 'HAS_CHILD' && r.toId === personId)
}

/** Get persons alive during a given year */
function getAliveDuring(year: number, persons: Person[]): Person[] {
  return persons.filter(p => {
    if (!p.birthDate) return false
    const born = new Date(p.birthDate).getFullYear()
    const died = p.deathDate
      ? new Date(p.deathDate).getFullYear()
      : p.isLiving !== false ? 9999 : born + 70
    return born <= year && died >= year
  })
}

/** Variation engine — localStorage tracking of last shown ancestor */
function getLastShownAncestor(treeId: string): string | null {
  try { return localStorage.getItem(`fc_last_ancestor_${treeId}`) } catch { return null }
}
function setLastShownAncestor(treeId: string, personId: string): void {
  try { localStorage.setItem(`fc_last_ancestor_${treeId}`, personId) } catch { /* noop */ }
}

/** Apply family-specific voice to prompt questions */
function personalizePromptQuestion(question: string): string {
  return question
    .replace(/\bHow do you celebrate\b/g, 'How does your family celebrate')
    .replace(/\bin your community\b/g, 'in your family')
    .replace(/\byour community\b/g, 'your family')
    .replace(/\bin your home\b/g, 'in your household')
    .replace(/\bdo you celebrate\b/g, 'does your family celebrate')
    .replace(/\bWhat do you\b/g, 'What does your family')
    .replace(/\bHow did you\b/g, 'How did your family')
}

// ── Card builders ──────────────────────────────────────────────────────────

function buildSnapshotCard(persons: Person[], relationships: Relationship[], treeName: string, sessionRotation = 0): SnapshotCardData {
  const home = persons.find(p => p.isHomePerson)
  const familyName = home?.lastName || treeName.replace(' Tree', '').replace(' Family', '')
  const genDepth = computeGenerationDepth(persons, relationships)

  // Find earliest-born ancestor
  const ancestors = home ? collectAncestors(home.personId, persons, relationships) : []
  let rootAncestorName: string | null = null
  let rootAncestorYear: number | null = null
  let earliestYear = Infinity
  let rootBirthPlace: string | null = null
  for (const { person } of ancestors) {
    if (person.birthDate) {
      const y = new Date(person.birthDate).getFullYear()
      if (y < earliestYear) {
        earliestYear = y
        rootAncestorName = `${person.firstName} ${person.lastName || ''}`.trim()
        rootAncestorYear = y
        rootBirthPlace = person.birthPlace || null
      }
    }
    if (!rootAncestorName && hasNoParents(person.personId, relationships)) {
      rootAncestorName = `${person.firstName} ${person.lastName || ''}`.trim()
      rootBirthPlace = person.birthPlace || null
    }
  }

  // Compute narrative line
  const birthPlaceCount = new Set(persons.map(p => p.birthPlace).filter(Boolean)).size
  let narrativeLine: string | null = null
  if (rootBirthPlace && rootAncestorYear) {
    narrativeLine = `Your roots trace to ${rootBirthPlace} in ${rootAncestorYear}`
  } else if (rootAncestorYear) {
    narrativeLine = `Your family's recorded story begins in ${rootAncestorYear}`
  } else if (genDepth > 1) {
    narrativeLine = birthPlaceCount > 1
      ? `Spanning ${genDepth} generations across ${birthPlaceCount} places`
      : `Spanning ${genDepth} generations of recorded history`
  }

  // Compute dynamic insight — 3 rotating variants (selected by sessionRotation % 3)
  const decadeCounts: Record<number, number> = {}
  for (const p of persons) {
    if (p.birthDate) {
      const decade = Math.floor(new Date(p.birthDate).getFullYear() / 10) * 10
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1
    }
  }
  const topEntry = Object.entries(decadeCounts).sort((a, b) => +b[1] - +a[1])[0]
  const currentYear = new Date().getFullYear()

  // Variant 0 — Growth
  const growthInsight: string | null = topEntry && +topEntry[1] >= 3
    ? `Most growth happened in the ${topEntry[0]}s`
    : birthPlaceCount >= 2
    ? `Your family grew across ${birthPlaceCount} places`
    : null
  // Variant 1 — Geography
  const geographyInsight: string | null = birthPlaceCount >= 2 && genDepth >= 2
    ? `Rooted in ${birthPlaceCount} places across ${genDepth} generation${genDepth !== 1 ? 's' : ''}`
    : genDepth >= 2 ? `A ${genDepth}-generation legacy` : null
  // Variant 2 — Generation depth
  const generationInsight: string | null = earliestYear !== Infinity
    ? `Your oldest ancestor was born ${currentYear - earliestYear} years ago`
    : null

  const insightVariants = [growthInsight, geographyInsight, generationInsight]
  // When narrativeLine already mentions place count (fallback case), avoid showing
  // place-based insight variants that would duplicate the information.
  // Prefer the generation-year insight or decade insight which are non-redundant.
  const narrativeMentionsPlaces = narrativeLine?.includes(' places') && !rootAncestorYear
  const dynamicInsight = narrativeMentionsPlaces
    ? (generationInsight ?? (topEntry && +topEntry[1] >= 3 ? `Most growth happened in the ${topEntry[0]}s` : null) ?? null)
    : (insightVariants[sessionRotation % 3] ?? insightVariants.find(i => i !== null) ?? null)

  return {
    kind: 'snapshot',
    id: 'snapshot-identity',
    familyName,
    memberCount: persons.length,
    generationDepth: genDepth,
    rootAncestorName,
    rootAncestorYear: earliestYear !== Infinity ? earliestYear : null,
    treeName,
    narrativeLine,
    dynamicInsight,
  }
}

function buildInsightCards(persons: Person[], unions: Union[], relationships: Relationship[]): InsightCardData[] {
  const cards: InsightCardData[] = []
  const count = persons.length
  const marriages = unions.length
  const genDepth = computeGenerationDepth(persons, relationships)
  const birthPlaceCount = new Set(persons.map(p => p.birthPlace).filter(Boolean)).size

  if (count > 0) {
    const sizeChain: string[] = [
      `Your tree covers ${genDepth} generation${genDepth !== 1 ? 's' : ''} of recorded history`,
      birthPlaceCount < 3
        ? 'Add birth locations to reveal where your family spread'
        : `Family spread across ${birthPlaceCount} places`,
    ]
    cards.push({
      kind: 'insight',
      id: 'insight-family-size',
      headline: count === 1
        ? 'Your family story has begun'
        : `You belong to a family of ${count} people`,
      subtext: count < 10
        ? 'Every great lineage starts here. Keep adding members.'
        : count < 50
        ? 'Your tree is growing into something meaningful.'
        : 'A legacy that deserves to be told.',
      whyItMatters: 'Larger families tend to preserve stronger cultural memory across generations.',
      chain: sizeChain,
      icon: 'tree',
      actionLabel: 'See all members',
      actionType: 'open-people',
    })
  }

  if (marriages > 0) {
    cards.push({
      kind: 'insight',
      id: 'insight-marriages',
      headline: marriages === 1
        ? 'One marriage has shaped your family'
        : `${marriages} marriages have shaped your family`,
      subtext: 'Each union wove two families and their entire histories together.',
      whyItMatters: 'Marriage alliances often carried cultural, economic, and social significance across generations.',
      icon: 'marriages',
    })
  }

  return cards
}

function buildAncestorCards(persons: Person[], relationships: Relationship[], treeId: string): AncestorCardData[] {
  const home = persons.find(p => p.isHomePerson)
  if (!home) return []
  const ancestors = collectAncestors(home.personId, persons, relationships)
  if (ancestors.length === 0) return []

  // Find earliest birth year among all ancestors for context detection
  let earliestYear = Infinity
  for (const { person } of ancestors) {
    if (person.birthDate) {
      const y = new Date(person.birthDate).getFullYear()
      if (y < earliestYear) earliestYear = y
    }
  }

  // Find max descendants for context detection
  let maxDescendants = 0
  for (const { person } of ancestors) {
    const dc = countDescendants(person.personId, relationships)
    if (dc > maxDescendants) maxDescendants = dc
  }

  // Variation engine: avoid showing same ancestor two sessions in a row
  const lastShown = getLastShownAncestor(treeId)
  const day = getDayOfYear()
  const primaryIdx = day % ancestors.length
  const secondaryIdx = (day + 1) % ancestors.length

  // Shift primary if it matches last shown
  const adjustedPrimaryIdx = lastShown && ancestors[primaryIdx]?.person.personId === lastShown
    ? (primaryIdx + 1) % ancestors.length
    : primaryIdx

  const cards: AncestorCardData[] = []
  const indices = new Set<number>([adjustedPrimaryIdx, secondaryIdx])

  for (const idx of indices) {
    const { person, generation } = ancestors[idx]
    if (cards.some(c => c.person.personId === person.personId)) continue

    const dc = countDescendants(person.personId, relationships)
    const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null

    // Build context note
    let contextNote: string | undefined
    if (hasNoParents(person.personId, relationships)) {
      contextNote = 'The root of this branch — no ancestors recorded further back'
    } else if (birthYear && birthYear <= earliestYear + 5) {
      contextNote = 'One of the earliest recorded members in your tree'
    } else if (dc === maxDescendants && dc > 5) {
      contextNote = 'The most connected ancestor in your lineage'
    }

    cards.push({
      kind: 'ancestor',
      id: `ancestor-${person.personId}`,
      person,
      generationLabel: getGenerationLabel(generation, person.gender || 'male'),
      lifespan: getLifespan(person),
      descendantCount: dc,
      contextNote,
    })
  }

  // Record which ancestor was shown (first/primary card)
  if (cards.length > 0) {
    setLastShownAncestor(treeId, cards[0].person.personId)
  }

  return cards
}

function buildTimelineCards(persons: Person[]): TimelineCardData[] {
  const events = buildFamilyTimeline(persons, 6)
  return events.map(e => {
    let activeMemberCount: number | undefined
    let activeMemberNames: string[] | undefined
    if (e.type === 'historical') {
      const alive = getAliveDuring(e.year, persons)
      activeMemberCount = alive.length
      activeMemberNames = alive.slice(0, 2).map(p => p.firstName).filter(Boolean)
    }
    return {
      kind: 'timeline' as const,
      id: `timeline-${e.year}-${e.type}-${e.personId || 'hist'}`,
      year: e.year,
      label: e.type === 'historical' ? `Your family lived through — ${e.label}` : e.label,
      detail: e.detail,
      eventType: e.type,
      personId: e.personId,
      personName: e.personName,
      activeMemberCount,
      activeMemberNames,
    }
  })
}

function buildPromptCards(persons: Person[]): PromptCardData[] {
  const cards: PromptCardData[] = []
  const religion = detectFamilyReligion(persons)
  const festival = getActiveFestivalBundle(religion)
  const day = getDayOfYear()

  if (festival) {
    const idx = day % festival.prompts.length
    const rawQuestion = festival.prompts[idx].question
    cards.push({
      kind: 'prompt',
      id: `prompt-festival-${festival.festivalName}`,
      emoji: festival.emoji,
      title: festival.festivalName,
      question: personalizePromptQuestion(rawQuestion),
      ctaLabel: 'Write a Memory',
      ctaAction: 'open-memories',
      dismissKey: `prompt_festival_${festival.festivalName}_${new Date().toISOString().slice(0, 10)}`,
    })
  } else {
    const tIdx = day % INTERVIEW_TEMPLATES.length
    const template = INTERVIEW_TEMPLATES[tIdx]
    const qIdx = day % template.questions.length
    const rawQuestion = template.questions[qIdx].question
    cards.push({
      kind: 'prompt',
      id: `prompt-interview-${tIdx}`,
      emoji: '💬',
      title: template.title,
      question: personalizePromptQuestion(rawQuestion),
      ctaLabel: 'Write a Story',
      ctaAction: 'open-memories',
      dismissKey: `prompt_interview_${tIdx}_${new Date().toISOString().slice(0, 10)}`,
    })
  }

  return cards
}

function buildUnlockCards(persons: Person[], relationships: Relationship[]): UnlockCardData[] {
  const cards: UnlockCardData[] = []
  const home = persons.find(p => p.isHomePerson)
  const ancestors = home ? collectAncestors(home.personId, persons, relationships) : []

  // Find root ancestor name for curiosity messaging
  let rootAncestorName: string | null = null
  let earliestY = Infinity
  for (const { person } of ancestors) {
    if (person.birthDate) {
      const y = new Date(person.birthDate).getFullYear()
      if (y < earliestY) { earliestY = y; rootAncestorName = person.firstName }
    }
    if (!rootAncestorName && hasNoParents(person.personId, relationships)) {
      rootAncestorName = person.firstName
    }
  }

  if (ancestors.length < 4) {
    cards.push({
      kind: 'unlock',
      id: 'unlock-migration',
      message: rootAncestorName
        ? `You might have ancestors beyond ${rootAncestorName} — add ${Math.max(1, 4 - ancestors.length)} more connections`
        : `Add ${Math.max(1, 4 - ancestors.length)} more ancestor${4 - ancestors.length !== 1 ? 's' : ''} to discover your family's migration patterns`,
      ctaLabel: 'Add ancestors',
      ctaAction: 'navigate-tree',
    })
  }

  const birthPlaces = new Set(persons.map(p => p.birthPlace).filter(Boolean))
  if (birthPlaces.size < 3 && persons.length >= 5) {
    cards.push({
      kind: 'unlock',
      id: 'unlock-geography',
      message: 'Add birth locations to reveal where your family spread across India',
      ctaLabel: 'Edit profiles',
      ctaAction: 'navigate-tree',
    })
  }

  if (persons.length < 20) {
    cards.push({
      kind: 'unlock',
      id: 'unlock-depth',
      message: `Add ${Math.max(1, 20 - persons.length)} more members to unlock generation-depth insights`,
      ctaLabel: 'Grow your tree',
      ctaAction: 'navigate-tree',
    })
  }

  // Return at most 1 unlock card (most impactful)
  return cards.slice(0, 1)
}

function buildRewardCards(persons: Person[], relationships: Relationship[], treeId: string): RewardCardData[] {
  if (!treeId || typeof window === 'undefined') return []

  const rewards: RewardCardData[] = []
  const now = persons.length
  const genDepth = computeGenerationDepth(persons, relationships)
  const hasBirthPlace = persons.some(p => p.birthPlace)

  try {
    const storedCount = parseInt(localStorage.getItem(`fc_milestone_count_${treeId}`) || '0', 10)
    const storedDepth = parseInt(localStorage.getItem(`fc_milestone_depth_${treeId}`) || '0', 10)
    const storedPlace = localStorage.getItem(`fc_milestone_place_${treeId}`) === '1'

    // Update stored values immediately to prevent repeat
    localStorage.setItem(`fc_milestone_count_${treeId}`, String(now))
    localStorage.setItem(`fc_milestone_depth_${treeId}`, String(genDepth))
    if (hasBirthPlace) localStorage.setItem(`fc_milestone_place_${treeId}`, '1')

    if (storedCount > 0 && now > storedCount) {
      rewards.push({
        kind: 'reward',
        id: 'reward-member-growth',
        emoji: '🎉',
        headline: `Your family just grew to ${now} members!`,
        subtext: `${now - storedCount} new member${now - storedCount !== 1 ? 's' : ''} added since your last visit`,
      })
    } else if (storedDepth > 0 && genDepth > storedDepth) {
      rewards.push({
        kind: 'reward',
        id: 'reward-generation-unlock',
        emoji: '✨',
        headline: `You unlocked a new generation!`,
        subtext: `Your tree now spans ${genDepth} generations of history`,
      })
    } else if (!storedPlace && hasBirthPlace && now >= 3) {
      rewards.push({
        kind: 'reward',
        id: 'reward-first-location',
        emoji: '📍',
        headline: "Your family's first location is on record",
        subtext: "The map of your family's journey is starting to take shape",
      })
    }
  } catch {
    // localStorage not available
  }

  return rewards.slice(0, 1)
}

function buildYouPositionCard(persons: Person[], relationships: Relationship[]): YouPositionCardData | null {
  const home = persons.find(p => p.isHomePerson)
  if (!home) return null

  // BFS up: count ancestor generation hops
  const visitedUp = new Set<string>([home.personId])
  let queueUp: string[] = [home.personId]
  let generationsAbove = 0
  while (queueUp.length > 0) {
    const next: string[] = []
    for (const pid of queueUp) {
      const parentUnions = relationships.filter(r => r.type === 'HAS_CHILD' && r.toId === pid).map(r => r.fromId)
      for (const uid of parentUnions) {
        const parents = relationships.filter(r => r.type === 'PARTNER_IN' && r.toId === uid).map(r => r.fromId)
        for (const parentId of parents) {
          if (!visitedUp.has(parentId)) { visitedUp.add(parentId); next.push(parentId) }
        }
      }
    }
    if (next.length > 0) generationsAbove++
    queueUp = next
  }

  // BFS down: count descendant generation hops
  const visitedDown = new Set<string>([home.personId])
  let queueDown: string[] = [home.personId]
  let generationsBelow = 0
  while (queueDown.length > 0) {
    const next: string[] = []
    for (const pid of queueDown) {
      const childUnions = relationships.filter(r => r.type === 'PARTNER_IN' && r.fromId === pid).map(r => r.toId)
      for (const uid of childUnions) {
        const children = relationships.filter(r => r.type === 'HAS_CHILD' && r.fromId === uid).map(r => r.toId)
        for (const childId of children) {
          if (!visitedDown.has(childId)) { visitedDown.add(childId); next.push(childId) }
        }
      }
    }
    if (next.length > 0) generationsBelow++
    queueDown = next
  }

  const branchCompleteness: 'high' | 'medium' | 'low' =
    generationsAbove >= 4 ? 'high' : generationsAbove >= 2 ? 'medium' : 'low'

  return {
    kind: 'you-position',
    id: 'you-position',
    yourGeneration: generationsAbove + 1,
    totalGenerations: generationsAbove + 1 + generationsBelow,
    generationsAbove,
    generationsBelow,
    branchCompleteness,
  }
}

function buildDiscoveryCard(persons: Person[], relationships: Relationship[], treeName: string): DiscoveryCardData | null {
  if (persons.length < 5) return null
  const home = persons.find(p => p.isHomePerson)
  if (!home) return null
  const ancestors = collectAncestors(home.personId, persons, relationships)
  if (ancestors.length === 0) return null

  // Find root ancestors (no parents recorded)
  const rootAncestors = ancestors.filter(({ person }) => hasNoParents(person.personId, relationships))
  if (rootAncestors.length === 0) return null

  // Pick earliest-born root ancestor
  let rootAncestor = rootAncestors[0]
  for (const a of rootAncestors) {
    if (a.person.birthDate && rootAncestor.person.birthDate) {
      if (new Date(a.person.birthDate).getFullYear() < new Date(rootAncestor.person.birthDate).getFullYear()) {
        rootAncestor = a
      }
    }
  }

  const { person } = rootAncestor
  const name = `${person.firstName} ${person.lastName || ''}`.trim()
  const familyName = treeName.replace(' Tree', '').replace(' Family', '')

  return {
    kind: 'discovery',
    id: 'discovery-origin',
    question: `Where did the ${familyName} family originate?`,
    hook: `${name} is your earliest recorded ancestor — your lineage likely extends further back in time`,
    ctaLabel: `Add ${person.firstName}'s parents to explore`,
    ctaPersonId: person.personId,
  }
}

function buildSurpriseCards(persons: Person[], relationships: Relationship[], unions: Union[]): SurpriseCardData[] {
  const cards: SurpriseCardData[] = []
  const genDepth = computeGenerationDepth(persons, relationships)
  const count = persons.length
  const marriages = unions.length

  let earliest = Infinity, latest = -Infinity
  for (const p of persons) {
    if (p.birthDate) {
      const y = new Date(p.birthDate).getFullYear()
      if (y > 1800) { earliest = Math.min(earliest, y); latest = Math.max(latest, y) }
    }
  }
  const span = earliest !== Infinity ? latest - earliest : 0

  if (genDepth >= 5) {
    cards.push({
      kind: 'surprise',
      id: 'surprise-generations',
      badge: genDepth >= 7 ? 'RARE' : 'TOP 5%',
      stat: `${genDepth} generations documented`,
      context: genDepth >= 7
        ? 'Less than 1% of family trees document this many generations'
        : 'Only 5% of family trees reach this depth of recorded history',
    })
  }

  if (count >= 100) {
    cards.push({
      kind: 'surprise',
      id: 'surprise-members',
      badge: count >= 200 ? 'REMARKABLE' : 'TOP 10%',
      stat: `${count} family members documented`,
      context: count >= 200
        ? 'A truly comprehensive family record — exceptionally rare'
        : 'Most family trees document fewer than 50 people',
    })
  }

  if (marriages >= 50 && cards.length < 2) {
    cards.push({
      kind: 'surprise',
      id: 'surprise-marriages',
      badge: 'REMARKABLE',
      stat: `${marriages} documented marriages`,
      context: 'A remarkable tapestry of family connections across generations',
    })
  }

  if (span >= 150 && cards.length < 2) {
    cards.push({
      kind: 'surprise',
      id: 'surprise-span',
      badge: span >= 200 ? 'RARE' : 'NOTABLE',
      stat: `${span}-year documented family history`,
      context: `From ${earliest} to ${latest} — a legacy spanning generations`,
    })
  }

  return cards.slice(0, 2)
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateFeed(params: FeedParams): FeedCard[] {
  const { persons, unions, relationships, completenessPercent, topSuggestion, treeName = 'My Family Tree', treeId = '', sessionRotation = 0 } = params

  // ── NEW USER (< 3 members): guidance mode ─────────────────────────────
  if (persons.length < 3) {
    const feed: FeedCard[] = []

    // Snapshot at top even for new users
    feed.push(buildSnapshotCard(persons, relationships, treeName, sessionRotation))

    if (completenessPercent !== undefined && completenessPercent < 90) {
      feed.push({
        kind: 'progress',
        id: 'progress-main',
        percent: completenessPercent,
        topSuggestionName: topSuggestion?.personName,
        topSuggestionType: topSuggestion?.type,
        topSuggestionPersonId: topSuggestion?.personId,
        ctaLabel: topSuggestion ? `Complete ${topSuggestion.personName}'s profile to go deeper` : 'Add more members',
        ctaAction: topSuggestion ? 'open-profile' : 'navigate-tree',
      })
    }

    feed.push({
      kind: 'insight',
      id: 'insight-welcome',
      headline: persons.length === 0 ? 'Your family story starts here' : 'Your story is just beginning',
      subtext: 'Add your parents, grandparents and siblings to unlock insights about your lineage.',
      icon: 'tree',
      actionLabel: 'Start building',
      actionType: 'navigate-tree',
    })

    const prompts = buildPromptCards(persons)
    if (prompts[0]) feed.push(prompts[0])

    feed.push({
      kind: 'unlock',
      id: 'unlock-new-user',
      message: 'Add 3 members to unlock your first family insights',
      ctaLabel: 'Add family members',
      ctaAction: 'navigate-tree',
    })

    return feed
  }

  // ── RETURNING USER: strict zone ordering ──────────────────────────────
  const insightCards = buildInsightCards(persons, unions, relationships)
  const ancestorCards = buildAncestorCards(persons, relationships, treeId)
  const rewardCards = buildRewardCards(persons, relationships, treeId)
  const timelineCards = buildTimelineCards(persons)
  const promptCards = buildPromptCards(persons)
  const unlockCards = buildUnlockCards(persons, relationships)
  const youPosition = buildYouPositionCard(persons, relationships)
  const discoveryCard = buildDiscoveryCard(persons, relationships, treeName)
  const surpriseCards = buildSurpriseCards(persons, relationships, unions)

  // ZONE 1 — TOP (fixed)
  const zone1: FeedCard[] = []
  zone1.push(buildSnapshotCard(persons, relationships, treeName, sessionRotation))
  if (youPosition) zone1.push(youPosition)
  if (rewardCards[0]) zone1.push(rewardCards[0])
  if (completenessPercent !== undefined && completenessPercent < 95) {
    zone1.push({
      kind: 'progress',
      id: 'progress-main',
      percent: completenessPercent,
      topSuggestionName: topSuggestion?.personName,
      topSuggestionType: topSuggestion?.type,
      topSuggestionPersonId: topSuggestion?.personId,
      ctaLabel: topSuggestion ? `Complete ${topSuggestion.personName}'s profile to go deeper` : 'View suggestions to unlock more',
      ctaAction: topSuggestion ? 'open-profile' : 'open-suggestions',
    })
  }

  // ZONE 2 — MIDDLE (rotating)
  const zone2: FeedCard[] = []
  if (ancestorCards[0]) zone2.push(ancestorCards[0])

  const primaryInsight = insightCards.find(c => c.id === 'insight-family-size') || insightCards[0]
  if (primaryInsight) zone2.push(primaryInsight)
  if (discoveryCard) zone2.push(discoveryCard)

  const day = getDayOfYear()
  // Pick a personal timeline event (birth/death) first
  const personalTimeline = timelineCards.filter(c => c.eventType !== 'historical')
  const historicalTimeline = timelineCards.filter(c => c.eventType === 'historical')
  if (personalTimeline.length > 0) zone2.push(personalTimeline[day % personalTimeline.length])
  else if (timelineCards.length > 0) zone2.push(timelineCards[day % timelineCards.length])

  const secondInsight = insightCards.find(c => c.id === 'insight-marriages')
  if (secondInsight && secondInsight.id !== primaryInsight?.id) zone2.push(secondInsight)

  // ZONE 3 — BOTTOM
  const zone3: FeedCard[] = []
  if (promptCards[0]) zone3.push(promptCards[0])
  if (unlockCards[0]) zone3.push(unlockCards[0])

  // Filler: historical timeline, more timeline
  for (const tc of historicalTimeline) zone3.push(tc)
  for (const tc of personalTimeline) zone3.push(tc)

  const all = [...zone1, ...zone2, ...zone3]

  // Deduplicate
  const seen = new Set<string>()
  const deduped = all.filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  }).slice(0, 14)

  // Splice surprise cards at positions 5 and 10 for rhythm variation
  if (surpriseCards[0] && deduped.length > 5) {
    deduped.splice(5, 0, surpriseCards[0])
  }
  if (surpriseCards[1] && deduped.length > 10) {
    deduped.splice(10, 0, surpriseCards[1])
  }

  return deduped
}
