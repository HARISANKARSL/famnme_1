/**
 * DailySharePage — Twitter/X-style social feed for family trees
 * Renders as a normal in-canvas page (sidebar stays visible).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Newspaper, AlertTriangle } from 'lucide-react';
import { FeedPostSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useResponsive } from '@/hooks/useResponsive';
import { ShareComposer } from '@/components/dailyshare/ShareComposer';
import { SharePostCard } from '@/components/dailyshare/SharePostCard';
import { FeedLanguageSelector } from '@/components/dailyshare/FeedLanguageSelector';
import { EmptyFeedState } from '@/components/dailyshare/EmptyFeedState';
import * as api from '@/services/dailyShareApiService';
import type { SharePost, FeedPreferences } from '@/services/dailyShareApiService';
import dummyFeed from '@/data/dummyFeed.json';

import { useAnalyticsStore } from '@/store/analyticsStore';
import { AnalyticsTrackerConsole } from '@/components/dailyshare/AnalyticsTrackerConsole';

interface DailySharePageProps {
  treeId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  onClose: () => void;
}

export function DailySharePage({
  treeId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onClose,
}: DailySharePageProps) {
  const { isMobile } = useResponsive();
  const [posts, setPosts] = useState<SharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [feedPrefs, setFeedPrefs] = useState<FeedPreferences>({
    preferredLanguages: ['en'],
    languageMode: 'soft',
  });
  const [prefsLoading, setPrefsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);



  // Analytics periodic flush (every 15 seconds) & page/route exit handling
  useEffect(() => {
    const interval = setInterval(() => {
      useAnalyticsStore.getState().flushQueue();
    }, 15000);

    return () => {
      clearInterval(interval);
      console.log('🚪 [Analytics Store] Page/Route Exit Detected. Flushing remaining events.');
      useAnalyticsStore.getState().flushQueue(true);
    };
  }, []);

  // Load feed preferences on mount
  useEffect(() => {
    void (async () => {
      try {
        const prefs = await api.fetchFeedPreferences();
        setFeedPrefs(prefs);
      } catch {
        // Use defaults on error
      } finally {
        setPrefsLoading(false);
      }
    })();
  }, []);

  const loadFeed = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const feed = await api.fetchGlobalFeed(cursor as any);

        if (cursor) {
          setPosts(prev => [...prev, ...feed.posts]);
        } else {
          setPosts(feed.posts);
        }
        setNextCursor(feed.nextCursor);
        setIsOffline(false);
      } catch (apiErr) {
        console.warn('Failed to fetch global feed, using dummy fallback:', apiErr);
        if (!cursor) {
          setPosts(dummyFeed.posts as SharePost[]);
          setNextCursor(null);
          setIsOffline(true);
        } else {
          throw apiErr;
        }
      }
    } catch {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePrefsUpdate = useCallback(async (prefs: FeedPreferences) => {
    setFeedPrefs(prefs);
    try {
      await api.updateFeedPreferences(prefs);
    } catch {
      // Silent failure — preferences still update locally
    }
    // Reload feed with new language preferences
    void loadFeed();
  }, [loadFeed]);

  // Infinite scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loadingMore || !nextCursor) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadFeed(nextCursor);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadingMore, nextCursor, loadFeed]);

  const handlePostCreated = () => {
    loadFeed();
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.postId !== postId));
  };

  const handlePostUpdated = useCallback((postId: string, updates: Partial<SharePost>) => {
    setPosts(prev => prev.map(p => p.postId === postId ? { ...p, ...updates } : p));
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#F7F4F0] dark:bg-[#121212]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-3 h-14 border-b border-[#E2E8F0]/80 dark:border-[#2a2a2a] bg-[#F9FAFB]/95 dark:bg-[#1E1E1E]/95 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={onClose}
          className="h-11 w-11 flex items-center justify-center rounded-full text-[#8B7355] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0 md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Newspaper className="h-4 w-4 text-[#2F3E8F] flex-shrink-0" />
          <h1
            className="text-base font-semibold text-[#3D2E1F] dark:text-[#F3F2F1] truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Daily Share
          </h1>
        </div>

        {!prefsLoading && (
          <FeedLanguageSelector
            preferences={feedPrefs}
            onUpdate={handlePrefsUpdate}
          />
        )}

        <button
          onClick={() => loadFeed()}
          className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-full text-[#8B7355] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
          title="Refresh feed"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </header>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        <div className={`max-w-[600px] mx-auto w-full bg-white dark:bg-[#1E1E1E] min-h-full ${isMobile ? '' : 'border-x border-[#E2E8F0]/40 dark:border-[#2a2a2a]/60'}`} style={isMobile ? { paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' } : undefined}>
          <ShareComposer
            treeId={treeId}
            authorName={currentUserName}
            authorAvatarUrl={currentUserAvatar}
            onPostCreated={handlePostCreated}
          />

          {isOffline && (
            <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-[#E2E8F0]/80 dark:border-[#2a2a2a] text-amber-800 dark:text-amber-300 text-[11px] font-medium animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>You are viewing cached offline posts.</span>
              </div>
              <button
                onClick={() => loadFeed()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-all font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                Refresh
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <FeedPostSkeleton />
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </div>
          ) : (error && posts.length === 0) ? (
            <ErrorState
              icon="network"
              title="We couldn't load the feed"
              subtitle="Check your connection and try again."
              primaryAction={{ label: 'Try again', onClick: () => loadFeed() }}
            />
          ) : posts.length === 0 ? (
            <EmptyFeedState
              preferredLanguages={feedPrefs.preferredLanguages}
              languageMode={feedPrefs.languageMode}
              onSwitchToSoft={() => handlePrefsUpdate({ ...feedPrefs, languageMode: 'soft' })}
            />
          ) : (
            <>
              {posts.map(post => (
                <SharePostCard
                  key={post.postId}
                  post={post}
                  treeId={post.treeId}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  currentUserAvatar={currentUserAvatar}
                  onDeleted={handlePostDeleted}
                  onUpdated={handlePostUpdated}
                  globalMode={true}
                />
              ))}

              {loadingMore && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#2F3E8F]" />
                </div>
              )}

              {!nextCursor && posts.length > 0 && (
                <div className="text-center py-8 text-xs text-[#8B7355]/60">
                  You've reached the end
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <AnalyticsTrackerConsole />
    </div>
  );
}

export default DailySharePage;
