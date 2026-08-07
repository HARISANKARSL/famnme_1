import { create } from 'zustand';
import { useAuthStore } from './authStore';
import aiInstance from '@/services/api/aiInstance';
import { getAuthToken } from '@/lib/auth';

export type EventType =
  | 'post_view'
  | 'image_click'
  | 'video_start'
  | 'video_pause'
  | 'video_watch'
  | 'video_complete'
  | 'profile_view'
  | 'video_progress';

export interface BaseEvent {
  type: EventType;
  timestamp: number;
}

export interface PostViewEvent extends BaseEvent {
  type: 'post_view';
  postId: string;
  duration: number;
  postType?: 'video' | 'image';
}

export interface ImageClickEvent extends BaseEvent {
  type: 'image_click';
  postId: string;
}

export interface VideoStartEvent extends BaseEvent {
  type: 'video_start';
  postId: string;
}

export interface VideoPauseEvent extends BaseEvent {
  type: 'video_pause';
  postId: string;
  watchDuration: number;
  watchPercentage: number;
  videoDuration: number;
}

export interface VideoWatchEvent extends BaseEvent {
  type: 'video_watch';
  postId: string;
  watchDuration: number;
  watchPercentage: number;
  videoDuration: number;
  completed: boolean;
}

export interface VideoCompleteEvent extends BaseEvent {
  type: 'video_complete';
  postId: string;
  watchDuration: number;
  watchPercentage: number;
  videoDuration: number;
  completed: boolean;
}

export interface ProfileViewEvent extends BaseEvent {
  type: 'profile_view';
  targetUserId: string;
}

export interface VideoProgressEvent extends BaseEvent {
  type: 'video_progress';
  postId: string;
  checkpoint: string;
  watchTime: number;
  watchPercentage: number;
}

export type AnalyticsEvent =
  | PostViewEvent
  | ImageClickEvent
  | VideoStartEvent
  | VideoPauseEvent
  | VideoWatchEvent
  | VideoCompleteEvent
  | ProfileViewEvent
  | VideoProgressEvent;

export type AnalyticsEventInput =
  | Omit<PostViewEvent, 'timestamp'> & { timestamp?: number }
  | Omit<ImageClickEvent, 'timestamp'> & { timestamp?: number }
  | Omit<VideoStartEvent, 'timestamp'> & { timestamp?: number }
  | Omit<VideoPauseEvent, 'timestamp'> & { timestamp?: number }
  | Omit<VideoWatchEvent, 'timestamp'> & { timestamp?: number }
  | Omit<VideoCompleteEvent, 'timestamp'> & { timestamp?: number }
  | Omit<ProfileViewEvent, 'timestamp'> & { timestamp?: number }
  | Omit<VideoProgressEvent, 'timestamp'> & { timestamp?: number };

interface AnalyticsState {
  eventQueue: AnalyticsEvent[];
  viewedPosts: string[];
  activeVideo: {
    postId: string;
    startedAt: string;
    currentWatchDuration: number;
    videoDuration: number;
    isPaused?: boolean;
  } | null;
  completedCheckpoints: Record<string, string[]>;

  // Actions
  addEvent: (event: AnalyticsEventInput) => void;
  removeEvent: (index: number) => void;
  clearQueue: () => void;
  markPostViewed: (postId: string) => void;
  isPostViewed: (postId: string) => boolean;

  // Custom video actions
  trackVideoStart: (postId: string, duration?: number) => void;
  trackVideoPause: (postId: string) => void;
  trackVideoComplete: (postId: string) => void;
  trackVideoScrollAway: (postId: string) => void;
  updateActiveVideoProgress: (currentTime: number, duration: number) => void;

  // Flush actions
  flushQueue: (isUnloading?: boolean) => void;
  getQueuedEvents: () => AnalyticsEvent[];
  getEventPayload: (userId?: string) => { userId?: string; events: any[] };
}

const LOCAL_STORAGE_KEY = 'famnme_event_queue';

const getQueuedEventsFromStorage = (): any[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveQueuedEventsToStorage = (events: any[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
  } catch { }
};

const getEligibleCheckpoints = (currentTime: number, duration: number): { checkpoint: string; watchTime: number; watchPercentage: number }[] => {
  if (duration <= 0) return [];
  const pct = Math.min(100, Math.round((currentTime / duration) * 100));
  const timeSec = Math.round(currentTime);

  const list: { checkpoint: string; eligible: boolean; watchTime: number; watchPercentage: number }[] = [
    { checkpoint: '5_seconds', eligible: timeSec >= 5, watchTime: 5, watchPercentage: Math.max(1, Math.round((5 / duration) * 100)) },
    { checkpoint: '15_seconds', eligible: timeSec >= 15, watchTime: 15, watchPercentage: Math.max(1, Math.round((15 / duration) * 100)) },
    { checkpoint: '25_percent', eligible: pct >= 25, watchTime: Math.round(0.25 * duration), watchPercentage: 25 },
    { checkpoint: '50_percent', eligible: pct >= 50, watchTime: Math.round(0.50 * duration), watchPercentage: 50 },
    { checkpoint: '75_percent', eligible: pct >= 75, watchTime: Math.round(0.75 * duration), watchPercentage: 75 },
  ];

  return list.filter(m => m.eligible);
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  eventQueue: getQueuedEventsFromStorage(),
  viewedPosts: [],
  activeVideo: null,
  completedCheckpoints: {},

  addEvent: (eventInput) => {
    const timestamp = eventInput.timestamp || Date.now();
    const eventWithTimestamp = {
      ...eventInput,
      timestamp,
    } as AnalyticsEvent;

    // Special logic for post_view to prevent duplicates during a single feed session
    if (eventWithTimestamp.type === 'post_view') {
      const postId = eventWithTimestamp.postId;
      if (get().viewedPosts.includes(postId)) {
        console.log(`🚫 [TRACKING - BLOCKED] post_view (duplicate ignored) | Post ID: ${postId}`);
        return;
      }
      set((state) => ({
        viewedPosts: [...state.viewedPosts, postId],
      }));
    }

    // Deduplicate video_start events
    if (eventWithTimestamp.type === 'video_start') {
      const queue = get().eventQueue;
      const lastEvent = queue[queue.length - 1];

      // If the last queued event was also a video_start for the same postId, ignore
      if (lastEvent && lastEvent.type === 'video_start' && lastEvent.postId === eventWithTimestamp.postId) {
        console.log(`🚫 [TRACKING - BLOCKED] video_start (last event duplicate) | Post ID: ${eventWithTimestamp.postId}`);
        return;
      }

      // If there was a video_start for this postId within the last 2 seconds, ignore
      const recentStart = queue.find(
        (ev) =>
          ev.type === 'video_start' &&
          ev.postId === eventWithTimestamp.postId &&
          timestamp - ev.timestamp < 2000
      );
      if (recentStart) {
        console.log(`🚫 [TRACKING - BLOCKED] video_start (recent duplicate) | Post ID: ${eventWithTimestamp.postId}`);
        return;
      }
    }

    set((state) => {
      let newQueue = [...state.eventQueue];

      // Update video progress events in-place to prevent duplicate logs in the queue
      if (eventWithTimestamp.type === 'video_pause' || eventWithTimestamp.type === 'video_watch' || eventWithTimestamp.type === 'video_complete') {
        const existingIdx = newQueue.findIndex(
          (ev) =>
            (ev.type === 'video_pause' || ev.type === 'video_watch' || ev.type === 'video_complete') &&
            ev.postId === eventWithTimestamp.postId
        );

        if (existingIdx !== -1) {
          // Replace with the newer/updated watch event
          newQueue[existingIdx] = eventWithTimestamp;
        } else {
          newQueue.push(eventWithTimestamp);
        }
      } else {
        newQueue.push(eventWithTimestamp);
      }

      saveQueuedEventsToStorage(newQueue);

      // Auto-flush rule 1: Queue contains 10 events
      if (newQueue.length >= 10) {
        setTimeout(() => get().flushQueue(), 0);
      }

      return { eventQueue: newQueue };
    });
  },

  removeEvent: (index) => {
    set((state) => {
      const newQueue = state.eventQueue.filter((_, idx) => idx !== index);
      saveQueuedEventsToStorage(newQueue);
      return { eventQueue: newQueue };
    });
  },

  clearQueue: () => {
    set({ eventQueue: [] });
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch { }
  },

  markPostViewed: (postId) => {
    set((state) => {
      if (state.viewedPosts.includes(postId)) return state;
      return { viewedPosts: [...state.viewedPosts, postId] };
    });
  },

  isPostViewed: (postId) => {
    return get().viewedPosts.includes(postId);
  },

  trackVideoStart: (postId, duration) => {
    const active = get().activeVideo;
    if (active && active.postId === postId) {
      if (active.isPaused) {
        set((state) => ({
          activeVideo: state.activeVideo ? { ...state.activeVideo, isPaused: false } : null
        }));
      }
      return;
    }
    if (active && active.postId !== postId) {
      get().trackVideoScrollAway(active.postId);
    }

    set((state) => {
      const updatedCheckpoints = { ...state.completedCheckpoints };
      delete updatedCheckpoints[postId];
      return {
        completedCheckpoints: updatedCheckpoints,
        activeVideo: {
          postId,
          startedAt: new Date().toISOString(),
          currentWatchDuration: 0,
          videoDuration: duration || 0,
          isPaused: false,
        },
      };
    });

    get().addEvent({
      type: 'video_start',
      postId,
    });
  },

  trackVideoPause: (postId) => {
    const active = get().activeVideo;
    if (!active || active.postId !== postId) return;

    const watchDuration = Math.round(active.currentWatchDuration);
    if (watchDuration <= 0) {
      set({ activeVideo: null });
      return;
    }
    const watchPercentage = active.videoDuration > 0
      ? Math.min(100, Math.round((active.currentWatchDuration / active.videoDuration) * 100))
      : 0;

    get().addEvent({
      type: 'video_pause',
      postId,
      watchDuration,
      watchPercentage,
      videoDuration: Math.round(active.videoDuration),
    });

    set((state) => ({
      activeVideo: state.activeVideo ? { ...state.activeVideo, isPaused: true } : null
    }));
  },

  trackVideoScrollAway: (postId) => {
    const active = get().activeVideo;
    if (!active || active.postId !== postId) return;

    if (!active.isPaused) {
      const watchDuration = Math.round(active.currentWatchDuration);
      if (watchDuration > 0) {
        const watchPercentage = active.videoDuration > 0
          ? Math.min(100, Math.round((active.currentWatchDuration / active.videoDuration) * 100))
          : 0;

        get().addEvent({
          type: 'video_watch',
          postId,
          watchDuration,
          watchPercentage,
          videoDuration: Math.round(active.videoDuration),
          completed: false,
        });
      }
    }

    set({ activeVideo: null });
  },

  trackVideoComplete: (postId) => {
    const active = get().activeVideo;
    if (!active || active.postId !== postId) return;

    const watchDuration = Math.round(active.currentWatchDuration);
    if (watchDuration <= 0) {
      set({ activeVideo: null });
      return;
    }
    const watchPercentage = 100;

    get().addEvent({
      type: 'video_complete',
      postId,
      watchDuration,
      watchPercentage,
      videoDuration: Math.round(active.videoDuration),
      completed: true,
    });

    set({ activeVideo: null });
  },

  updateActiveVideoProgress: (currentTime, duration) => {
    set((state) => {
      if (!state.activeVideo) return state;

      const active = state.activeVideo;
      const finalDuration = duration || active.videoDuration;

      const nextActiveVideo = {
        ...active,
        currentWatchDuration: currentTime,
        videoDuration: finalDuration,
      };

      // Check for new checkpoints
      let newEventsToEnqueue: AnalyticsEvent[] = [];
      let updatedCheckpoints = { ...state.completedCheckpoints };

      if (finalDuration > 0) {
        const eligible = getEligibleCheckpoints(currentTime, finalDuration);
        const completed = state.completedCheckpoints[active.postId] || [];
        const newReached = eligible.filter(cp => !completed.includes(cp.checkpoint));

        if (newReached.length > 0) {
          const newCheckpointNames = newReached.map(cp => cp.checkpoint);
          updatedCheckpoints[active.postId] = [...completed, ...newCheckpointNames];
          
          newReached.forEach(cp => {
            const progressEvent: VideoProgressEvent = {
              type: 'video_progress',
              postId: active.postId,
              checkpoint: cp.checkpoint,
              watchTime: cp.watchTime,
              watchPercentage: cp.watchPercentage,
              timestamp: Date.now(),
            };
            newEventsToEnqueue.push(progressEvent);
          });
        }
      }

      let nextQueue = [...state.eventQueue];
      if (newEventsToEnqueue.length > 0) {
        nextQueue = [...nextQueue, ...newEventsToEnqueue];
        saveQueuedEventsToStorage(nextQueue);
        
        // Auto-flush rule: Queue contains 10 events
        if (nextQueue.length >= 10) {
          setTimeout(() => get().flushQueue(), 0);
        }
      }

      return {
        activeVideo: nextActiveVideo,
        completedCheckpoints: updatedCheckpoints,
        eventQueue: nextQueue,
      };
    });
  },

  flushQueue: (isUnloading = false) => {
    // If there is an active video, capture its progress before flushing without stopping playback
    const active = get().activeVideo;
    if (active && !active.isPaused) {
      const watchDuration = Math.round(active.currentWatchDuration);
      if (watchDuration > 0) {
        const watchPercentage = active.videoDuration > 0
          ? Math.min(100, Math.round((active.currentWatchDuration / active.videoDuration) * 100))
          : 0;

        get().addEvent({
          type: 'video_watch',
          postId: active.postId,
          watchDuration,
          watchPercentage,
          videoDuration: Math.round(active.videoDuration),
          completed: false,
        });
      }
      if (isUnloading) {
        set({ activeVideo: null });
      }
    }

    const { eventQueue } = get();
    if (eventQueue.length === 0) return;

    const userId = useAuthStore.getState().user?.id || 'guest_user';
    const payload = get().getEventPayload(userId);

    // console.log(`🚀 [Analytics Flush] Sending payload to /recommendations/interaction (isUnloading: ${isUnloading}):`, JSON.stringify(payload, null, 2));

    // Clear the queue state immediately
    set({ eventQueue: [] });
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch { }

    if (isUnloading) {
      const baseUrl = import.meta.env.VITE_AI_API_BASE_URL || 'https://famnme.actigen.ai';
      const url = `${baseUrl}/recommendations/interaction`;
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      void fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } else {
      aiInstance.post('recommendations/interaction', payload)
        .then(() => {
          console.log('✅ Successfully flushed analytics events.');
        })
        .catch((err) => {
          console.error('❌ Failed to flush analytics events:', err);
        });
    }
  },

  getQueuedEvents: () => {
    return get().eventQueue;
  },

  getEventPayload: (userId) => {
    const mappedEvents = get().eventQueue.map((ev) => {
      const formatted: any = {
        eventType: ev.type,
      };

      if ('postId' in ev) {
        formatted.postId = ev.postId;
      }

      if (ev.type === 'post_view') {
        formatted.eventType = 'post_view';
        formatted.duration = ev.duration;
      } else if (ev.type === 'image_click') {
        formatted.eventType = 'image_click';
      } else if (ev.type === 'video_start') {
        formatted.eventType = 'video_start';
      } else if (ev.type === 'video_pause' || ev.type === 'video_watch' || ev.type === 'video_complete') {
        formatted.eventType = 'video_watch';
        const watchDuration = (ev as any).watchDuration || 0;
        const watchPercentage = (ev as any).watchPercentage || 0;
        const videoDuration = (ev as any).videoDuration || 0;

        formatted.videoLength = Math.round(videoDuration);
        formatted.watchTime = Math.round(watchDuration);
        formatted.watchPercentage = Math.round(watchPercentage);
        formatted.completed = ev.type === 'video_complete' || (ev as any).completed || false;
      } else if (ev.type === 'profile_view') {
        formatted.eventType = 'profile_view';
        formatted.targetUserId = ev.targetUserId;
      } else if (ev.type === 'video_progress') {
        formatted.eventType = 'video_progress';
        formatted.checkpoint = (ev as any).checkpoint;
        formatted.watchTime = (ev as any).watchTime;
        formatted.watchPercentage = (ev as any).watchPercentage;
      }

      return formatted;
    });

    return {
      userId,
      events: mappedEvents,
    };
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useAnalyticsStore.getState().flushQueue(true);
  });

  // Flush remaining events immediately when the user switches tabs or minimizes the window
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useAnalyticsStore.getState().flushQueue(true);
    }
  });
}
