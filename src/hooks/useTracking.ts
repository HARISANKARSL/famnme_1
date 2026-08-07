import { useEffect, useRef } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import * as api from '@/services/dailyShareApiService';
import type { SharePost } from '@/services/dailyShareApiService';

export function usePostTracking(post: SharePost, isVideo: boolean) {
  const postId = post.postId;
  const cardRef = useRef<HTMLDivElement>(null);
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store the activeVideo state in a ref to prevent observer reconstruction on progress updates
  const activeVideo = useAnalyticsStore((state) => state.activeVideo);
  const activeVideoRef = useRef(activeVideo);
  useEffect(() => {
    activeVideoRef.current = activeVideo;
  }, [activeVideo]);

  const addEvent = useAnalyticsStore((state) => state.addEvent);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const store = useAnalyticsStore.getState();

        if (entry.intersectionRatio >= 0.3) {
          // 1. Post view: Start timer for 2 seconds if not already viewed in this session
          if (!viewTimerRef.current && !store.isPostViewed(postId)) {
            viewTimerRef.current = setTimeout(() => {
              addEvent({
                type: 'post_view',
                postId,
                duration: 2000,
                postType: isVideo ? 'video' : 'image',
              });
              api.recordView(post);
              viewTimerRef.current = null;
            }, 2000);
          }
        } else {
          // Clear post view timer if it leaves viewport before 2 seconds
          if (viewTimerRef.current) {
            clearTimeout(viewTimerRef.current);
            viewTimerRef.current = null;
          }

          // 3. Video Scroll Away: If this is the active video, trigger trackVideoScrollAway
          const currentActive = store.activeVideo;
          if (isVideo && currentActive && currentActive.postId === postId) {
            store.trackVideoScrollAway(postId);
          }
        }
      },
      { threshold: [0.3, 0.7] }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, [postId, isVideo, addEvent]);

  return cardRef;
}
