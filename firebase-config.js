// Shared Firebase initialization. Values are served by a Vercel Function so they are
// not committed in source. Firebase client config is still delivered to the browser
// at runtime because the Firebase web SDK requires it.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function loadFirebaseConfig() {
  try {
    const response = await fetch("/api/firebase-config", {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin",
    });
    if (response.ok) return response.json();
  } catch {}

  // Fallback for local dev: set window.__FIREBASE_CONFIG__ before this script loads
  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;

  throw new Error("Firebase configuration is unavailable. Set window.__FIREBASE_CONFIG__ for local dev.");
}

const app = initializeApp(await loadFirebaseConfig());

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
