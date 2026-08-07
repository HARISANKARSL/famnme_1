/**
 * InstitutionsHomePage — the new search-first landing page for
 * Celebrate Culture → Sacred Institutions.
 *
 * Replaces ReligiousServicesPage. Orchestrates three views via internal state:
 *   - 'home'   : hero search, My Institutions row, Recent Memories
 *   - 'search' : full-screen InstitutionSearchPage overlay
 *   - 'detail' : full-screen InstitutionDetailPage for a selected link
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Landmark, Search, MapPin, Star, Gem, ChevronRight, Image as ImageIcon } from 'lucide-react'
import type { Person, Union, TempleLink, PlaceSuggestion } from '@/types'
import {
  getPersonTempleLinks, getTreeTempleMemoryCounts,
  getTempleMemories, createTempleLink,
} from '@/services/templeLinkApiService'
import {
  searchNearbyPlaces, enrichPlace,
} from '@/services/googleMapsApiService'
import {
  resolveLocalInstitution, resolveInstitutions, type ResolvedInstitution,
} from '@/components/institutions/institutionResolver'
import {
  InstitutionCard,
  // InstitutionAddCard, 
  type InstitutionCardData
} from '@/components/institutions/InstitutionCard'
import { EmptyInstitutionsState } from '@/components/institutions/EmptyInstitutionsState'
import { getFindHeadline } from '@/components/institutions/tagConfig'
import { InstitutionSearchPage } from './InstitutionSearchPage'
import { InstitutionDetailPage } from './InstitutionDetailPage'

interface InstitutionsHomePageProps {
  persons?: Person[]
  unions?: Union[]
  treeId?: string
  onClose: () => void
}

type View = 'home' | 'search' | 'detail'

interface RecentMemoryItem {
  memoryId: string
  templeLinkId: string
  templeId: string
  templeName: string
  title: string
  thumbnailUrl?: string
  mediaUrl?: string
  dateTaken?: string
}

const FAITH_KEY = (treeId?: string) => `cc_faith_${treeId ?? 'default'}`
const FAITH_LABEL_SHORT: Record<string, string> = { Hindu: 'Hindu', Christian: 'Christian', Islam: 'Muslim', Muslim: 'Muslim' }

export function InstitutionsHomePage({ persons, unions: _unions, treeId, onClose }: InstitutionsHomePageProps) {
  void _unions

  // ---- User/tree context ----------------------------------------------------
  const homePerson = useMemo(() => persons?.find(p => p.isHomePerson), [persons])

  // Faith preference — read-only on this page (picker will move to Profile).
  const faithLabel = useMemo((): string | null => {
    try { return localStorage.getItem(FAITH_KEY(treeId)) } catch { return null }
  }, [treeId])

  // ---- View routing (internal) ---------------------------------------------
  const [view, setView] = useState<View>('home')
  const [selectedLink, setSelectedLink] = useState<TempleLink | null>(null)
  const [initialSearchQuery, setInitialSearchQuery] = useState('')

  // ---- My Institutions data -------------------------------------------------
  const [links, setLinks] = useState<TempleLink[]>([])
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({})
  const [resolvedById, setResolvedById] = useState<Record<string, ResolvedInstitution>>({})
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!treeId || !homePerson) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getPersonTempleLinks(treeId, homePerson.personId).catch(() => [] as TempleLink[]),
      getTreeTempleMemoryCounts(treeId).catch(() => ({} as Record<string, number>)),
    ]).then(async ([ls, counts]) => {
      if (cancelled) return
      setLinks(ls)
      setMemoryCounts(counts)
      // Resolve each linked templeId in parallel
      const resolved = await resolveInstitutions(ls.map(l => l.templeId))
      if (!cancelled) {
        setResolvedById(resolved)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [treeId, homePerson, reloadKey])

  // ---- Recent Memories (aggregate across linked institutions) --------------
  const [recentMemories, setRecentMemories] = useState<RecentMemoryItem[]>([])

  useEffect(() => {
    if (!treeId || links.length === 0) { setRecentMemories([]); return }
    let cancelled = false
    Promise.all(
      links.map(link =>
        getTempleMemories(treeId, link.templeId)
          .then(r => r.memories.map(m => ({
            memoryId: m.memoryId,
            templeLinkId: link.templeLinkId,
            templeId: link.templeId,
            templeName: resolvedById[link.templeId]?.name ?? '',
            title: m.title,
            thumbnailUrl: m.thumbnailUrl,
            mediaUrl: m.mediaUrl,
            dateTaken: m.dateTaken,
          } satisfies RecentMemoryItem)))
          .catch(() => [] as RecentMemoryItem[])
      )
    ).then(results => {
      if (cancelled) return
      const all = results.flat()
      all.sort((a, b) => {
        const da = a.dateTaken ? new Date(a.dateTaken).getTime() : 0
        const db = b.dateTaken ? new Date(b.dateTaken).getTime() : 0
        return db - da
      })
      setRecentMemories(all.slice(0, 8))
    })
    return () => { cancelled = true }
  }, [treeId, links, resolvedById])

  // ---- Nearby (populated on demand by 📍 Near me chip) ---------------------
  const [showNearby, setShowNearby] = useState(false)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceSuggestion[]>([])
  const [nearbyError, setNearbyError] = useState<string | null>(null)

  const fetchNearby = useCallback(() => {
    setShowNearby(true)
    setNearbyError(null)
    if (!navigator.geolocation) {
      setNearbyError('Location not available on this device.')
      return
    }
    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const types = faithLabel === 'Christian' ? ['church']
            : faithLabel === 'Islam' || faithLabel === 'Muslim' ? ['mosque']
              : ['temple', 'church', 'mosque']
          const places = await searchNearbyPlaces(pos.coords.latitude, pos.coords.longitude, types, 15)
          setNearbyPlaces(places.slice(0, 8))
        } catch {
          setNearbyError('Could not fetch nearby places.')
        } finally {
          setNearbyLoading(false)
        }
      },
      () => { setNearbyError('Please enable location to see nearby places.'); setNearbyLoading(false) },
      { timeout: 8000, maximumAge: 300000 }
    )
  }, [faithLabel])

  // ---- Handlers -------------------------------------------------------------
  const openCard = useCallback((templeLinkId: string) => {
    const link = links.find(l => l.templeLinkId === templeLinkId)
    if (!link) return
    setSelectedLink(link)
    setView('detail')
  }, [links])

  const openSearch = useCallback((prefill = '') => {
    setInitialSearchQuery(prefill)
    setView('search')
  }, [])

  const handleAdded = useCallback((_templeId: string) => {
    void _templeId
    // Bounce back to home, reload, then auto-open that newly linked institution
    setView('home')
    setReloadKey(k => k + 1)
  }, [])

  const handleAddNearby = useCallback(async (place: PlaceSuggestion) => {
    if (!treeId || !homePerson) return
    try {
      enrichPlace(place.placeId).catch(() => {/* silent */ })
      // Explicit connectionType for backward compat with the strict prod backend.
      await createTempleLink(treeId, homePerson.personId, { templeId: place.placeId, connectionType: 'regular_visit' })
      setReloadKey(k => k + 1)
      setShowNearby(false)
    } catch {
      /* silent */
    }
  }, [treeId, homePerson])

  const handleRemoved = useCallback(() => {
    setView('home')
    setSelectedLink(null)
    setReloadKey(k => k + 1)
  }, [])

  const handleLinkUpdated = useCallback((next: TempleLink) => {
    setSelectedLink(next)
    setLinks(prev => prev.map(l => l.templeLinkId === next.templeLinkId ? next : l))
  }, [])

  // ---- Card data (resolved + counts) ---------------------------------------
  const cards: InstitutionCardData[] = useMemo(() => {
    return links.map(l => {
      const r = resolvedById[l.templeId] ?? resolveLocalInstitution(l.templeId)
      return {
        templeLinkId: l.templeLinkId,
        templeId: l.templeId,
        name: r?.name ?? 'Sacred place',
        location: r?.location,
        photoUrl: r?.photoUrl,
        religion: r?.religion ?? null,
        tags: l.tags ?? [],
        memoryCount: memoryCounts[l.templeId] ?? 0,
      }
    })
  }, [links, resolvedById, memoryCounts])

  // Guard: if no tree/home person, show a friendly message
  const canUse = !!treeId && !!homePerson

  // ---- Views ---------------------------------------------------------------
  if (view === 'search' && canUse) {
    return (
      <InstitutionSearchPage
        treeId={treeId!}
        personId={homePerson!.personId}
        faithLabel={faithLabel}
        initialQuery={initialSearchQuery}
        onBack={() => setView('home')}
        onAdded={handleAdded}
      />
    )
  }

  if (view === 'detail' && selectedLink && canUse) {
    return (
      <InstitutionDetailPage
        treeId={treeId!}
        personId={homePerson!.personId}
        link={selectedLink}
        persons={persons}
        onBack={() => { setView('home'); setReloadKey(k => k + 1) }}
        onRemoved={handleRemoved}
        onLinkUpdated={handleLinkUpdated}
      />
    )
  }

  // Home view ----------------------------------------------------------------
  return (
    <div className="absolute inset-0 z-40 bg-[#F6F2EA] dark:bg-[#141414] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="shrink-0 h-14 md:h-16 flex items-center gap-3 px-3 md:px-5 bg-white dark:bg-[#1A1A1A] border-b border-[#E2DBCE]/70 dark:border-[#2A2A2A]">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[#2F3E8F]/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#2F3E8F]/10 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 text-[#2F3E8F]" />
          </div>
          <h1 className="text-[17px] md:text-[18px] font-bold text-[#3D2E1F] dark:text-[#F5F5F5] truncate font-serif-display">
            Sacred Institutions
          </h1>
        </div>
        {faithLabel && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C2A46D]/15 text-[#A0814B] text-[11px] font-semibold">
            <Gem className="w-3 h-3" />
            {FAITH_LABEL_SHORT[faithLabel] ?? faithLabel}
          </span>
        )}
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-3 md:px-6 py-5 md:py-8 space-y-7">

          {/* ═══ Search hero ═══ */}
          <section>
            <h2 className="text-[20px] md:text-[24px] font-bold text-[#3D2E1F] dark:text-[#F5F5F5] font-serif-display mb-1">
              {getFindHeadline(faithLabel)}
            </h2>
            <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] mb-3">
              Search by name or location. Add it as yours. Keep memories together.
            </p>
            <button
              onClick={() => openSearch()}
              className="group w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE] dark:ring-[#2A2A2A] hover:ring-[#2F3E8F]/50 hover:shadow-sm transition-all text-left"
            >
              <Search className="w-5 h-5 text-[#2F3E8F] shrink-0" strokeWidth={1.8} />
              <span className="flex-1 text-[14px] text-[#8B7355] dark:text-[#A19F9D] group-hover:text-[#3D2E1F] transition-colors">
                Search by name or location…
              </span>
              <ChevronRight className="w-4 h-4 text-[#8B7355] group-hover:text-[#2F3E8F] transition-colors" />
            </button>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={fetchNearby}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE] dark:ring-[#2A2A2A] text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] hover:ring-[#2F3E8F]/50 transition-all min-h-[32px]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#2F3E8F]" /> Near me
              </button>
              <button
                onClick={() => openSearch('popular')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE] dark:ring-[#2A2A2A] text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] hover:ring-[#2F3E8F]/50 transition-all min-h-[32px]"
              >
                <Star className="w-3.5 h-3.5 text-[#C2A46D]" /> Popular
              </button>
            </div>
          </section>

          {/* ═══ Nearby inline results ═══ */}
          {showNearby && (
            <section className="rounded-2xl bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE]/70 dark:ring-[#2A2A2A] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#F5F5F5]">Near you</h3>
                <button onClick={() => setShowNearby(false)} className="text-[11px] text-[#8B7355] hover:text-[#3D2E1F]">Hide</button>
              </div>
              {nearbyLoading && <p className="text-[12px] text-[#8B7355]">Finding places near you…</p>}
              {nearbyError && <p className="text-[12px] text-red-600">{nearbyError}</p>}
              {!nearbyLoading && !nearbyError && nearbyPlaces.length === 0 && (
                <p className="text-[12px] text-[#8B7355]">No sacred places found nearby.</p>
              )}
              <ul className="space-y-2">
                {nearbyPlaces.map(p => (
                  <li key={p.placeId} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F6F2EA] dark:hover:bg-[#252525]">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#2F3E8F]/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-[#2F3E8F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#8B7355] line-clamp-1">{p.formattedAddress}</p>
                    </div>
                    <button
                      onClick={() => handleAddNearby(p)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-[#2F3E8F] hover:bg-[#25327A] text-white text-[11px] font-semibold min-h-[32px]"
                    >
                      + Add
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ═══ My Institutions / Empty state ═══ */}
          {!loading && cards.length === 0 ? (
            <EmptyInstitutionsState onStart={() => openSearch()} faithLabel={faithLabel} />
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] md:text-[15px] font-bold uppercase tracking-wide text-[#8B7355]">
                  My Institutions {cards.length > 0 && <span className="text-[#3D2E1F] dark:text-[#F5F5F5] normal-case font-normal tracking-normal">· {cards.length}</span>}
                </h3>
                <button
                  onClick={() => openSearch()}
                  className="text-[12px] font-semibold text-[#2F3E8F] hover:underline"
                >
                  + Add
                </button>
              </div>
              {loading ? (
                <div className="flex gap-3 overflow-hidden">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="shrink-0 w-[220px] md:w-[240px] aspect-[4/5] rounded-2xl bg-white/50 dark:bg-[#1E1E1E]/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 md:-mx-6 px-3 md:px-6 snap-x">
                  {cards.map(c => (
                    <div key={c.templeLinkId} className="snap-start">
                      <InstitutionCard institution={c} onClick={() => openCard(c.templeLinkId)} />
                    </div>
                  ))}
                  <div className="snap-start">
                    {/* <InstitutionAddCard onClick={() => openSearch()} /> */}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ═══ Recent Memories ═══ */}
          {recentMemories.length > 0 && (
            <section>
              <h3 className="text-[14px] md:text-[15px] font-bold uppercase tracking-wide text-[#8B7355] mb-3">
                Recent Memories
              </h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {recentMemories.map(m => (
                  <li key={m.memoryId}>
                    <button
                      onClick={() => {
                        const link = links.find(l => l.templeLinkId === m.templeLinkId)
                        if (link) { setSelectedLink(link); setView('detail') }
                      }}
                      className="group w-full text-left rounded-xl overflow-hidden bg-white dark:bg-[#1E1E1E] ring-1 ring-[#E2DBCE]/70 dark:ring-[#2A2A2A] hover:ring-[#2F3E8F]/50 transition-all"
                    >
                      <div className="relative w-full aspect-square bg-[#E2DBCE]/40 dark:bg-[#252525] overflow-hidden">
                        {(m.thumbnailUrl || m.mediaUrl) ? (
                          <img src={m.thumbnailUrl || m.mediaUrl} alt={m.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#8B7355]/50">
                            <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-2">
                        <p className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] line-clamp-1">
                          {m.title}
                        </p>
                        {m.templeName && (
                          <p className="text-[10px] text-[#8B7355] dark:text-[#A19F9D] line-clamp-1">
                            at {m.templeName}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
