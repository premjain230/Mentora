import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

interface FirebaseBundle {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  googleProvider: GoogleAuthProvider;
}

/**
 * Non-secret fallbacks for values that are safe to infer from the project id.
 * `apiKey` is deliberately NOT defaulted: without it Firebase Auth cannot work,
 * so we surface a configuration error instead of initialising a broken app.
 */
const DEFAULT_CONFIG: FirebaseConfig = {
  authDomain: "mentora-c6dca.firebaseapp.com",
  projectId: "mentora-c6dca",
  storageBucket: "mentora-c6dca.firebasestorage.app",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();

// One config fetch and one initialisation per browser session. This prevents
// duplicate `initializeApp()` calls when several components mount at once
// (for example the login page and a layout-level auth listener).
let configPromise: Promise<FirebaseConfig> | null = null;
let initPromise: Promise<FirebaseBundle> | null = null;

function emptyBundle(): FirebaseBundle {
  return { app: null, auth: null, db: null, googleProvider };
}

function isComplete(config: FirebaseConfig | null | undefined): config is FirebaseConfig {
  return Boolean(config?.apiKey && config.authDomain && config.projectId);
}

async function loadClientFirebaseConfig(): Promise<FirebaseConfig | null> {
  // 1. Build-time public env vars, when configured in Vercel.
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_CONFIG.projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
    };
  }

  // 2. Runtime config from the same-origin API route.
  try {
    const res = await fetch("/api/firebase-config", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as FirebaseConfig;
      if (isComplete(data)) return data;
      console.error("[firebase] /api/firebase-config returned an incomplete config.");
    } else {
      console.error(`[firebase] /api/firebase-config responded with HTTP ${res.status}.`);
    }
  } catch (err) {
    console.error("[firebase] Could not reach /api/firebase-config:", err);
  }

  // 3. Optional server-rendered global (legacy pages only).
  if (typeof window !== "undefined") {
    const globalConfig = (window as any).__FIREBASE_CONFIG__ as FirebaseConfig | undefined;
    if (isComplete(globalConfig)) return globalConfig;
  }

  return null;
}

export function getClientFirebaseConfig(): Promise<FirebaseConfig> {
  if (typeof window === "undefined") {
    return Promise.resolve(DEFAULT_CONFIG);
  }

  if (!configPromise) {
    configPromise = loadClientFirebaseConfig().then((config) => {
      if (config) return config;
      // Allow a later retry instead of caching the failure for the whole session.
      configPromise = null;
      return DEFAULT_CONFIG;
    });
  }

  return configPromise;
}

/**
 * Initialise Firebase exactly once. Safe to call from multiple components: all
 * callers share the same promise, so React 18 strict-mode double effects and
 * parallel auth listeners cannot create duplicate apps.
 */
export function initFirebase(): Promise<FirebaseBundle> {
  if (typeof window === "undefined") {
    return Promise.resolve(emptyBundle());
  }

  if (initPromise) return initPromise;

  initPromise = (async (): Promise<FirebaseBundle> => {
    if (getApps().length > 0) {
      app = getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      return { app, auth, db, googleProvider };
    }

    const config = await getClientFirebaseConfig();
    if (!isComplete(config)) {
      throw new Error(
        "Firebase web configuration is unavailable. Check /api/firebase-config."
      );
    }

    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);

    return { app, auth, db, googleProvider };
  })().catch((err) => {
    // Reset so a subsequent user action (for example retrying sign-in after a
    // transient network failure) can initialise Firebase again.
    console.error("[firebase] Initialisation failed:", err);
    initPromise = null;
    return emptyBundle();
  });

  return initPromise;
}

export { app, auth, db, googleProvider };
