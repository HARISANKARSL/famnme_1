/**
 * RelationshipChallengeCard — Gamified daily family challenge
 *
 * Multiple challenge types that rotate daily:
 * 1. "How are they related?" — discover the connection
 * 2. "Whose hometown?" — match a place to a person
 * 3. "Who am I?" — guess the ancestor from clues
 *
 * Tracks XP, streak, and challenge stats — persisted to backend (PostgreSQL)
 * with localStorage as instant cache. Psychology: variable rewards, competence
 * building, loss aversion (streak), narrative framing, social sharing.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { AppTooltip } from '@/components/ui/AppTooltip'
import {
  HelpCircle, Shuffle, Share2, ChevronRight, MapPin, User,
  Flame, Star, Trophy, Zap, Check, X as XIcon,
} from 'lucide-react'
import type { Person } from '@/types'
import { resolveBackendUrl } from '@/config/api'
import {
  fetchChallengeStats,
  saveChallengeStats,
  mergeStats,
  type ChallengeStats,
} from '@/services/challengeApiService'
import { shareCard } from '@/utils/shareCardGenerator'

// ── Types ──

type ChallengeType = 'relationship' | 'hometown' | 'whoami'

interface RelationshipChallengeCardProps {
  persons: Person[]
  treeId: string
  familyName?: string
  onReveal?: (personAId: string, personBId: string) => void
  onOpenProfile?: (personId: string) => void
}

// ── Constants ──

const XP_PER_CORRECT = 25
const XP_PER_ATTEMPT = 5
const XP_STREAK_BONUS = 10
const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500]
const LEVEL_TITLES = ['Newcomer', 'Curious', 'Explorer', 'Historian', 'Storyteller', 'Chronicler', 'Genealogist', 'Archivist', 'Elder', 'Patriarch']

// ── Persistence ──

function loadLocalStats(treeId: string): ChallengeStats {
  try {
    const raw = localStorage.getItem(`fc_challenge_${treeId}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { totalXP: 0, challengesCompleted: 0, correctAnswers: 0, currentStreak: 0, longestStreak: 0, lastPlayedDate: '', level: 0 }
}

function saveLocalStats(treeId: string, stats: ChallengeStats): void {
  try {
    localStorage.setItem(`fc_challenge_${treeId}`, JSON.stringify(stats))
  } catch { /* ignore */ }
}

/** Save to localStorage + backend (fire-and-forget). */
function persistStats(treeId: string, stats: ChallengeStats): void {
  saveLocalStats(treeId, stats)
  saveChallengeStats(treeId, stats) // async, no await
}

function getLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]) return i
  }
  return 0
}

function getXPToNextLevel(xp: number): { current: number; needed: number; percent: number } {
  const level = getLevel(xp)
  const currentLevelXP = LEVELS[level]
  const nextLevelXP = LEVELS[level + 1] || LEVELS[level] + 500
  const current = xp - currentLevelXP
  const needed = nextLevelXP - currentLevelXP
  return { current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) }
}

// ── Helpers ──

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86400000)
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function seededPick<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined
  return arr[seed % arr.length]
}

function seededPair(persons: Person[], seed: number): [Person, Person] | null {
  const eligible = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))
  if (eligible.length < 2) return null
  const home = eligible.find(p => p.isHomePerson)
  const others = eligible.filter(p => !p.isHomePerson)
  if (home && others.length > 0) {
    return [home, others[seed % others.length]]
  }
  const i = seed % eligible.length
  let j = (seed * 7 + 13) % eligible.length
  if (j === i) j = (j + 1) % eligible.length
  return [eligible[i], eligible[j]]
}

// ── Build challenges from family data ──

interface Challenge {
  type: ChallengeType
  title: string
  subtitle: string
  icon: typeof HelpCircle
  iconColor: string
}

function buildAvailableChallenges(persons: Person[]): Challenge[] {
  const challenges: Challenge[] = []
  const living = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')))

  // Always available: relationship challenge
  if (living.length >= 2) {
    challenges.push({
      type: 'relationship',
      title: 'How are they related?',
      subtitle: 'Discover the connection between two family members',
      icon: HelpCircle,
      iconColor: 'text-[#2F3E8F]',
    })
  }

  // Hometown challenge: need people with birthPlace
  const withPlaces = living.filter(p => p.birthPlace || p.nativePlace)
  if (withPlaces.length >= 2) {
    challenges.push({
      type: 'hometown',
      title: 'Whose hometown?',
      subtitle: 'Match the place to the right family member',
      icon: MapPin,
      iconColor: 'text-[#C2A46D]',
    })
  }

  // Who am I: need people with some data
  const withData = living.filter(p => (p.occupation || p.birthPlace || p.birthDate) && p.firstName)
  if (withData.length >= 3) {
    challenges.push({
      type: 'whoami',
      title: 'Who am I?',
      subtitle: 'Guess the family member from the clues',
      icon: User,
      iconColor: 'text-[#4B2C5E]',
    })
  }

  return challenges
}

// ── Person avatar ──

function PersonBubble({ person, onClick, size = 'md', highlight }: {
  person: Person
  onClick?: () => void
  size?: 'sm' | 'md'
  highlight?: boolean
}) {
  const photoUrl = person.profilePhotoUrl ? resolveBackendUrl(person.profilePhotoUrl) : null
  const initials = `${person.firstName?.[0] || ''}${person.lastName?.[0] || ''}`.toUpperCase()
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14 md:w-16 md:h-16'

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <div className={`${dim} rounded-full overflow-hidden transition-all ${
        highlight
          ? 'ring-3 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
          : 'ring-2 ring-[#2F3E8F]/20 dark:ring-[#5A6BFF]/20 group-hover:ring-[#2F3E8F]/50'
      }`}>
        {photoUrl ? (
          <img src={photoUrl} alt={person.firstName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#2F3E8F] flex items-center justify-center">
            <span className="text-white text-base font-semibold">{initials}</span>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-stone-700 dark:text-[#ccc] max-w-[80px] truncate">
        {person.firstName}
      </span>
    </button>
  )
}

// ── Main Component ──

export function RelationshipChallengeCard({
  persons,
  treeId,
  familyName,
  onOpenProfile,
}: RelationshipChallengeCardProps) {
  const [stats, setStats] = useState(() => loadLocalStats(treeId))
  const [shuffleSeed, setShuffleSeed] = useState(getDayOfYear())
  const [revealed, setRevealed] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [pathLabel, setPathLabel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showXPGain, setShowXPGain] = useState<number | null>(null)
  const backendSynced = useRef(false)

  // Sync with backend on mount — merge local + remote, keep highest values
  useEffect(() => {
    if (backendSynced.current) return
    backendSynced.current = true
    fetchChallengeStats(treeId).then(remote => {
      if (!remote) return
      setStats(local => {
        const merged = mergeStats(local, remote)
        saveLocalStats(treeId, merged)
        return merged
      })
    })
  }, [treeId])

  // Check streak continuity
  useEffect(() => {
    const today = getToday()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    if (stats.lastPlayedDate && stats.lastPlayedDate !== today && stats.lastPlayedDate !== yesterdayStr) {
      // Streak broken
      setStats(prev => {
        const updated = { ...prev, currentStreak: 0 }
        persistStats(treeId, updated)
        return updated
      })
    }
  }, [treeId, stats.lastPlayedDate])

  // Available challenges
  const challenges = useMemo(() => buildAvailableChallenges(persons), [persons])
  const currentChallenge = challenges.length > 0 ? challenges[shuffleSeed % challenges.length] : null

  // Generate challenge data based on type
  const pair = useMemo(() => seededPair(persons, shuffleSeed), [persons, shuffleSeed])

  // Hometown challenge data
  const hometownData = useMemo(() => {
    const withPlaces = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')) && (p.birthPlace || p.nativePlace))
    if (withPlaces.length < 2) return null
    const target = seededPick(withPlaces, shuffleSeed)
    if (!target) return null
    const place = target.nativePlace || target.birthPlace || ''
    // Pick 2 wrong answers
    const others = withPlaces.filter(p => p.personId !== target.personId && (p.nativePlace || p.birthPlace) !== place)
    const wrong1 = seededPick(others, shuffleSeed + 3)
    const wrong2 = seededPick(others.filter(p => p.personId !== wrong1?.personId), shuffleSeed + 7)
    const options = [target, wrong1, wrong2].filter(Boolean) as Person[]
    // Shuffle options deterministically
    options.sort((a, b) => {
      const ha = a.personId.charCodeAt(0) + shuffleSeed
      const hb = b.personId.charCodeAt(0) + shuffleSeed
      return ha - hb
    })
    return { place, correctId: target.personId, options, target }
  }, [persons, shuffleSeed])

  // Who Am I challenge data
  const whoamiData = useMemo(() => {
    const withData = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_')) && p.firstName && (p.occupation || p.birthPlace || p.birthDate))
    if (withData.length < 3) return null
    const target = seededPick(withData, shuffleSeed + 5)
    if (!target) return null

    const clues: string[] = []
    if (target.gender) clues.push(target.gender === 'male' ? 'I am a man in the family' : target.gender === 'female' ? 'I am a woman in the family' : 'I am a member of the family')
    if (target.occupation) clues.push(`My profession: ${target.occupation}`)
    if (target.birthPlace) clues.push(`I was born in ${target.birthPlace}`)
    if (target.birthDate) {
      const decade = Math.floor(new Date(target.birthDate).getFullYear() / 10) * 10
      clues.push(`I was born in the ${decade}s`)
    }
    if (target.nativePlace && target.nativePlace !== target.birthPlace) clues.push(`My native place is ${target.nativePlace}`)

    // Options
    const others = withData.filter(p => p.personId !== target.personId)
    const wrong1 = seededPick(others, shuffleSeed + 11)
    const wrong2 = seededPick(others.filter(p => p.personId !== wrong1?.personId), shuffleSeed + 17)
    const options = [target, wrong1, wrong2].filter(Boolean) as Person[]
    options.sort((a, b) => a.personId.localeCompare(b.personId))

    return { clues: clues.slice(0, 3), correctId: target.personId, options, target }
  }, [persons, shuffleSeed])

  // ── Award XP ──
  const awardXP = useCallback((correct: boolean) => {
    const today = getToday()
    const xpGain = correct ? XP_PER_CORRECT : XP_PER_ATTEMPT
    const isNewDay = stats.lastPlayedDate !== today
    const streakBonus = isNewDay && correct ? XP_STREAK_BONUS : 0
    const totalGain = xpGain + streakBonus

    setShowXPGain(totalGain)
    setTimeout(() => setShowXPGain(null), 2000)

    setStats(prev => {
      const newXP = prev.totalXP + totalGain
      const newStreak = isNewDay
        ? (correct ? prev.currentStreak + 1 : 0)
        : prev.currentStreak
      const updated: ChallengeStats = {
        totalXP: newXP,
        challengesCompleted: prev.challengesCompleted + 1,
        correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastPlayedDate: today,
        level: getLevel(newXP),
      }
      persistStats(treeId, updated)
      return updated
    })
  }, [stats.lastPlayedDate, treeId])

  // ── Relationship reveal ──
  const handleRelationshipReveal = useCallback(async () => {
    if (!pair || revealed) return
    setLoading(true)
    try {
      const { fetchRelationshipPath } = await import('@/services/neo4jDataService')
      const result = await fetchRelationshipPath(pair[0].personId, pair[1].personId, treeId)
      const label = result.derivedRelationship?.label || 'Distant relatives'
      setPathLabel(label)
      setRevealed(true)
      setIsCorrect(true) // Revealing is always "correct" for this type
      awardXP(true)
    } catch {
      setPathLabel('Relationship unknown')
      setRevealed(true)
      awardXP(false)
    } finally {
      setLoading(false)
    }
  }, [pair, revealed, treeId, awardXP])

  // ── Multiple choice answer ──
  const handleAnswer = useCallback((personId: string, correctId: string) => {
    if (revealed) return
    setSelectedAnswer(personId)
    const correct = personId === correctId
    setIsCorrect(correct)
    setRevealed(true)
    awardXP(correct)
  }, [revealed, awardXP])

  // ── Shuffle ──
  const handleShuffle = useCallback(() => {
    setShuffleSeed(prev => prev + 1)
    setRevealed(false)
    setPathLabel(null)
    setIsCorrect(null)
    setSelectedAnswer(null)
  }, [])

  // ── Share ──
  const handleShare = useCallback(async () => {
    if (!currentChallenge) return
    const title = currentChallenge.type === 'relationship' && pair && pathLabel
      ? `${pair[0].firstName} is ${pair[1].firstName}'s ${pathLabel}`
      : `Solved today's Family Challenge!`
    await shareCard({
      title,
      highlight: `Level ${stats.level + 1}: ${LEVEL_TITLES[stats.level]}`,
      subtitle: `${stats.totalXP} XP · ${stats.currentStreak} day streak`,
      familyName: familyName || 'My Family',
    })
  }, [currentChallenge, pair, pathLabel, stats, familyName])

  if (!currentChallenge || persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length < 2) return null

  const level = getLevel(stats.totalXP)
  const xpProgress = getXPToNextLevel(stats.totalXP)

  return (
    <div className="rounded-2xl bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
      {/* ── Stats bar ── */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
        {/* Level badge */}
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C2A46D] to-[#8B7355] flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold">{level + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-[#3D2E1F] dark:text-[#e0e0e0] leading-none">{LEVEL_TITLES[level]}</p>
            <p className="text-[9px] text-[#8B7355] dark:text-[#888]">{stats.totalXP} XP</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="flex-1 min-w-0">
          <div className="h-1.5 rounded-full bg-stone-100 dark:bg-[#333] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#C2A46D] to-[#2F3E8F] transition-all duration-700 ease-out"
              style={{ width: `${xpProgress.percent}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        {stats.currentStreak > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-bold text-orange-500">{stats.currentStreak}</span>
          </div>
        )}

        {/* Score */}
        <div className="flex items-center gap-1 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-[#C2A46D]" />
          <span className="text-[11px] font-semibold text-[#8B7355] dark:text-[#999]">
            {stats.correctAnswers}/{stats.challengesCompleted}
          </span>
        </div>
      </div>

      {/* ── Challenge header ── */}
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-center gap-2">
          <currentChallenge.icon className={`w-4 h-4 ${currentChallenge.iconColor}`} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">Daily Challenge</p>
            <p className="text-sm font-semibold text-stone-800 dark:text-[#F5F1E8]">{currentChallenge.title}</p>
          </div>
        </div>
        <AppTooltip content="Try another challenge">
          <button
            onClick={handleShuffle}
            className="p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-[#333] transition-colors"
          >
            <Shuffle className="w-4 h-4 text-[#8B7355] dark:text-[#999]" />
          </button>
        </AppTooltip>
      </div>

      {/* ── XP gain animation ── */}
      {showXPGain !== null && (
        <div className="flex justify-center -mt-1 mb-1 animate-fade-in-up">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#C2A46D]/15 text-[#C2A46D] text-[12px] font-bold">
            <Zap className="w-3 h-3" />+{showXPGain} XP
          </span>
        </div>
      )}

      {/* ── Challenge body ── */}
      <div className="px-4 pb-4">
        {currentChallenge.type === 'relationship' && pair && (
          <RelationshipChallenge
            pair={pair}
            loading={loading}
            revealed={revealed}
            pathLabel={pathLabel}
            onReveal={handleRelationshipReveal}
            onOpenProfile={onOpenProfile}
          />
        )}

        {currentChallenge.type === 'hometown' && hometownData && (
          <HometownChallenge
            data={hometownData}
            revealed={revealed}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect}
            onAnswer={(id) => handleAnswer(id, hometownData.correctId)}
          />
        )}

        {currentChallenge.type === 'whoami' && whoamiData && (
          <WhoAmIChallenge
            data={whoamiData}
            revealed={revealed}
            selectedAnswer={selectedAnswer}
            isCorrect={isCorrect}
            onAnswer={(id) => handleAnswer(id, whoamiData.correctId)}
            onOpenProfile={onOpenProfile}
          />
        )}

        {/* ── Result + actions ── */}
        {revealed && (
          <div className="mt-4 space-y-2 animate-fade-in-up">
            {/* Result banner */}
            {isCorrect !== null && currentChallenge.type !== 'relationship' && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
              }`}>
                {isCorrect ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                <span className="text-[13px] font-semibold">
                  {isCorrect ? 'Correct! You know your family well.' : 'Not quite — but now you know!'}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold text-[#2F3E8F] dark:text-[#5A6BFF] bg-[#E8EDFF] dark:bg-[#2F3E8F]/15 hover:bg-[#DCE3FF] dark:hover:bg-[#2F3E8F]/25 active:scale-[0.97] transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              <button
                onClick={handleShuffle}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold text-stone-600 dark:text-[#ccc] bg-stone-50 dark:bg-[#333] hover:bg-stone-100 dark:hover:bg-[#3a3a3a] active:scale-[0.97] transition-all"
              >
                Next challenge
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {!revealed && (
          <p className="text-center text-[11px] text-[#8B7355] dark:text-[#999] mt-3">
            {currentChallenge.subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Challenge type: Relationship ──

function RelationshipChallenge({ pair, loading, revealed, pathLabel, onReveal, onOpenProfile }: {
  pair: [Person, Person]
  loading: boolean
  revealed: boolean
  pathLabel: string | null
  onReveal: () => void
  onOpenProfile?: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-center gap-4 md:gap-6">
      <PersonBubble person={pair[0]} onClick={() => onOpenProfile?.(pair[0].personId)} />
      <div className="flex flex-col items-center">
        {loading ? (
          <div className="w-10 h-10 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#2F3E8F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revealed && pathLabel ? (
          <div className="text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2F3E8F]/10 dark:bg-[#5A6BFF]/10 mb-1">
              <Star className="w-3 h-3 text-[#C2A46D]" />
              <p className="text-sm font-bold text-[#2F3E8F] dark:text-[#5A6BFF]">{pathLabel}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onReveal}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all active:scale-95"
          >
            <HelpCircle className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
      <PersonBubble person={pair[1]} onClick={() => onOpenProfile?.(pair[1].personId)} />
    </div>
  )
}

// ── Challenge type: Hometown ──

function HometownChallenge({ data, revealed, selectedAnswer, isCorrect, onAnswer }: {
  data: { place: string; correctId: string; options: Person[]; target: Person }
  revealed: boolean
  selectedAnswer: string | null
  isCorrect: boolean | null
  onAnswer: (personId: string) => void
}) {
  return (
    <div className="space-y-3">
      {/* Place card */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#C2A46D]/10 to-[#2F3E8F]/10 dark:from-[#C2A46D]/15 dark:to-[#2F3E8F]/15">
        <MapPin className="w-5 h-5 text-[#C2A46D]" />
        <span className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#e0e0e0]">{data.place}</span>
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-2">
        {data.options.map(person => {
          const isSelected = selectedAnswer === person.personId
          const isCorrectAnswer = person.personId === data.correctId
          let borderClass = 'ring-1 ring-stone-200 dark:ring-[#444] hover:ring-[#2F3E8F]/50'
          if (revealed) {
            if (isCorrectAnswer) borderClass = 'ring-2 ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
            else if (isSelected && !isCorrect) borderClass = 'ring-2 ring-rose-400 bg-rose-50 dark:bg-rose-900/20'
            else borderClass = 'ring-1 ring-stone-200 dark:ring-[#444] opacity-50'
          }

          return (
            <button
              key={person.personId}
              onClick={() => !revealed && onAnswer(person.personId)}
              disabled={revealed}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all ${borderClass} ${!revealed ? 'active:scale-95 cursor-pointer' : ''}`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                {person.profilePhotoUrl ? (
                  <img src={resolveBackendUrl(person.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2F3E8F] flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{person.firstName?.[0]}{person.lastName?.[0]}</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium text-[#3D2E1F] dark:text-[#ccc] truncate max-w-full">{person.firstName}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Challenge type: Who Am I ──

function WhoAmIChallenge({ data, revealed, selectedAnswer, isCorrect, onAnswer, onOpenProfile }: {
  data: { clues: string[]; correctId: string; options: Person[]; target: Person }
  revealed: boolean
  selectedAnswer: string | null
  isCorrect: boolean | null
  onAnswer: (personId: string) => void
  onOpenProfile?: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {/* Clue cards */}
      <div className="space-y-1.5">
        {data.clues.map((clue, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4B2C5E]/[0.06] dark:bg-[#4B2C5E]/[0.15]"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <span className="w-5 h-5 rounded-full bg-[#4B2C5E]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#4B2C5E] dark:text-[#9B7BB0]">{i + 1}</span>
            </span>
            <span className="text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0]">{clue}</span>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="space-y-1.5">
        {data.options.map(person => {
          const isSelected = selectedAnswer === person.personId
          const isCorrectAnswer = person.personId === data.correctId
          let style = 'bg-white dark:bg-[#2a2a2a] ring-1 ring-stone-200 dark:ring-[#444] hover:ring-[#4B2C5E]/50'
          if (revealed) {
            if (isCorrectAnswer) style = 'bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-400'
            else if (isSelected && !isCorrect) style = 'bg-rose-50 dark:bg-rose-900/20 ring-2 ring-rose-400'
            else style = 'bg-white dark:bg-[#2a2a2a] ring-1 ring-stone-200 dark:ring-[#444] opacity-50'
          }

          return (
            <button
              key={person.personId}
              onClick={() => {
                if (!revealed) onAnswer(person.personId)
                else if (isCorrectAnswer) onOpenProfile?.(person.personId)
              }}
              disabled={revealed && !isCorrectAnswer}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${style} ${!revealed ? 'active:scale-[0.98] cursor-pointer' : ''}`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                {person.profilePhotoUrl ? (
                  <img src={resolveBackendUrl(person.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#4B2C5E] flex items-center justify-center">
                    <span className="text-white text-[10px] font-semibold">{person.firstName?.[0]}{person.lastName?.[0]}</span>
                  </div>
                )}
              </div>
              <span className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#e0e0e0]">
                {person.firstName} {person.lastName || ''}
              </span>
              {revealed && isCorrectAnswer && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
              {revealed && isSelected && !isCorrect && <XIcon className="w-4 h-4 text-rose-500 ml-auto" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
