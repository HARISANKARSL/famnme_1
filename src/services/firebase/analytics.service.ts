import { logEvent } from "firebase/analytics";
import { analytics } from "./firebase";

export const trackEvent = (
    eventName: string,
    params?: Record<string, unknown>
) => {
    if (!analytics) {
        console.warn("[Firebase] Analytics not initialized.");
        return;
    }

    console.log("[Firebase] Sending Event:", eventName, params);

    logEvent(analytics, eventName, params);

    console.log("[Firebase] Event Sent");
};