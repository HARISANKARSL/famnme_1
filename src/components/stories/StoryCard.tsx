/**
 * StoryCard - Circular Instagram-style story bubble
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { resolveBackendUrl } from '@/config/api'
import type { Story } from '@/types'

interface StoryCardProps {
  story?: Story
  isCreateButton?: boolean
  isSeen?: boolean
  onClick: () => void
}

export function StoryCard({ story, isCreateButton, isSeen = false, onClick }: StoryCardProps) {
  const [imgFailed, setImgFailed] = useState(false)

  if (isCreateButton) {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#C2A46D] flex items-center justify-center bg-[#C2A46D]/8 hover:bg-[#C2A46D]/15 transition-colors">
          <Plus className="w-5 h-5 text-[#C2A46D]" />
        </div>
        <span className="text-[10px] text-[#C2A46D] font-medium w-14 text-center truncate">Create</span>
      </button>
    )
  }

  if (!story) return null

  // Resolve image: direct coverUrl > first file thumbnail > author avatar > null
  const getAvatarPath = () => {
    if (story.coverUrl) return story.coverUrl
    
    const storyAny = story as any
    const firstFile = (storyAny.files || storyAny.slides)?.[0]
    if (firstFile) {
      return firstFile.signedUrl || firstFile.thumbnailUrl || firstFile.thumbnailKey || firstFile.fileUrl || firstFile.url || firstFile.key
    }
    
    return story.authorAvatarUrl || null
  }
  
  const avatarPath = getAvatarPath()
  const imgSrc = !imgFailed && avatarPath ? resolveBackendUrl(avatarPath) : null

  const borderClass = isSeen
    ? 'bg-[#d4d0c8] dark:bg-[#555]'
    : 'bg-gradient-to-tr from-[#C2A46D] via-[#D4B896] to-[#A8894F]'

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0 group"
      title={story.title}
    >
      <div className={`w-14 h-14 rounded-full p-0.5 ${borderClass}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#1a1a1a] border-2 border-white dark:border-[#1a1a1a]">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={story.title}
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#C2A46D] to-[#8B7355] flex items-center justify-center text-white text-lg font-bold">
              {(story.personName || story.authorName)?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-[#8B7355] dark:text-[#999] w-14 text-center truncate group-hover:text-[#3D2E1F] dark:group-hover:text-[#f5f5f5]">
        {story.title}
      </span>
    </button>
  )
}
