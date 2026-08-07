/**
 * StoryViewer - Full-screen Instagram-style story playback (v3 — optimized)
 *
 * Performance improvements:
 * - Accepts optional slides prop; can also load slides internally (instant open)
 * - Preloads next slide image while viewing current
 * - Deferred like status fetch (doesn't block render)
 * - Image load state prevents flash of empty content
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'
import {
  X, ChevronLeft, ChevronRight, Pause, Play,
  MoreVertical, Trash2, Heart, Edit2, Share2, Copy, Loader2,
} from 'lucide-react'
import { deleteStory, likeStory, getStoryLikes, fetchSlides as apiFetchSlides } from '@/services/storyApiService'
import { resolveBackendUrl } from '@/config/api'
import type { Story, StorySlide } from '@/types'

interface StoryViewerProps {
  story: Story
  slides?: StorySlide[]   // optional — if not provided, fetches internally
  onClose: () => void
  onDeleted?: () => void
  onEdit?: (storyId: string) => void
}

/** Minimal markdown: **bold**, *italic*, newlines — sanitized to prevent XSS */
function parseMarkdown(text: string): string {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'br'] })
}

/** Detect text-only slides (SVG placeholder or no mediaUrl) */
function isTextSlide(slide: StorySlide | undefined): boolean {
  if (!slide) return true
  if (!slide.mediaUrl) return true
  if (slide.mediaUrl.startsWith('data:image/svg')) return true
  return false
}

/** Preload an image URL into browser cache */
function preloadImage(url: string): void {
  const img = new Image()
  img.src = url
}

/** Warm gradient backgrounds for text-only slides */
const TEXT_GRADIENTS = [
  'linear-gradient(135deg, #2F3E8F 0%, #8B5E3C 50%, #5A3D2B 100%)',
  'linear-gradient(135deg, #7B8C5E 0%, #5A6B42 50%, #3D4A2B 100%)',
  'linear-gradient(135deg, #5A7E8E 0%, #3D5A66 50%, #2A3F48 100%)',
  'linear-gradient(135deg, #8B7355 0%, #6B5540 50%, #4A3A2B 100%)',
  'linear-gradient(135deg, #C47A8A 0%, #9E5A6A 50%, #7A3D4D 100%)',
]

export function StoryViewer({ story, slides: initialSlides, onClose, onDeleted, onEdit }: StoryViewerProps) {
  const [slides, setSlides] = useState<StorySlide[]>(initialSlides || [])
  const [slidesLoading, setSlidesLoading] = useState(!initialSlides || initialSlides.length === 0)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const advancingRef = useRef(false)
  const userData = JSON.parse(localStorage.getItem('auth_user') || '{}')


  // Fetch slides if not provided (instant-open pattern)
  useEffect(() => {
    // 1. If story already has files/slides attached (from unified API), use them immediately
    const storyAny = story as any;
    const directFiles = storyAny.files || storyAny.slides;

    if (directFiles && Array.isArray(directFiles) && directFiles.length > 0) {
      const mapped = directFiles.map((f: any, idx: number) => ({
        slideId: f.fileId || `f-${idx}`,
        storyId: story.storyId,
        sortOrder: f.sortOrder ?? idx,
        mediaUrl: f.signedUrl || f.fileUrl || f.url || f.key || null,
        thumbnailUrl: f.thumbnailUrl || f.signedUrl || f.fileUrl || null,
        captionText: f.caption || f.captionText || null,
        duration: f.duration || 5
      }));
      setSlides(mapped);
      setSlidesLoading(false);
      return;
    }

    // 2. Handle text-only story (new unified API structure)
    if (storyAny.type === 'textstory' && storyAny.textstory) {
      setSlides([{
        slideId: 'text-1',
        storyId: story.storyId,
        sortOrder: 0,
        mediaUrl: null,
        captionText: storyAny.textstory,
        duration: 8
      }]);
      setSlidesLoading(false);
      return;
    }

    if (initialSlides && initialSlides.length > 0) return;

    let cancelled = false;
    setSlidesLoading(true);
    apiFetchSlides(story.storyId).then(result => {
      if (cancelled) return;
      if (result.length === 0) {
        // Safety check: if we're here and result is 0, we might have a broken story or loading error
        console.warn('StoryViewer: No slides found for storyId', story.storyId);
        onClose();
        return;
      }
      setSlides(result);
      setSlidesLoading(false);

      const first = result[0];
      if (first?.mediaUrl && !isTextSlide(first)) {
        preloadImage(resolveBackendUrl(first.mediaUrl));
      }
    }).catch(err => {
      console.error('StoryViewer: Failed to fetch slides', err);
      if (!cancelled) onClose();
    });
    return () => { cancelled = true };
  }, [story.storyId, initialSlides, onClose, story]);

  // Deferred like status — fetched 800ms after mount so it doesn't block images
  useEffect(() => {
    const timer = setTimeout(() => {
      getStoryLikes(story.storyId).then(r => {
        setLiked(r.liked)
        setLikeCount(r.likeCount)
      }).catch(() => { })
    }, 800)
    return () => clearTimeout(timer)
  }, [story.storyId])

  const slide = slides[currentSlide]
  const duration = (slide?.duration || 5) * 1000
  const textSlide = isTextSlide(slide)

  // Preload next slide image when current slide changes
  useEffect(() => {
    if (slides.length === 0) return
    const nextIdx = currentSlide + 1
    if (nextIdx < slides.length) {
      const next = slides[nextIdx]
      if (next?.mediaUrl && !isTextSlide(next)) {
        preloadImage(resolveBackendUrl(next.mediaUrl))
      }
    }
  }, [currentSlide, slides])

  // Reset image loaded state on slide change
  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)
  }, [currentSlide])

  const goNext = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentSlide, slides.length, onClose])

  const goPrev = useCallback(() => {
    advancingRef.current = true
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
      setProgress(0)
    }
  }, [currentSlide])

  // Reset advance guard when slide changes
  useEffect(() => {
    advancingRef.current = false
  }, [currentSlide])

  const menuOpen = showMenu || confirmDelete
  // Pause auto-advance while image is loading (prevents skipping slides)
  const effectivelyPaused = paused || menuOpen || (!imgLoaded && !textSlide && !slidesLoading)

  // Auto-advance timer
  useEffect(() => {
    if (effectivelyPaused || slidesLoading || slides.length === 0) return
    const interval = 50
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (interval / duration) * 100
        if (next >= 100) {
          queueMicrotask(() => goNext())
          return 100
        }
        return next
      })
    }, interval)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentSlide, effectivelyPaused, duration, goNext, slidesLoading, slides.length])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, onClose])

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteStory(story.storyId)
      onDeleted?.()
      onClose()
    } catch (err) {
      console.error('Failed to delete story:', err)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleLike = async () => {
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 400)
    try {
      const result = await likeStory(story.storyId)
      setLiked(result.liked)
      setLikeCount(result.likeCount)
    } catch { /* silently fail */ }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/dashboard?story=${story.storyId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => { })
    setShowMenu(false)
  }

  // Click areas: left 1/3 = prev, middle = pause, right 1/3 = next
  const handleAreaClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width / 3) goPrev()
    else if (x > (rect.width * 2) / 3) goNext()
    else setPaused(p => !p)
  }

  // Resolve image URL
  const mediaUrl = slide?.mediaUrl ? resolveBackendUrl(slide.mediaUrl) : null
  const avatarUrl = story.authorAvatarUrl ? resolveBackendUrl(story.authorAvatarUrl) : null
  const showImage = !textSlide && mediaUrl && !imgError

  // Gradient for text slides
  const textGradient = TEXT_GRADIENTS[currentSlide % TEXT_GRADIENTS.length]

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center">

      {/* Loading state — while slides are fetching */}
      {slidesLoading && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-[#1a1816] flex items-center justify-center"
            style={{ aspectRatio: '9 / 16', height: '90vh', maxWidth: '100vw' }}>
            {/* Show story cover or author avatar as loading background */}
            {(story.coverUrl || story.authorAvatarUrl) && (
              <img
                src={resolveBackendUrl(story.coverUrl || story.authorAvatarUrl || '')}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30"
              />
            )}
            <div className="relative flex flex-col items-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
              <p className="text-white/50 text-sm">Loading story...</p>
            </div>
            {/* Close button even during loading */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Story content — only when slides are loaded */}
      {!slidesLoading && slides.length > 0 && (
        <>
          {/* ── Story Card (9:16 aspect ratio) ── */}
          <div
            className="relative overflow-hidden rounded-2xl shadow-2xl"
            style={{
              aspectRatio: '9 / 16',
              maxHeight: '90vh',
              width: 'auto',
              height: '90vh',
              maxWidth: '100vw',
            }}
          >
            {/* Background: blurred image fill + sharp foreground, gradient fallback, or text slide gradient */}
            {showImage ? (
              <>
                {/* Blurred background fill */}
                <img
                  src={mediaUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                  draggable={false}
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Sharp foreground — with onLoad for smooth transition */}
                <img
                  src={mediaUrl}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-150 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  draggable={false}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => { setImgError(true); setImgLoaded(true) }}
                />
                {/* Loading spinner while image loads */}
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-5">
                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: textSlide ? textGradient : 'linear-gradient(135deg, #2F3E8F 0%, #8B5E3C 50%, #5A3D2B 100%)',
                }}
              />
            )}

            {/* Click areas overlay */}
            <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleAreaClick} />

            {/* ── Progress bars ── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3">
              {slides.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.35)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: i < currentSlide ? '100%' : i === currentSlide ? `${progress}%` : '0%',
                      background: '#FFFFFF',
                      transition: i === currentSlide ? 'width 75ms linear' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* ── Author bar ── */}
            <div className="absolute top-5 left-3 right-3 z-20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/30 shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-[#2F3E8F] to-[#8B5E3C]">
                      {(story.personName || story.authorName || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p 
                    className="text-white text-sm font-semibold leading-tight truncate" 
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    title={story.personName || story.authorName || userData?.fullName}
                  >
                    {story.personName || story.authorName || userData?.fullName}
                  </p>
                  <p 
                    className="text-white/70 text-xs font-medium leading-tight truncate" 
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    title={story.title}
                  >
                    {story.title}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-0.5">
                <span className="text-white/60 text-xs font-medium mr-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {currentSlide + 1} / {slides.length}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPaused(p => !p) }}
                  className="p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all text-white"
                >
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m) }}
                    className="p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all text-white"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[180px] z-30">
                      {/* {onEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(story.storyId) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 text-sm transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-white/70" />Edit story
                        </button>
                      )} */}
                      {/* <button
                        onClick={(e) => { e.stopPropagation(); handleShare() }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 text-sm transition-colors"
                      >
                        {copied ? <Copy className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-white/70" />}
                        {copied ? 'Link copied!' : 'Share story'}
                      </button> */}
                      <div className="h-px bg-white/10" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); setConfirmDelete(true) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/10 text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />Delete story
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onClose() }}
                  className="p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Text-only slide content ── */}
            {textSlide && slide?.captionText && (
              <div className="absolute top-20 bottom-20 left-0 right-0 z-10 flex items-center justify-center px-8 pointer-events-none">
                <div
                  className="text-white text-center max-w-sm break-words break-all"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                  dangerouslySetInnerHTML={{
                    __html: `<div style="font-size:${
                      slide.captionText.length <= 100 ? '24px' : slide.captionText.length <= 200 ? '20px' : '16px'
                    };line-height:1.7;font-weight:400;word-wrap:break-word;word-break:break-all;overflow-wrap:break-word">${parseMarkdown(slide.captionText)}</div>`,
                  }}
                />
              </div>
            )}

            {/* ── Caption on photo slides ── */}
            {!textSlide && slide?.captionText && (
              <>
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
                  style={{
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-16 pointer-events-none">
                  <div
                    className="text-white text-base leading-relaxed break-words break-all"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(slide.captionText) }}
                  />
                </div>
              </>
            )}

            {/* ── Image fallback for broken images ── */}
            {!textSlide && !showImage && imgLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-white/80 text-lg font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                  {story.title}
                </p>
                <p className="text-white/50 text-sm mt-1">{story.personName || story.authorName || userData?.fullName}</p>
              </div>
            )}

            {/* ── Navigation arrows ── */}
            {currentSlide > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-white/80" />
              </button>
            )}
            {currentSlide < slides.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all"
              >
                <ChevronRight className="w-5 h-5 text-white/80" />
              </button>
            )}

            {/* ── Reply input (Phase 3 / 6.2) — bottom-left ── */}
            {/* <StoryReplyComposer storyId={story.storyId} /> */}

            {/* ── Like + reactions (Phase 3 / 6.2) ── */}
            {/* <div className="absolute bottom-4 right-4 z-20 flex flex-col items-center gap-1">
              <StoryReactionsBar storyId={story.storyId} />
              <button
                onClick={(e) => { e.stopPropagation(); handleLike() }}
                className={`p-2.5 rounded-full transition-all active:scale-90 ${liked ? 'bg-red-500/20' : 'bg-black/20 hover:bg-black/40'}`}
                style={{ transform: likeAnimating ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s ease' }}
                aria-label={liked ? 'Unlike story' : 'Like story'}
              >
                <Heart className={`w-6 h-6 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-white/80'}`} />
              </button>
              {likeCount > 0 && (
                <span className="text-white/70 text-xs font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {likeCount}
                </span>
              )}
            </div> */}

            {/* ── Pause indicator ── */}
            {paused && !menuOpen && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-4">
                  <Pause className="w-8 h-8 text-white/80" />
                </div>
              </div>
            )}
          </div>

          {/* ── Delete confirmation ── */}
          {confirmDelete && (
            <div
              className="absolute inset-0 z-40 flex items-end justify-center"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative w-full max-w-sm mb-8 mx-4 animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10">
                  <div className="px-4 pt-4 pb-2 text-center">
                    <p className="text-white text-sm font-medium">Delete this story?</p>
                    <p className="text-white/50 text-xs mt-1">This action cannot be undone.</p>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full py-3 text-red-400 font-semibold text-sm border-t border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-full mt-2 py-3 bg-gray-900/95 backdrop-blur-xl rounded-2xl text-white text-sm font-medium border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── StoryReactionsBar (Phase 3 / 6.2) ───────────────────────────────────
   Backed by `/api/stories/:id/reactions`. Optimistic updates with a
   localStorage cache so the bubble renders instantly on open. Falls back
   to cache-only if the endpoint fails (offline, auth expired). */

import { getAuthToken as _getAuthToken } from '@/lib/auth'
import { resolveBackendUrl as _resolveBackendUrl } from '@/config/api'
const _STORY_API_BASE = _resolveBackendUrl('/api')

const REACTION_EMOJIS = ['👍', '❤️', '🙏', '😂'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]

const REACTIONS_KEY = 'story.reactions'

interface ReactionsMap { [storyId: string]: ReactionEmoji | null }

function loadReactionsCache(): ReactionsMap {
  try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}') } catch { return {} }
}
function saveReactionsCache(map: ReactionsMap) {
  try { localStorage.setItem(REACTIONS_KEY, JSON.stringify(map)) } catch { /* noop */ }
}

async function apiFetchMyReaction(storyId: string): Promise<ReactionEmoji | null> {
  const token = _getAuthToken()
  if (!token) return null
  try {
    const res = await fetch(`${_STORY_API_BASE}/stories/${encodeURIComponent(storyId)}/reactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const body = await res.json() as { myReaction: string | null }
    const em = body.myReaction as ReactionEmoji | null
    return em && (REACTION_EMOJIS as readonly string[]).includes(em) ? em : null
  } catch { return null }
}
async function apiSetReaction(storyId: string, emoji: ReactionEmoji): Promise<boolean> {
  const token = _getAuthToken()
  if (!token) return false
  try {
    const res = await fetch(`${_STORY_API_BASE}/stories/${encodeURIComponent(storyId)}/reactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
    return res.ok
  } catch { return false }
}
async function apiClearReaction(storyId: string): Promise<boolean> {
  const token = _getAuthToken()
  if (!token) return false
  try {
    const res = await fetch(`${_STORY_API_BASE}/stories/${encodeURIComponent(storyId)}/reactions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok
  } catch { return false }
}

function StoryReactionsBar({ storyId }: { storyId: string }) {
  const [selected, setSelected] = useState<ReactionEmoji | null>(() => loadReactionsCache()[storyId] ?? null)
  const [expanded, setExpanded] = useState(false)

  // Sync with server on mount.
  useEffect(() => {
    let cancelled = false
      ; (async () => {
        const fromServer = await apiFetchMyReaction(storyId)
        if (cancelled) return
        if (fromServer !== undefined) {
          const map = loadReactionsCache()
          map[storyId] = fromServer
          saveReactionsCache(map)
          setSelected(fromServer)
        }
      })()
    return () => { cancelled = true }
  }, [storyId])

  const pick = (emoji: ReactionEmoji) => {
    // Optimistic update
    const map = loadReactionsCache()
    const isUndo = map[storyId] === emoji
    const next = isUndo ? null : emoji
    map[storyId] = next
    saveReactionsCache(map)
    setSelected(next)
    setExpanded(false)
      // Fire-and-forget server call; revert optimistic on failure
      ; (async () => {
        const ok = next ? await apiSetReaction(storyId, next) : await apiClearReaction(storyId)
        if (!ok) {
          // Revert
          const rev = loadReactionsCache()
          rev[storyId] = isUndo ? emoji : (map[storyId] ?? null)
          saveReactionsCache(rev)
          setSelected(rev[storyId] ?? null)
        }
      })()
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
        className={`p-2 rounded-full transition-all active:scale-90 text-lg leading-none ${selected ? 'bg-white/20' : 'bg-black/20 hover:bg-black/40'
          }`}
        aria-label={selected ? `Your reaction: ${selected}. Tap to change.` : 'React'}
        title={selected ? 'Change reaction' : 'React'}
      >
        {selected ?? '😊'}
      </button>
    )
  }
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-1 animate-in fade-in"
      onClick={(e) => e.stopPropagation()}
      role="radiogroup"
      aria-label="Quick reactions"
    >
      {REACTION_EMOJIS.map(em => (
        <button
          key={em}
          type="button"
          onClick={() => pick(em)}
          className={`w-8 h-8 rounded-full text-lg leading-none transition-transform hover:scale-110 active:scale-90 ${selected === em ? 'bg-white/25' : ''
            }`}
          role="radio"
          aria-checked={selected === em}
          aria-label={`React with ${em}`}
        >
          {em}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="w-8 h-8 rounded-full text-xs text-white/70 hover:text-white"
        aria-label="Close reactions"
      >
        ✕
      </button>
    </div>
  )
}

/* ─── StoryReplyComposer (Phase 3 / 6.2) ──────────────────────────────────
   Bottom-left input that posts to /api/stories/:id/replies. Optimistic — clears
   input on submit; the recipient sees the reply in their inbox separately. */
function StoryReplyComposer({ storyId }: { storyId: string }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const token = _getAuthToken()
      await fetch(`${_STORY_API_BASE}/stories/${encodeURIComponent(storyId)}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: value }),
      })
      setText('')
      setSent(true)
      setTimeout(() => setSent(false), 1800)
    } catch {
      /* silent — user can retry */
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-20 max-w-[60%] flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
        placeholder={sent ? 'Reply sent ✓' : 'Reply…'}
        disabled={sending}
        className="flex-1 min-w-0 h-9 px-3 rounded-full bg-white/15 backdrop-blur-md text-white placeholder-white/60 text-[13px] focus:outline-none focus:ring-2 focus:ring-white/40 border border-white/20"
      />
      {text.trim() && (
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="h-9 px-3 rounded-full bg-white text-[#2F3E8F] text-[12px] font-semibold disabled:opacity-50"
        >
          Send
        </button>
      )}
    </div>
  )
}
