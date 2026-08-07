import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

export let analytics: Analytics | null = null;

let resolveAnalytics!: (value: Analytics | null) => void;
export const analyticsReady = new Promise<Analytics | null>((resolve) => {
    resolveAnalytics = resolve;
});

(async () => {
    try {
        const supported = await isSupported();

        if (!supported) {
            console.warn("[Firebase] Analytics is not supported in this browser.");
            resolveAnalytics(null);
            return;
        }

        if (typeof window !== "undefined") {
            // Automatically enable debug_mode for Google Analytics in local development
            if (import.meta.env.DEV && firebaseConfig.measurementId) {
                const win = window as any;
                win.dataLayer = win.dataLayer || [];
                win.gtag = win.gtag || function () {
                    // eslint-disable-next-line prefer-rest-params
                    win.dataLayer.push(arguments);
                };
                win.gtag("config", firebaseConfig.measurementId, { debug_mode: true });
                console.log("[Firebase] GA4 Debug Mode enabled for local development.");
            }
        }

        analytics = getAnalytics(app);

        console.log("[Firebase] App Initialized");
        console.log("[Firebase] Analytics Initialized", analytics);
        console.log(
            "[Firebase] Measurement ID:",
            import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
        );
        resolveAnalytics(analytics);
    } catch (err) {
        console.error("[Firebase] Initialization Error:", err);
        resolveAnalytics(null);
    }
})();