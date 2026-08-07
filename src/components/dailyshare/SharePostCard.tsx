/**
 * SharePostCard — Individual post card in the Daily Share feed
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Globe, Lock, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ShareImageGrid } from './ShareImageGrid';
import { ShareMediaViewer } from './ShareMediaViewer';
import { ShareSheet } from './ShareSheet';
import { LinkPreviewCard } from './LinkPreviewCard';
import { YouTubePreviewCard } from './YouTubePreviewCard';
import { ShareCommentSection } from './ShareCommentSection';
import { LanguageBadge } from './LanguageBadge';
import { FeedReasonTooltip } from './FeedReasonTooltip';
import * as api from '@/services/dailyShareApiService';
import type { SharePost, ShareComment } from '@/services/dailyShareApiService';
import { useToast } from '@/components/ui/use-toast';
import { useFeedStore } from '@/store/feedStore';
import { resolveBackendUrl } from '@/config/api';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { usePostTracking } from '@/hooks/useTracking';

/**
 * Extracts video info (embed URL, video ID, provider) from a YouTube or Vimeo URL.
 */
function getVideoInfo(url: string): { embedUrl: string; videoId: string; provider: 'youtube' | 'vimeo' } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID or youtube.com/shorts/ID
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v') || u.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
      if (id) return { embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, videoId: id, provider: 'youtube' };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('?')[0];
      if (id) return { embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, videoId: id, provider: 'youtube' };
    }

    // Vimeo: vimeo.com/ID
    if (host === 'vimeo.com') {
      const id = u.pathname.match(/\/(\d+)/)?.[1];
      if (id) return { embedUrl: `https://player.vimeo.com/video/${id}`, videoId: id, provider: 'vimeo' };
    }
  } catch {
    // invalid URL
  }
  return null;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  // Ensure UTC parsing by appending 'Z' if missing (and no other timezone info exists)
  const isUtc = dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/);
  const parsedDateStr = isUtc ? `${dateStr}Z` : dateStr;

  let seconds = Math.floor((Date.now() - new Date(parsedDateStr).getTime()) / 1000);
  if (seconds < 0) seconds = 0; // prevent negative times if slight clock skew
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
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

interface SharePostCardProps {
  post: SharePost;
  treeId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onDeleted: (postId: string) => void;
  onUpdated?: (postId: string, updates: Partial<SharePost>) => void;
  globalMode?: boolean;
}

export function SharePostCard({
  post,
  treeId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onDeleted,
  onUpdated,
  globalMode,
}: SharePostCardProps) {
  const [liked, setLiked] = useState(post.isLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);

  // Sync state with props when parent state updates
  useEffect(() => {
    setLiked(post.isLikedByMe ?? false);
    setLikeCount(post.likeCount ?? 0);
    setCommentCount(post.commentCount ?? 0);
  }, [post.isLikedByMe, post.likeCount, post.commentCount]);

  // Clear active comment post ID when card unmounts to reset to initial closed state on page change
  useEffect(() => {
    return () => {
      if (useFeedStore.getState().activeCommentPostId === post.postId) {
        useFeedStore.getState().setActiveCommentPostId(null);
      }
    };
  }, [post.postId]);

  const activeCommentPostId = useFeedStore(state => state.activeCommentPostId);
  const setActiveCommentPostId = useFeedStore(state => state.setActiveCommentPostId);
  const showComments = activeCommentPostId === post.postId;
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { toast } = useToast();

  const mediaUrls: string[] = useMemo(() => {
    const urls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
    return urls.map(url => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
      }
      return resolveBackendUrl(url);
    }).filter(Boolean);
  }, [post.mediaUrls]);
  const isVideo = post.postType === 'video' || !!getVideoInfo(post.linkUrl || '');
  const cardRef = usePostTracking(post.postId, isVideo);
  const isOwnPost = post.authorId === currentUserId;

  const handleLike = useCallback(async () => {
    // Optimistic update
    const newLikedStatus = !liked;
    setLiked(newLikedStatus);
    const newLikeCount = newLikedStatus ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLikeCount(newLikeCount);

    try {
      // Use the unified interaction endpoint
      const response = await api.postMemoryInteraction(post.postId, currentUserId, newLikedStatus, "");

      // Update counts based on response if present
      const serverLikeCount = response?.likeCount ?? response?.data?.likeCount ?? response?.data?.memory?.likeCount;
      const finalLikeCount = serverLikeCount !== undefined ? serverLikeCount : newLikeCount;
      if (serverLikeCount !== undefined) {
        setLikeCount(serverLikeCount);
      }

      const serverCommentCount = response?.commentCount ?? response?.data?.commentCount ?? response?.data?.memory?.commentCount;
      const finalCommentCount = serverCommentCount !== undefined ? serverCommentCount : commentCount;
      if (serverCommentCount !== undefined) {
        setCommentCount(serverCommentCount);
      }

      // Sync parent state
      onUpdated?.(post.postId, {
        isLikedByMe: newLikedStatus,
        likeCount: finalLikeCount,
        commentCount: finalCommentCount,
      });
    } catch {
      // Revert on error
      setLiked(!newLikedStatus);
      setLikeCount(prev => newLikedStatus ? Math.max(0, prev - 1) : prev + 1);
    }
  }, [post.postId, liked, likeCount, commentCount, currentUserId, onUpdated]);

  const handleToggleComments = useCallback(async () => {
    const isOpening = !showComments;

    if (isOpening) {
      setActiveCommentPostId(post.postId);
      if (comments.length === 0) {
        setLoadingComments(true);
        try {
          const { comments: fetched, hasMore } = await api.fetchComments(post.postId, 1, 10);
          setComments(fetched);
          setHasMoreComments(hasMore);
          setCommentPage(1);
        } catch {
          toast({ title: 'Error', description: 'Failed to load comments', variant: 'destructive' });
        } finally {
          setLoadingComments(false);
        }
      }
      api.reportInteraction(post.postId, 'expand');
    } else {
      setActiveCommentPostId(null);
    }
  }, [showComments, comments.length, post.postId, toast, setActiveCommentPostId]);

  const handleLoadMoreComments = useCallback(async () => {
    if (loadingComments || !hasMoreComments) return;
    setLoadingComments(true);
    try {
      const nextPage = commentPage + 1;
      const { comments: fetched, hasMore } = await api.fetchComments(post.postId, nextPage, 10);
      setComments(prev => [...prev, ...fetched]);
      setHasMoreComments(hasMore);
      setCommentPage(nextPage);
    } catch {
      toast({ title: 'Error', description: 'Failed to load more comments', variant: 'destructive' });
    } finally {
      setLoadingComments(false);
    }
  }, [loadingComments, hasMoreComments, commentPage, post.postId, toast]);

  const handleAddComment = useCallback(async (text: string) => {
    setIsAddingComment(true);

    try {
      const response = await api.postMemoryInteraction(post.postId, currentUserId, liked, text);

      const serverLikeCount = response?.likeCount ?? response?.data?.likeCount ?? response?.data?.memory?.likeCount;
      const finalLikeCount = serverLikeCount !== undefined ? serverLikeCount : likeCount;
      if (serverLikeCount !== undefined) {
        setLikeCount(serverLikeCount);
      }

      const serverCommentCount = response?.commentCount ?? response?.data?.commentCount ?? response?.data?.memory?.commentCount;
      const finalCommentCount = serverCommentCount !== undefined ? serverCommentCount : commentCount + 1;
      setCommentCount(finalCommentCount);

      // Fetch fresh comments from server
      const { comments: fetched, hasMore } = await api.fetchComments(post.postId, 1, Math.max(10, comments.length + 1));
      setComments(fetched);
      setHasMoreComments(hasMore);

      // Sync parent state
      onUpdated?.(post.postId, {
        commentCount: finalCommentCount,
        likeCount: finalLikeCount,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
      throw err;
    } finally {
      setIsAddingComment(false);
    }
  }, [post.postId, liked, currentUserId, comments.length, commentCount, likeCount, toast, onUpdated]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await api.deleteComment(treeId, commentId);
    setComments(prev => prev.filter(c => c.commentId !== commentId));
    const finalCommentCount = Math.max(0, commentCount - 1);
    setCommentCount(finalCommentCount);
    onUpdated?.(post.postId, {
      commentCount: finalCommentCount,
    });
  }, [treeId, commentCount, post.postId, onUpdated]);

  const handleDelete = useCallback(async () => {
    try {
      await api.deletePost(treeId, post.postId);
      onDeleted(post.postId);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
    }
  }, [treeId, post.postId, onDeleted, toast]);

  const handleImageClick = useCallback(async (index: number) => {
    setViewerIndex(index);

    // Track image_click event in Zustand
    useAnalyticsStore.getState().addEvent({
      type: 'image_click',
      postId: post.postId,
    });

    if (comments.length === 0 && !loadingComments) {
      setLoadingComments(true);
      try {
        const { comments: fetched, hasMore } = await api.fetchComments(post.postId, 1, 10);
        setComments(fetched);
        setHasMoreComments(hasMore);
        setCommentPage(1);
      } catch {
        // silently ignore — viewer still works without comments
      } finally {
        setLoadingComments(false);
      }
    }
  }, [comments.length, loadingComments, post.postId]);

  const handleShare = useCallback(() => {
    setShowShareSheet(true);
  }, []);

  // Auto-link URLs in text
  const renderContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
      <p className="text-[15px] text-[#3D2E1F] dark:text-[#D2D0CE] leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) =>
          urlRegex.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#2F3E8F] hover:underline">
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  };

  return (
    <article ref={cardRef} className={`border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors ${post.postSource === 'admin' ? 'bg-[#FFF8F3] dark:bg-[#120d08]' : ''}`}>
      {/* Fam & Me header badge */}
      {post.postSource === 'admin' && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2F3E8F]">FamNme</span>
          <span className="h-px flex-1 bg-[#2F3E8F]/20" />
        </div>
      )}

      {/* Header: Avatar + Name + Time + Menu */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {post.postSource === 'admin' ? (
          /* FamNme branded avatar */
          <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-white border border-[#E2E8F0] dark:border-[#2a2a2a]">
            <img src="/logo.png" alt="FamNme" className="w-full h-full object-contain" />
          </div>
        ) : (
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.authorAvatarUrl ? (post.authorAvatarUrl.startsWith('http') ? post.authorAvatarUrl : resolveBackendUrl(post.authorAvatarUrl)) : undefined} />
            <AvatarFallback className="bg-[#E2E8F0] dark:bg-[#2a2a2a] text-[#8B7355] text-sm font-medium">
              {getInitials(post.authorName)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">
                {post.authorName}
              </span>
              <span className="text-xs text-[#8B7355] dark:text-[#A19F9D]">
                · {timeAgo(post.publishedAt || post.createdAt)}
              </span>
              {/* {post.detectedLanguage && post.detectedLanguage !== 'en' && (
                <LanguageBadge language={post.detectedLanguage} />
              )} */}
              {isOwnPost && post.postSource !== 'admin' && (
                <span title={post.visibility === 'public' ? 'Public post' : 'Family post'}>
                  {post.visibility === 'public'
                    ? <Globe className="h-3 w-3 text-[#8B7355]/60" />
                    : <Lock className="h-3 w-3 text-[#8B7355]/60" />
                  }
                </span>
              )}
              {post.feedReasons && post.feedReasons.length > 0 && (
                <FeedReasonTooltip reasons={post.feedReasons} />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="mt-2">
            {renderContent(post.content)}
            {post.linkUrl && (!post.content || !post.content.includes(post.linkUrl)) && (
              <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block text-[15px] text-[#2F3E8F] hover:underline mt-1 break-all">
                {post.linkUrl}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Media — only for non-link and non-video posts */}
      {mediaUrls.length > 0 && post.postType !== 'link' && post.postType !== 'video' && (
        <div className="w-full">
          <ShareImageGrid urls={mediaUrls} onImageClick={handleImageClick} />
        </div>
      )}

      {/* Video */}
      {post.postType === 'video' && !post.linkUrl && (post.videoUrl || mediaUrls.length > 0) && (
        <div className="w-full bg-black">
          <VideoWithThumbnail
            src={post.videoUrl ? (post.videoUrl.startsWith('http') ? post.videoUrl : resolveBackendUrl(post.videoUrl)) : (mediaUrls[0] || '')}
            poster={post.videoThumbnailUrl ? (post.videoThumbnailUrl.startsWith('http') ? post.videoThumbnailUrl : resolveBackendUrl(post.videoThumbnailUrl)) : undefined}
            postId={post.postId}
          />
        </div>
      )}

      {/* Link preview — YouTube/Vimeo embedded card, or generic link card */}
      {(post.postType !== 'image' && (post.postType === 'link' || post.linkUrl)) && (() => {
        const linkUrl = post.linkUrl || (post.postType === 'link' && mediaUrls.length > 0 ? mediaUrls[0] : '');
        if (!linkUrl) return null;

        // Use mediaUrls[0] as thumbnail for link/video posts; fall back to linkImageUrl
        const rawThumbSrc = (post.postType === 'link' || post.postType === 'video') && (mediaUrls && mediaUrls.length > 0)
          ? mediaUrls[0]
          : (post.linkImageUrl ?? undefined);
        const thumbSrc = rawThumbSrc
          ? (rawThumbSrc.startsWith('http') || rawThumbSrc.startsWith('data:') ? rawThumbSrc : resolveBackendUrl(rawThumbSrc))
          : undefined;

        const videoInfo = getVideoInfo(linkUrl);
        if (videoInfo) {
          return (
            <div className="w-full">
              <YouTubePreviewCard
                videoId={videoInfo.videoId}
                embedUrl={videoInfo.embedUrl}
                title={post.linkTitle}
                thumbnailUrl={thumbSrc}
                provider={videoInfo.provider}
                postId={post.postId}
              />
            </div>
          );
        }
        return (
          <div className="w-full">
            <LinkPreviewCard
              url={linkUrl}
              title={post.linkTitle}
              description={post.linkDescription}
              imageUrl={thumbSrc}
            />
          </div>
        );
      })()}

      {/* Footer: Action bar & Comments Section */}
      <div className="px-2 pb-4">
        <div className="-">
          {/* Action bar: Like, Comment, Share */}
          <div className="flex items-center gap-2 mt-2 -ml-2">
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-2.5 md:px-2 md:py-1.5 min-h-[44px] md:min-h-0 rounded-full text-sm transition-colors ${liked
                ? 'text-[#2F3E8F]'
                : 'text-[#8B7355] dark:text-[#A19F9D] hover:text-[#2F3E8F] hover:bg-[#2F3E8F]/5'
                }`}
            >
              <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span className="text-[13px]">{likeCount}</span>}
            </button>

            {/* Comment */}
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 px-3 py-2.5 md:px-2 md:py-1.5 min-h-[44px] md:min-h-0 rounded-full text-sm text-[#8B7355] dark:text-[#A19F9D] hover:text-[#2F3E8F] hover:bg-[#2F3E8F]/5 transition-colors"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
              {commentCount > 0 && <span className="text-[13px]">{commentCount}</span>}
            </button>
          </div>

          {/* Comments section */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${showComments ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              }`}
          >
            <div className="overflow-hidden">
              <ShareCommentSection
                comments={comments}
                currentUserId={currentUserId}
                loading={loadingComments && comments.length === 0}
                loadingMore={loadingComments && comments.length > 0}
                isAddingComment={isAddingComment}
                hasMore={hasMoreComments}
                onLoadMore={handleLoadMoreComments}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Share sheet */}
      {showShareSheet && (
        <ShareSheet post={post} onClose={() => setShowShareSheet(false)} />
      )}

      {/* Photo lightbox viewer */}
      {viewerIndex !== null && (
        <ShareMediaViewer
          post={post}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          currentUserId={currentUserId}
          liked={liked}
          likeCount={likeCount}
          commentCount={commentCount}
          onLike={handleLike}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          comments={comments}
          loadingComments={loadingComments}
        />
      )}
    </article>
  );
}

/**
 * VideoWithThumbnail — Shows a native video preview frame with a play button overlay.
 *
 * Uses a real <video> element with preload="metadata" to let the browser render the
 * first frame natively (no CORS issues, no canvas extraction). A play button overlay
 * sits on top. Clicking it starts playback with full controls.
 *
 * If a server-generated poster exists, uses it. Otherwise relies on the browser's
 * native metadata preload which renders the first frame automatically.
 */
function VideoWithThumbnail({ src, poster, postId }: { src: string; poster?: string; postId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const activeVideo = useAnalyticsStore((state) => state.activeVideo);
  const isThisVideoActive = activeVideo?.postId === postId;

  const handlePlay = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn('Autoplay/play failed:', err);
      });
      useAnalyticsStore.getState().trackVideoStart(postId, videoRef.current.duration || 0);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isThisVideoActive) {
        if (videoRef.current.paused) {
          setIsPlaying(true);
          videoRef.current.play().catch(() => {});
        }
      } else {
        if (!videoRef.current.paused) {
          setIsPlaying(false);
          videoRef.current.pause();
        }
      }
    }
  }, [isThisVideoActive]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    useAnalyticsStore.getState().updateActiveVideoProgress(v.currentTime, v.duration || 0);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    useAnalyticsStore.getState().trackVideoComplete(postId);
  };

  const handlePause = () => {
    if (videoRef.current?.seeking) return;
    setIsPlaying(false);
    useAnalyticsStore.getState().trackVideoPause(postId);
  };

  const handlePlayEvent = () => {
    setIsPlaying(true);
    if (videoRef.current) {
      useAnalyticsStore.getState().trackVideoStart(postId, videoRef.current.duration || 0);
    }
  };

  useEffect(() => {
    return () => {
      const currentActive = useAnalyticsStore.getState().activeVideo;
      if (currentActive && currentActive.postId === postId) {
        useAnalyticsStore.getState().trackVideoScrollAway(postId);
      }
    };
  }, [postId]);

  return (
    <div className="relative w-full overflow-hidden bg-black group">
      <video
        ref={videoRef}
        src={src}
        controls={isPlaying}
        preload="metadata"
        poster={poster}
        onLoadedData={() => setHasLoaded(true)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPause={handlePause}
        onPlay={handlePlayEvent}
        className="w-full max-h-[400px] bg-black"
        playsInline
      />

      {/* Play button overlay shown when not playing */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors cursor-pointer"
          onClick={handlePlay}
        >
          <div className={`w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all ${hasLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Play className="w-6 h-6 text-[#3D2E1F] ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Loading shimmer before video metadata loads */}
      {!hasLoaded && !poster && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
