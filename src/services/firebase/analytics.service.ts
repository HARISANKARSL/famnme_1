import { logEvent, setUserId as firebaseSetUserId, setUserProperties as firebaseSetUserProperties } from "firebase/analytics";
import { analytics, analyticsReady } from "./firebase";
import axios, { type AxiosInstance } from "axios";
import { normalizeUrl, shouldSkipTracking } from "@/utils/proxyIdCleaner";

// Queue for events tracked before Firebase Analytics finishes initializing
const eventQueue: { eventName: string; params?: Record<string, unknown> }[] = [];
const propertyQueue: (() => void)[] = [];
let isReady = false;

// When initialization completes, flush all queued events
analyticsReady.then((initializedAnalytics) => {
    isReady = true;
    if (initializedAnalytics) {
        while (propertyQueue.length > 0) {
            const fn = propertyQueue.shift();
            if (fn) {
                try { fn(); } catch (e) { console.warn("[Firebase] Failed to flush property:", e); }
            }
        }
        while (eventQueue.length > 0) {
            const queued = eventQueue.shift();
            if (queued) {
                console.log("[Firebase] Sending Queued Event:", queued.eventName, queued.params);
                logEvent(initializedAnalytics, queued.eventName, queued.params);
            }
        }
    } else {
        console.warn("[Firebase] Analytics initialization failed. Queued events cleared.");
        eventQueue.length = 0;
        propertyQueue.length = 0;
    }
});

export const setAnalyticsUserId = (userId: string | null) => {
    if (!isReady) {
        console.log("[Firebase] Queuing User ID (waiting for initialization):", userId);
        propertyQueue.push(() => setAnalyticsUserId(userId));
        return;
    }
    if (analytics) {
        console.log("[Firebase] Setting User ID:", userId);
        firebaseSetUserId(analytics, userId);
    }
};

export const setAnalyticsUserProperties = (properties: Record<string, unknown>) => {
    if (!isReady) {
        console.log("[Firebase] Queuing User Properties (waiting for initialization):", properties);
        propertyQueue.push(() => setAnalyticsUserProperties(properties));
        return;
    }
    if (analytics) {
        console.log("[Firebase] Setting User Properties:", properties);
        firebaseSetUserProperties(analytics, properties);
    }
};

export const updateTreeUserProperties = (hasTree: boolean, memberCount: number) => {
    setAnalyticsUserProperties({
        family_created: hasTree ? "Yes" : "No",
        family_members_count: memberCount
    });
};


export const trackEvent = (
    eventName: string,
    params?: Record<string, unknown>
) => {
    // Automatically map login_failed to login_error (with reason parameter)
    if (eventName === "login_failed") {
        trackEvent("login_error", { reason: params?.reason || "unknown_reason" });
    }

    if (!isReady) {
        console.log("[Firebase] Queuing Event (waiting for initialization):", eventName, params);
        eventQueue.push({ eventName, params });
        return;
    }

    if (!analytics) {
        console.warn("[Firebase] Analytics not initialized.");
        return;
    }

    console.log("[Firebase] Sending Event:", eventName, params);
    logEvent(analytics, eventName, params);
    console.log("[Firebase] Event Sent");
};

export const attachAnalyticsInterceptor = (instance: AxiosInstance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Don't track user-cancelled requests or requests without a config
      if (!error || !error.config || axios.isCancel(error)) {
        return Promise.reject(error);
      }

      const status = error.response?.status;
      // Skip tracking standard client authorization or resource not found status codes
      if (status === 401 || status === 403 || status === 404) {
        return Promise.reject(error);
      }

      const rawUrl = error.config.url;
      if (shouldSkipTracking(rawUrl)) {
        return Promise.reject(error);
      }
      const apiName = normalizeUrl(rawUrl);

      const isTimeout =
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        error.message?.toLowerCase().includes("timeout");

      if (isTimeout) {
        trackEvent("api_timeout", {
          api_name: apiName,
        });
      } else {
        trackEvent("api_failed", {
          api_name: apiName,
        });
      }

      return Promise.reject(error);
    }
  );
};

export const trackPaymentError = (reason: string) => {
  trackEvent("payment_error", { reason });
};

interface RetentionData {
  firstSeenDate: string;
  lastActiveDate: string;
  lastCheckedDate: string;
  trackedMilestones?: {
    day1?: boolean;
    day7?: boolean;
    day30?: boolean;
  };
}

export const trackUserRetention = (userId?: string) => {
  if (typeof window === "undefined" || !window.localStorage) return;

  if (userId) {
    setAnalyticsUserId(userId);
  }

  const key = userId ? `fc_retention_${userId}` : "fc_retention_global";
  const today = new Date().toISOString().slice(0, 10);

  let data: RetentionData | null = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      data = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[Analytics] Failed to parse retention data:", e);
  }

  const getDaysDifference = (fromDateStr: string, toDateStr: string): number => {
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);
    const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.floor((utcTo - utcFrom) / (1000 * 60 * 60 * 24));
  };

  let firstSeenDate = today;
  let userType: "New" | "Returning" = "New";

  if (!data || !data.firstSeenDate) {
    const initialData: RetentionData = {
      firstSeenDate: today,
      lastActiveDate: today,
      lastCheckedDate: today,
      trackedMilestones: {},
    };
    try {
      localStorage.setItem(key, JSON.stringify(initialData));
    } catch (e) {
      /* ignore */
    }

    if (userId) {
      setAnalyticsUserProperties({
        registration_date: today,
        user_type: "New"
      });
    }
    return;
  }

  firstSeenDate = data.firstSeenDate;
  const daysSinceFirstSeen = getDaysDifference(firstSeenDate, today);
  userType = daysSinceFirstSeen > 0 ? "Returning" : "New";

  if (userId) {
    setAnalyticsUserProperties({
      registration_date: firstSeenDate,
      user_type: userType
    });
  }

  // Already evaluated today
  if (data.lastCheckedDate === today) {
    return;
  }

  const daysSinceFirst = getDaysDifference(data.firstSeenDate, today);
  const daysSinceLast = getDaysDifference(data.lastActiveDate, today);

  // 1. Returning user event
  if (daysSinceLast >= 1) {
    trackEvent("returning_user", { days_since_last: daysSinceLast });
  }

  const trackedMilestones = data.trackedMilestones || {};

  // 2. Day 1 active event
  if (daysSinceFirst === 1 && !trackedMilestones.day1) {
    trackEvent("day1_active");
    trackedMilestones.day1 = true;
  }

  // 3. Day 7 active event
  if (daysSinceFirst === 7 && !trackedMilestones.day7) {
    trackEvent("day7_active");
    trackedMilestones.day7 = true;
  }

  // 4. Day 30 active event
  if (daysSinceFirst === 30 && !trackedMilestones.day30) {
    trackEvent("day30_active");
    trackedMilestones.day30 = true;
  }

  const updatedData: RetentionData = {
    firstSeenDate: data.firstSeenDate,
    lastActiveDate: today,
    lastCheckedDate: today,
    trackedMilestones,
  };

  try {
    localStorage.setItem(key, JSON.stringify(updatedData));
  } catch (e) {
    /* ignore */
  }
};