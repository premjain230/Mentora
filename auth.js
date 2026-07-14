// ── auth.js ──
// Handles: Email/password sign-in & sign-up, Google OAuth, forgot password.
// Used by: login.html  →  signIn()
//           signup.html →  signUp()
// Both pages call googleSignIn() from their "Continue with Google" button.

import {
  auth,
  db,
  googleProvider,
} from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Show an error/success banner inside element with id="authMsg" */
function showMsg(text, isError = true) {
  let el = document.getElementById("authMsg");
  if (!el) {
    el = document.createElement("div");
    el.id = "authMsg";
    el.style.cssText = `
      margin: 12px 0 0;
      padding: 11px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      animation: fadeUp .3s ease;
    `;
    // Insert before the primary submit button or append to form
    const btn = document.querySelector(".btn, .btn-primary, #createBtn, #signInBtn, [type='submit']");
    if (btn?.parentNode) {
      btn.parentNode.insertBefore(el, btn);
    } else {
      const form = document.querySelector("form, .auth-box, .card") || document.body;
      form.prepend(el);
    }
  }
  el.textContent = text;
  el.style.background = isError
    ? "rgba(244,114,182,0.12)"
    : "rgba(6,214,207,0.12)";
  el.style.border = isError
    ? "1px solid rgba(244,114,182,0.3)"
    : "1px solid rgba(6,214,207,0.3)";
  el.style.color = isError ? "#f472b6" : "#06d6cf";
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Please wait…";
    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

/** Persist user profile doc to Firestore on first sign-up */
export async function ensureUserDoc(user, extra = {}) {
  if (!db) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || extra.displayName || "",
      email: user.email,
      photoURL: user.photoURL || "",
      exam: extra.exam || "",
      createdAt: serverTimestamp(),
      plan: "free",
    });
  }
}

function redirectToHome() {
  window.location.href = "home.html";
}

// ─── Google Sign-In (shared by login + signup) ───────────────────────────────

export async function googleSignIn(btnEl) {
  const btn = btnEl || document.querySelector(".btn-google");
  setLoading(btn, true);
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    redirectToHome();
  } catch (err) {
    showMsg(friendlyError(err.code));
    setLoading(btn, false);
    throw err;
  }
}

// ─── Email / Password Sign-In  (login.html) ──────────────────────────────────

export async function signIn(btnEl) {
  const btn = btnEl || document.querySelector(".btn") || document.getElementById("signInBtn");
  const emailElement = document.getElementById("emailIn") || document.querySelector('input[type="email"]');
  const email = emailElement?.value?.trim();
  const password = document.getElementById("pwdF")?.value;

  if (!email || !password) {
    showMsg("Please fill in all fields.");
    return;
  }

  setLoading(btn, true);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      showMsg("Please verify your email before signing in. Check your inbox (and spam) for the verification link.");
      setLoading(btn, false);
      return;
    }
    redirectToHome();
  } catch (err) {
    showMsg(friendlyError(err.code));
    setLoading(btn, false);
    throw err;
  }
}

// ─── Email / Password Sign-Up  (signup.html) ─────────────────────────────────

export async function signUp(btnEl, extra = {}) {
  const btn = btnEl || document.getElementById("createBtn") || document.querySelector(".btn-primary") || document.querySelector("[onclick*='handleSignUp']");

  const firstName = document.getElementById("fnIn")?.value?.trim();
  const lastName  = document.getElementById("lnIn")?.value?.trim();
  const email     = document.getElementById("emailIn")?.value?.trim();
  const password  = document.getElementById("pwdIn")?.value;
  const terms     = document.getElementById("terms")?.checked;

  if (!firstName || !email || !password) {
    showMsg("Please fill in all required fields.");
    return;
  }
  if (!terms) {
    showMsg("Please accept the Terms of Service to continue.");
    return;
  }
  if (password.length < 8) {
    showMsg("Password must be at least 8 characters.");
    return;
  }

  setLoading(btn, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = `${firstName} ${lastName}`.trim();
    await updateProfile(cred.user, { displayName });
    await ensureUserDoc(cred.user, { displayName, exam: extra.goal || "" });
    await sendEmailVerification(cred.user);
    window.location.href = "verify-email.html";
  } catch (err) {
    showMsg(friendlyError(err.code));
    setLoading(btn, false);
    throw err;
  }
}

// ─── Forgot Password ─────────────────────────────────────────────────────────

export async function forgotPassword() {
  const email = document.querySelector('input[type="email"]')?.value?.trim();
  if (!email) {
    showMsg("Enter your email address first.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("Reset link sent! Check your inbox.", false);
  } catch (err) {
    showMsg(friendlyError(err.code));
  }
}

// ─── Resend Email Verification ────────────────────────────────────────────────

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) {
    showMsg("You must be signed in to resend verification.");
    return;
  }
  try {
    await sendEmailVerification(user);
    showMsg("Verification email sent! Check your inbox.", false);
  } catch (err) {
    showMsg(friendlyError(err.code));
  }
}

// ─── Check Email Verification & Reload User ──────────────────────────────────

export async function checkEmailVerified() {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    await reload(user);
    return user.emailVerified;
  } catch {
    return false;
  }
}

// ─── Auth State: redirect away from auth pages if already signed in ──────────

if (!auth) {
  console.error("Firebase Auth not available. Auth pages will not function.");
} else {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (user.emailVerified) redirectToHome();
    }
  });
}

// ─── Error code → human message ──────────────────────────────────────────────

function friendlyError(code) {
  const map = {
    "auth/invalid-email":            "Invalid email address.",
    "auth/user-not-found":           "No account found with this email.",
    "auth/wrong-password":           "Incorrect password. Try again.",
    "auth/email-already-in-use":     "An account with this email already exists.",
    "auth/weak-password":            "Password is too weak (min 8 chars).",
    "auth/popup-closed-by-user":     "Google sign-in cancelled.",
    "auth/network-request-failed":   "Network error. Check your connection.",
    "auth/too-many-requests":        "Too many attempts. Try again later.",
    "auth/invalid-credential":       "Invalid credentials. Check email & password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}
