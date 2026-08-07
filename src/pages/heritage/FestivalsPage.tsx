/**
 * FestivalsPage — /heritage/festivals
 *
 * A quiet editorial take on a family's festival year. Grouped by time
 * horizon (today → this week → this month → later), with a serif display
 * hero, region-aware micro-copy, and a single memory prompt surfaced for
 * the current celebration rather than a grid of generic questions.
 */
import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Info, MapPin, Feather, ChevronRight, ArrowLeft, Plus, Mic, Users as UsersIcon, Quote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees, fetchTreeWindow } from '@/services/neo4jDataService'
import { AppShell } from '@/components/layout/AppShell'
import { HubPageTemplate } from '@/components/hubs/HubPageTemplate'
import { HeritageCardShell } from '@/components/heritage/shared/HeritageCardShell'
import { HeritageEmptyState } from '@/components/heritage/shared/HeritageEmptyState'
import {
  ALL_FESTIVALS,
  getActiveFestivalBundle,
  getFestivalsByReligion,
  type FestivalPromptBundle,
} from '@/data/festivals'
import type { Person } from '@/types'

const ACTIVE_TREE_KEY = 'familytree-active-tree'
function getStoredTreeId(): string | null {
  try { return localStorage.getItem(ACTIVE_TREE_KEY) } catch { return null }
}

// ── Festival-specific accents, hand-tuned for tone ────────────────────────
// Keyed by festival id (see src/data/festivals/*.ts). Falls back to the
// religion-default palette below so we never break on a new festival.
const FESTIVAL_ACCENT: Record<string, { from: string; via: string; to: string; ink: string }> = {
  'diwali':         { from: '#3D1E0B', via: '#8B4513', to: '#F4A460', ink: '#FFF4D4' },
  'holi':           { from: '#7A1F5F', via: '#C92E82', to: '#F4B3D6', ink: '#FFF1F8' },
  'rongali-bihu':   { from: '#2D5016', via: '#4A7C3F', to: '#C8E06B', ink: '#F0FFD6' },
  'bihu':           { from: '#2D5016', via: '#4A7C3F', to: '#C8E06B', ink: '#F0FFD6' },
  'onam':           { from: '#1E5631', via: '#3D8B3D', to: '#F5E6A8', ink: '#FFFBE8' },
  'pongal':         { from: '#8B3A00', via: '#CC5500', to: '#F8C471', ink: '#FFF5E1' },
  'vishu':          { from: '#2E5939', via: '#5B8C3A', to: '#F7D247', ink: '#FFFBE8' },
  'makar-sankranti':{ from: '#5C2A0F', via: '#B8541C', to: '#FFB347', ink: '#FFEFD9' },
  'navratri':       { from: '#6B1B5A', via: '#A8358F', to: '#FFBE3D', ink: '#FFF4E0' },
  'dussehra':       { from: '#6B1F1F', via: '#A0342E', to: '#E8A14A', ink: '#FFF0DE' },
  'raksha-bandhan': { from: '#8B3A5C', via: '#BC5A85', to: '#F4B8D4', ink: '#FFF0F8' },
  'krishna-janmashtami':{ from: '#1A2D5B', via: '#3B5BA0', to: '#7EC8E3', ink: '#EAF5FC' },
  'janmashtami':    { from: '#1A2D5B', via: '#3B5BA0', to: '#7EC8E3', ink: '#EAF5FC' },
  'ganesh-chaturthi':{ from: '#8B2A00', via: '#D14F00', to: '#F7A440', ink: '#FFEFD9' },
  'guru-purnima':   { from: '#3D2E6B', via: '#7B5FB0', to: '#D4BEEF', ink: '#F5EEFF' },
  'rath-yatra':     { from: '#5C2E0B', via: '#A85D1C', to: '#F4B860', ink: '#FFEFD9' },
  'buddha-purnima': { from: '#3D2E1F', via: '#8B6F3A', to: '#F5DBA0', ink: '#FFF5DC' },
  'thrissur-pooram':{ from: '#2E3A5F', via: '#5B6F9E', to: '#F2D88C', ink: '#FFF5DC' },
  'christmas':      { from: '#0F3E24', via: '#1E6B3F', to: '#E0B76D', ink: '#FFF5E0' },
  'easter':         { from: '#4B2C5E', via: '#7B4A92', to: '#EAD5F2', ink: '#F9F0FF' },
  'eid-al-fitr':    { from: '#0F3E34', via: '#2A5F4B', to: '#E8D5A8', ink: '#F5F2E6' },
  'eid-al-adha':    { from: '#0F3E34', via: '#2A5F4B', to: '#E8D5A8', ink: '#F5F2E6' },
  'ramadan':        { from: '#1A3F4B', via: '#3F6E7C', to: '#F2E0B6', ink: '#FAF5E1' },
  'baisakhi':       { from: '#7A3F0F', via: '#CC6D1A', to: '#F8C87E', ink: '#FFEFD9' },
  'lohri':          { from: '#5C1F00', via: '#B84000', to: '#FFB347', ink: '#FFEAD3' },
  'navroz':         { from: '#7A1B3F', via: '#B53765', to: '#F2B9CC', ink: '#FFF0F5' },
}

const RELIGION_ACCENT: Record<string, { from: string; via: string; to: string; ink: string }> = {
  hindu:    { from: '#3D2E1F', via: '#8B6F3A', to: '#E8C47E', ink: '#FFF5DC' },
  muslim:   { from: '#0F3E34', via: '#2A5F4B', to: '#E8D5A8', ink: '#F5F2E6' },
  islam:    { from: '#0F3E34', via: '#2A5F4B', to: '#E8D5A8', ink: '#F5F2E6' },
  christian:{ from: '#2F3E8F', via: '#4B2C5E', to: '#C9B6E8', ink: '#F5EEFF' },
  sikh:     { from: '#7A3F0F', via: '#CC6D1A', to: '#F8C87E', ink: '#FFEFD9' },
  jain:     { from: '#8B6914', via: '#CC9E3B', to: '#F0DF9C', ink: '#FFF8DC' },
  buddhist: { from: '#8B5F3A', via: '#CC8B5F', to: '#F0C494', ink: '#FFF2DE' },
  parsi:    { from: '#4F1414', via: '#8B2A2A', to: '#E89B9B', ink: '#FFEAEA' },
}

function accentFor(f: FestivalPromptBundle) {
  return FESTIVAL_ACCENT[f.id]
    ?? RELIGION_ACCENT[(f.religions[0] || 'hindu').toLowerCase()]
    ?? RELIGION_ACCENT.hindu
}

// ── Editorial "what this festival holds" copy ─────────────────────────────
// Hand-written, not AI — short and warm, shown in the detail view.
// Falls back to the humanised banner when a festival isn't in this map.
const FESTIVAL_MEANING: Record<string, string> = {
  'rongali-bihu':
    'Rongali Bihu, or Bohag Bihu, marks the Assamese New Year and the start of the sowing season. It is a spring festival of song and feast — young people sing bihu geet, elders bless the home, and families gather around pitha and jolpaan.',
  'bihu':
    'Bihu celebrates the turning of the Assamese year and the rhythm of the harvest. It is observed three times a year, each tied to a different stage of the crop — Rongali, Kongali, and Bhogali.',
  'diwali':
    'Diwali is the festival of lights — the homecoming of Rama, the lighting of lamps, the quiet victory of brightness over the longest nights. Homes are cleaned and painted, sweets are made in advance, and the evening belongs to family, diyas, and small rituals of gratitude.',
  'holi':
    'Holi announces the arrival of spring — a day when colour is permission and laughter is currency. The evening before, Holika Dahan, families light a communal fire to mark the end of winter and the burning away of what no longer serves.',
  'onam':
    'Onam is Kerala\u2019s harvest festival, held in honour of the legendary king Mahabali. The sadhya laid out on a banana leaf, the pookalam at the doorstep, and the boat races on backwater canals all carry the memory of a time when, the legend says, no one in the land went hungry.',
  'vishu':
    'Vishu marks the Malayali New Year with the Vishukkani — a careful arrangement of coins, fruits, flowers and a lamp, meant to be the first sight on waking. Elders give kaineettam to the young, and the day is spent at the family temple before the feast.',
  'pongal':
    'Pongal is Tamil Nadu\u2019s four-day thanksgiving to the sun. The first pot of new rice boils over at dawn as families shout \u201cPongalo Pongal!\u201d — a blessing that overflowing is a good thing.',
  'makar-sankranti':
    'Makar Sankranti marks the sun\u2019s northward turn. Across India it takes different names and foods — til-gul in Maharashtra, khichdi in the north, kites against blue Gujarati skies — but the through-line is the same: shorter nights, longer light.',
  'ganesh-chaturthi':
    'Ganesh Chaturthi welcomes Ganapati into the home for a few short days before he is carried, singing, to the water. The rituals are old, the energy young — Ganpati Bappa Morya rings down narrow lanes across Maharashtra and beyond.',
  'navratri':
    'Navratri is nine nights of devotion to the nine forms of the Goddess. In Gujarat it becomes garba and dandiya; in Bengal it leads to Durga Puja; across the country, it is one of the quieter festivals to live through and one of the loudest to dance in.',
  'durga-puja':
    'Durga Puja is Bengal\u2019s homecoming festival — five days when the Goddess returns with her children, pandals rise across neighbourhoods, and the city becomes a living open house. The dhunuchi dance, the bhog, the sindoor khela on Dashami: each has its own hour.',
  'dussehra':
    'Dussehra marks Rama\u2019s victory over Ravana and the close of Navratri. Giant effigies of Ravana burn at sunset in the north; in the south, Ayudha Puja honours the tools of daily life.',
  'raksha-bandhan':
    'Raksha Bandhan is the festival of siblings — a thread tied, a promise renewed, a gift offered. In many homes it is also a day to remember the cousins who grew up down the road and the ones who now live oceans away.',
  'krishna-janmashtami':
    'Janmashtami celebrates the birth of Krishna at midnight \u2014 fasting until the hour, then the breaking of the dahi handi, and a soft prasad at dawn.',
  'janmashtami':
    'Janmashtami celebrates Krishna\u2019s birth at midnight. Children dress as the blue god, the dahi handi is strung high, and the fast of the day ends with mishri and butter.',
  'guru-purnima':
    'Guru Purnima is a day to honour those who taught you — the formal teachers, but also the grandmother who taught you how to knead dough, the uncle who taught you how to sit through loss.',
  'buddha-purnima':
    'Buddha Purnima marks the birth, enlightenment and passing of the Buddha \u2014 three events held to have occurred on the same full-moon day. It is a quiet festival of lamps, alms and stillness.',
  'rath-yatra':
    'The Jagannath Rath Yatra is one of the largest public festivals in India, when the deities of Puri ride in hand-pulled chariots through the streets. Families across Odisha send their elders or go themselves — a moving temple, the old world in motion.',
  'thrissur-pooram':
    'Thrissur Pooram is Kerala\u2019s grandest temple festival \u2014 a hundred decorated elephants, panchavadyam drums that go on until dawn, and the silent, stately exchange of silken parasols.',
  'ram-navami':
    'Ram Navami marks the birth of Lord Rama at noon \u2014 recited from the Ramayana, sung in bhajans, and in some homes celebrated with a small cradle where the infant Rama is rocked.',
  'maha-shivaratri':
    'Maha Shivaratri is the night of Shiva \u2014 fasting, a vigil, and the slow pouring of water or milk over the lingam through the dark hours. A festival held closer to silence than to celebration.',
  'vasant-panchami':
    'Vasant Panchami welcomes spring and honours Saraswati, goddess of learning. Many children are taught their first letters on this day; many homes wear yellow.',
  'chhath-puja':
    'Chhath is a four-day festival of devotion to the Sun, celebrated mostly in Bihar, Jharkhand, eastern UP and Nepal. Standing in the river at sunset, again at sunrise \u2014 it asks an old question of gratitude.',
  'karwa-chauth':
    'Karwa Chauth is observed mostly by married women in north India \u2014 a daylong fast broken only when the moon is sighted through a sieve. The festival is layered with memory; every mother\u2019s sieve has a story.',
  'christmas':
    'Christmas marks the birth of Jesus Christ. In Indian Christian homes it blends carols and cribs with kuswar, plum cake, and a midnight mass that spills out into a late supper.',
  'easter':
    'Easter celebrates the resurrection \u2014 the quiet heart of the Christian calendar. After the forty days of Lent, there is a stillness to the morning and a brightness to the feast.',
  'eid-al-fitr':
    'Eid al-Fitr closes the month of Ramadan. The morning prayer is followed by the long embrace of relatives, sheer khurma or sewai, and the giving of Eidi to younger cousins.',
  'eid-al-adha':
    'Eid al-Adha honours the willingness of Ibrahim to sacrifice his son and the mercy that replaced the act. Meat is shared in three parts \u2014 family, neighbours, and those in need.',
  'ramadan':
    'Ramadan is the month of fasting from dawn to dusk. The pre-dawn sehri and the evening iftar become small family gatherings, and the month closes with the rush of Eid.',
  'baisakhi':
    'Baisakhi marks the Sikh New Year and the founding of the Khalsa. Gurdwaras fill with kirtan, farms celebrate the Punjab harvest, and bhangra takes the streets.',
  'lohri':
    'Lohri is Punjab\u2019s winter-bonfire night \u2014 peanuts and rewri thrown into the flames, sarson da saag on the table, and songs that are older than anyone in the room.',
  'navroz':
    'Navroz is the Parsi New Year, a quiet and graceful day of prayer at the agiary, a meal with the extended family, and the old wish, \u201cSal Mubarak.\u201d',
}

function festivalMeaning(f: FestivalPromptBundle): string {
  return FESTIVAL_MEANING[f.id] ?? humaniseBanner(f.banner)
}

// ── Date helpers ───────────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function daysUntil(mmdd: string): number {
  const now = new Date()
  const [mm, dd] = mmdd.split('-').map(Number)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(now.getFullYear(), mm - 1, dd)
  if (target < today) target.setFullYear(today.getFullYear() + 1)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function humanDate(mmdd: string): string {
  const days = daysUntil(mmdd)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) {
    const now = new Date()
    const target = new Date(now)
    target.setDate(now.getDate() + days)
    return DAY_NAMES[target.getDay()]
  }
  if (days < 14) return 'Next week'
  const [mm, dd] = mmdd.split('-').map(Number)
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`
  return `${MONTH_NAMES[mm - 1]} ${pad(dd)}`
}

function longDateToday(): string {
  const d = new Date()
  return `${DAY_NAMES[d.getDay()]} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

// ── Upcoming grouping ─────────────────────────────────────────────────────
function getUpcomingFestivals(religions: string[], limit = 24): FestivalPromptBundle[] {
  const pool = religions.length === 0
    ? ALL_FESTIVALS
    : religions.flatMap(r => getFestivalsByReligion(r))
  const uniq = Array.from(new Map(pool.map(f => [f.id, f])).values())
  return uniq
    .map(f => ({ f, days: Math.min(...f.dates.map(daysUntil)) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, limit)
    .map(x => x.f)
}

type TimeGroup = 'this-week' | 'this-month' | 'later'

function groupByHorizon(festivals: FestivalPromptBundle[]): Record<TimeGroup, FestivalPromptBundle[]> {
  const buckets: Record<TimeGroup, FestivalPromptBundle[]> = { 'this-week': [], 'this-month': [], 'later': [] }
  for (const f of festivals) {
    const d = Math.min(...f.dates.map(daysUntil))
    if (d <= 7) buckets['this-week'].push(f)
    else if (d <= 30) buckets['this-month'].push(f)
    else buckets['later'].push(f)
  }
  return buckets
}

function formatReligionWord(r: string) {
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()
}

// ── Page ──────────────────────────────────────────────────────────────────

export function FestivalsPage() {
  const user = useAuthStore(s => s.user)
  const [persons, setPersons] = useState<Person[]>([])
  const [selectedReligions, setSelectedReligions] = useState<Set<string>>(new Set())
  const [religionsReady, setReligionsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFestival, setSelectedFestival] = useState<FestivalPromptBundle | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const trees = await getUserTrees(user.id)
        if (cancelled) return
        if (trees.length === 0) {
          setError('Create a family tree to see your festivals.')
          setReligionsReady(true)
          return
        }
        const stored = getStoredTreeId()
        const tree = trees.find(t => t.treeId === stored) || trees[0]
        const data = await fetchTreeWindow(tree.treeId)
        if (cancelled) return
        setPersons(data.persons as Person[])
        const rels = new Set<string>()
        for (const p of data.persons) {
          const r = (p as Person).religion?.toLowerCase().trim()
          if (r) rels.add(r)
        }
        setSelectedReligions(rels)
        setReligionsReady(true)
      } catch {
        if (!cancelled) {
          setError('Could not load your tree right now.')
          setReligionsReady(true)
        }
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const religionsInTree = useMemo(() => {
    const set = new Set<string>()
    for (const p of persons) {
      const r = p.religion?.toLowerCase().trim()
      if (r) set.add(r)
    }
    return Array.from(set).sort()
  }, [persons])

  const activeReligions = useMemo(() => Array.from(selectedReligions), [selectedReligions])

  const todayFestival = useMemo(() => {
    if (!religionsReady) return null
    for (const r of activeReligions) {
      const f = getActiveFestivalBundle(r)
      if (f) return f
    }
    if (activeReligions.length === 0) return getActiveFestivalBundle(null)
    return null
  }, [religionsReady, activeReligions])

  const upcoming = useMemo(
    () => religionsReady ? getUpcomingFestivals(activeReligions) : [],
    [religionsReady, activeReligions],
  )

  const horizonGroups = useMemo(() => {
    // If today's festival is surfaced above, don't repeat it in the list.
    const rest = todayFestival ? upcoming.filter(f => f.id !== todayFestival.id) : upcoming
    return groupByHorizon(rest)
  }, [upcoming, todayFestival])

  const toggleReligion = (r: string) => {
    setSelectedReligions(prev => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  const isMixedFamily = religionsInTree.length > 1
  const firstName = persons.find(p => p.isHomePerson)?.firstName

  // Detail view takes over the main content area when a festival is selected.
  if (selectedFestival) {
    return (
      <AppShell activeView="home">
        <FestivalDetail
          festival={selectedFestival}
          firstName={firstName}
          onBack={() => setSelectedFestival(null)}
        />
      </AppShell>
    )
  }

  return (
    <AppShell activeView="home">
      <HubPageTemplate
        title="Festivals"
        subtitle="The rhythms your family lives by — a quiet calendar of celebrations."
        icon={<Sparkles className="w-6 h-6 text-[#C2A46D]" strokeWidth={2.25} />}
        backTo={null}
      >
        <div className="space-y-6 md:space-y-8">
          {!religionsReady ? (
            <HeroSkeleton />
          ) : todayFestival ? (
            <TodayMoment festival={todayFestival} firstName={firstName} />
          ) : upcoming[0] ? (
            <NextFestivalEditorial festival={upcoming[0]} />
          ) : null}

          {error && (
            <HeritageEmptyState
              icon={Info}
              title="Tell us what your family celebrates"
              message={error}
              tone="gold"
            />
          )}

          {isMixedFamily && religionsReady && (
            <InterReligionNote religions={religionsInTree} />
          )}

          {religionsInTree.length > 1 && religionsReady && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="text-[#8B7355] dark:text-[#A19F9D]">Show calendars for</span>
              {religionsInTree.map(r => {
                const active = selectedReligions.has(r)
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleReligion(r)}
                    className={`px-3 py-1 rounded-full font-medium transition-all ${
                      active
                        ? 'bg-[#3D2E1F] text-[#F6F2EA] shadow-sm'
                        : 'bg-transparent text-[#5C4A2E] ring-1 ring-[#E2DBCE] hover:ring-[#C2A46D]/60'
                    }`}
                  >
                    {formatReligionWord(r)}
                  </button>
                )
              })}
            </div>
          )}

          {!religionsReady ? (
            <ListSkeleton />
          ) : (
            <>
              <HorizonSection title="This week" festivals={horizonGroups['this-week']} onSelect={setSelectedFestival} variant="featured" />
              <HorizonSection title="Later this month" festivals={horizonGroups['this-month']} onSelect={setSelectedFestival} variant="list" />
              <HorizonSection title="Coming up" festivals={horizonGroups['later']} onSelect={setSelectedFestival} variant="list" />
            </>
          )}

          <div className="pt-4 pb-2 text-center">
            <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] italic max-w-md mx-auto leading-relaxed">
              The festivals above follow the Gregorian calendar approximations of each tradition. Lunar festivals will shift slightly year to year.
            </p>
          </div>
        </div>

      </HubPageTemplate>
    </AppShell>
  )
}

// ═══ Today's moment — the editorial hero ═══

function TodayMoment({ festival, firstName }: { festival: FestivalPromptBundle; firstName?: string }) {
  const a = accentFor(festival)
  const firstRegion = festival.regions?.[0]
  const firstPrompt = festival.prompts[0]?.question

  return (
    <article
      className="relative rounded-3xl overflow-hidden shadow-[0_24px_60px_-24px_rgba(61,46,31,0.45)]"
      style={{ background: `linear-gradient(135deg, ${a.from} 0%, ${a.via} 55%, ${a.to} 100%)` }}
    >
      {/* Soft texture overlay */}
      <div className="absolute inset-0 opacity-[0.10] pointer-events-none mix-blend-overlay" aria-hidden>
        <svg width="100%" height="100%">
          <filter id="fest-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#fest-grain)" />
        </svg>
      </div>
      {/* Decorative circles */}
      <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20" style={{ background: a.ink }} aria-hidden />
      <div className="absolute -bottom-20 left-1/4 w-44 h-44 rounded-full opacity-10 bg-white" aria-hidden />

      <div className="relative px-6 md:px-10 py-8 md:py-12" style={{ color: a.ink }}>
        <p className="text-[10.5px] md:text-[11px] tracking-[0.28em] uppercase font-semibold opacity-80 mb-3">
          Today &middot; {longDateToday()}
        </p>
        <h2
          className="font-serif-display text-[36px] md:text-[52px] leading-[1.05] font-semibold mb-3"
          style={{ color: '#FFFFFF' }}
        >
          {festival.festivalName}
        </h2>
        <p className="text-[15px] md:text-[17px] leading-relaxed max-w-2xl font-light" style={{ color: a.ink }}>
          {humaniseBanner(festival.banner)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {festival.religions.map(r => (
            <span key={r} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/15 border border-white/20 backdrop-blur-sm" style={{ color: a.ink }}>
              {formatReligionWord(r)} tradition
            </span>
          ))}
          {firstRegion && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 border border-white/15" style={{ color: a.ink }}>
              <MapPin className="w-3 h-3" />
              Especially in {firstRegion}
            </span>
          )}
        </div>

        {firstPrompt && (
          <div className="mt-7 md:mt-9 max-w-2xl">
            <div className="rounded-xl p-4 md:p-5 bg-white/[0.10] border border-white/[0.18] backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <Feather className="w-4 h-4 mt-0.5 shrink-0 opacity-90" style={{ color: a.ink }} />
                <div className="min-w-0">
                  <p className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-80 mb-1.5">
                    {firstName ? `A prompt for ${firstName}` : 'A prompt for you'}
                  </p>
                  <p className="text-[13.5px] md:text-[14px] leading-relaxed italic font-light" style={{ color: a.ink }}>
                    &ldquo;{firstPrompt}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

// ═══ Next-in-line fallback when there's no festival today ═══

function NextFestivalEditorial({ festival }: { festival: FestivalPromptBundle }) {
  const a = accentFor(festival)
  const days = Math.min(...festival.dates.map(daysUntil))
  const when = humanDate(festival.dates[0])

  return (
    <article
      className="relative rounded-3xl overflow-hidden shadow-[0_24px_60px_-24px_rgba(61,46,31,0.45)]"
      style={{ background: `linear-gradient(135deg, ${a.from} 0%, ${a.via} 55%, ${a.to} 100%)` }}
    >
      <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20" style={{ background: a.ink }} aria-hidden />
      <div className="relative px-6 md:px-10 py-8 md:py-10" style={{ color: a.ink }}>
        <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold opacity-80 mb-3">
          Next in your calendar &middot; {when}
        </p>
        <h2 className="font-serif-display text-[30px] md:text-[40px] leading-tight font-semibold mb-2" style={{ color: '#FFFFFF' }}>
          {festival.festivalName}
        </h2>
        <p className="text-[14px] md:text-[16px] leading-relaxed max-w-2xl font-light" style={{ color: a.ink }}>
          {humaniseBanner(festival.banner)}
        </p>
        <p className="text-[12px] mt-4 opacity-80">
          {days === 1 ? 'Tomorrow' : `In ${days} days`}
        </p>
      </div>
    </article>
  )
}

// ═══ Horizon sections ═══

function HorizonSection({
  title,
  festivals,
  onSelect,
  variant,
}: {
  title: string
  festivals: FestivalPromptBundle[]
  onSelect: (f: FestivalPromptBundle) => void
  variant: 'featured' | 'list'
}) {
  if (festivals.length === 0) return null

  return (
    <section>
      <header className="flex items-baseline justify-between mb-3">
        <h3 className="font-serif-display text-[18px] md:text-[20px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8]">
          {title}
        </h3>
        <span className="text-[11px] text-[#8B7355]">
          {festivals.length} {festivals.length === 1 ? 'festival' : 'festivals'}
        </span>
      </header>
      {variant === 'featured' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {festivals.map(f => <FeaturedCard key={f.id} festival={f} onClick={() => onSelect(f)} />)}
        </div>
      ) : (
        <HeritageCardShell>
          <ul className="divide-y divide-[#E2DBCE]/70 dark:divide-[#3A342C]/60">
            {festivals.map(f => (
              <li key={f.id}>
                <ListRow festival={f} onClick={() => onSelect(f)} />
              </li>
            ))}
          </ul>
        </HeritageCardShell>
      )}
    </section>
  )
}

// ═══ Featured card — shows in the "this week" row ═══

function FeaturedCard({ festival, onClick }: { festival: FestivalPromptBundle; onClick: () => void }) {
  const a = accentFor(festival)
  const when = humanDate(festival.dates[0])
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl overflow-hidden bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE] dark:ring-[#3A342C] hover:ring-[#C2A46D]/60 hover:-translate-y-0.5 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3E8F]"
    >
      <div
        className="relative h-28 md:h-32 flex items-end p-4"
        style={{ background: `linear-gradient(135deg, ${a.from} 0%, ${a.via} 100%)` }}
      >
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/20 border border-white/25 backdrop-blur-sm" style={{ color: a.ink }}>
            {when}
          </span>
        </div>
        <div className="text-white/95 max-w-full">
          <h4 className="font-serif-display text-[18px] md:text-[19px] leading-tight font-semibold line-clamp-2">
            {festival.festivalName}
          </h4>
          {festival.regions?.[0] && (
            <p className="text-[11px] mt-0.5 opacity-80 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {festival.regions[0]}
            </p>
          )}
        </div>
      </div>
      <div className="px-4 py-3 md:py-4 flex items-start gap-3">
        <p className="flex-1 text-[12.5px] md:text-[13px] text-[#5C4A2E] dark:text-[#C9BDA8] leading-relaxed line-clamp-2">
          {humaniseBanner(festival.banner)}
        </p>
        <ChevronRight className="w-4 h-4 text-[#8B7355] shrink-0 mt-0.5 group-hover:text-[#2F3E8F] group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  )
}

// ═══ List row — compact, typographic ═══

function ListRow({ festival, onClick }: { festival: FestivalPromptBundle; onClick: () => void }) {
  const when = humanDate(festival.dates[0])
  const region = festival.regions?.[0]
  return (
    <button
      onClick={onClick}
      className="group w-full text-left py-3.5 px-0.5 flex items-start gap-4 hover:bg-[#FAF7F0] dark:hover:bg-[#241E18] transition-colors"
    >
      <div className="w-28 shrink-0">
        <p className="text-[12.5px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8]">{when}</p>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-serif-display text-[16px] leading-tight font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] mb-0.5">
          {festival.festivalName}
        </h4>
        <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] leading-relaxed line-clamp-1">
          {region ? <><MapPin className="w-3 h-3 inline -mt-0.5 mr-1" />{region} &middot; </> : null}
          {humaniseBanner(festival.banner)}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#8B7355]/60 shrink-0 mt-1 group-hover:text-[#2F3E8F] group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}

// ═══ Inter-religion note ═══

function InterReligionNote({ religions }: { religions: string[] }) {
  const names = religions.map(formatReligionWord)
  const joined = names.length === 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
  return (
    <div className="rounded-2xl border border-[#C2A46D]/25 bg-[#FAF7F0]/60 dark:bg-[#241E18]/60 px-5 py-4 md:px-6 md:py-5">
      <p className="font-serif-display text-[15px] md:text-[16px] leading-relaxed text-[#3D2E1F] dark:text-[#F5F1E8] italic">
        Your family carries the traditions of {joined}.
      </p>
      <p className="text-[12.5px] text-[#8B7355] dark:text-[#A19F9D] mt-1.5 leading-relaxed">
        Both calendars are woven together below, in the order they unfold through your year.
      </p>
    </div>
  )
}

// ═══ Detail sheet ═══

// ═══ Festival detail — a full-page, meaningful view ═══
//
// Purpose: help the family preserve their celebration of this festival.
// Each section earns its place on the page — editorial context, this year's
// observance, a clear primary action (capture a memory), conversational
// starters (not "memory prompts"), and where-it-is-celebrated anchoring.

function FestivalDetail({
  festival, firstName, onBack,
}: {
  festival: FestivalPromptBundle
  firstName?: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const a = accentFor(festival)
  const firstDate = festival.dates[0]
  const whenLabel = humanDate(firstDate)
  const meaning = festivalMeaning(festival)

  // Format the span ("21 April" or "14-16 October" or "21 April + 15 May")
  const dateSpan = (() => {
    if (festival.dates.length === 1) return formatLongDate(festival.dates[0])
    // Check if the dates are a contiguous range
    const sorted = [...festival.dates].sort()
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    if (sorted.length <= 6) {
      return `${formatLongDate(first)} \u2013 ${formatLongDate(last)}`
    }
    return `Around ${formatLongDate(first)}`
  })()

  const primaryPrompt = festival.prompts[0]?.question
  const otherPrompts = festival.prompts.slice(1, 4)

  return (
    <div className="min-h-screen bg-[#F6F2EA] dark:bg-[#141414]">
      {/* Header bar */}
      <header className="sticky top-0 z-20 bg-[#F6F2EA]/95 dark:bg-[#141414]/95 backdrop-blur-sm border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A]">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-12 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#3D2E1F]/[0.06] transition-colors"
            aria-label="Back to festivals"
          >
            <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#F5F1E8]" />
          </button>
          <span className="text-[13px] text-[#8B7355] dark:text-[#A19F9D]">Festivals</span>
          <span className="text-[13px] text-[#8B7355] dark:text-[#A19F9D]">&rsaquo;</span>
          <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] truncate">
            {festival.festivalName}
          </span>
        </div>
      </header>

      {/* Hero */}
      <div
        className="relative"
        style={{ background: `linear-gradient(135deg, ${a.from} 0%, ${a.via} 55%, ${a.to} 100%)` }}
      >
        <div className="absolute inset-0 opacity-[0.09] mix-blend-overlay pointer-events-none" aria-hidden>
          <svg width="100%" height="100%">
            <filter id="fest-detail-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fest-detail-grain)" />
          </svg>
        </div>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20" style={{ background: a.ink }} aria-hidden />
        <div className="relative max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-14" style={{ color: a.ink }}>
          <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold opacity-85 mb-3">
            {whenLabel === 'Today' ? 'Happening today' : whenLabel === 'Tomorrow' ? 'Tomorrow' : `Next \u2014 ${whenLabel}`}
          </p>
          <h1 className="font-serif-display text-[34px] md:text-[48px] leading-[1.05] font-semibold text-white max-w-2xl">
            {festival.festivalName}
          </h1>
          <p className="mt-3 text-[13px] md:text-[14px] opacity-90">
            {dateSpan}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {festival.religions.map(r => (
              <span
                key={r}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/12 border border-white/20 backdrop-blur-sm"
                style={{ color: a.ink }}
              >
                {formatReligionWord(r)} tradition
              </span>
            ))}
            {festival.regions?.map(region => (
              <span
                key={region}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/8 border border-white/15"
                style={{ color: a.ink }}
              >
                <MapPin className="w-3 h-3" />
                {region}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-10 pb-24">

        {/* What this festival holds — editorial context */}
        <section>
          <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold text-[#8B6F3A] mb-3">
            What this festival holds
          </p>
          <p className="font-serif-display text-[17px] md:text-[19px] leading-[1.55] text-[#3D2E1F] dark:text-[#F5F1E8] max-w-2xl">
            {meaning}
          </p>
        </section>

        {/* Primary action — capture a memory */}
        <section>
          <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold text-[#8B6F3A] mb-3">
            Make it yours
          </p>
          <div
            className="relative rounded-2xl overflow-hidden border"
            style={{ borderColor: `${a.via}33`, background: `linear-gradient(135deg, ${a.ink}66 0%, ${a.ink}22 100%)` }}
          >
            <div className="px-5 py-5 md:px-6 md:py-6">
              <h3 className="font-serif-display text-[20px] md:text-[22px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] leading-tight">
                {whenLabel === 'Today'
                  ? `Save a memory from this ${festival.festivalName}`
                  : `Carry your family\u2019s ${festival.festivalName} forward`}
              </h3>
              <p className="mt-2 text-[13.5px] text-[#5C4A2E] dark:text-[#C9BDA8] leading-relaxed max-w-xl">
                A photo, a voice note, a paragraph written in haste &mdash; the details that will let a grandchild feel what this day was like in your home.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate('/dashboard#memories')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#3D2E1F] text-[#F6F2EA] hover:bg-[#2A1F15] transition-colors text-[13px] font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add a memory
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-transparent text-[#3D2E1F] dark:text-[#F5F1E8] ring-1 ring-[#3D2E1F]/30 hover:ring-[#3D2E1F]/60 transition-colors text-[13px] font-medium"
                >
                  <UsersIcon className="w-4 h-4" />
                  Invite family to share
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Questions worth asking */}
        {(primaryPrompt || otherPrompts.length > 0) && (
          <section>
            <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold text-[#8B6F3A] mb-3">
              Questions worth asking {firstName ? `someone in ${firstName}\u2019s family` : 'an elder'}
            </p>
            <div className="space-y-3">
              {primaryPrompt && (
                <figure className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE]/70 dark:ring-[#3A342C] p-5 md:p-6">
                  <Quote className="w-5 h-5 text-[#C2A46D] mb-3" strokeWidth={1.8} />
                  <blockquote className="font-serif-display text-[18px] md:text-[20px] leading-relaxed text-[#3D2E1F] dark:text-[#F5F1E8] italic">
                    {primaryPrompt}
                  </blockquote>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate('/dashboard#memories')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3D2E1F] text-[#F6F2EA] hover:bg-[#2A1F15] transition-colors text-[12px] font-medium"
                    >
                      <Feather className="w-3.5 h-3.5" />
                      Write an answer
                    </button>
                    <button
                      onClick={() => navigate('/dashboard#memories')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-transparent ring-1 ring-[#3D2E1F]/30 text-[#3D2E1F] dark:text-[#F5F1E8] hover:ring-[#3D2E1F]/60 transition-colors text-[12px] font-medium"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Record a reply
                    </button>
                  </div>
                </figure>
              )}
              {otherPrompts.length > 0 && (
                <ul className="space-y-2">
                  {otherPrompts.map((p, i) => (
                    <li
                      key={i}
                      className="rounded-xl bg-[#FAF7F0] dark:bg-[#241E18] ring-1 ring-[#E2DBCE]/60 dark:ring-[#3A342C]/60 px-4 py-3.5 flex items-start gap-3"
                    >
                      <Feather className="w-3.5 h-3.5 text-[#8B6F3A] mt-0.5 shrink-0" strokeWidth={1.8} />
                      <p className="text-[13.5px] text-[#3D2E1F] dark:text-[#F5F1E8] leading-relaxed italic font-light">
                        {p.question}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* When it falls this year — multi-day festivals */}
        {festival.dates.length > 1 && festival.dates.length <= 8 && (
          <section>
            <p className="text-[10.5px] tracking-[0.28em] uppercase font-semibold text-[#8B6F3A] mb-3">
              When it falls this year
            </p>
            <ul className="space-y-1.5 text-[13.5px] text-[#3D2E1F] dark:text-[#F5F1E8]">
              {festival.dates.slice(0, 8).map((d, i) => (
                <li key={d} className="flex items-baseline gap-3">
                  <span className="text-[#8B7355] w-10 tabular-nums">{i + 1}.</span>
                  <span className="font-medium">{formatLongDate(d)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Closing note */}
        <section className="pt-2">
          <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] italic max-w-xl leading-relaxed">
            Memories tied to this festival will gather here as your family adds them over the years.
          </p>
        </section>
      </main>
    </div>
  )
}

function formatLongDate(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map(Number)
  const pad = (n: number) => n < 10 ? `0${n}` : `${n}`
  return `${MONTH_NAMES[mm - 1]} ${pad(dd)}`
}

// ═══ Skeletons ═══

function HeroSkeleton() {
  return (
    <div className="h-44 md:h-56 rounded-3xl bg-gradient-to-br from-[#C2A46D]/15 via-[#8B6F3A]/10 to-[#4B2C5E]/10 animate-pulse" aria-label="Loading today's festival" />
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-28 rounded bg-[#E2DBCE]/60 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[0, 1].map(i => <div key={i} className="h-36 rounded-2xl bg-[#E2DBCE]/30 animate-pulse" />)}
      </div>
      <div className="h-32 rounded-2xl bg-[#E2DBCE]/30 animate-pulse" />
    </div>
  )
}

// ═══ Copy humaniser ═══
//
// The raw `banner` text in src/data/festivals/*.ts is quite shouty — lots of
// exclamation points, phrases like "X is here!" and "Celebrate your family's
// [thing]". Soften it a touch so the editorial hero reads like an intro
// instead of an announcement. Not an AI call — just a lightweight rewrite.

function humaniseBanner(banner: string): string {
  return banner
    // "Foo is here!" / "Foo is coming!" → drop the exclaim
    .replace(/\bis (here|coming|near)!+/gi, 'is almost here —')
    // Generic "Celebrate/Preserve your family's X" nudges feel CTA-y
    .replace(/\bcelebrate\s+(the\s+|your\s+family'?s\s+)?/i, 'A time for ')
    .replace(/\bpreserve\s+your\s+family'?s\s+/i, 'A time to hold onto ')
    // Strip trailing exclamations for a quieter voice
    .replace(/!+\s*$/, '.')
    .trim()
}
