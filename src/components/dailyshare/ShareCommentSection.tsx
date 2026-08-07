/**
 * ShareCommentSection — Expandable comments for a post
 */

import { useState, useRef, useEffect } from 'react';
import { Trash2, Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ShareComment } from '@/services/dailyShareApiService';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  // Ensure UTC parsing by appending 'Z' if missing (and no other timezone info exists)
  const isUtc = dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/);
  const parsedDateStr = isUtc ? `${dateStr}Z` : dateStr;

  let seconds = Math.floor((Date.now() - new Date(parsedDateStr).getTime()) / 1000);
  if (seconds < 0) seconds = 0; // prevent negative times if slight clock skew
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    const d = new Date(parsedDateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return parsedDateStr;
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export type CommentSortOrder = 'relevant' | 'liked' | 'replies';

interface ShareCommentSectionProps {
  comments: ShareComment[];
  currentUserId: string;
  loading: boolean;
  loadingMore?: boolean;
  isAddingComment?: boolean;
  hasMore?: boolean;
  sortOrder?: CommentSortOrder;
  onAddComment: (text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onLoadMore?: () => void;
}

export function ShareCommentSection({
  comments,
  currentUserId,
  loading,
  loadingMore,
  isAddingComment,
  hasMore,
  sortOrder = 'relevant',
  onAddComment,
  onDeleteComment,
  onLoadMore,
}: ShareCommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Drag to scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newComment]);

  useEffect(() => {
    // Auto-scroll to bottom when a comment is being added or just finished adding
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isAddingComment, comments.length]);

  // Setup a non-passive wheel listener on mount to allow preventDefault for nested scroll boundaries
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Check if the container actually has scrollable overflow
      const isScrollable = container.scrollHeight > container.clientHeight;
      if (!isScrollable) return;

      const isScrollingUp = e.deltaY < 0;
      const isScrollingDown = e.deltaY > 0;
      const isAtTop = container.scrollTop <= 1;
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;

      // If scrolling up and not at top, or scrolling down and not at bottom,
      // scroll the container manually and stop the event from bubbling/triggering page scroll.
      if ((isScrollingUp && !isAtTop) || (isScrollingDown && !isAtBottom)) {
        container.scrollTop += e.deltaY;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasMore && !loadingMore && onLoadMore) {
        onLoadMore();
      }
    }
  };
  const handleSubmit = async () => {
    const text = newComment.trim();
    if (!text || submitting) return;
    const backupText = newComment;
    setNewComment('');
    setSubmitting(true);
    try {
      await onAddComment(text);
    } catch {
      setNewComment(backupText);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortOrder === 'liked') {
      // Newest first as proxy for "most active"
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'replies') {
      // My own comments first, then chronological
      const aOwn = a.authorId === currentUserId ? 0 : 1;
      const bOwn = b.authorId === currentUserId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    // relevant: oldest first (natural thread order)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a] py-3 mt-1">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="h-7 w-7 rounded-full bg-stone-200 dark:bg-[#2a2a2a] shrink-0" />
              <div className="flex-1">
                <div className="bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] rounded-lg px-3 py-3 space-y-2.5">
                  <div className="h-2 w-24 bg-stone-300/50 dark:bg-[#333] rounded" />
                  <div className="h-2 w-full bg-stone-200/50 dark:bg-[#2a2a2a] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="space-y-3 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1"
          onScroll={handleScroll}
        >
          {sortedComments.map(comment => (
            submitting ? (
              <div key={comment.commentId} className="flex gap-2 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-stone-200 dark:bg-[#2a2a2a] shrink-0" />
                <div className="flex-1">
                  <div className="bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] rounded-lg px-3 py-3 space-y-2.5">
                    <div className="h-2 w-24 bg-stone-300/50 dark:bg-[#333] rounded" />
                    <div className="h-2 w-full bg-stone-200/50 dark:bg-[#2a2a2a] rounded" />
                  </div>
                </div>
              </div>
            ) : (
              <div key={comment.commentId} className="flex gap-2 group">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={comment.authorAvatarUrl || undefined} />
                  <AvatarFallback className="text-[10px] bg-[#E2E8F0] dark:bg-[#2a2a2a] text-[#8B7355]">
                    {getInitials(comment.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">
                      {comment.authorName}
                    </span>
                    <p className="text-sm text-[#3D2E1F] dark:text-[#D2D0CE] mt-0.5 whitespace-pre-wrap break-words break-all">{comment.text}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">
                      {timeAgo(comment.createdAt)}
                    </span>
                    {/* {comment.authorId === currentUserId && (
                      <button
                        onClick={() => onDeleteComment(comment.commentId)}
                        className="text-[11px] text-red-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )} */}
                  </div>
                </div>
              </div>
            )
          ))}
          {(isAddingComment || submitting) && (
            <div className="flex gap-2 animate-pulse mt-2">
              <div className="h-7 w-7 rounded-full bg-stone-200 dark:bg-[#2a2a2a] shrink-0" />
              <div className="flex-1">
                <div className="bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] rounded-lg px-3 py-3 space-y-2.5">
                  <div className="h-2 w-16 bg-stone-300/50 dark:bg-[#333] rounded" />
                  <div className="h-2 w-3/4 bg-stone-200/50 dark:bg-[#2a2a2a] rounded" />
                </div>
              </div>
            </div>
          )}
          {loadingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#8B7355]" />
            </div>
          )}
        </div>
      )}

      {/* Add comment input */}
      {submitting ? (
        <div className="flex items-center gap-2 mt-3 px-4 h-[38px] animate-pulse bg-[#F5F0EB]/40 dark:bg-[#1e1e1e]/40 rounded-2xl border border-dashed border-[#E2E8F0]/80 dark:border-[#2a2a2a]/80 justify-center text-xs text-[#8B7355] dark:text-[#A19F9D]">
          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-[#2F3E8F]" />
          <span>Posting comment...</span>
        </div>
      ) : (
        <div className="flex items-end gap-2 mt-3 px-1">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Write a comment..."
            rows={1}
            className="flex-1 min-h-[38px] max-h-[120px] py-2 px-4 text-base md:text-sm bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] rounded-2xl text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/60 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40 resize-none overflow-y-auto scrollbar-thin"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-[#2F3E8F] text-white disabled:opacity-40 hover:bg-[#A8643A] transition-colors mb-0.5"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
