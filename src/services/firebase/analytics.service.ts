import { logEvent } from "firebase/analytics";
import { analytics, analyticsReady } from "./firebase";

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