/**
 * YourFaithFeed — Admin-only content feed for the "Your Faith" tab.
 * Users can browse, like, comment, and share but cannot create posts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import type { FaithContext } from '@/data/temples/sacredPlaceLabels';
import { getFaithFeed } from '@/services/faithContentApiService';
import type { FaithPost } from '@/services/faithContentApiService';
import { FaithPostCard } from './FaithPostCard';

interface YourFaithFeedProps {
  faithContext: FaithContext;
}

function faithToCategory(faith: FaithContext): string | undefined {
  if (faith === 'Hindu') return 'hindu';
  if (faith === 'Christian') return 'christian';
  if (faith === 'Islam') return 'muslim';
  return undefined; // show all for null/Mixed
}

export function YourFaithFeed({ faithContext }: YourFaithFeedProps) {
  const [posts, setPosts] = useState<FaithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user language from i18n
  const userLang = localStorage.getItem('familytree-locale') || 'en';

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const result = await getFaithFeed({
        faith: faithToCategory(faithContext),
        lang: userLang,
        cursor,
        limit: 20,
      });
      if (cursor) {
        setPosts(prev => [...prev, ...result.posts]);
      } else {
        setPosts(result.posts);
      }
      setNextCursor(result.nextCursor);
      setError(false);
    } catch {
      if (!cursor) setError(true);
    }
  }, [faithContext, userLang]);

  useEffect(() => {
    setLoading(true);
    fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  const handlePostUpdate = (updated: FaithPost) => {
    setPosts(prev => prev.map(p => p.postId === updated.postId ? updated : p));
  };

  // Infinite scroll — inline the load-more logic to avoid stale closures
  useEffect(() => {
    const el = scrollRef.current?.closest('.overflow-y-auto');
    if (!el || !nextCursor) return;

    let loading = false;
    const handleScroll = async () => {
      if (loading || !nextCursor) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        loading = true;
        setLoadingMore(true);
        await fetchFeed(nextCursor);
        setLoadingMore(false);
        loading = false;
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [nextCursor, fetchFeed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-14 h-14 rounded-2xl bg-[#2F3E8F]/10 flex items-center justify-center mb-4">
          <BookOpen className="w-6 h-6 text-[#2F3E8F]" />
        </div>
        <h3 className="text-[16px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5] mb-1.5 text-center">
          Your Faith
        </h3>
        <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D] text-center max-w-xs">
          Cultural articles, videos, and content curated for your community will appear here. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="px-4 md:px-6 py-4 space-y-4">
      {posts.map(post => (
        <FaithPostCard
          key={post.postId}
          post={post}
          onUpdate={handlePostUpdate}
        />
      ))}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[#8B7355]" />
        </div>
      )}

      {nextCursor && !loadingMore && (
        <button
          onClick={async () => {
            if (!nextCursor || loadingMore) return;
            setLoadingMore(true);
            await fetchFeed(nextCursor);
            setLoadingMore(false);
          }}
          className="w-full py-2.5 rounded-xl text-[13px] font-medium text-[#2F3E8F] hover:bg-[#2F3E8F]/5 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
