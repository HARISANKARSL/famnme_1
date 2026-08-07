/**
 * ShareMediaViewer — Full-screen photo lightbox (X/Twitter-style)
 *
 * Desktop: dark image panel (left) + scrollable post context panel (right)
 * Mobile: full-screen image with bottom overlay bar
 *
 * Features:
 * - Stats bar below image (likes, comments, views, share)
 * - Right panel: author info, post text, interactive like/comment/share
 * - Share sheet for WhatsApp, Twitter, Facebook, copy link
 * - View count recorded on open
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Eye, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareCommentSection } from './ShareCommentSection';
import type { CommentSortOrder } from './ShareCommentSection';
import { ShareSheet } from './ShareSheet';
import { useResponsive } from '@/hooks/useResponsive';
import * as api from '@/services/dailyShareApiService';
import type { SharePost, ShareComment } from '@/services/dailyShareApiService';
import { resolveBackendUrl } from '@/config/api';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

function formatPostDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

function formatPostTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ShareMediaViewerProps {
  post: SharePost;
  initialIndex: number;
  onClose: () => void;
  currentUserId: string;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onAddComment: (text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  comments: ShareComment[];
  loadingComments: boolean;
}

export function ShareMediaViewer({
  post,
  initialIndex,
  onClose,
  currentUserId,
  liked,
  likeCount,
  commentCount,
  onLike,
  onAddComment,
  onDeleteComment,
  comments,
  loadingComments,
}: ShareMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [viewCount, setViewCount] = useState(post.viewCount ?? 0);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSortOrder>('relevant');
  const { isMobile } = useResponsive();

  const CONTENT_COLLAPSE_LIMIT = 180;

  const urls: string[] = useMemo(() => {
    const rawUrls: string[] = Array.isArray(post.mediaUrls)
      ? post.mediaUrls
      : typeof post.mediaUrls === 'string'
        ? (() => { try { return JSON.parse(post.mediaUrls as string); } catch { return []; } })()
        : [];
    return rawUrls.map(url => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
      }
      return resolveBackendUrl(url);
    }).filter(Boolean);
  }, [post.mediaUrls]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Record view on open (fire-and-forget)
  useEffect(() => {
    api.recordView(post.postId);
    setViewCount(v => v + 1);
  }, [post.postId]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showShareSheet) return; // let sheet handle its own keyboard
      if (e.key === 'Escape') { onClose(); return; }
      // Don't intercept arrows when typing in an input
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(urls.length - 1, i + 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, urls.length, showShareSheet]);

  const prev = useCallback(() => setCurrentIndex(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrentIndex(i => Math.min(urls.length - 1, i + 1)), [urls.length]);

  if (urls.length === 0) return null;

  const authorAvatar = post.postSource === 'admin'
    ? undefined
    : (post.authorAvatarUrl
      ? (post.authorAvatarUrl.startsWith('http') ? post.authorAvatarUrl : resolveBackendUrl(post.authorAvatarUrl))
      : undefined);

  // ── Stats bar (shown below image on desktop, inside bottom overlay on mobile) ─
  const StatsBar = ({ dark = false }: { dark?: boolean }) => {
    const base = dark
      ? 'text-white/80 hover:text-white'
      : 'text-[#8B7355] dark:text-[#A19F9D]';
    const likedCls = dark
      ? (liked ? 'text-[#2F3E8F]' : base)
      : (liked ? 'text-[#2F3E8F]' : `${base} hover:text-[#2F3E8F]`);

    return (
      <div className={`flex items-center gap-5 ${dark ? '' : 'px-4 py-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]'}`}>
        {/* Like */}
        <button onClick={onLike} className={`flex items-center gap-1.5 text-sm transition-colors ${likedCls}`}>
          <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
          {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
        </button>

        {/* Comment count (display only — section below is interactive) */}
        <div className={`flex items-center gap-1.5 text-sm ${dark ? 'text-white/80' : 'text-[#8B7355] dark:text-[#A19F9D]'}`}>
          <MessageCircle className="h-5 w-5" />
          {commentCount > 0 && <span>{formatCount(commentCount)}</span>}
        </div>

        {/* Views */}
        {/* <div className={`flex items-center gap-1.5 text-sm ${dark ? 'text-white/60' : 'text-[#8B7355]/70 dark:text-[#A19F9D]/70'}`}>
          <Eye className="h-5 w-5" />
          {viewCount > 0 && <span>{formatCount(viewCount)}</span>}
        </div> */}

        {/* Share
        <button
          onClick={() => setShowShareSheet(true)}
          className={`flex items-center gap-1.5 text-sm transition-colors ml-auto ${dark ? 'text-white/80 hover:text-white' : `${base} hover:text-[#2F3E8F]`}`}
        >
          <Share2 className="h-5 w-5" />
        </button>
        */}
      </div>
    );
  };

  // ── Desktop layout ───────────────────────────────────────────────────────────
  if (!isMobile) {
    return createPortal(
      <>
        <div className="fixed inset-0 z-[60] flex bg-black" onClick={onClose}>

          {/* Left: image panel */}
          <div
            className="flex-1 relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image area */}
            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Prev arrow */}
              {urls.length > 1 && currentIndex > 0 && (
                <button
                  onClick={prev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              <img
                src={urls[currentIndex]}
                alt={`Image ${currentIndex + 1} of ${urls.length}`}
                className="max-h-full max-w-full w-auto h-auto object-contain select-none"
                draggable={false}
              />

              {/* Next arrow */}
              {urls.length > 1 && currentIndex < urls.length - 1 && (
                <button
                  onClick={next}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Counter */}
              {urls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  {currentIndex + 1} / {urls.length}
                </div>
              )}
            </div>

            {/* Stats bar — below the image, on the dark panel */}
            <div className="flex-shrink-0 px-6 py-3 border-t border-white/10">
              <StatsBar dark />
            </div>
          </div>

          {/* Right: post context panel */}
          <div
            className="w-[380px] bg-white dark:bg-[#111111] flex flex-col overflow-hidden border-l border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Author row */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex-shrink-0">
              {post.postSource === 'admin' ? (
                <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-white border border-[#E2E8F0]/60">
                  <img src="/logo.png" alt="FamNme" className="w-full h-full object-contain" />
                </div>
              ) : (
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={authorAvatar} />
                  <AvatarFallback className="bg-[#E2E8F0] dark:bg-[#2a2a2a] text-[#8B7355] text-sm font-medium">
                    {getInitials(post.authorName)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate">
                  {post.authorName}
                </p>
                <p className="text-xs text-[#8B7355] dark:text-[#A19F9D]">
                  {timeAgo(post.createdAt)}
                </p>
              </div>
            </div>

            {/* Post text with Show more */}
            {(post.content || post.linkUrl) && (
              <div className="px-4 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex-shrink-0">
                {post.content && (
                  <p className="text-[15px] text-[#3D2E1F] dark:text-[#D2D0CE] whitespace-pre-wrap leading-relaxed">
                    {contentExpanded || post.content.length <= CONTENT_COLLAPSE_LIMIT
                      ? post.content
                      : post.content.slice(0, CONTENT_COLLAPSE_LIMIT) + '…'}
                  </p>
                )}
                {post.content && post.content.length > CONTENT_COLLAPSE_LIMIT && (
                  <button
                    onClick={() => setContentExpanded(v => !v)}
                    className="mt-1.5 text-xs font-medium text-[#2F3E8F] hover:underline block"
                  >
                    {contentExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
                {post.linkUrl && (!post.content || !post.content.includes(post.linkUrl)) && (
                  <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className={`block text-[15px] text-[#2F3E8F] hover:underline break-all ${post.content ? 'mt-2' : ''}`}>
                    {post.linkUrl}
                  </a>
                )}
              </div>
            )}

            {/* Date / time / views */}
            <div className="px-4 py-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex-shrink-0 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-[#8B7355] dark:text-[#A19F9D]">
                {formatPostTime(post.createdAt)} · {formatPostDate(post.createdAt)}
              </span>
              {/* {viewCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-[#8B7355]/70 dark:text-[#A19F9D]/70">
                  <Eye className="h-3.5 w-3.5" />
                  {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
                </span>
              )} */}
            </div>

            {/* Action bar */}
            <div className="flex-shrink-0">
              <StatsBar dark={false} />
            </div>

            {/* Comment sort dropdown */}
            {/* <div className="px-4 pt-3 pb-1 flex-shrink-0">
              <div className="relative inline-block">
                <select
                  value={commentSort}
                  onChange={(e) => setCommentSort(e.target.value as CommentSortOrder)}
                  className="appearance-none pl-3 pr-7 py-1 text-xs font-medium rounded-full border border-[#E2E8F0] dark:border-[#2a2a2a] bg-[#F5F0EB] dark:bg-[#1e1e1e] text-[#3D2E1F] dark:text-[#F3F2F1] focus:outline-none cursor-pointer"
                >
                  <option value="relevant">Relevant</option>
                  <option value="liked">Liked</option>
                  <option value="replies">Replies</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#8B7355]" />
              </div>
            </div> */}

            {/* Comments — scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <ShareCommentSection
                comments={comments}
                currentUserId={currentUserId}
                loading={loadingComments}
                sortOrder={commentSort}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
              />
            </div>
          </div>
        </div>

        {/* Share sheet rendered above viewer */}
        {showShareSheet && (
          <div className="fixed inset-0 z-[70]">
            <ShareSheet post={post} onClose={() => setShowShareSheet(false)} />
          </div>
        )}
      </>,
      document.body,
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black" onClick={onClose}>
        {/* Image area */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute left-4 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev arrow */}
          {urls.length > 1 && currentIndex > 0 && (
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={urls[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${urls.length}`}
            className="max-w-full w-auto h-auto object-contain select-none"
            style={{ maxHeight: 'calc(100vh - 120px)' }}
            draggable={false}
          />

          {/* Next arrow */}
          {urls.length > 1 && currentIndex < urls.length - 1 && (
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-11 w-11 flex items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Counter */}
          {urls.length > 1 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
              {currentIndex + 1} / {urls.length}
            </div>
          )}
        </div>

        {/* Bottom overlay: author + stats */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 px-4"
          style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Author row */}
          <div className="flex items-center gap-2 mb-3">
            {post.postSource === 'admin' ? (
              <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-white">
                <img src="/logo.png" alt="FamNme" className="w-full h-full object-contain" />
              </div>
            ) : (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="bg-white/20 text-white text-xs font-medium">
                  {getInitials(post.authorName)}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm font-medium text-white truncate">{post.authorName}</span>
            <span className="text-xs text-white/50 flex-shrink-0">{timeAgo(post.createdAt)}</span>
          </div>

          {/* Post text snippet */}
          {(post.content || post.linkUrl) && (
            <div className="mb-3">
              {post.content && (
                <p className="text-xs text-white/70 line-clamp-2">{post.content}</p>
              )}
              {post.linkUrl && (!post.content || !post.content.includes(post.linkUrl)) && (
                <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#8CA0FF] hover:underline truncate mt-1">
                  {post.linkUrl}
                </a>
              )}
            </div>
          )}

          {/* Stats bar */}
          <StatsBar dark />
        </div>
      </div>

      {/* Share sheet */}
      {showShareSheet && (
        <div className="fixed inset-0 z-[70]">
          <ShareSheet post={post} onClose={() => setShowShareSheet(false)} />
        </div>
      )}
    </>,
    document.body,
  );
}
