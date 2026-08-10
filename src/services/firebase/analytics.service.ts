import { logEvent } from "firebase/analytics";
import { analytics, analyticsReady } from "./firebase";
import axios, { type AxiosInstance } from "axios";
import { normalizeUrl, shouldSkipTracking } from "@/utils/proxyIdCleaner";

// Queue for events tracked before Firebase Analytics finishes initializing
const eventQueue: { eventName: string; params?: Record<string, unknown> }[] = [];
let isReady = false;

// When initialization completes, flush all queued events
analyticsReady.then((initializedAnalytics) => {
    isReady = true;
    if (initializedAnalytics) {
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
    }
});

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