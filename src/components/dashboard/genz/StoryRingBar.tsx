/**
 * StoryRingBar — Dashboard stories row
 *
 * Fetches real stories and displays them as circular thumbnails.
 * First bubble is "+" to create — opens StoryEditor inline.
 * Tapping a story opens the full StoryViewer overlay.
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Plus, Gem } from 'lucide-react'
import { fetchStories } from '@/services/storyApiService'
import { resolveBackendUrl } from '@/config/api'
import type { Story } from '@/types'

const StoryViewer = lazy(() =>
  import('@/components/stories/StoryViewer').then(m => ({ default: m.StoryViewer }))
)

const StoryEditor = lazy(() =>
  import('@/components/stories/StoryEditor').then(m => ({ default: m.StoryEditor }))
)

interface StoryRingBarProps {
  treeId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
  onOpenStoriesPage?: () => void
}

export function StoryRingBar({
  treeId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onOpenStoriesPage,
}: StoryRingBarProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem('dashboard-seen-stories')
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch { return new Set() }
  })

  const loadStories = useCallback(() => {
    if (!treeId) return
    setLoading(true)
    fetchStories(treeId)
      .then(res => setStories(Array.isArray(res) ? res : []))
      .catch(() => setStories([]))
      .finally(() => setLoading(false))
  }, [treeId])

  useEffect(() => { loadStories() }, [loadStories])

  const markSeen = (storyId: string) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      next.add(storyId)
      try { sessionStorage.setItem('dashboard-seen-stories', JSON.stringify([...next])) } catch { /* noop */ }
      return next
    })
  }

  const handleViewStory = (story: Story) => {
    markSeen(story.storyId)
    setViewingStory(story)
  }

  const handleStoryCreated = () => {
    setShowEditor(false)
    loadStories()
  }

  // 24h expiry (Phase 3 / 6.2) — hide stories older than 24 hours from the ring.
  // Full history remains available on the /stories page via `onOpenStoriesPage`.
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const fresh = stories.filter(s => new Date(s.createdAt).getTime() >= cutoff)

  // Sort: unseen first, then by creation date desc
  const sorted = [...fresh].sort((a, b) => {
    const aUnseen = !seenIds.has(a.storyId)
    const bUnseen = !seenIds.has(b.storyId)
    if (aUnseen !== bUnseen) return aUnseen ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const hasStories = sorted.length > 0

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] p-4">
        <div className="flex items-center gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
              <div className="w-[68px] h-[68px] rounded-full bg-stone-200 dark:bg-[#333]" />
              <div className="w-10 h-2 rounded bg-stone-200 dark:bg-[#333]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-[#4B2C5E]" />
            <h3 className="text-[14px] font-bold text-[#3D2E1F] dark:text-[#e0e0e0]">Stories</h3>
          </div>
          {hasStories && onOpenStoriesPage && (
            <button
              onClick={onOpenStoriesPage}
              className="text-[12px] font-medium text-[#4B2C5E] hover:text-[#3D2349] transition-colors"
            >
              See all
            </button>
          )}
        </div>

        {/* Story bubbles */}
        <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide py-3 px-4">
          {/* Create bubble */}
          <button
            onClick={() => setShowEditor(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="w-[68px] h-[68px] rounded-full border-[2.5px] border-dashed border-[#4B2C5E]/30 dark:border-[#9B7BB0]/30 flex items-center justify-center bg-[#4B2C5E]/[0.04] dark:bg-[#4B2C5E]/[0.08] transition-all group-hover:border-[#4B2C5E]/60 group-hover:bg-[#4B2C5E]/[0.08] group-hover:scale-105">
              <Plus className="w-6 h-6 text-[#4B2C5E] dark:text-[#9B7BB0]" />
            </div>
            <span className="text-[11px] text-[#4B2C5E] dark:text-[#9B7BB0] font-medium">Create</span>
          </button>

          {/* Story thumbnails */}
          {sorted.map(story => {
            const isSeen = seenIds.has(story.storyId)
            return (
              <StoryBubble
                key={story.storyId}
                story={story}
                isSeen={isSeen}
                onClick={() => handleViewStory(story)}
              />
            )
          })}

          {/* Empty state */}
          {!hasStories && (
            <div className="flex items-center gap-3 py-2 px-2">
              <p className="text-[13px] text-[#8B7355]/60 dark:text-[#666]">
                No stories yet — create your first one!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer overlay */}
      {viewingStory && (
        <Suspense fallback={null}>
          <StoryViewer
            story={viewingStory}
            onClose={() => setViewingStory(null)}
            onDeleted={loadStories}
          />
        </Suspense>
      )}

      {/* Story Editor overlay */}
      {showEditor && (
        <Suspense fallback={null}>
          <StoryEditor
            treeId={treeId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onClose={() => setShowEditor(false)}
            onCreated={handleStoryCreated}
          />
        </Suspense>
      )}
    </>
  )
}

// ── Individual story bubble ──
function StoryBubble({ story, isSeen, onClick }: { story: Story; isSeen: boolean; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false)

  const imgSrc = !imgFailed
    ? (story.coverUrl ? resolveBackendUrl(story.coverUrl) : story.authorAvatarUrl ? resolveBackendUrl(story.authorAvatarUrl) : null)
    : null

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 group"
      title={story.title}
    >
      {/* Ring */}
      <div
        className={`w-[68px] h-[68px] rounded-full p-[3px] transition-all group-hover:scale-105 ${
          isSeen
            ? 'bg-gradient-to-br from-[#d4d0c8] to-[#c0bab0] dark:from-[#555] dark:to-[#444]'
            : 'bg-gradient-to-br from-[#4B2C5E] via-[#7B4F9A] to-[#C2A46D] shadow-[0_0_12px_rgba(75,44,94,0.25)]'
        }`}
      >
        <div className="w-full h-full rounded-full bg-white dark:bg-[#1E1E1E] p-[2px]">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={story.title}
              className="w-full h-full rounded-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {(story.personName || story.authorName)?.[0]?.toUpperCase() || story.title?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Title */}
      <span className={`text-[11px] font-medium w-[68px] text-center truncate transition-colors ${
        isSeen
          ? 'text-[#8B7355]/50 dark:text-[#666]'
          : 'text-[#3D2E1F] dark:text-[#ccc] group-hover:text-[#4B2C5E]'
      }`}>
        {story.title}
      </span>
    </button>
  )
}
