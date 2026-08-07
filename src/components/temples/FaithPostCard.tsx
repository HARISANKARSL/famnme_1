/**
 * FaithPostCard — Displays a single post in the "Your Faith" feed.
 */

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Pin, ExternalLink, Play } from 'lucide-react';
import type { FaithPost, FaithComment } from '@/services/faithContentApiService';
import { toggleFaithLike, getFaithComments, addFaithComment, viewFaithPost } from '@/services/faithContentApiService';

interface FaithPostCardProps {
  post: FaithPost;
  onUpdate: (post: FaithPost) => void;
  /** Current user's display name for comments */
  userName?: string;
  userAvatarUrl?: string;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  try {
    if (isNaN(date.getTime())) return iso;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

export function FaithPostCard({ post, onUpdate, userName, userAvatarUrl }: FaithPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLikedByUser ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FaithComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Track view on mount
  useEffect(() => { viewFaithPost(post.postId); }, [post.postId]);

  const handleLike = async () => {
    const prev = { isLiked, likeCount };
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    try {
      const result = await toggleFaithLike(post.postId);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
      onUpdate({ ...post, likeCount: result.likeCount, isLikedByUser: result.liked });
    } catch {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const fetched = await getFaithComments(post.postId);
        setComments(fetched);
      } catch { /* ignore */ }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const comment = await addFaithComment(post.postId, commentText.trim(), userName ?? 'User', userAvatarUrl);
      setComments(prev => [...prev, comment]);
      setCommentText('');
      onUpdate({ ...post, commentCount: post.commentCount + 1 });
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    const text = post.title ? `${post.title}\n\n${post.content}` : post.content;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F3E8F] to-[#4B2C5E] flex items-center justify-center">
          <span className="text-[11px] font-bold text-white">FC</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">FamilyAConnect</p>
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D]">{formatDate(post.createdAt)}</p>
        </div>
        {post.isPinned && (
          <Pin className="w-3.5 h-3.5 text-[#C2A46D] shrink-0" />
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {post.title && (
          <h3 className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] mb-1.5">{post.title}</h3>
        )}
        <p className="text-[13px] text-[#5A4D3F] dark:text-[#B8A090] leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* Media */}
      {post.postType === 'image' && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`grid gap-1 ${post.mediaUrls.length === 1 ? '' : 'grid-cols-2'}`}>
          {post.mediaUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="w-full h-48 object-cover" loading="lazy" />
          ))}
        </div>
      )}

      {post.postType === 'video' && post.videoUrl && (
        <div className="relative">
          {post.videoThumbnailUrl ? (
            <a href={post.videoUrl} target="_blank" rel="noopener noreferrer" className="block relative">
              <img src={post.videoThumbnailUrl} alt="" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              </div>
            </a>
          ) : (
            <video src={post.videoUrl} controls className="w-full max-h-64" />
          )}
        </div>
      )}

      {post.postType === 'link' && post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 md:gap-3 mx-3 md:mx-4 mb-3 px-2.5 md:px-3 py-2.5 rounded-xl border border-[#E2DBCE]/80 dark:border-[#2a2a2a] hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E] transition-colors overflow-hidden"
        >
          {post.linkImageUrl && (
            <img src={post.linkImageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{post.linkTitle || post.linkUrl}</p>
            {post.linkDescription && (
              <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] line-clamp-2">{post.linkDescription}</p>
            )}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-[#8B7355] shrink-0" />
        </a>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
            isLiked
              ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
              : 'text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          {likeCount > 0 && likeCount}
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E] transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.commentCount > 0 && post.commentCount}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#8B7355] dark:text-[#A19F9D] hover:bg-[#F6F2EA] dark:hover:bg-[#1E1E1E] transition-colors ml-auto"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-[#E2DBCE]/40 dark:border-[#2a2a2a] px-4 py-3">
          {loadingComments && (
            <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D]">Loading comments...</p>
          )}

          {comments.length > 0 && (
            <div className="space-y-3 mb-3">
              {comments.map(c => (
                <div key={c.commentId} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#ECE7DF] dark:bg-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                    {c.authorAvatarUrl ? (
                      <img src={c.authorAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-[#8B7355]">{(c.authorName ?? 'U')[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[12px]">
                      <span className="font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{c.authorName ?? 'User'}</span>
                      {' '}
                      <span className="text-[#5A4D3F] dark:text-[#B8A090]">{c.text}</span>
                    </p>
                    <p className="text-[10px] text-[#8B7355]/70 dark:text-[#A19F9D]/70 mt-0.5">{formatDate(c.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Write a comment..."
              className="flex-1 h-11 md:h-9 px-3 rounded-lg border border-[#E2DBCE]/80 dark:border-[#2a2a2a] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder-[#8B7355]/50 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/30"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="px-3 h-9 rounded-lg text-[12px] font-medium text-white bg-[#2F3E8F] hover:bg-[#3B4DA6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
