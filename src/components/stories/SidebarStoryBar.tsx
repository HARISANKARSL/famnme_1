/**
 * SidebarStoryBar - 2-row grid story widget for desktop sidebar
 * Row 1: [+Create] + up to 4 stories
 * Row 2: up to 5 stories (or 4 + View More if >9 total)
 */

import { MoreHorizontal } from 'lucide-react'
import { StoryCard } from './StoryCard'
import type { Story } from '@/types'

interface SidebarStoryBarProps {
  stories: Story[]
  seenIds: Set<string>
  onCreateStory: () => void
  onViewStory: (story: Story) => void
  onViewMore: () => void
}



export function SidebarStoryBar({
  stories,
  seenIds,
  onCreateStory,
  onViewStory,
  onViewMore,
}: SidebarStoryBarProps) {
  // Fits in a wrapping layout inside the 280px sidebar.
  // Slot 1: Create button.
  // If stories count > 7, show 6 stories + 1 More button. Otherwise show all <= 7 stories.
  const hasOverflow = stories.length > 7
  const visibleStories = hasOverflow ? stories.slice(0, 6) : stories

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-3 justify-start">
        <StoryCard isCreateButton onClick={onCreateStory} />
        {visibleStories.map(story => (
          <StoryCard
            key={story.storyId}
            story={story}
            isSeen={seenIds.has(story.storyId)}
            onClick={() => onViewStory(story)}
          />
        ))}
        {hasOverflow && (
          <button
            onClick={onViewMore}
            className="flex flex-col items-center gap-1 flex-shrink-0"
            title="View all stories"
          >
            <div className="w-14 h-14 rounded-full border-2 border-[#C2A46D]/40 flex items-center justify-center bg-[#C2A46D]/8 hover:bg-[#C2A46D]/15 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-[#C2A46D]" />
            </div>
            <span className="text-[10px] text-[#C2A46D] font-medium w-14 text-center">More</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {/* {stories.length === 0 && (
        <p className="text-[11px] text-[#8B7355] dark:text-[#666] text-center py-1">No stories yet</p>
      )} */}
    </div>
  )
}
