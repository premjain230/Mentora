// ── subscription.js ──
// Handles: plan reads/writes, daily usage tracking, reset logic.
// Imported by: subscription.html, limits.js, chat.js, planner.js

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { track } from "./modules/track.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const PLANS = {
  free: {
    label: "Free",
    chatLimit: 20,
    analysisLimit: 20,
    plannerMinutes: 30,
  },
  pro: {
    label: "Learning Allied Pro",
    chatLimit: Infinity,
    analysisLimit: Infinity,
    plannerMinutes: Infinity,
  },
};

// ─── Get today's date string (YYYY-MM-DD) ────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Ensure usage doc exists with correct shape ──────────────────────────────
// NOTE: The usage doc is now READ-ONLY for browsers (see firestore.rules).
// /api/groq-proxy owns the counters via the Admin SDK, so limits cannot be
// reset from the client. This function only reads and returns a zeroed shape.

async function ensureUsageDoc(uid) {
  if (!db) return { date: todayStr(), dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  const ref = doc(db, "usage", uid);
  const today = todayStr();

  let snap;
  try {
    snap = await getDoc(ref);
  } catch {
    return { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  }

  if (!snap.exists()) {
    return { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  }

  const data = snap.data();

  // Server rolls over the count when the date changes; surface zeros for a stale date.
  if (data.date !== today) {
    return { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  }

  return data;
}

// ─── Robust plan detection (fixes: "Pro" vs "pro", legacy flags, referral proDays, expiry) ──
function normalizePlan(raw) {
  const p = String(raw || "").trim().toLowerCase();
  if (p === "pro" || p === "premium" || p === "paid" || p === "unlimited" || p === "lifetime") return "pro";
  return "free";
}

/** Check if any subscription expiry date attached to the user has passed. */
function isSubscriptionExpired(data) {
  if (!data) return false;
  const expiresAt = data.subscriptionExpiresAt || data.proExpiresAt || data.proUntil || data.referralRewards?.proExpiresAt;
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  // Expired if valid date and in the past
  return !isNaN(exp.getTime()) && exp.getTime() <= Date.now();
}

export function isProUserData(data) {
  if (!data) return false;

  // 1. If explicit expiry date is in the past, user has expired (fall back to free)
  if (isSubscriptionExpired(data)) {
    return false;
  }

  // NOTE: role/isAdmin fields are profile data, not proof of entitlement.
  // Admin Pro access comes from verified custom claims in getUserPlan().

  // 2. Plan string matches
  if (normalizePlan(data.plan) === "pro") return true;
  if (normalizePlan(data.tier) === "pro" || normalizePlan(data.subscriptionTier) === "pro") return true;

  // 4. Boolean Pro flags
  if (data.isPro === true || data.pro === true || data.isPremium === true) return true;

  // 5. Subscription status
  if (data.subscriptionStatus === "active" || data.subscriptionStatus === "pro") return true;
  if (data.subscription?.status === "active" || normalizePlan(data.subscription?.plan) === "pro") return true;

  // 6. Referral-earned pro days (require an explicit, still-valid expiry)
  const proDays = Number(data.referralRewards?.proDays) || 0;
  const proExpiresAt = data.referralRewards?.proExpiresAt || data.proExpiresAt || data.subscriptionExpiresAt || data.proUntil;
  if (proDays > 0 && proExpiresAt) {
    const exp = new Date(proExpiresAt);
    if (!isNaN(exp.getTime()) && exp.getTime() > Date.now()) return true;
  }

  // 7. Active until future date
  if (proExpiresAt) {
    const exp = new Date(proExpiresAt);
    if (!isNaN(exp.getTime()) && exp.getTime() > Date.now()) return true;
  }

  return false;
}

// ─── Get user plan ────────────────────────────────────────────────────────────

/** Claims are authoritative only while their attached expiry (if any) is valid. */
function claimsGrantPro(claims) {
  if (!claims) return false;
  if (claims.admin === true || claims.role === "admin") return true;
  if (claims.pro !== true) return false;
  const expiry = claims.proExpiresAt || claims.proUntil || claims.subscriptionExpiresAt;
  if (!expiry) return true; // lifetime claim
  const exp = new Date(expiry);
  return !isNaN(exp.getTime()) && exp.getTime() > Date.now();
}

export async function getUserPlan(uid, user = null) {
  // 1. First check Firebase Auth custom claims if user object is available (fastest, authoritative)
  const u = user || auth?.currentUser;
  if (u && typeof u.getIdTokenResult === "function") {
    try {
      const tokenResult = await u.getIdTokenResult();
      if (claimsGrantPro(tokenResult?.claims)) {
        return "pro";
      }
    } catch {}
  }

  if (!db) return "free";

  // Server-owned entitlement record wins when present, so a revocation can
  // never be undone by stale legacy user-document fields.
  try {
    const entSnap = await getDoc(doc(db, "entitlements", uid));
    if (entSnap.exists()) {
      return isProUserData(entSnap.data()) ? "pro" : "free";
    }
  } catch (err) {
    console.warn("[getUserPlan] entitlement read failed:", err);
  }

  const ref = doc(db, "users", uid);
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    console.warn("[getUserPlan] getDoc failed:", err);
    return "free";
  }

  if (!snap.exists()) {
    // Auto-create user doc if missing (fallback for sign-up failures)
    const data = {
      uid,
      email: u?.email || "",
      displayName: u?.displayName || "",
      photoURL: u?.photoURL || "",
      exam: "",
      createdAt: serverTimestamp(),
      plan: "free",
    };
    await setDoc(ref, data).catch(() => {});
    return "free";
  }

  const data = snap.data();
  if (isProUserData(data)) return "pro";
  return normalizePlan(data.plan) || "free";
}

// ─── Get full usage snapshot ──────────────────────────────────────────────────

export async function getUsage(uid) {
  return await ensureUsageDoc(uid);
}

// ─── Increment a usage counter ────────────────────────────────────────────────
// type: "chat" | "analysis" | "planner"
// For planner, pass minutes (number). For chat/analysis, pass 1.
//
// NOTE: This is intentionally a no-op now. Usage counters are owned by the
// server (/api/groq-proxy enforces + increments via the Admin SDK); browsers
// cannot write to the usage doc (firestore.rules deny). Keeping the function
// avoids ripping out call sites while preserving read-only semantics.

export async function incrementUsage(uid, type, amount = 1) {
  void uid;
  void type;
  void amount;
  return;
}

// ─── Check if user can perform action ────────────────────────────────────────
// Returns { allowed: bool, plan, usage, limit }

export async function checkLimit(uid, type) {
  const plan = await getUserPlan(uid, auth?.currentUser);
  const limits = PLANS[plan] || PLANS.free;
  const usage = await getUsage(uid);

  // Ensure numeric counts are safe (Firestore may return undefined)
  const chatUsed = Number(usage.dailyChatCount) || 0;
  const analysisUsed = Number(usage.dailyAnalysisCount) || 0;
  const plannerUsed = Number(usage.plannerUsageMinutes) || 0;

  const map = {
    chat: { used: chatUsed, limit: limits.chatLimit },
    analysis: { used: analysisUsed, limit: limits.analysisLimit },
    planner: { used: plannerUsed, limit: limits.plannerMinutes },
  };

  const { used, limit } = map[type] || { used: 0, limit: Infinity };
  return {
    allowed: limit === Infinity || used < limit,
    plan,
    used: Number(used) || 0,
    limit,
    type,
  };
}

// ─── Get referral bonus from user doc ────────────────────────────────────────

export async function getReferralBonus(uid) {
  if (!db) return { bonusChats: 0, proDays: 0, premiumQuizDays: 0 };
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { bonusChats: 0, proDays: 0, premiumQuizDays: 0 };
  const data = snap.data();
  return {
    bonusChats: data.referralRewards?.bonusChats || 0,
    proDays: data.referralRewards?.proDays || 0,
    premiumQuizDays: data.referralRewards?.premiumQuizDays || 0,
  };
}

// ─── Augment checkLimit with referral bonuses ────────────────────────────────

export async function checkLimitWithBonus(uid, type) {
  const result = await checkLimit(uid, type);
  if (type !== "chat") return result;
  const bonus = await getReferralBonus(uid);
  if (bonus.bonusChats <= 0) return result;
  return {
    ...result,
    limit: result.limit === Infinity ? Infinity : result.limit + bonus.bonusChats,
    allowed: result.limit === Infinity || result.used < result.limit + bonus.bonusChats,
  };
}

// ─── Auth-aware wrapper: get current user's plan + usage ─────────────────────

export function onUserReady(callback) {
  if (!auth) { console.warn("Auth not available for onUserReady"); return; }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const plan = await getUserPlan(user.uid);
    const usage = await getUsage(user.uid);
    callback({ user, plan, usage });
  });
}
// ─── Request Pro Access (writes intent to Firestore) ─────────────────────────

export async function requestProAccess(uid, email) {
  if (!db) return;
  track("subscription_started", {});
  const ref = doc(db, "proRequests", uid);
  await setDoc(ref, {
    uid,
    email,
    requestedAt: serverTimestamp(),
    status: "pending",
  });
}
