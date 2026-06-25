// ── subscription.js ──
// Handles: plan reads/writes, daily usage tracking, reset logic.
// Imported by: subscription.html, limits.js, chat.js, analyze.js, planner.js

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const PLANS = {
  free: {
    label: "Free",
    chatLimit: 20,
    analysisLimit: 20,
    plannerMinutes: 30,
  },
  pro: {
    label: "Aquila Pro",
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

async function ensureUsageDoc(uid) {
  const ref = doc(db, "usage", uid);
  const snap = await getDoc(ref);
  const today = todayStr();

  if (!snap.exists()) {
    await setDoc(ref, {
      date: today,
      dailyChatCount: 0,
      dailyAnalysisCount: 0,
      plannerUsageMinutes: 0,
    });
    return { date: today, dailyChatCount: 0, dailyAnalysisCount: 0, plannerUsageMinutes: 0 };
  }

  const data = snap.data();

  // Reset if it's a new day
  if (data.date !== today) {
    const reset = {
      date: today,
      dailyChatCount: 0,
      dailyAnalysisCount: 0,
      plannerUsageMinutes: 0,
    };
    await setDoc(ref, reset);
    return reset;
  }

  return data;
}

// ─── Get user plan ────────────────────────────────────────────────────────────

export async function getUserPlan(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return "free";
  return snap.data().plan || "free";
}

// ─── Get full usage snapshot ──────────────────────────────────────────────────

export async function getUsage(uid) {
  return await ensureUsageDoc(uid);
}

// ─── Increment a usage counter ────────────────────────────────────────────────
// type: "chat" | "analysis" | "planner"
// For planner, pass minutes (number). For chat/analysis, pass 1.

export async function incrementUsage(uid, type, amount = 1) {
  const ref = doc(db, "usage", uid);
  await ensureUsageDoc(uid); // ensures reset if new day

  const fieldMap = {
    chat: "dailyChatCount",
    analysis: "dailyAnalysisCount",
    planner: "plannerUsageMinutes",
  };

  const field = fieldMap[type];
  if (!field) return;

  const snap = await getDoc(ref);
  const current = snap.data()?.[field] || 0;
  await updateDoc(ref, { [field]: current + amount });
}

// ─── Check if user can perform action ────────────────────────────────────────
// Returns { allowed: bool, plan, usage, limit }

export async function checkLimit(uid, type) {
  const plan = await getUserPlan(uid);
  const limits = PLANS[plan];
  const usage = await getUsage(uid);

  const map = {
    chat: { used: usage.dailyChatCount, limit: limits.chatLimit },
    analysis: { used: usage.dailyAnalysisCount, limit: limits.analysisLimit },
    planner: { used: usage.plannerUsageMinutes, limit: limits.plannerMinutes },
  };

  const { used, limit } = map[type] || { used: 0, limit: Infinity };
  return {
    allowed: limit === Infinity || used < limit,
    plan,
    used,
    limit,
    type,
  };
}

// ─── Auth-aware wrapper: get current user's plan + usage ─────────────────────

export function onUserReady(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const plan = await getUserPlan(user.uid);
    const usage = await getUsage(user.uid);
    callback({ user, plan, usage });
  });
}

// ─── Request Pro Access (writes intent to Firestore) ─────────────────────────

export async function requestProAccess(uid, email) {
  const ref = doc(db, "proRequests", uid);
  await setDoc(ref, {
    uid,
    email,
    requestedAt: serverTimestamp(),
    status: "pending",
  });
}
