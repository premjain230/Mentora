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

const DEFAULT_CONFIG: FirebaseConfig = {
  authDomain: "mentora-c6dca.firebaseapp.com",
  projectId: "mentora-c6dca",
  storageBucket: "mentora-c6dca.firebasestorage.app",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();

export async function getClientFirebaseConfig(): Promise<FirebaseConfig> {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }

  // 1. Check NEXT_PUBLIC env vars if configured
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

  // 2. Fetch from backend /api/firebase-config
  try {
    const res = await fetch("/api/firebase-config", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.apiKey) return data;
    }
  } catch (err) {
    console.warn("Could not fetch /api/firebase-config:", err);
  }

  // 3. Fallback to window global
  if ((window as any).__FIREBASE_CONFIG__) {
    return (window as any).__FIREBASE_CONFIG__;
  }

  return DEFAULT_CONFIG;
}

export async function initFirebase(): Promise<{
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  googleProvider: GoogleAuthProvider;
}> {
  if (typeof window === "undefined") {
    return { app: null, auth: null, db: null, googleProvider };
  }

  if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    return { app, auth, db, googleProvider };
  }

  try {
    const config = await getClientFirebaseConfig();
    if (config.apiKey) {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (err) {
    console.error("Firebase init failed:", err);
  }

  return { app, auth, db, googleProvider };
}

export { app, auth, db, googleProvider };
