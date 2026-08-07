/**
 * StoryGridCard - Pinterest-style card for stories grid
 * Image-forward, natural aspect ratio, minimal chrome, hover reveals info
 */

import { useState } from 'react'
import { Play, BookOpen, MoreHorizontal } from 'lucide-react'
import { resolveBackendUrl } from '@/config/api'
import type { Story } from '@/types'

interface StoryGridCardProps {
  story: Story
  isSeen: boolean
  onClick: () => void
  onDelete?: () => void
}

function formatRelativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

import { Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function StoryGridCard({ story, isSeen, onClick, onDelete }: StoryGridCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Resolve cover image: direct coverUrl > first file's thumbnail > first file's key > null
  const getCoverPath = () => {
    if (story.coverUrl) return story.coverUrl
    const storyAny = story as any
    const firstFile = (storyAny.files || storyAny.slides)?.[0]
    if (firstFile) {
      return firstFile.signedUrl || firstFile.thumbnailUrl || firstFile.thumbnailKey || firstFile.fileUrl || firstFile.url || firstFile.key
    }
    return null
  }

  const coverPath = getCoverPath()
  const imgSrc = !imgFailed && coverPath ? resolveBackendUrl(coverPath) : null

  const textstoryContent = (story as any).textstory || (story as any).textContent || '';

  return (
    <div className={`w-full group rounded-[20px] overflow-hidden relative bg-white dark:bg-[#1a1a1a] transition-all duration-300 transform ${isMenuOpen ? 'shadow-[0_8px_30px_rgba(0,0,0,0.15)] -translate-y-1 ring-2 ring-[#C2A46D]/30' : 'shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1'}`}>
      <div
        onClick={onClick}
        className="cursor-pointer relative overflow-hidden"
      >
        {/* Cover image — fixed aspect ratio for consistency */}
        <div className="relative bg-[#f0ebe4] dark:bg-[#252525] aspect-[3/4] overflow-hidden">
          {imgSrc ? (
            <>
              <img
                src={imgSrc}
                alt={story.title}
                className={`w-full h-full object-cover transition-all duration-500 ${isMenuOpen ? 'scale-105 brightness-[0.85]' : 'group-hover:scale-105 group-hover:brightness-[0.9]'}`}
                loading="lazy"
                onError={() => setImgFailed(true)}
              />

              {/* Hover Play Icon Center Overlay */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 z-10 ${isMenuOpen ? 'opacity-0 scale-95' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-xl">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Refined permanent-to-hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${isMenuOpen ? 'opacity-90' : 'opacity-80 group-hover:opacity-90'}`} />

              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end min-h-[40%] z-10">
                <h4 className="text-white text-[15px] font-bold line-clamp-2 leading-[1.2] drop-shadow-md tracking-tight mb-2 break-words">
                  {story.title}
                </h4>
                
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6 border-[1.5px] border-white/20 shadow-sm">
                    <AvatarImage src={story.authorAvatarUrl ? resolveBackendUrl(story.authorAvatarUrl) : undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#C2A46D] to-[#8B7355] text-white text-[8px] font-bold">
                      {(story.personName || story.authorName)?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/90 text-[11px] font-semibold leading-tight truncate">{story.personName || story.authorName || 'Explorer'}</span>
                    <span className="text-white/60 text-[9px] uppercase tracking-wider font-bold">{formatRelativeTime(story.createdAt)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`w-full h-full flex flex-col justify-between p-5 text-left relative bg-gradient-to-br from-[#FAF4E8] to-[#DFCBB5] dark:from-[#2E2517] dark:to-[#171109] transition-all duration-500 ${isMenuOpen ? 'brightness-95' : 'group-hover:brightness-98 dark:group-hover:brightness-105'}`}>
              {/* Background Watermark Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <BookOpen className="w-24 h-24 text-[#C2A46D]/15 dark:text-[#C2A46D]/8" strokeWidth={0.75} />
              </div>

              {/* Top spacer for absolute badges */}
              <div className="h-8 z-10" />

              {/* Middle part: Title & Description */}
              <div className="flex-1 flex flex-col justify-center my-3 min-w-0 z-10 relative">
                <h4 className="text-[#4e3621] dark:text-[#f3ede2] text-[15px] font-bold tracking-tight mb-2 line-clamp-2 break-words leading-snug drop-shadow-sm">
                  {story.title}
                </h4>
                {textstoryContent && (
                  <p className="text-[#735a43] dark:text-[#cbbdaf] text-[12px] font-medium line-clamp-5 leading-relaxed break-words">
                    {textstoryContent}
                  </p>
                )}
              </div>

              {/* Bottom part: Author metadata */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-[#e2d5c3] dark:border-[#2E2517]/40 z-10 relative">
                <Avatar className="w-6 h-6 border-[1.5px] border-[#C2A46D]/30 dark:border-white/20 shadow-sm">
                  <AvatarImage src={story.authorAvatarUrl ? resolveBackendUrl(story.authorAvatarUrl) : undefined} />
                  <AvatarFallback className="bg-[#C2A46D]/10 dark:bg-white/10 text-[#8B7355] dark:text-white text-[8px] font-bold border border-[#C2A46D]/20 dark:border-white/10">
                    {(story.personName || story.authorName)?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-[#4e3621] dark:text-[#f3ede2] text-[11px] font-semibold leading-tight truncate">
                    {story.personName || story.authorName || 'Explorer'}
                  </span>
                  <span className="text-[#8B7355] dark:text-[#9e8f7f] text-[9px] uppercase tracking-wider font-bold">
                    {formatRelativeTime(story.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Unseen indicator dot — elevated pill style */}
          {!isSeen && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C2A46D] shadow-[0_0_12px_rgba(194,164,109,0.5)] z-20">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] text-white font-bold tracking-tight uppercase">New</span>
            </div>
          )}

          {/* Slide count badge — premium glass effect (Moved to bottom right) */}
          {story.slideCount && story.slideCount > 1 && (
            <div className={`absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/30 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-20 shadow-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}>
              <Play className="w-2.5 h-2.5 fill-white" />
              {story.slideCount}
            </div>
          )}
        </div>
      </div>

      {/* Action Menu — Top Right Position */}
      <div className={`absolute top-4 right-4 transition-all duration-300 z-30 ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0'}`}>
        <DropdownMenu onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 ${isMenuOpen ? 'bg-white text-[#C2A46D]' : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white hover:text-[#C2A46D]'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5 border-[#C2A46D]/10 shadow-2xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete();
              }}
              className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-[13px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Story</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
