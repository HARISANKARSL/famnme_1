/**
 * StoriesGrid - Full Pinterest-style masonry grid for the "Stories" tab
 * Includes StoryViewer + StoryEditor modals
 */

import { useState, lazy, Suspense } from 'react'
import { Plus, BookOpen, Loader2 } from 'lucide-react'
import { StoryGridCard } from './StoryGridCard'
import type { Story } from '@/types'

import { deleteStory } from '@/services/storyApiService'
import { ConfirmationModal } from '@/components/modals/ConfirmationModal'

const StoryViewer = lazy(() => import('./StoryViewer').then(m => ({ default: m.StoryViewer })))
const StoryEditor = lazy(() => import('./StoryEditor').then(m => ({ default: m.StoryEditor })))

interface StoriesGridProps {
  stories: Story[]
  loading: boolean
  isAppending?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  seenIds: Set<string>
  onMarkSeen: (storyId: string) => void
  onStoriesChanged: () => void
  treeId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

export function StoriesGrid({
  stories,
  loading,
  isAppending,
  hasMore,
  onLoadMore,
  seenIds,
  onMarkSeen,
  onStoriesChanged,
  treeId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: StoriesGridProps) {
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [storyToDelete, setStoryToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleViewStory = (story: Story) => {
    onMarkSeen(story.storyId)
    setViewingStory(story) // Open instantly — StoryViewer fetches slides internally
  }

  const handleDeleteConfirm = async () => {
    if (!storyToDelete) return
    try {
      setDeleting(true)
      await deleteStory(storyToDelete)
      setStoryToDelete(null)
      onStoriesChanged()
    } catch (err) {
      console.error('Failed to delete story:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 className="w-6 h-6 text-[#C2A46D] animate-spin" />
        <p className="text-[12px] text-[#8B7355] dark:text-[#666]">Loading stories...</p>
      </div>
    )
  }

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-[#C2A46D]/10 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-[#C2A46D]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">No stories yet</p>
          <p className="text-[12px] text-[#8B7355] dark:text-[#666] mt-1">Create your first story to share memories</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-1.5 h-9 px-5 rounded-full text-[12px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)', boxShadow: '0 2px 10px rgba(194,164,109,0.3)' }}
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Create Story
        </button>

        <Suspense fallback={null}>
          {showEditor && (
            <StoryEditor
              treeId={treeId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onClose={() => setShowEditor(false)}
              onCreated={() => { setShowEditor(false); onStoriesChanged(); }}
            />
          )}
        </Suspense>
      </div>
    )
  }

  return (
    <div>
      {/* Header: title + Create Story button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">All Stories</h3>
          <p className="text-[11px] text-[#8B7355] dark:text-[#666] mt-0.5">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</p>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          style={{ background: 'linear-gradient(180deg, #C2A46D, #A8894F)', boxShadow: '0 2px 6px rgba(194,164,109,0.3)' }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Create Story
        </button>
      </div>

      {/* Modern fixed-height grid for consistency */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
        {stories.map(story => (
          <StoryGridCard
            key={story.storyId}
            story={story}
            isSeen={seenIds.has(story.storyId)}
            onClick={() => handleViewStory(story)}
            onDelete={() => setStoryToDelete(story.storyId)}
          />
        ))}
      </div>

      {/* Infinite Scroll Sentinel */}
      {hasMore && (
        <div 
          ref={(el) => {
            if (!el || !onLoadMore || isAppending) return;
            const observer = new IntersectionObserver((entries) => {
              if (entries[0].isIntersecting) onLoadMore();
            }, { threshold: 0.1 });
            observer.observe(el);
            return () => observer.disconnect();
          }}
          className="flex justify-center py-10"
        >
          {isAppending && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#1a1a1a] shadow-sm border border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
              <Loader2 className="w-3.5 h-3.5 text-[#C2A46D] animate-spin" />
              <span className="text-[11px] font-medium text-[#8B7355] dark:text-[#666]">Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Story Viewer */}
      <Suspense fallback={null}>
        {viewingStory && (
          <StoryViewer
            story={viewingStory}
            onClose={() => setViewingStory(null)}
            onDeleted={() => { setViewingStory(null); onStoriesChanged(); }}
            onEdit={() => { setViewingStory(null); setShowEditor(true); }}
          />
        )}

        {/* Story Editor */}
        {showEditor && (
          <StoryEditor
            treeId={treeId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            onClose={() => setShowEditor(false)}
            onCreated={() => { setShowEditor(false); onStoriesChanged(); }}
          />
        )}
      </Suspense>

      <ConfirmationModal
        open={!!storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Story"
        description="Are you sure you want to delete this story? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}

export default StoriesGrid
