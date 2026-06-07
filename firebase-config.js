// ── firebase-config.js ──
// Shared Firebase initialization. Import this in all other JS files.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC--GsipEZSX-W3-eBFWrLhiEC9McOmrW0",
  authDomain: "mentora-c6dca.firebaseapp.com",
  projectId: "mentora-c6dca",
  storageBucket: "mentora-c6dca.firebasestorage.app",
  messagingSenderId: "388015722291",
  appId: "1:388015722291:web:5fd20e48390a96caf13846",
  measurementId: "G-ET1SWBG3W4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
