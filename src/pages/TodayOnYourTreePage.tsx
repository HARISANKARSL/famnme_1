/**
 * TodayOnYourTreePage (`/today`)
 *
 * Shows all of today's family events: birthdays, wedding anniversaries, and
 * death anniversaries. Each row deep-links to the person profile.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Cake, Heart, Flower2, Calendar, Gem } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { useAuthStore } from '@/store/authStore'
import { getUserTrees } from '@/services/neo4jDataService'
import { fetchTodayEvents, formatEventMessage, type TodayEvent } from '@/services/todayEventsService'
import { resolveBackendUrl } from '@/config/api'

const ACTIVE_TREE_KEY = 'familytree-active-tree'
const PREFS_KEY = 'today-category-prefs'

type Filter = 'all' | 'birthday' | 'anniversary' | 'death_anniversary'

interface CategoryPrefs {
  birthday: boolean
  anniversary: boolean
  death_anniversary: boolean
}

function loadPrefs(): CategoryPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CategoryPrefs>
      return {
        birthday:          parsed.birthday          !== false,
        anniversary:       parsed.anniversary       !== false,
        death_anniversary: parsed.death_anniversary !== false,
      }
    }
  } catch { /* ignore */ }
  return { birthday: true, anniversary: true, death_anniversary: true }
}

function savePrefs(prefs: CategoryPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)) } catch { /* ignore */ }
}

function todayLong(): string {
  try {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${weekday}, ${dd}-${mm}-${yy}`;
  } catch {
    try {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    } catch {
      return '';
    }
  }
}

export function TodayOnYourTreePage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)

  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [treeName, setTreeName]       = useState('Family')
  const [events, setEvents]           = useState<TodayEvent[]>([])
  const [filter, setFilter]           = useState<Filter>('all')
  const [prefs, setPrefs]             = useState<CategoryPrefs>(loadPrefs)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true); setError(null)
        const trees = await getUserTrees(user.id)
        if (cancelled) return
        if (trees.length === 0) {
          setError('Add people to your tree to see anniversaries and birthdays here.')
          setLoading(false); return
        }
        const storedId = localStorage.getItem(ACTIVE_TREE_KEY)
        const tree = trees.find(t => t.treeId === storedId) || trees[0]
        setTreeName(tree.treeName)
        const { events: evs } = await fetchTodayEvents(tree.treeId)
        if (cancelled) return
        setEvents(evs)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load today\u2019s events.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const visible = useMemo(() => {
    return events
      .filter(e => prefs[e.type])
      .filter(e => filter === 'all' || e.type === filter)
  }, [events, filter, prefs])

  const counts = useMemo(() => ({
    birthday:          events.filter(e => e.type === 'birthday').length,
    anniversary:       events.filter(e => e.type === 'anniversary').length,
    death_anniversary: events.filter(e => e.type === 'death_anniversary').length,
  }), [events])

  function togglePref(key: keyof CategoryPrefs) {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      savePrefs(next)
      return next
    })
  }

  return (
    <AppShell activeView="home">
      <div className="min-h-full bg-[#F6F2EA] dark:bg-[#0a0a0a] text-[#3D2E1F] dark:text-[#F3F2F1]">
        <main id="main-content" className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-16">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-[13px] text-[#8B7355] dark:text-[#888] hover:text-[#2F3E8F] mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>

          <header className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Gem className="w-5 h-5 text-[#C2A46D]" strokeWidth={2.25} />
              <h1 className="font-display text-[28px] md:text-[32px] font-semibold leading-tight">
                Today on your tree
              </h1>
            </div>
            <p className="text-[14px] text-[#8B7355] dark:text-[#888]">
              {todayLong()} · Gentle reminders from the {treeName} tree.
            </p>
          </header>

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <FilterBar
                filter={filter}
                onChange={setFilter}
                counts={counts}
              />

              <PrefsBar prefs={prefs} onToggle={togglePref} />

              <ul className="space-y-3 mt-4">
                {visible.length === 0 ? (
                  <li className="text-sm text-[#8B7355] dark:text-[#888] py-6 text-center">
                    No events in this view. Adjust filters above to see more.
                  </li>
                ) : (
                  visible.map((e, i) => <EventRow key={`${e.type}-${e.personId}-${i}`} event={e} />)
                )}
              </ul>
            </>
          )}
        </main>
      </div>
    </AppShell>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EventRow({ event }: { event: TodayEvent }) {
  const photo = event.profilePhotoUrl ? resolveBackendUrl(event.profilePhotoUrl) : null
  const initials = ((event.firstName?.[0] || '') + (event.lastName?.[0] || '')).toUpperCase()
  const Icon     = event.type === 'birthday' ? Cake : event.type === 'anniversary' ? Heart : Flower2
  const accent   = event.type === 'birthday'
    ? 'bg-[#FFF4E0] text-[#C2A46D] border-[#C2A46D]/40'
    : event.type === 'anniversary'
      ? 'bg-[#FFE9F1] text-[#B8437E] border-[#B8437E]/30'
      : 'bg-[#EEE9F8] text-[#4B2C5E] border-[#4B2C5E]/30'

  return (
    <li>
      <Link
        to={`/person/${event.personId}`}
        className="flex items-center gap-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] p-4 hover:border-[#C2A46D] hover:shadow-sm transition-all"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F4F6F9] dark:bg-[#2a2a2a] flex items-center justify-center shrink-0 border border-stone-200 dark:border-[#333]">
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-[#8B7355]">{initials || '—'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] text-[#3D2E1F] dark:text-white font-medium truncate">
            {formatEventMessage(event)}
          </div>
          <div className="text-xs text-[#8B7355] dark:text-[#888] mt-0.5">
            {labelForType(event.type)}
            {event.eventYear > 0 ? ` · ${event.eventYear}` : ''}
          </div>
        </div>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${accent} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
      </Link>
    </li>
  )
}

function labelForType(t: TodayEvent['type']): string {
  if (t === 'birthday')    return 'Birthday'
  if (t === 'anniversary') return 'Wedding anniversary'
  return 'Death anniversary'
}

function FilterBar({
  filter, onChange, counts,
}: {
  filter: Filter
  onChange: (f: Filter) => void
  counts: { birthday: number; anniversary: number; death_anniversary: number }
}) {
  const total = counts.birthday + counts.anniversary + counts.death_anniversary
  const tabs: Array<{ id: Filter; label: string; n: number }> = [
    { id: 'all',               label: 'All',            n: total },
    { id: 'birthday',          label: 'Birthdays',      n: counts.birthday },
    { id: 'anniversary',       label: 'Anniversaries',  n: counts.anniversary },
    { id: 'death_anniversary', label: 'Remembrance',    n: counts.death_anniversary },
  ]
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            filter === t.id
              ? 'bg-[#2F3E8F] border-[#2F3E8F] text-white'
              : 'bg-white dark:bg-[#1a1a1a] border-stone-200 dark:border-[#333] text-[#3D2E1F] dark:text-[#F3F2F1] hover:border-[#2F3E8F]/40'
          }`}
        >
          {t.label} <span className="opacity-70">({t.n})</span>
        </button>
      ))}
    </div>
  )
}

function PrefsBar({
  prefs, onToggle,
}: {
  prefs: CategoryPrefs
  onToggle: (key: keyof CategoryPrefs) => void
}) {
  const items: Array<{ key: keyof CategoryPrefs; label: string }> = [
    { key: 'birthday',          label: 'Birthdays' },
    { key: 'anniversary',       label: 'Anniversaries' },
    { key: 'death_anniversary', label: 'Remembrance' },
  ]
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-[#8B7355] dark:text-[#888]">
      <Calendar className="w-3.5 h-3.5" />
      <span>Show:</span>
      {items.map(it => (
        <label key={it.key} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prefs[it.key]}
            onChange={() => onToggle(it.key)}
            className="w-3.5 h-3.5 accent-[#2F3E8F]"
          />
          {it.label}
        </label>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2].map(i => (
        <li key={i} className="h-20 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] animate-pulse" />
      ))}
    </ul>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] p-8 text-center">
      <p className="text-sm text-[#8B7355]">{message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] p-10 text-center space-y-3">
      <Gem className="w-6 h-6 text-[#C2A46D] mx-auto" />
      <h2 className="font-semibold text-lg">A quiet day on your tree</h2>
      <p className="text-sm text-[#8B7355] dark:text-[#888] max-w-sm mx-auto">
        No birthdays, anniversaries, or remembrances fall on today&rsquo;s date.
        Come back tomorrow &mdash; or add birth and wedding dates to surface more moments.
      </p>
    </div>
  )
}
