/**
 * PostOfTheDayCard — 6.7 (featured slot above the global feed).
 *
 * Renders a small "✨ Today's highlight" card above the feed when the
 * server's post-of-day endpoint returns a winner. Hidden gracefully if
 * the platform feed is empty or the endpoint errors.
 */
import { useEffect, useState } from 'react'
import { Gem, Heart, MessageCircle, Eye } from 'lucide-react'
import { fetchPostOfTheDay } from '@/services/dailyShareApiService'
import type { SharePost } from '@/services/dailyShareApiService'

export function PostOfTheDayCard() {
  const [post, setPost] = useState<SharePost | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPostOfTheDay()
      .then(p => { if (!cancelled) setPost(p) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  if (!loaded || !post) return null

  const preview = post.content.length > 140
    ? post.content.slice(0, 140) + '…'
    : post.content

  return (
    <div
      role="article"
      aria-label="Post of the day"
      className="rounded-2xl bg-gradient-to-br from-[#C2A46D]/10 to-[#2F3E8F]/[0.06] dark:from-[#C2A46D]/15 dark:to-[#2F3E8F]/15 border border-[#C2A46D]/30 p-4 sm:p-5 mb-4"
    >
      <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-[0.08em] font-semibold text-[#8B6C2E] dark:text-[#D9BE8A]">
        <Gem className="w-3 h-3" strokeWidth={2.5} />
        Today's highlight
      </div>

      <div className="flex items-start gap-3">
        {post.authorAvatarUrl ? (
          <img
            src={post.authorAvatarUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white/80 shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#2F3E8F] text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {(post.authorName?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-[#3D2E1F] dark:text-[#F5F1E8] truncate">
            {post.authorName || 'A family member'}
          </p>
          <p className="text-[13px] text-[#5B5449] dark:text-[#B8B8B8] mt-0.5 leading-snug whitespace-pre-wrap">
            {preview}
          </p>
          {post.mediaUrls && post.mediaUrls[0] && (
            <img
              src={post.mediaUrls[0]}
              alt=""
              loading="lazy"
              decoding="async"
              className="mt-2 max-h-40 w-auto rounded-md object-cover"
            />
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {post.likeCount ?? 0}</span>
            <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {post.commentCount ?? 0}</span>
            <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.viewCount ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
