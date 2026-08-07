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

(async () => {
    try {
        const supported = await isSupported();

        if (!supported) {
            console.warn("[Firebase] Analytics is not supported in this browser.");
            return;
        }

        analytics = getAnalytics(app);

        console.log("[Firebase] App Initialized");
        console.log("[Firebase] Analytics Initialized", analytics);
        console.log(
            "[Firebase] Measurement ID:",
            import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
        );
    } catch (err) {
        console.error("[Firebase] Initialization Error:", err);
    }
})();