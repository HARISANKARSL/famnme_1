/**
 * MemoryCommentsSection - Embedded comment list + input for memory detail/viewer
 */

import { useState, useEffect } from 'react';
import { Send, Trash2, Loader2 } from 'lucide-react';
import {
  fetchMemoryComments,
  addMemoryComment,
  deleteMemoryComment,
  type MemoryComment,
} from '@/services/memoriesApiService';

interface MemoryCommentsSectionProps {
  memoryId: string;
  currentUserId: string;
  currentUserName: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
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

export function MemoryCommentsSection({ memoryId, currentUserId, currentUserName }: MemoryCommentsSectionProps) {
  const [comments, setComments] = useState<MemoryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = () => {
    setLoading(true);
    fetchMemoryComments(memoryId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadComments(); }, [memoryId]);

  const handlePost = async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const c = await addMemoryComment(memoryId, text.trim(), currentUserName);
      setComments(prev => [c, ...prev]);
      setText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteMemoryComment(memoryId, commentId);
      setComments(prev => prev.filter(c => c.commentId !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-sky-300 focus:ring-1 focus:ring-sky-200 outline-none"
        />
        <button
          onClick={handlePost}
          disabled={posting || !text.trim()}
          className="p-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* List */}
      {loading && <p className="text-xs text-gray-400 text-center py-3">Loading comments...</p>}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">No comments yet</p>
      )}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {comments.map((c) => (
          <div key={c.commentId} className="flex gap-2 group">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-gray-500">
              {c.userName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{c.userName}</span>
                <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-600 break-words">{c.text}</p>
            </div>
            {c.userId === currentUserId && (
              <button
                onClick={() => handleDelete(c.commentId)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
