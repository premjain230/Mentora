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
  } catch (e) {
    console.warn("Fetching Firebase config failed, trying fallback.", e);
  }

  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;

  throw new Error("Firebase configuration is unavailable.");
}

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

try {
  const config = await loadFirebaseConfig();
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

export { auth, db, googleProvider };
