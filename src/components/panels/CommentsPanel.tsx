import { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface Comment {
  id: string;
  text: string;
  userName: string;
  createdAt: string;
  userId?: string;
}

export interface CommentsPanelProps {
  personId: string;
  personName: string;
  treeId: string;
  onClose: () => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
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

export function CommentsPanel({ personId, personName, treeId, onClose }: CommentsPanelProps) {
  const { isMobile } = useResponsive();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/tree/${treeId}/person/${personId}/comments`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      setComments(Array.isArray(data) ? data : data.comments ?? []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [treeId, personId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    const text = newComment.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/tree/${treeId}/person/${personId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, userName: 'Me' }),
        }
      );
      if (!res.ok) throw new Error('Failed to post comment');
      setNewComment('');
      await fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/tree/${treeId}/person/${personId}/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!res.ok) throw new Error('Failed to delete comment');
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 bottom-0 w-full sm:w-96'} bg-white dark:bg-[#1E1E1E] border-l border-gray-100 dark:border-[#2a2a2a] shadow-2xl z-50 flex flex-col pointer-events-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5f5f5] truncate">
                Comments
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#aaa] truncate">{personName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Comment list */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'pb-16' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Be the first to leave a comment.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="group bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f5f5f5]">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-[#888]">
                        {relativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-[#ccc] mt-1 whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/25 transition-all flex-shrink-0"
                    title="Delete comment"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-[#2a2a2a] p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment..."
              className="flex-1 rounded-lg border border-gray-300 dark:border-[#444] bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={submitting}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="p-2 rounded-lg bg-[#2F3E8F] text-white hover:bg-[#3B4DA6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
