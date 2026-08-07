/**
 * StoryBar - Horizontal scrollable row of story bubbles (mobile)
 * v2: Opens viewer instantly — StoryViewer fetches slides internally
 */

import { useState, useEffect } from 'react'
import { StoryCard } from './StoryCard'
import { StoryViewer } from './StoryViewer'
import { StoryEditor } from './StoryEditor'
import { fetchStories } from '@/services/storyApiService'
import type { Story } from '@/types'

interface StoryBarProps {
  treeId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
}

export function StoryBar({ treeId, currentUserId, currentUserName, currentUserAvatar }: StoryBarProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [showEditor, setShowEditor] = useState(false)

  const loadStories = () => {
    fetchStories(treeId).then(setStories).catch(console.error)
  }

  useEffect(() => { loadStories() }, [treeId])

  const handleViewStory = (story: Story) => {
    setViewingStory(story) // Instant open — viewer fetches slides internally
  }

  const handleEditStory = (_storyId: string) => {
    setViewingStory(null)
    setShowEditor(true)
  }

  if (stories.length === 0 && !showEditor) {
    return (
      <div className="px-3 py-2">
        <button
          onClick={() => setShowEditor(true)}
          className="w-full py-2 text-xs text-[#C2A46D] hover:text-[#A8894F] hover:bg-[#C2A46D]/8 rounded-lg transition-colors font-medium"
        >
          + Create your first story
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-100">
        <StoryCard isCreateButton onClick={() => setShowEditor(true)} />
        {stories.map(story => (
          <StoryCard key={story.storyId} story={story} onClick={() => handleViewStory(story)} />
        ))}
      </div>

      {/* Story Viewer — opens instantly, fetches slides internally */}
      {viewingStory && (
        <StoryViewer
          story={viewingStory}
          onClose={() => setViewingStory(null)}
          onDeleted={loadStories}
          onEdit={handleEditStory}
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
          onCreated={() => { setShowEditor(false); loadStories() }}
        />
      )}
    </>
  )
}
