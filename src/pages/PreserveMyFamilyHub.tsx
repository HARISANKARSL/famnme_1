/**
 * PreserveMyFamilyHub — Landing page for the Preserve My Family section.
 *
 * Design: Matches dashboard widget aesthetic with rich cards.
 *   - Memories Gallery: Warm gradient hero card with photo count + recent thumbnail
 *   - Stories: Dark navy card (narrative/creative feel)
 *   - Albums: Standard white card
 *   - Interviews: Standard white card
 *   - Slideshow / Memory Book: Compact utility row
 */

import { useEffect, useState } from 'react'
import { ArrowLeft, Heart, Camera, BookOpen, FolderOpen, MessageSquare, Play, Download, ChevronRight, ArrowRight, Image, Video, Mic, FileText } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'

interface PreserveMyFamilyHubProps {
  onClose: () => void
  onOpenGallery: () => void
  onOpenStories: () => void
  onOpenAlbums: () => void
  onOpenInterviews: () => void
  onOpenSlideshow: () => void
  onOpenMemoryBook: () => void
  onAddMemory: () => void
  treeId?: string
  isTreeLoaded: boolean
  memoryCounts?: Record<string, number>
  albumCount?: number
  storyCount?: number
}

export function PreserveMyFamilyHub({
  onClose,
  onOpenGallery,
  onOpenStories,
  onOpenAlbums,
  onOpenInterviews,
  onOpenSlideshow,
  onOpenMemoryBook,
  onAddMemory,
  isTreeLoaded,
  memoryCounts,
  albumCount = 0,
  storyCount = 0,
}: PreserveMyFamilyHubProps) {
  const { isMobile } = useResponsive()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const totalMemories = memoryCounts
    ? (memoryCounts.photo || 0) + (memoryCounts.video || 0) + (memoryCounts.audio || 0) + (memoryCounts.text || 0)
    : 0
  const photoCount = memoryCounts?.photo || 0
  const videoCount = memoryCounts?.video || 0
  const audioCount = memoryCounts?.audio || 0
  const textCount = memoryCounts?.text || 0

  const disabled = !isTreeLoaded

  return (
    <div className="absolute inset-0 z-40 bg-[#F2EFE9] dark:bg-[#000] flex flex-col">
      {/* Header */}
      <div className="shrink-0 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A] bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#2F3E8F]/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[#3D2E1F] dark:text-[#D4D0CC]" />
        </button>
        <Heart className="w-5 h-5 text-[#C2A46D]" strokeWidth={1.8} />
        <h1 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#F3F2F1]">
          Preserve My Family
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5 md:py-8 space-y-4">

          {/* ═══ HERO: Memories Gallery ═══ */}
          <div
            onClick={disabled ? undefined : onOpenGallery}
            onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onOpenGallery(); }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99] cursor-pointer'
              } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: '0ms' }}
          >
            <div className="relative bg-gradient-to-r from-[#8B5E3C] to-[#C2A46D] p-5 md:p-7">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/[0.05] rounded-full -translate-y-16 translate-x-16 group-hover:translate-x-12 transition-transform duration-500" />
              <div className="absolute bottom-0 left-1/3 w-28 h-28 bg-white/[0.04] rounded-full translate-y-14 group-hover:translate-y-10 transition-transform duration-500" />

              <div className="relative flex items-start gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.15] flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="text-[18px] md:text-[20px] font-bold text-white">
                        Memories Gallery
                      </h2>
                      <p className="text-[11px] text-white/60">
                        Photos &middot; Videos &middot; Audio &middot; Text
                      </p>
                    </div>
                  </div>

                  <p className="text-[13px] text-white/70 leading-relaxed max-w-lg">
                    Browse, organize, and relive your family&apos;s most precious moments
                  </p>

                  {totalMemories > 0 && (
                    <div className="flex items-center flex-wrap gap-2 mt-4">
                      {photoCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.12] text-white/90">
                          <Image className="w-3 h-3" /> {photoCount}
                        </span>
                      )}
                      {videoCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.12] text-white/90">
                          <Video className="w-3 h-3" /> {videoCount}
                        </span>
                      )}
                      {audioCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.12] text-white/90">
                          <Mic className="w-3 h-3" /> {audioCount}
                        </span>
                      )}
                      {textCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/[0.12] text-white/90">
                          <FileText className="w-3 h-3" /> {textCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Add Memory CTA */}
                  {isTreeLoaded && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddMemory(); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-white/[0.15] text-white hover:bg-white/[0.25] transition-colors cursor-pointer border-none"
                      >
                        + Add Memory
                      </button>
                    </div>
                  )}
                </div>

                <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-1 transition-all mt-2 shrink-0" />
              </div>
            </div>
          </div>

          {/* ═══ ROW 2: Stories + Albums ═══ */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>

            {/* Stories — dark navy card */}
            <div
              onClick={disabled ? undefined : onOpenStories}
              onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onOpenStories(); }}
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C2A46D]/40 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99] cursor-pointer'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '60ms' }}
            >
              <div className="relative bg-[#1a1a2e] ring-1 ring-[#2a2a4e] rounded-2xl p-5 min-h-[160px] flex flex-col">
                {/* Decorative page lines */}
                <div className="absolute top-6 right-6 w-12 h-14 opacity-[0.06]">
                  <div className="w-full h-0.5 bg-white mb-2" />
                  <div className="w-3/4 h-0.5 bg-white mb-2" />
                  <div className="w-full h-0.5 bg-white mb-2" />
                  <div className="w-1/2 h-0.5 bg-white" />
                </div>

                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C2A46D]">Stories</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-white/90 mb-1">
                    Family Stories
                  </h3>
                  <p className="text-[11px] text-white/50 leading-relaxed flex-1">
                    Write and share narratives about your family&apos;s journey and heritage
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    {storyCount > 0 && (
                      <span className="text-[11px] text-[#C2A46D]/80">
                        {storyCount} {storyCount === 1 ? 'story' : 'stories'}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#C2A46D]/50 group-hover:text-[#C2A46D] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* Albums — white card */}
            <div
              onClick={disabled ? undefined : onOpenAlbums}
              onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onOpenAlbums(); }}
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99] cursor-pointer'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '120ms' }}
            >
              <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[160px] flex flex-col">
                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-[#2F3E8F] dark:text-[#5A6BFF]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2F3E8F] dark:text-[#5A6BFF]">Albums</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1">
                    Photo Albums
                  </h3>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                    Organize memories into themed collections and albums
                  </p>

                  <div className="flex items-center justify-between mt-4">
                    {albumCount > 0 && (
                      <span className="text-[11px] text-[#8B7355]">
                        {albumCount} {albumCount === 1 ? 'album' : 'albums'}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-[#8B7355]/40 group-hover:text-[#2F3E8F] group-hover:translate-x-0.5 transition-all ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ ROW 3: Interviews + Utility actions ═══ */}
          {/* <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>

            <div
              onClick={disabled ? undefined : onOpenInterviews}
              onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onOpenInterviews(); }}
              role="button"
              tabIndex={disabled ? -1 : 0}
              className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#4B2C5E]/30 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.99] cursor-pointer'
                } ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
              style={{ transitionDelay: '180ms' }}
            >
              <div className="relative bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl p-5 min-h-[140px] flex flex-col">
                <div className="relative flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-[#4B2C5E] dark:text-[#D4B8E8]" strokeWidth={1.8} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4B2C5E] dark:text-[#D4B8E8]">Interviews</span>
                  </div>

                  <h3 className="text-[15px] font-bold text-stone-800 dark:text-[#F5F1E8] mb-1">
                    Interview an Elder
                  </h3>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#999] leading-relaxed flex-1">
                    Capture family wisdom through guided conversations
                  </p>

                  <div className="flex items-center justify-end mt-3">
                    <ArrowRight className="w-4 h-4 text-[#8B7355]/40 group-hover:text-[#4B2C5E] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </div>

        
            <div className={`flex flex-col gap-3 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} transition-all duration-300`}
              style={{ transitionDelay: '240ms' }}>
              <button
                onClick={disabled ? undefined : onOpenSlideshow}
                disabled={disabled}
                className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.99]'
                  }`}
              >
                <div className="bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#C2A46D]/10 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 text-[#C2A46D]" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold text-stone-800 dark:text-[#F5F1E8]">Slideshow</h3>
                    <p className="text-[10px] text-[#8B7355] dark:text-[#999]">Auto-play your memories</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8B7355]/30 group-hover:text-[#C2A46D] transition-colors shrink-0" />
                </div>
              </button>

              <button
                onClick={disabled ? undefined : onOpenMemoryBook}
                disabled={disabled}
                className={`group w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.99]'
                  }`}
              >
                <div className="bg-white dark:bg-[#242424] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#2F3E8F]/10 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-[#2F3E8F]" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold text-stone-800 dark:text-[#F5F1E8]">Export Memory Book</h3>
                    <p className="text-[10px] text-[#8B7355] dark:text-[#999]">Create a printable family book</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8B7355]/30 group-hover:text-[#2F3E8F] transition-colors shrink-0" />
                </div>
              </button>
            </div>
          </div> */}

        </div>
      </div>
    </div>
  )
}
