/**
 * CreatePostWidget — Unified content creation hub
 *
 * Three modes: Memory, Posts, Stories
 * Each mode expands a text area with relevant attachment options.
 * Shows recent items below with navigation links — auto-clears on interaction.
 */

import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Heart, Send, Newspaper, Film, Image, Paperclip, X,
  BookOpen, ArrowRight, Play, Gem, Globe, Users,
  ChevronUp, ChevronDown, Type, Link2, Loader2, Languages,
} from 'lucide-react'
import { resolveBackendUrl } from '@/config/api'
import { createMemory, fetchMemories } from '@/services/memoriesApiService'
import { createPost, createPostAI, fetchLinkPreviewGlobal } from '@/services/dailyShareApiService'
import type { LinkPreview } from '@/services/dailyShareApiService'
import { createStory, addSlide, fetchSlides } from '@/services/storyApiService'
import type { Memory, Story, StorySlide } from '@/types'
import { LinkPreviewCard } from '@/components/dailyshare/LinkPreviewCard'
import { YouTubePreviewCard } from '@/components/dailyshare/YouTubePreviewCard'
import { useToast } from '@/components/ui/use-toast'
import { trackEvent } from '@/services/firebase/analytics.service'

type Mode = 'memory' | 'post' | 'story' | null

interface CreatePostWidgetProps {
  treeId: string
  userAvatarUrl?: string | null
  userName?: string
  onOpenMemories?: () => void
  onOpenDailyShare?: () => void
  onOpenStories?: () => void
  onPostCreated?: () => void
}

// ── Slide data with editable caption ──
interface SelectedSlide {
  memoryId: string
  mediaUrl: string
  thumbnailUrl: string
  caption: string
  captionPosition: 'top' | 'center' | 'bottom'
}

// ── Image resizer ──
async function resizeImage(file: File, maxDim = 1200, maxBytes = 800_000): Promise<File> {
  if (file.size <= maxBytes) return file
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      for (let q = 0.85; q >= 0.3; q -= 0.1) {
        canvas.toBlob((blob) => {
          if (blob && blob.size <= maxBytes) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          }
        }, 'image/jpeg', q)
      }
      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.3)
    }
    img.src = URL.createObjectURL(file)
  })
}

export function CreatePostWidget({
  treeId,
  userAvatarUrl,
  userName = 'You',
  onOpenMemories,
  onOpenDailyShare,
  onOpenStories,
  onPostCreated,
}: CreatePostWidgetProps) {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const photoUrl = userAvatarUrl ? resolveBackendUrl(userAvatarUrl) : null

  // ── Shared state ──
  const [activeMode, setActiveMode] = useState<Mode>(null)
  const [text, setText] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // ── Post visibility ──
  const [postVisibility, setPostVisibility] = useState<'family' | 'public'>('family')

  // ── Link / URL input (for Post mode) ──
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [fetchingPreview, setFetchingPreview] = useState(false)

  // ── Content language tag ──
  const [contentLanguage, setContentLanguage] = useState<string>('auto')
  const [showLangPicker, setShowLangPicker] = useState(false)

  // ── Recent results (ephemeral — cleared on navigation) ──
  const [recentMemory, setRecentMemory] = useState<Memory | null>(null)
  const [recentPost, setRecentPost] = useState<{ postId: string; content: string; mediaUrls?: string[] | null } | null>(null)
  const [recentStory, setRecentStory] = useState<Story | null>(null)
  const [recentStorySlides, setRecentStorySlides] = useState<StorySlide[]>([])
  const [showStoryPreview, setShowStoryPreview] = useState(false)

  // ── Story photo picker + captions ──
  const [storyPhotos, setStoryPhotos] = useState<Memory[]>([])
  const [selectedSlides, setSelectedSlides] = useState<SelectedSlide[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [editingCaptionIdx, setEditingCaptionIdx] = useState<number | null>(null)

  // ── Mode activation ──
  const activateMode = useCallback((mode: Mode) => {
    setActiveMode(mode)
    setText('')
    setMediaFiles([])
    setMediaPreviews([])
    setSelectedSlides([])
    setEditingCaptionIdx(null)
    setPostVisibility('family')

    if (mode === 'story') {
      setLoadingPhotos(true)
      fetchMemories(treeId, { type: 'photo' }).then(response => {
        setStoryPhotos(response.memories || [])
      }).catch(() => setStoryPhotos([]))
        .finally(() => setLoadingPhotos(false))
    }

    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [treeId])

  const closeMode = () => {
    setActiveMode(null)
    setText('')
    setMediaFiles([])
    setMediaPreviews([])
    setSelectedSlides([])
    setEditingCaptionIdx(null)
    setLinkUrl('')
    setLinkPreview(null)
    setShowLinkInput(false)
    setContentLanguage('auto')
    setShowLangPicker(false)
  }

  // ── Link preview fetch ──
  const handleLinkBlur = useCallback(async () => {
    const url = linkUrl.trim()
    if (!url) { setLinkPreview(null); return }
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    setLinkUrl(fullUrl)
    setFetchingPreview(true)
    try {
      const preview = await fetchLinkPreviewGlobal(fullUrl)
      setLinkPreview(preview)
    } catch {
      setLinkPreview(null)
    } finally {
      setFetchingPreview(false)
    }
  }, [linkUrl])

  // ── YouTube video detection ──
  const getVideoInfo = (url: string): { videoId: string; provider: 'youtube' | 'vimeo' } | null => {
    try {
      const u = new URL(url)
      const host = u.hostname.replace('www.', '')
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const id = u.searchParams.get('v') || u.pathname.match(/\/shorts\/([^/?]+)/)?.[1]
        if (id) return { videoId: id, provider: 'youtube' }
      }
      if (host === 'youtu.be') {
        const id = u.pathname.slice(1).split('?')[0]
        if (id) return { videoId: id, provider: 'youtube' }
      }
      if (host === 'vimeo.com') {
        const id = u.pathname.match(/\/(\d+)/)?.[1]
        if (id) return { videoId: id, provider: 'vimeo' }
      }
    } catch { /* invalid URL */ }
    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const f = files[0]

    // Revoke previous URL if any
    if (mediaPreviews.length > 0) {
      URL.revokeObjectURL(mediaPreviews[0])
    }

    if (f.type.startsWith('image/')) {
      const resized = await resizeImage(f)
      setMediaFiles([resized])
      setMediaPreviews([URL.createObjectURL(resized)])
    } else if (f.type.startsWith('video/') && f.size <= 100_000_000) {
      setMediaFiles([f])
      setMediaPreviews([URL.createObjectURL(f)])
    }

    e.target.value = ''
  }

  const removeMedia = (idx: number) => {
    URL.revokeObjectURL(mediaPreviews[idx])
    setMediaFiles(prev => prev.filter((_, i) => i !== idx))
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Story: toggle photo selection with caption data ──
  const toggleStoryPhoto = (mem: Memory) => {
    const mid = mem._id || mem.memoryId;
    if (!mid) return;

    const mUrl = mem.mediaUrl || (mem as any).fileUrl || mem.files?.[0]?.fileUrl || '';
    const tUrl = mem.thumbnailUrl || (mem as any).thumbUrl || mem.files?.[0]?.thumbnailUrl || mUrl;

    setSelectedSlides(prev => {
      const exists = prev.findIndex(s => s.memoryId === mid)
      if (exists >= 0) {
        return prev.filter((_, i) => i !== exists)
      }
      return [...prev, {
        memoryId: mid,
        mediaUrl: mUrl,
        thumbnailUrl: tUrl,
        caption: mem.title || '',
        captionPosition: 'bottom' as const,
      }]
    })
  }

  // ── Story: reorder slides ──
  const moveSlide = (idx: number, direction: 'up' | 'down') => {
    setSelectedSlides(prev => {
      const arr = [...prev]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= arr.length) return arr
        ;[arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]]
      return arr
    })
  }

  // ── Story: update caption ──
  const updateSlideCaption = (idx: number, caption: string) => {
    setSelectedSlides(prev => prev.map((s, i) => i === idx ? { ...s, caption } : s))
  }

  const updateSlideCaptionPosition = (idx: number, pos: 'top' | 'center' | 'bottom') => {
    setSelectedSlides(prev => prev.map((s, i) => i === idx ? { ...s, captionPosition: pos } : s))
  }

  // ── Submit: Memory ──
  const handleSubmitMemory = async () => {
    if (!text.trim() && mediaFiles.length === 0) return
    setSubmitting(true)
    try {
      const file = mediaFiles[0] || null
      const memoryType = file
        ? (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'photo')
        : 'text'

      const memory = await createMemory(treeId, file, {
        title: text.trim().slice(0, 100) || 'Quick Memory',
        description: text.trim(),
        memoryType: memoryType as 'photo' | 'video' | 'audio' | 'text',
        privacy: 'tree',
        status: 'published',
      })
      setRecentMemory(memory)
      onPostCreated?.()

      setSubmitting(false)
      setShowSuccessToast(true)
      setTimeout(() => {
        setShowSuccessToast(false)
        closeMode()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to create memory:', err)
      toast({
        title: "Error Creating Memory",
        description: err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to save memory. Please try again.",
        variant: "destructive"
      })
      setSubmitting(false)
    }
  }

  // ── Submit: Post ──
  const handleSubmitPost = async () => {
    const trimmedLink = linkUrl.trim()
    const hasLink = trimmedLink.length > 0
    if (!text.trim() && mediaFiles.length === 0 && !hasLink) return

    if (text.trim().length > 10000) {
      toast({
        title: "Post limit exceeded",
        description: `Content is too large. Please reduce the content size and try again.`,
        variant: "destructive"
      })
      return
    }

    const videoInfo = hasLink ? getVideoInfo(trimmedLink) : null

    const postType = mediaFiles.length > 0
      ? (mediaFiles[0].type.startsWith('video/') ? 'video' : 'image')
      : videoInfo ? 'video' : (hasLink ? 'link' : 'text')

    const mediaType = mediaFiles.length > 0
      ? (mediaFiles[0].type.startsWith('video/') ? "Video" : "Image")
      : videoInfo ? "Video" : (hasLink ? "Link" : "None");

    trackEvent("create_post_started", {
      post_id: null,
      post_type: postType,
      media_type: mediaType,
    });

    setSubmitting(true)
    try {
      // Pull author_id from the auth store (same pattern as service)
      const { useAuthStore } = await import('@/store/authStore')
      const authorId = useAuthStore.getState().user?.id ?? ''

      // Pull personName (full name) from sessionStorage
      let sessionFullName = ''
      try {
        const rawUser = sessionStorage.getItem('userData')
        if (rawUser) {
          const parsed = JSON.parse(rawUser)
          sessionFullName = parsed.fullName || parsed.name || ''
        }
      } catch (e) {
        console.error('Failed to parse userData from sessionStorage:', e)
      }

      const post = await createPostAI({
        author_id: authorId,
        tree_id: treeId,
        content: text.trim(),
        post_type: postType,
        link_url: hasLink ? trimmedLink : undefined,
        upload_file: mediaFiles[0],
        author_name: userName,
        visibility: postVisibility,
        personName: sessionFullName || undefined,
      })

      trackEvent("create_post_completed", {
        post_id: post.postId,
        post_type: post.postType,
        media_type: mediaType,
      });

      setRecentPost({ postId: post.postId, content: post.content, mediaUrls: post.mediaUrls })
      onPostCreated?.()

      setSubmitting(false)
      setShowSuccessToast(true)
      setTimeout(() => {
        setShowSuccessToast(false)
        closeMode()
      }, 2000)
    } catch (err: any) {
      trackEvent("create_post_failed", {
        post_id: null,
        post_type: postType,
        media_type: mediaType,
        error: String(err),
      });
      console.error('Failed to create post:', err)
      toast({
        title: "Post Creation Failed",
        description: err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to create post. Please try again.",
        variant: "destructive"
      })
      setSubmitting(false)
    }
  }

  // ── Submit: Story ──
  const handleSubmitStory = async () => {
    if (selectedSlides.length === 0) return
    setSubmitting(true)
    try {
      const story = await createStory(treeId, {
        title: text.trim() || 'My Story',
        isPublished: true,
        authorName: userName,
        authorAvatarUrl: userAvatarUrl || undefined,
      })

      for (const slide of selectedSlides) {
        await addSlide(story.storyId, {
          mediaUrl: slide.mediaUrl || undefined,
          thumbnailUrl: slide.thumbnailUrl || undefined,
          captionText: slide.caption || undefined,
          captionPosition: slide.captionPosition,
          duration: 5,
          memoryId: slide.memoryId,
        })
      }

      const slides = await fetchSlides(story.storyId)
      setRecentStory(story)
      setRecentStorySlides(slides)
      onPostCreated?.()
      setShowStoryPreview(false)

      setSubmitting(false)
      setShowSuccessToast(true)
      setTimeout(() => {
        setShowSuccessToast(false)
        closeMode()
      }, 2000)
    } catch (err: any) {
      console.error('Failed to create story:', err)
      toast({
        title: "Error Creating Story",
        description: err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to create story. Please try again.",
        variant: "destructive"
      })
      setSubmitting(false)
    }
  }

  // ── Navigate and dismiss recent ──
  const handleNavigateMemories = () => {
    setRecentMemory(null)
    onOpenMemories?.()
  }
  const handleNavigateDailyShare = () => {
    setRecentPost(null)
    onOpenDailyShare?.()
  }
  const handleNavigateStories = () => {
    setRecentStory(null)
    setRecentStorySlides([])
    setShowStoryPreview(false)
    onOpenStories?.()
  }

  // ── Mode config ──
  const modeConfig = {
    memory: {
      label: 'Memory',
      icon: Heart,
      bgActive: 'bg-[#C2A46D]/[0.12] dark:bg-[#C2A46D]/[0.20] text-[#C2A46D] dark:text-[#E6C587]',
      bgHover: 'hover:bg-[#C2A46D]/[0.08] dark:hover:bg-white/[0.04]',
      placeholder: 'Write your memory...',
      submitLabel: 'Add Memory',
      submitColor: 'bg-[#C2A46D] hover:bg-[#B0935E] dark:bg-[#C2A46D] dark:hover:bg-[#B0935E]',
    },
    post: {
      label: 'Posts',
      icon: Newspaper,
      bgActive: 'bg-[#2F3E8F]/[0.12] dark:bg-[#8CA0FF]/[0.20] text-[#2F3E8F] dark:text-[#8CA0FF]',
      bgHover: 'hover:bg-[#2F3E8F]/[0.08] dark:hover:bg-white/[0.04]',
      placeholder: 'Write your post...',
      submitLabel: 'Add Post',
      submitColor: 'bg-[#2F3E8F] hover:bg-[#253175] dark:bg-[#3b4cb0] dark:hover:bg-[#485bc7]',
    },
    story: {
      label: 'Stories',
      icon: Gem,
      bgActive: 'bg-[#4B2C5E]/[0.12] dark:bg-[#AF52DE]/[0.20] text-[#4B2C5E] dark:text-[#C582E5]',
      bgHover: 'hover:bg-[#4B2C5E]/[0.08] dark:hover:bg-white/[0.04]',
      placeholder: 'Give your story a title...',
      submitLabel: 'Post Story',
      submitColor: 'bg-[#4B2C5E] hover:bg-[#3D2349] dark:bg-[#6c3f87] dark:hover:bg-[#7c4d9b]',
    },
  }

  const isExpanded = activeMode !== null && !submitting && !showSuccessToast

  return (
    <>
      {/* ━━━ Main Widget Card ━━━ */}
      <div className="relative rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden transition-all duration-300">

        {/* ── Top row: Avatar + prompt ── */}
        <div className="p-4 pb-0">
          <div className="flex items-center gap-3">
            {/* {photoUrl ? (
              <img src={photoUrl} alt={userName} className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-[#2F3E8F]/10" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#2F3E8F] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-semibold">{initials}</span>
              </div>
            )} */}
            <div className="w-11 h-11 rounded-full bg-[#2F3E8F] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-semibold">{initials}</span>
            </div>

            {!isExpanded ? (
              <button
                onClick={() => activateMode('post')}
                className="flex-1 text-left px-4 py-3 rounded-full bg-[#F6F2EA] dark:bg-[#2A2A2A] text-[14px] text-[#8B7355]/70 dark:text-[#777] hover:bg-[#EDE8DF] dark:hover:bg-[#333] transition-colors"
              >
                Want to share something with your family?
              </button>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#ccc]">
                    {activeMode && modeConfig[activeMode].label}
                  </span>
                  <button
                    onClick={closeMode}
                    disabled={submitting}
                    className="p-1 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-[#999] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Expanded: Text area + attachments ── */}
        {isExpanded && activeMode && (
          <div className="px-4 pt-3 pb-2 animate-fade-in">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={modeConfig[activeMode].placeholder}
              rows={3}
              data-lenis-prevent
              className="w-full resize-none rounded-xl bg-[#F6F2EA] dark:bg-[#2A2A2A] px-4 py-3 text-[14px] text-[#3D2E1F] dark:text-[#e0e0e0] placeholder:text-[#8B7355]/50 dark:placeholder:text-[#888] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20 transition-all"
            />

            {/* Media previews (Memory & Post) */}
            {mediaPreviews.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {mediaPreviews.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden ring-1 ring-stone-200 dark:ring-[#444]">
                    {mediaFiles[idx]?.type.startsWith('video/') ? (
                      <div className="w-full h-full bg-black/80 flex items-center justify-center">
                        <Film className="w-6 h-6 text-white/70" />
                      </div>
                    ) : (
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeMedia(idx)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ═══ Story: Photo picker + Caption editing ═══ */}
            {activeMode === 'story' && (
              <div className="mt-3 space-y-3">
                {/* Photo grid picker */}
                <div>
                  <p className="text-[12px] font-medium text-[#8B7355] dark:text-[#888] mb-2">
                    Select photos for your story
                  </p>
                  {loadingPhotos ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-[13px] text-[#999]">
                      <div className="w-4 h-4 border-2 border-[#4B2C5E]/30 border-t-[#4B2C5E] rounded-full animate-spin" />
                      Loading photos...
                    </div>
                  ) : storyPhotos.length === 0 ? (
                    <p className="text-[13px] text-[#999] dark:text-[#666] py-3 text-center">
                      No photos yet. Add memories first to create stories.
                    </p>
                  ) : (
                    <div data-lenis-prevent className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-hide rounded-lg">
                      {storyPhotos.slice(0, 20).map(mem => {
                        const mid = mem._id || mem.memoryId;
                        if (!mid) return null;

                        const selectedIdx = selectedSlides.findIndex(s => s.memoryId === mid)
                        const isSelected = selectedIdx >= 0

                        const mUrl = mem.mediaUrl || (mem as any).fileUrl || mem.files?.[0]?.fileUrl || '';
                        const tUrl = mem.thumbnailUrl || (mem as any).thumbUrl || mem.files?.[0]?.thumbnailUrl || mUrl;

                        return (
                          <button
                            key={mid}
                            onClick={() => toggleStoryPhoto(mem)}
                            className={`relative aspect-square rounded-lg overflow-hidden transition-all bg-stone-50 dark:bg-stone-900 flex items-center justify-center border-[3px] ${isSelected ? 'border-[#1A255C] dark:border-[#8CA0FF] scale-[0.97]' : 'border-transparent hover:opacity-80'
                              }`}
                          >
                            <img
                              src={tUrl ? resolveBackendUrl(tUrl) : ''}
                              alt={mem.title}
                              className="w-full h-full object-contain"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#1A255C]/20 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-[#1A255C] dark:bg-[#8CA0FF] flex items-center justify-center border border-white dark:border-[#1E1E1E]">
                                  <span className="text-white dark:text-stone-950 text-[11px] font-bold">{selectedIdx + 1}</span>
                                </div>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selected slides: caption editing */}
                {selectedSlides.length > 0 && (
                  <div>
                    <p className="text-[12px] font-medium text-[#8B7355] dark:text-[#888] mb-2 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5" />
                      Edit captions ({selectedSlides.length} slide{selectedSlides.length !== 1 ? 's' : ''})
                    </p>
                    <div data-lenis-prevent className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-hide">
                      {selectedSlides.map((slide, idx) => (
                        <div
                          key={slide.memoryId}
                          className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${editingCaptionIdx === idx ? 'bg-[#4B2C5E]/[0.06] dark:bg-[#4B2C5E]/[0.12]' : 'bg-[#F6F2EA]/60 dark:bg-[#2A2A2A]'
                            }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-50 dark:bg-stone-900 flex items-center justify-center">
                            <img
                              src={slide.thumbnailUrl ? resolveBackendUrl(slide.thumbnailUrl) : ''}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#4B2C5E] flex items-center justify-center">
                              <span className="text-white text-[10px] font-bold">{idx + 1}</span>
                            </div>
                          </div>

                          {/* Caption input */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={slide.caption}
                              onChange={e => updateSlideCaption(idx, e.target.value)}
                              onFocus={() => setEditingCaptionIdx(idx)}
                              onBlur={() => setEditingCaptionIdx(null)}
                              placeholder="Add caption..."
                              className="w-full bg-transparent text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0] placeholder:text-[#8B7355]/40 focus:outline-none border-b border-transparent focus:border-[#4B2C5E]/30 pb-0.5 transition-colors"
                            />
                            {/* Caption position */}
                            <div className="flex items-center gap-1 mt-1.5">
                              {(['top', 'center', 'bottom'] as const).map(pos => (
                                <button
                                  key={pos}
                                  onClick={() => updateSlideCaptionPosition(idx, pos)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${slide.captionPosition === pos
                                    ? 'bg-[#4B2C5E] text-white'
                                    : 'bg-[#4B2C5E]/[0.08] text-[#4B2C5E]/60 dark:text-[#9B7BB0]/60 hover:bg-[#4B2C5E]/[0.15]'
                                    }`}
                                >
                                  {pos}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reorder */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              onClick={() => moveSlide(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 rounded text-[#8B7355] hover:bg-black/[0.05] disabled:opacity-20 transition-colors"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveSlide(idx, 'down')}
                              disabled={idx === selectedSlides.length - 1}
                              className="p-0.5 rounded text-[#8B7355] hover:bg-black/[0.05] disabled:opacity-20 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ Link input (Post mode) ═══ */}
            {activeMode === 'post' && showLinkInput && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onBlur={handleLinkBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLinkBlur() }}
                    placeholder="Paste a YouTube URL..."
                    className="flex-1 h-10 md:h-9 px-3 text-sm bg-[#F6F2EA] dark:bg-[#2A2A2A] border border-stone-200 dark:border-[#444] rounded-lg text-[#3D2E1F] dark:text-[#e0e0e0] placeholder:text-[#8B7355]/50 focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/20"
                  />
                  <button
                    onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkPreview(null) }}
                    className="text-[#8B7355] hover:text-[#3D2E1F] p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {fetchingPreview && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#8B7355]">
                    <Loader2 className="h-3 w-3 animate-spin" /> Fetching preview...
                  </div>
                )}
                {linkPreview && linkUrl && (() => {
                  const videoInfo = getVideoInfo(linkUrl)
                  if (videoInfo) {
                    return (
                      <div className="mt-2">
                        <YouTubePreviewCard
                          videoId={videoInfo.videoId}
                          embedUrl={videoInfo.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${videoInfo.videoId}?rel=0` : `https://player.vimeo.com/video/${videoInfo.videoId}`}
                          title={linkPreview.title}
                          provider={videoInfo.provider}
                        />
                      </div>
                    )
                  }
                  if (linkPreview.title) {
                    return (
                      <div className="mt-2">
                        <LinkPreviewCard
                          url={linkUrl}
                          title={linkPreview.title}
                          description={linkPreview.description}
                          imageUrl={linkPreview.imageUrl}
                        />
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            {/* ═══ Attachment bar (Memory & Posts modes) ═══ */}
            {(activeMode === 'memory' || activeMode === 'post') && (
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*'
                      fileInputRef.current.click()
                    }
                  }}
                  disabled={mediaFiles.length >= 4}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#6B8E5A] dark:text-[#82B366] hover:bg-[#6B8E5A]/[0.08] dark:hover:bg-[#82B366]/[0.15] transition-colors disabled:opacity-40"
                >
                  <Image className="w-4 h-4" />
                  Photo
                </button>
                {/* <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/*'
                      fileInputRef.current.click()
                    }
                  }}
                  disabled={mediaFiles.length >= 4}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#2F3E8F] dark:text-[#8CA0FF] hover:bg-[#2F3E8F]/[0.08] dark:hover:bg-[#8CA0FF]/[0.15] transition-colors disabled:opacity-40"
                >
                  <Film className="w-4 h-4" />
                  Video
                </button> */}
                {activeMode === 'post' && (
                  <button
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${showLinkInput
                      ? 'text-[#C2A46D] dark:text-[#E6C587] bg-[#C2A46D]/[0.12] dark:bg-[#C2A46D]/[0.20]'
                      : 'text-[#C2A46D] dark:text-[#E6C587] hover:bg-[#C2A46D]/[0.08] dark:hover:bg-[#C2A46D]/[0.15]'
                      }`}
                  >
                    <Link2 className="w-4 h-4" />
                    Link
                  </button>
                )}
                {activeMode === 'memory' && (
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = 'image/*,video/*,audio/*'
                        fileInputRef.current.click()
                      }
                    }}
                    disabled={mediaFiles.length >= 4}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#8B7355] dark:text-[#B8A090] hover:bg-[#8B7355]/[0.08] dark:hover:bg-[#B8A090]/[0.15] transition-colors disabled:opacity-40"
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach
                  </button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              </div>
            )}

            {/* ═══ Post visibility + language toggle ═══ */}
            {activeMode === 'post' && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-[#333] flex-wrap">
                <span className="text-[11px] text-[#8B7355] dark:text-[#888]">Visible to:</span>
                <button
                  onClick={() => setPostVisibility('family')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${postVisibility === 'family'
                    ? 'bg-[#2F3E8F] dark:bg-[#3b4cb0] text-white shadow-sm'
                    : 'bg-[#2F3E8F]/[0.06] dark:bg-white/[0.06] text-[#2F3E8F]/70 dark:text-[#8CA0FF] hover:bg-[#2F3E8F]/[0.12] dark:hover:bg-white/[0.10]'
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Family
                </button>
                <button
                  onClick={() => setPostVisibility('public')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${postVisibility === 'public'
                    ? 'bg-[#2F3E8F] dark:bg-[#3b4cb0] text-white shadow-sm'
                    : 'bg-[#2F3E8F]/[0.06] dark:bg-white/[0.06] text-[#2F3E8F]/70 dark:text-[#8CA0FF] hover:bg-[#2F3E8F]/[0.12] dark:hover:bg-white/[0.10]'
                    }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </button>


                <div className="relative ml-auto">
                  {/* <button
                    onClick={() => setShowLangPicker(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                      contentLanguage !== 'auto'
                        ? 'bg-[#C2A46D]/15 dark:bg-[#C2A46D]/30 text-[#8B6914] dark:text-[#ffd60a] border border-[#C2A46D]/40'
                        : 'bg-stone-100 dark:bg-[#2A2A2A] text-[#8B7355] dark:text-[#C8C4BC] hover:bg-stone-200 dark:hover:bg-[#333]'
                    }`}
                    title="Tag content language"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {contentLanguage === 'auto' ? 'Language' : { 'en': 'English', 'hi-IN': 'Hindi', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'bn-IN': 'Bengali', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati' }[contentLanguage] || 'Language'}
                  </button> */}
                  {showLangPicker && (
                    <div data-lenis-prevent className="absolute bottom-full mb-1 right-0 w-40 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-lg border border-stone-200 dark:border-[#444] z-50 py-1 max-h-52 overflow-y-auto">
                      <button onClick={() => { setContentLanguage('auto'); setShowLangPicker(false) }} className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 dark:hover:bg-[#2A2A2A] ${contentLanguage === 'auto' ? 'text-[#2F3E8F] dark:text-[#8CA0FF] font-medium' : 'text-[#8B7355] dark:text-[#aaa]'}`}>Auto-detect</button>
                      {[
                        { code: 'en', label: 'English' }, { code: 'hi-IN', label: 'Hindi' },
                        { code: 'ta-IN', label: 'Tamil' }, { code: 'te-IN', label: 'Telugu' },
                        { code: 'bn-IN', label: 'Bengali' }, { code: 'kn-IN', label: 'Kannada' },
                        { code: 'ml-IN', label: 'Malayalam' }, { code: 'mr-IN', label: 'Marathi' },
                        { code: 'gu-IN', label: 'Gujarati' },
                      ].map(l => (
                        <button key={l.code} onClick={() => { setContentLanguage(l.code); setShowLangPicker(false) }} className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 dark:hover:bg-[#2A2A2A] ${contentLanguage === l.code ? 'text-[#2F3E8F] dark:text-[#8CA0FF] font-medium' : 'text-[#8B7355] dark:text-[#aaa]'}`}>{l.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Submit button ═══ */}
            <div className="flex justify-end mt-3 mb-1">
              <button
                onClick={
                  activeMode === 'memory' ? handleSubmitMemory
                    : activeMode === 'post' ? handleSubmitPost
                      : handleSubmitStory
                }
                disabled={submitting || (activeMode === 'story' ? selectedSlides.length === 0 : (!text.trim() && mediaFiles.length === 0 && !linkUrl.trim()))}
                className={`
                  flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold text-white
                  ${modeConfig[activeMode].submitColor}
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-sm hover:shadow-md
                `}
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {modeConfig[activeMode].submitLabel}
              </button>
            </div>
          </div>
        )}

        {/* ── Mode selector tabs — Memory & Story hidden; only Posts shown ── */}
        <div className={`flex items-center border-t border-stone-100 dark:border-[#333] ${isExpanded ? '' : 'mt-3'}`}>
          {(['post'] as const).map(mode => {
            const cfg = modeConfig[mode]
            const Icon = cfg.icon
            const isActive = activeMode === mode
            return (
              <button
                key={mode}
                onClick={() => !submitting && activateMode(mode)}
                disabled={submitting}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium
                  transition-all duration-200
                  ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isActive
                    ? cfg.bgActive
                    : `text-[#8B7355] dark:text-[#888] ${cfg.bgHover} dark:hover:bg-white/[0.04]`
                  }
                `}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.7} />
                {cfg.label}
              </button>
            )
          })}
        </div>


      </div>

      {/* ━━━ Inline Sticky Uploading/Success Banner ━━━ */}
      {(submitting || showSuccessToast) && activeMode && (
        <div className="sticky top-0 z-[90] w-full bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl shadow-sm ring-1 ring-stone-200/50 dark:ring-white/10 p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Media Thumbnail or Placeholder */}
          <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-stone-100 dark:bg-stone-800">
            {mediaPreviews.length > 0 ? (
              <img src={mediaPreviews[0]} alt="" className="w-full h-full object-cover" />
            ) : linkPreview?.imageUrl ? (
              <img src={linkPreview.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Send className="w-4 h-4 text-[#8B7355] dark:text-[#A19F9D]" />
              </div>
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
              {showSuccessToast
                ? 'Successfully posted!'
                : activeMode === 'post' && postVisibility === 'public'
                  ? 'Publishing to public feed...'
                  : activeMode === 'memory'
                    ? 'Saving to memories...'
                    : 'Publishing to family vault...'}
            </h4>
            <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">
              {showSuccessToast ? 'Ready to view in feed' : 'Posting...'}
            </p>
          </div>

          {/* Right side circular progress or checkmark */}
          <div className="shrink-0 pr-1">
            {showSuccessToast ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-in zoom-in duration-300">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <Loader2 className="w-5 h-5 text-[#2F3E8F] dark:text-[#8CA0FF] animate-spin" />
            )}
          </div>

          {/* Gradient Loading Bar at bottom of banner (only when submitting) */}
          {submitting && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden bg-stone-100 dark:bg-stone-800">
              <div className="h-full w-[200%] bg-gradient-to-r from-[#2F3E8F] via-[#C2A46D] to-[#2F3E8F] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>
          )}
        </div>
      )}

      {/* ━━━ Recent Memory Preview ━━━ */}
      {recentMemory && (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden animate-fade-in-up">
          {/* Hero image or icon */}
          {recentMemory.mediaUrl ? (
            <div className="relative h-40 overflow-hidden">
              <img
                src={resolveBackendUrl(recentMemory.mediaUrl)}
                alt={recentMemory.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-[11px] font-semibold text-[#C2A46D] uppercase tracking-wide mb-0.5">Memory Added</p>
                <p className="text-[16px] font-semibold text-white truncate">{recentMemory.title}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#C2A46D]/20 to-[#C2A46D]/5 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-[#C2A46D]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#C2A46D] uppercase tracking-wide mb-0.5">Memory Added</p>
                <p className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#e0e0e0] truncate">{recentMemory.title}</p>
              </div>
            </div>
          )}
          {recentMemory.description && (
            <p className="px-4 pt-2 text-[13px] text-[#8B7355] dark:text-[#888] line-clamp-2">{recentMemory.description}</p>
          )}
          <div className="px-4 py-3">
            <button
              onClick={handleNavigateMemories}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#C2A46D] hover:text-[#B0935E] transition-colors group"
            >
              Explore all memories
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* ━━━ Recent Post Preview ━━━ */}
      {/* {recentPost && (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden animate-fade-in-up">
      
          {recentPost.mediaUrls && recentPost.mediaUrls.length > 0 && (
            <div className={`grid gap-0.5 ${recentPost.mediaUrls.length === 1 ? '' : recentPost.mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'} max-h-48 overflow-hidden`}>
              {recentPost.mediaUrls.slice(0, 4).map((url, i) => (
                <img key={i} src={resolveBackendUrl(url)} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          )}
          <div className="p-4">
            <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wide mb-1">Post Shared</p>
            <p className="text-[14px] text-[#3D2E1F] dark:text-[#e0e0e0] line-clamp-3 leading-relaxed">{recentPost.content}</p>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={handleNavigateDailyShare}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2F3E8F] hover:text-[#253175] transition-colors group"
            >
              View more in Daily Share
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )} */}

      {/* ━━━ Recent Story Preview ━━━ */}
      {recentStory && (
        <div className="rounded-2xl bg-white dark:bg-[#1E1E1E] shadow-sm ring-1 ring-stone-100 dark:ring-[#333] overflow-hidden animate-fade-in-up">
          <div className="p-4">
            <p className="text-[11px] font-semibold text-[#4B2C5E] uppercase tracking-wide mb-2">Story Created</p>

            {!showStoryPreview ? (
              <button
                onClick={() => setShowStoryPreview(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#4B2C5E]/[0.08] to-[#2F3E8F]/[0.08] hover:from-[#4B2C5E]/[0.14] hover:to-[#2F3E8F]/[0.14] transition-all group"
              >
                {/* Stacked thumbnails */}
                <div className="relative w-14 h-14 shrink-0">
                  {recentStorySlides.slice(0, 3).map((slide, i) => (
                    <div
                      key={slide.slideId}
                      className="absolute rounded-lg overflow-hidden ring-2 ring-white dark:ring-[#1E1E1E] shadow-sm"
                      style={{
                        width: '44px', height: '44px',
                        top: `${i * 3}px`, left: `${i * 4}px`,
                        zIndex: 3 - i,
                      }}
                    >
                      {slide.mediaUrl ? (
                        <img src={resolveBackendUrl(slide.mediaUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#4B2C5E]/20 flex items-center justify-center">
                          <Gem className="w-4 h-4 text-[#4B2C5E]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#e0e0e0]">{recentStory.title}</p>
                  <p className="text-[12px] text-[#8B7355] dark:text-[#888] mt-0.5">
                    {recentStorySlides.length} slide{recentStorySlides.length !== 1 ? 's' : ''} — Tap to view
                  </p>
                </div>
                <Play className="w-5 h-5 text-[#4B2C5E] shrink-0 transition-transform group-hover:scale-110" />
              </button>
            ) : (
              <StoryInlinePlayer
                slides={recentStorySlides}
                onClose={() => setShowStoryPreview(false)}
              />
            )}
          </div>

          <div className="px-4 pb-3 border-t border-stone-50 dark:border-[#333] pt-3">
            <button
              onClick={handleNavigateStories}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4B2C5E] hover:text-[#3D2349] transition-colors group"
            >
              Explore more stories
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Inline story player with auto-advance ──
function StoryInlinePlayer({ slides, onClose }: { slides: StorySlide[]; onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const slide = slides[currentIdx]

  const goNext = () => {
    if (currentIdx < slides.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      onClose()
    }
  }

  const goPrev = () => {
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  if (!slide) return null

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-[400px] bg-black">
        {/* Progress bars */}
        <div className="absolute top-2.5 inset-x-2.5 flex gap-1 z-10">
          {slides.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/30">
              <div className={`h-full rounded-full transition-all duration-300 ${i < currentIdx ? 'w-full bg-white' : i === currentIdx ? 'w-full bg-white' : 'w-0'
                }`} />
            </div>
          ))}
        </div>

        {/* Slide content */}
        {slide.mediaUrl ? (
          <img src={resolveBackendUrl(slide.mediaUrl)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#4B2C5E] to-[#2F3E8F] flex items-center justify-center p-6">
            <p className="text-white text-center text-lg font-medium">{slide.captionText}</p>
          </div>
        )}

        {/* Caption overlay */}
        {slide.captionText && slide.mediaUrl && (
          <div className={`absolute inset-x-0 px-4 py-3 ${(slide.captionPosition || 'bottom') === 'top'
            ? 'top-8 bg-gradient-to-b from-black/60 to-transparent'
            : (slide.captionPosition || 'bottom') === 'center'
              ? 'top-1/2 -translate-y-1/2 bg-black/40'
              : 'bottom-0 bg-gradient-to-t from-black/70 to-transparent'
            }`}>
            <p className="text-white text-[14px] leading-snug">{slide.captionText}</p>
          </div>
        )}

        {/* Tap zones */}
        <button className="absolute inset-y-0 left-0 w-1/3" onClick={goPrev} />
        <button className="absolute inset-y-0 right-0 w-2/3" onClick={goNext} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center z-20"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}
