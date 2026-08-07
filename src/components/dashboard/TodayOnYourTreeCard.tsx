/**
 * TodayOnYourTreeCard — compact widget shown on the dashboard landing.
 *
 * Shows up to 3 of today's events (birthdays, wedding anniversaries, death
 * anniversaries). Links to the full `/today` page when there's more to see.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gem, Cake, Heart, Flower2, ChevronRight } from 'lucide-react'
import { fetchTodayEvents, formatEventMessage, type TodayEvent } from '@/services/todayEventsService'
import { resolveBackendUrl } from '@/config/api'

const MAX_PREVIEW = 3

interface Props {
  treeId: string | null | undefined
}

export function TodayOnYourTreeCard({ treeId }: Props) {
  const [events, setEvents] = useState<TodayEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!treeId) { setLoading(false); return }
    let cancelled = false
      ; (async () => {
        try {
          setLoading(true)
          const { events: evs } = await fetchTodayEvents(treeId)
          if (!cancelled) setEvents(evs)
        } catch {
          if (!cancelled) setEvents([])
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [treeId])

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] p-5">
        <div className="h-4 bg-stone-100 dark:bg-[#2a2a2a] rounded w-32 mb-3 animate-pulse" />
        <div className="h-3 bg-stone-100 dark:bg-[#2a2a2a] rounded w-full mb-2 animate-pulse" />
        <div className="h-3 bg-stone-100 dark:bg-[#2a2a2a] rounded w-5/6 animate-pulse" />
      </div>
    )
  }

  // Silently hide when there are no events — the widget shouldn't be visual noise.
  if (!events || events.length === 0) return null

  const preview = events.slice(0, MAX_PREVIEW)
  const remaining = Math.max(0, events.length - MAX_PREVIEW)

  return (
    <div className="bg-gradient-to-br from-white to-[#F6F2EA] dark:from-[#1a1a1a] dark:to-[#1a1a1a] rounded-2xl border border-[#C2A46D]/30 dark:border-[#333] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4 text-[#C2A46D]" strokeWidth={2.25} />
          <h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-white">
            On this day
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-[#8B7355] font-medium">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>

      <ul className="space-y-2.5">
        {preview.map((e, i) => (
          <li key={`${e.type}-${e.personId}-${i}`}>
            <Link
              to={`/person/${e.personId}`}
              className="group flex items-center gap-3 -mx-1 px-1 py-1 rounded-lg hover:bg-white/80 dark:hover:bg-[#222] transition-colors"
            >
              <Avatar event={e} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#3D2E1F] dark:text-white leading-snug line-clamp-2">
                  {formatEventMessage(e)}
                </p>
              </div>
              <IconBadge type={e.type} />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/today"
        className="mt-3 flex items-center justify-between text-xs font-medium text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline"
      >
        <span>
          {remaining > 0 ? `View all ${events.length} events` : 'Open Today on your tree'}
        </span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

function Avatar({ event }: { event: TodayEvent }) {
  const photo = event.profilePhotoUrl ? resolveBackendUrl(event.profilePhotoUrl) : null
  const initials = ((event.firstName?.[0] || '') + (event.lastName?.[0] || '')).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#F4F6F9] dark:bg-[#2a2a2a] flex items-center justify-center shrink-0 border border-stone-200 dark:border-[#333]">
      {photo ? (
        <img src={photo} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[11px] font-semibold text-[#8B7355]">{initials || '·'}</span>
      )}
    </div>
  )
}

function IconBadge({ type }: { type: TodayEvent['type'] }) {
  const Icon = type === 'birthday' ? Cake : type === 'anniversary' ? Heart : Flower2
  const cls = type === 'birthday'
    ? 'bg-[#FFF4E0] text-[#C2A46D]'
    : type === 'anniversary'
      ? 'bg-[#FFE9F1] text-[#B8437E]'
      : 'bg-[#EEE9F8] text-[#4B2C5E]'
  return (
    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  )
}
