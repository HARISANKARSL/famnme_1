/**
 * DashboardHomePage — Two-column social dashboard
 *
 * Left column: CreatePostWidget + global Daily Share feed
 * Right column: Stories + engagement/identity/culture widgets
 * Collapses to single column on mobile.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useAnalyticsStore } from '@/store/analyticsStore'
import { useContributorStore } from '@/store/contributorStore'
import { X, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Person, Union, Memory } from '@/types'
import type { Relationship } from '@/services/elkLayoutService'
import { fetchSuggestions } from '@/services/neo4jDataService'
import { fetchMemories } from '@/services/memoriesApiService'
import { generateFeed } from '@/services/feedEngineService'
import { useResponsive } from '@/hooks/useResponsive'
import { useLenisDashboard } from '@/hooks/useLenisDashboard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import * as shareApi from '@/services/dailyShareApiService'
import type { SharePost } from '@/services/dailyShareApiService'
import { VirtualFeedList } from '@/components/dailyshare/VirtualFeedList'
import { SharePostSkeleton } from '@/components/dailyshare/SharePostSkeleton'
import { ScrollToTopButton } from '@/components/dashboard/ScrollToTopButton'
import { TreePreviewCard } from '@/components/home/TreePreviewCard'
import { OnboardingChecklist } from '@/components/home/OnboardingChecklist'
import { SeededFeedFallback } from '@/components/dailyshare/SeededFeedFallback'
import { PostOfTheDayCard } from '@/components/dailyshare/PostOfTheDayCard'
import { InactivityNudge } from '@/components/home/InactivityNudge'
import { TaskWalkthrough, type WalkthroughStep } from '@/components/onboarding/TaskWalkthrough'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  GenZEmptyState,
  CreatePostWidget,
} from '@/components/dashboard/genz'
import { resolveBackendUrl } from '@/config/api'
import dummyFeed from '@/data/dummyFeed.json'
import { trackEvent } from '@/services/firebase/analytics.service'

interface PeopleFilter {
  isLiving?: boolean
  filterMarried?: boolean
  sort?: string
  order?: string
  gender?: string
}

export interface DashboardHomeProps {
  treeId: string
  treeName: string
  persons: Person[]
  unions: Union[]
  relationships: Relationship[]
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string | null
  onNavigateToTree: () => void
  onOpenProfile: (personId: string) => void
  onOpenMemories?: () => void
  onOpenActivityFeed?: () => void
  onOpenMigrationMap?: () => void
  onOpenStatistics?: () => void
  onInviteFamily?: () => void
  onOpenAllPeople?: (filter?: PeopleFilter) => void
  treeStatistics?: {
    topGotras?: Array<{ gotra: string; count: number }>
    topBirthPlaces?: Array<{ place: string; count: number }>
  }
  kulaDevataName?: string | null
  templeMemoryCount?: number
  onStartStoryCapture?: () => void
  onOpenTemples?: () => void
  onOpenDailyShare?: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// function formatDate(): string {
//   const d = new Date()
//   const dd = String(d.getDate()).padStart(2, '0')
//   const mm = String(d.getMonth() + 1).padStart(2, '0')
//   const yy = String(d.getFullYear()).slice(-2)
//   const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
//   return `${weekday}, ${dd}-${mm}-${yy}`
// }


function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DashboardHomePage({
  treeId,
  treeName,
  persons,
  unions,
  relationships,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onNavigateToTree,
  onOpenProfile,
  onOpenMemories,
  onOpenMigrationMap,
  onInviteFamily,
  kulaDevataName,
  templeMemoryCount = 0,
  onStartStoryCapture,
  onOpenTemples,
  onOpenDailyShare,
}: DashboardHomeProps) {
  const { user } = useAuthStore()
  const firstName = user?.fullName?.split(' ')[0] || 'there'
  const isEmpty = persons.length === 0
  const homePerson = persons.find(p => p.isHomePerson)

  // Contributor role detection — used to filter/hide tree-wide widgets
  const myRole = useContributorStore(s => s.myRole)
  const _isContributor = myRole === 'contributor'
  const isNonOwner = myRole !== null && myRole !== 'owner'

  // ── Completeness ──
  const [completenessPercent, setCompletenessPercent] = useState<number | undefined>(undefined)
  const [topSuggestion, setTopSuggestion] = useState<{ personId: string; personName: string; type: string } | null>(null)

  // ── Memories for "Relive Memory" widget ──
  const [memories, setMemories] = useState<Memory[]>([])

  // ── Session reward ──
  const prevPersonCountRef = useRef<number | null>(null)
  const [sessionReward, setSessionReward] = useState<{ emoji: string; headline: string } | null>(null)

  // ── Daily Share feed state (page-based pagination) ──
  const [feedPosts, setFeedPosts] = useState<SharePost[]>([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)
  const [feedPage, setFeedPage] = useState(1)
  const [feedHasMore, setFeedHasMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [feedIsOffline, setFeedIsOffline] = useState(false)
  const feedScrollRef = useRef<HTMLDivElement>(null)
  // State-backed mirror so children re-render once the scroll element mounts
  // (refs don't trigger re-renders, which breaks virtualization on first paint).
  const [feedScrollEl, setFeedScrollEl] = useState<HTMLDivElement | null>(null)
  const setFeedScrollNode = useCallback((node: HTMLDivElement | null) => {
    feedScrollRef.current = node
    setFeedScrollEl(node)
  }, [])

  // ── Feed refresh scroll tracking ──
  const [initialViewedCount, setInitialViewedCount] = useState(() => useAnalyticsStore.getState().viewedPosts.length)
  const totalViewedCount = useAnalyticsStore(state => state.viewedPosts.length)
  const viewedSinceRefresh = Math.max(0, totalViewedCount - initialViewedCount)
  const [scrollTop, setScrollTop] = useState(0)
  const [showRefreshButton, setShowRefreshButton] = useState(false)

  // ── Smooth scroll (Lenis) ──
  const lenisRef = useLenisDashboard({ wrapper: feedScrollEl })

  // ── Generation depth ──
  const generationDepth = useMemo(() => {
    if (!homePerson) return 1
    const generationMap = new Map<string, number>()
    generationMap.set(homePerson.personId, 0)
    const queue = [homePerson.personId]
    let minGen = 0
    let maxGen = 0

    while (queue.length) {
      const id = queue.shift()!
      const gen = generationMap.get(id) || 0

      for (const r of relationships) {
        if (r.type === 'HAS_CHILD' && r.toId === id && !generationMap.has(r.fromId)) {
          const parentRels = relationships.filter(pr => pr.type === 'PARTNER_IN' && pr.toId === r.fromId)
          for (const pr of parentRels) {
            if (!generationMap.has(pr.fromId)) {
              generationMap.set(pr.fromId, gen - 1)
              queue.push(pr.fromId)
              minGen = Math.min(minGen, gen - 1)
            }
          }
        }
      }

      const partnerUnions = relationships.filter(r2 => r2.type === 'PARTNER_IN' && r2.fromId === id)
      for (const pu of partnerUnions) {
        const childRels = relationships.filter(cr => cr.type === 'HAS_CHILD' && cr.fromId === pu.toId)
        for (const cr of childRels) {
          if (!generationMap.has(cr.toId)) {
            generationMap.set(cr.toId, gen + 1)
            queue.push(cr.toId)
            maxGen = Math.max(maxGen, gen + 1)
          }
        }
      }
    }

    return Math.max(1, maxGen - minGen + 1)
  }, [homePerson, relationships])

  // ── Snapshot data ──
  const snapshotData = useMemo(() => {
    const feed = generateFeed({
      persons, unions, relationships,
      completenessPercent, topSuggestion,
      focusPersonId: homePerson?.personId || null,
      treeName, treeId, sessionRotation: 0,
    })
    return feed.find(c => c.kind === 'snapshot')
  }, [persons, unions, relationships, completenessPercent, topSuggestion, homePerson, treeName, treeId])

  // ── Fetch suggestions ──
  useEffect(() => {
    const defaultTreeId = localStorage.getItem('defaultTreeId') || treeId
    if (!defaultTreeId) return
    let cancelled = false
    fetchSuggestions(defaultTreeId).then(res => {
      if (cancelled) return
      setCompletenessPercent(res.completenessPercent)
      if (res.suggestions.length > 0) {
        const s = res.suggestions[0]
        setTopSuggestion({ personId: s.personId, personName: s.personName, type: s.type })
      }
    }).catch(() => {/* silent */ })
    return () => { cancelled = true }
  }, [treeId])

  // ── Fetch memories for Relive widget ──
  const loadMemories = useCallback(() => {
    if (!treeId) return
    fetchMemories(treeId).then(res => {
      const memoriesList = Array.isArray(res) ? res : (res?.memories || []);
      setMemories(memoriesList);
    }).catch(() => {/* silent */ })
  }, [treeId])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('memories-changed', loadMemories)
    return () => {
      window.removeEventListener('memories-changed', loadMemories)
    }
  }, [loadMemories])

  // ── Session reward ──
  useEffect(() => {
    const cleanCount = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length
    if (prevPersonCountRef.current !== null && cleanCount > prevPersonCountRef.current) {
      setSessionReward({
        emoji: '\uD83C\uDF89',
        headline: `Your family just grew to ${cleanCount} member${cleanCount !== 1 ? 's' : ''}!`,
      })
      const timer = setTimeout(() => setSessionReward(null), 8000)
      prevPersonCountRef.current = cleanCount
      return () => clearTimeout(timer)
    }
    prevPersonCountRef.current = cleanCount
  }, [persons]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ──
  const familyName = useMemo(() => {
    if (homePerson?.lastName) return homePerson.lastName
    const match = treeName.match(/^(\w+)\s+(?:family|tree)/i)
    if (match) return match[1]
    return treeName
  }, [homePerson, treeName])

  const homePersonAvatarUrl = homePerson?.photoThumbUrl ? resolveBackendUrl(homePerson.photoThumbUrl) : null
  const memberCount = persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length

  // ── Daily Share feed loading (page-based) ──
  const loadFeed = useCallback(async (page: number = 1, silent: boolean = false): Promise<boolean> => {
    try {
      if (page > 1) {
        setFeedLoadingMore(true)
      } else {
        if (!silent) {
          setFeedLoading(true)
        }
        setFeedError(null)
      }

      try {
        const feed = await shareApi.fetchGlobalFeed(page, treeId)
        if (page > 1) {
          setFeedPosts(prev => [...prev, ...feed.posts])
        } else {
          setFeedPosts(feed.posts)
          setInitialViewedCount(useAnalyticsStore.getState().viewedPosts.length)
        }
        setFeedHasMore(feed.hasMore)
        setFeedPage(feed.page)
        setFeedIsOffline(false)
        return true
      } catch (apiErr) {
        console.warn('Failed to fetch real feed, using dummy data:', apiErr)
        // Fallback to dummy data (first page only)
        if (page === 1) {
          setFeedPosts(dummyFeed.posts as SharePost[])
          setFeedHasMore(false)
          setFeedIsOffline(true)
          setInitialViewedCount(useAnalyticsStore.getState().viewedPosts.length)
        }
        return false
      }
    } catch {
      setFeedError('Failed to load feed')
      return false
    } finally {
      setFeedLoading(false)
      setFeedLoadingMore(false)
    }
  }, [treeId])

  useEffect(() => { loadFeed() }, [loadFeed])

  // Analytics periodic flush (every 15 seconds) & page/route exit handling
  useEffect(() => {
    const interval = setInterval(() => {
      useAnalyticsStore.getState().flushQueue();
    }, 15000);

    return () => {
      clearInterval(interval);
      console.log('🚪 [Analytics Store] Page/Route Exit Detected from DashboardHomePage. Flushing remaining events.');
      useAnalyticsStore.getState().flushQueue(true);
    };
  }, []);

  // Track when feed is opened
  useEffect(() => {
    trackEvent("feed_opened");
  }, []);

  // ── Scroll event listener to track position for refresh button ──
  useEffect(() => {
    if (!feedScrollEl) return
    const handleScroll = () => {
      setScrollTop(feedScrollEl.scrollTop)
    }
    feedScrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      feedScrollEl.removeEventListener('scroll', handleScroll)
    }
  }, [feedScrollEl])

  // ── Determine visibility of the "Refresh Feed" button ──
  useEffect(() => {
    if (feedPage >= 5 && scrollTop < 150) {
      setShowRefreshButton(true)
    } else {
      setShowRefreshButton(false)
    }
  }, [feedPage, scrollTop])

  // ── Call API to refresh and reload feed ──
  const handleRefreshFeed = useCallback(async () => {
    try {
      setShowRefreshButton(false)
      setFeedLoading(true)
      // Call recommendations refresh API with camelCase payload contract { authorId, treeId }
      await shareApi.refreshRecommendationsFeed(treeId)
      // Reset viewed posts since refresh counter
      setInitialViewedCount(useAnalyticsStore.getState().viewedPosts.length)
      // Reload feed
      const success = await loadFeed(1)
      
      if (success) {
        trackEvent("feed_refresh_success");
      } else {
        trackEvent("feed_refresh_failed", { reason: "feed_load_failed" });
      }

      // Scroll smoothly to top
      if (feedScrollEl) {
        feedScrollEl.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      console.error('Failed to refresh feed:', err)
      trackEvent("feed_refresh_failed", { reason: "api_call_failed", error: String(err) });
    } finally {
      setFeedLoading(false)
    }
  }, [treeId, loadFeed, feedScrollEl])

  // ── Pull-to-refresh (mobile) ──
  const { isTouchDevice } = useResponsive()
  const { pullDistance, isRefreshing } = usePullToRefresh({
    containerRef: feedScrollRef,
    onRefresh: async () => { 
      const success = await loadFeed() 
      if (success) {
        trackEvent("feed_refresh_success");
      } else {
        trackEvent("feed_refresh_failed", { reason: "pull_to_refresh_failed" });
      }
    },
    enabled: isTouchDevice,
  })

  // ── Infinite scroll — load next page ──
  const handleLoadMore = useCallback(() => {
    if (feedHasMore && !feedLoadingMore) {
      loadFeed(feedPage + 1)
    }
  }, [feedHasMore, feedLoadingMore, feedPage, loadFeed])

  const handlePostDeleted = (postId: string) => {
    setFeedPosts(prev => prev.filter(p => p.postId !== postId))
  }

  const handlePostUpdated = useCallback((postId: string, updates: Partial<SharePost>) => {
    setFeedPosts(prev => prev.map(p => p.postId === postId ? { ...p, ...updates } : p));
  }, []);

  const handlePostCreated = () => {
    loadFeed(1, true)
    loadMemories()
  }

  // ── Widgets block (reused in both mobile and desktop layouts) ──
  const widgetsBlock = (
    <>
      {/* Email verification banner (A3) */}
      {/* <div className="md:ios-stagger-1">
        <EmailVerificationBanner />
      </div> */}

      {/* Today on your tree (Phase 2 / C1 + 6.1) — above the fold */}
      {/* <div className="md:ios-stagger-1">
        <TodayCard
          treeId={treeId}
          persons={persons}
          unions={unions}
          relationships={relationships}
          memories={memories}
          onOpenMemories={onOpenMemories}
          onOpenProfile={onOpenProfile}
          onAddMemory={onOpenMemories}
        />
      </div> */}

      {/* Continue where you left off (6.11) — only shows if user touched a person in last 30 days */}
      {/* {treeId && onOpenProfile && (
        <div className="md:ios-stagger-1">
          <ContinueWhereYouLeftOff
            treeId={treeId}
            resolvePerson={(id) => persons.find(p => p.personId === id) ?? null}
            onOpenProfile={onOpenProfile}
          />
        </div>
      )} */}

      {/* Big Tree Card (Phase 2 / C1) — secondary hero, "open tree" path */}
      <div className="">
        <TreePreviewCard
          persons={persons}
          generationDepth={generationDepth}
          familyName={treeName}
          onNavigateToTree={onNavigateToTree}
          onAddPerson={onNavigateToTree}
          onInviteFamily={onInviteFamily}
          onOpenProfile={onOpenProfile}
        />
      </div>

      {/* Onboarding checklist (Phase 2 / 5.4) */}
      {user?.id && (
        <div className="md:ios-stagger-1">
          <OnboardingChecklist
            userId={user.id}
            persons={persons}
            memoryCount={memories.length}
            onAddMemory={onOpenMemories}

            onOpenHomePerson={() => homePerson && onOpenProfile?.(homePerson.personId)}
          />
        </div>
      )}

      {/* Memory prompt of the day (Phase 3 / 6.6) */}
      {/* <div className="md:ios-stagger-1">
        <PromptOfTheDay
          onStartPrompt={() => onOpenMemories?.()}
          inline
        />
      </div> */}

      {/* ── Right-rail trimmed to 4 widgets (C1) ── */}

      {/* 0. On this day — today-specific birthdays/anniversaries/remembrances */}
      {/* <div className="ios-stagger-1">
        <TodayOnYourTreeCard treeId={treeId} />
      </div> */}

      {/* 1. This week — Family Milestones (birthdays / anniversaries) */}
      {/* <div className="ios-stagger-2">
        <CelebrationWidget
          persons={persons}
          unions={unions}
          relationships={relationships}
          onOpenProfile={onOpenProfile}
        />
      </div> */}



      {/* 3. Tree Snapshot */}
      {/* <div className="ios-stagger-4">
        <TreeSnapshotWidget
          persons={persons}
          relationships={relationships}
          familyName={familyName}
          memberCount={memberCount}
          generationDepth={generationDepth}
          rootAncestorName={snapshotData?.kind === 'snapshot' ? snapshotData.rootAncestorName : null}
          onNavigateToTree={onNavigateToTree}
          onOpenProfile={onOpenProfile}
        />
      </div> */}

      {/* 4. Rotating widget — Relive Memory (changes daily by date hash) */}
      {/* <div className="ios-stagger-3">
        <ReliveMemoryWidget
          memories={memories}
          onOpenMemory={() => onOpenMemories?.()}
        />
      </div> */}

      {/* "Insights →" link — opens hub with the rest of the widgets */}
      {/* <Link
        to="/insights"
        className="group flex items-center justify-between rounded-2xl bg-white dark:bg-[#1E1E1E] px-4 py-3 shadow-sm ring-1 ring-stone-100 dark:ring-[#333] hover:bg-[#F8F6F1] dark:hover:bg-[#262626] transition-colors"
      >
        <div>
          <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8]">Insights & heritage</p>
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] mt-0.5">
            Astrology · migration · festivals · temples · roots map
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#2F3E8F] dark:text-[#7B8FD4] group-hover:translate-x-0.5 transition-transform" />
      </Link> */}
    </>
  )

  // ── Feed block (reused in both layouts) ──
  const feedBlock = (
    <>
      {/* Create Post Widget */}
      <CreatePostWidget
        treeId={treeId}
        userAvatarUrl={homePersonAvatarUrl}
        userName={user?.fullName || firstName}
        onOpenMemories={onOpenMemories}
        onOpenDailyShare={onOpenDailyShare}
        onOpenStories={onOpenMemories}
        onPostCreated={handlePostCreated}
      />

      {/* 6.7 — Post of the day featured slot, only renders if backend has a winner */}
      <PostOfTheDayCard />

      {/* Feed section */}
      <div className="rounded-2xl md:rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden ios-card md:!rounded-2xl">
        {feedIsOffline && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-[#E2DBCE]/40 dark:border-[#2a2a2a] text-amber-800 dark:text-amber-300 text-[11px] font-medium animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>You are viewing cached offline posts.</span>
            </div>
            <button
              onClick={() => loadFeed(1)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-all font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        )}
        {feedLoading ? (
          <div className="divide-y divide-stone-100 dark:divide-[#333]">
            <SharePostSkeleton />
            <SharePostSkeleton />
            <SharePostSkeleton />
          </div>
        ) : feedError ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#8B7355] dark:text-[#999]">{feedError}</p>
            <button
              onClick={() => loadFeed()}
              className="mt-3 text-sm text-[#2F3E8F] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : feedPosts.length === 0 ? (
          <SeededFeedFallback onStartMemory={onOpenMemories} />
        ) : (
          <VirtualFeedList
            posts={feedPosts}
            scrollElement={feedScrollEl}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onDeleted={handlePostDeleted}
            onUpdated={handlePostUpdated}
            onLoadMore={handleLoadMore}
            isLoadingMore={feedLoadingMore}
            hasMore={feedHasMore}
          />
        )}
      </div>
    </>
  )

  return (
    <div ref={setFeedScrollNode} className="relative flex-1 min-h-0 overflow-y-auto bg-[#F2EFE9] md:bg-[#F8F6F1] dark:bg-[#121212] md:dark:bg-[#121212] ios-scroll-container">
      <div className="lenis-content w-full flex flex-col min-h-full">

      {/* Floating Refresh Feed Button */}
      {showRefreshButton && (
        <div className="sticky top-4 z-[999] flex justify-center w-full pointer-events-none animate-ios-spring">
          <button
            onClick={handleRefreshFeed}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F3E8F] dark:bg-[#7B8FD4] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 text-[13px] font-bold tracking-tight"
          >
            <RefreshCw className="w-4 h-4 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
            New posts available. Click to refresh
          </button>
        </div>
      )}

      {/* Pull-to-refresh indicator — iOS style */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center overflow-hidden transition-all duration-200"
          style={{ height: `${Math.min(pullDistance, 80)}px` }}
        >
          {isRefreshing ? (
            <div className="ios-refresh-spinner mt-3" />
          ) : (
            <Loader2
              className="h-5 w-5 text-[#8B7355] dark:text-[#999] mt-3"
              style={{ opacity: Math.min(pullDistance / 60, 1), transform: `rotate(${pullDistance * 3}deg)` }}
            />
          )}
        </div>
      )}

      <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 pb-24 lg:pb-8">
        {/* Greeting */}
        <div className="mb-5 animate-fade-in">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-[#F5F1E8]">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs text-stone-400 dark:text-[#999] mt-0.5">{formatDate()}</p>
        </div>

        {/* Session reward toast */}
        {sessionReward && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-blue-700 p-4 shadow-md text-white flex items-center gap-3 animate-fade-in-up mb-5">
            <span className="text-3xl leading-none">{sessionReward.emoji}</span>
            <p className="flex-1 text-sm font-bold leading-snug">{sessionReward.headline}</p>
            <button onClick={() => setSessionReward(null)} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}

        {isEmpty ? (
          <GenZEmptyState
            onStartStoryCapture={onStartStoryCapture}
            onBuildStepByStep={onNavigateToTree}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
            {/* LEFT COLUMN — Feed */}
            <div className="w-full lg:w-[58%] lg:min-w-0 space-y-4">
              {feedBlock}
            </div>

            {/* RIGHT COLUMN — Widgets */}
            <div className="w-full lg:w-[42%] lg:min-w-0 space-y-4 lg:sticky lg:top-6">
              {widgetsBlock}
            </div>
          </div>
        )}
      </div>

      {/* Scroll-to-top FAB */}
      <ScrollToTopButton scrollRef={feedScrollRef} lenis={lenisRef.current} />

      {/* Phase 3 — contextual inactivity nudge (60s idle) */}
      {!isEmpty && (
        <InactivityNudge
          idleSeconds={90}
          onAddMemory={onOpenMemories}
          onInviteFamily={onInviteFamily}
          onOpenTree={onNavigateToTree}
        />
      )}

      {/* A13 — bespoke task-based walkthrough that waits for real actions.
          Only mounts when the user has < 3 members and < 1 memory (first-time-ish state). */}
      {user?.id && persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length < 3 && memories.length < 1 && (() => {
        const steps: WalkthroughStep[] = [
          {
            id: 'open-tree',
            label: 'Open your family tree',
            hint: 'Tap the Open tree chip on the dashboard.',
            isComplete: () => /\/tree/.test(location.pathname) || location.hash === '#tree',
          },
          {
            id: 'add-relative',
            label: 'Add your first relative',
            hint: 'On the tree, tap the + button on your card and pick Parent / Spouse / Child / Sibling.',
            isComplete: () => persons.filter(p => !p.isDeleted && !(p as any).isProxy && !(p.personId && p.personId.includes('_proxy_'))).length >= 2,
          },
          {
            id: 'add-memory',
            label: 'Add your first memory',
            hint: 'A photo, a story, anything — your tree gets richer with one.',
            isComplete: () => memories.length >= 1,
          },
        ]
        return (
          <TaskWalkthrough walkthroughId="dashboard_first_run" userId={user.id} steps={steps} />
        )
      })()}
      </div>
    </div>
  )
}
