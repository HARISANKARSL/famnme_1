/**
 * VirtualFeedList — Virtualized infinite-scroll feed using @tanstack/react-virtual.
 * Only renders visible posts + overscan. Triggers loadMore when nearing the end.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import type { SharePost } from '@/services/dailyShareApiService'
import { SharePostCard } from './SharePostCard'

interface VirtualFeedListProps {
  posts: SharePost[]
  scrollElement: HTMLElement | null
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string | null
  onDeleted: (postId: string) => void
  onUpdated?: (postId: string, updates: Partial<SharePost>) => void
  onLoadMore: () => void
  isLoadingMore: boolean
  hasMore: boolean
}

export function VirtualFeedList({
  posts,
  scrollElement,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onDeleted,
  onUpdated,
  onLoadMore,
  isLoadingMore,
  hasMore,
}: VirtualFeedListProps) {
  const loadMoreRef = useRef(onLoadMore)
  loadMoreRef.current = onLoadMore

  // Total items: posts + optional loader + optional end message
  const extraRows = (isLoadingMore ? 1 : 0) + (!hasMore && posts.length > 0 ? 1 : 0)
  const totalCount = posts.length + extraRows

  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => 400,
    overscan: 3,
  })

  // Trigger loadMore when approaching the end
  useEffect(() => {
    const items = virtualizer.getVirtualItems()
    const lastItem = items[items.length - 1]
    if (!lastItem) return

    if (lastItem.index >= posts.length - 5 && hasMore && !isLoadingMore) {
      loadMoreRef.current()
    }
  }, [virtualizer.getVirtualItems(), posts.length, hasMore, isLoadingMore]) // eslint-disable-line react-hooks/exhaustive-deps

  const measureRef = useCallback(
    (node: HTMLElement | null) => {
      if (node) virtualizer.measureElement(node)
    },
    [virtualizer],
  )

  const virtualItems = virtualizer.getVirtualItems()

  return (
    <div
      style={{
        height: virtualizer.getTotalSize(),
        position: 'relative',
        width: '100%',
      }}
    >
      {virtualItems.map((virtualRow) => {
        const idx = virtualRow.index

        // Loading more indicator
        if (idx >= posts.length && isLoadingMore) {
          return (
            <div
              key="loader"
              ref={measureRef}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#2F3E8F]" />
              </div>
            </div>
          )
        }

        // End of feed message
        if (idx >= posts.length && !hasMore) {
          return (
            <div
              key="end"
              ref={measureRef}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="text-center py-6 text-[11px] text-[#8B7355]/50 dark:text-[#666]">
                You&apos;ve reached the end
              </div>
            </div>
          )
        }

        // Regular post
        const post = posts[idx]
        if (!post) return null

        return (
          <div
            key={post.postId}
            ref={measureRef}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <SharePostCard
              post={post}
              treeId={post.treeId}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onDeleted={onDeleted}
              onUpdated={onUpdated}
              globalMode={true}
            />
          </div>
        )
      })}
    </div>
  )
}
