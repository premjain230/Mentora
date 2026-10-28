/**
 * Learning Allied Learning — Recommendation Engine (Prompt 1 foundation)
 * Prompt 6 will implement the ranking algorithm. This file defines the
 * interface and shared priority rules.
 */

import { createRecommendation } from "./contracts.js";

export const RECOMMENDATION_RULES = Object.freeze({
  // Single source of truth for ranking weights — Android must mirror.
  // Prompt 6: tune these.
  weights: {
    forgettingRisk: 0.45,
    lowMastery: 0.35,
    examProximity: 0.12,
    streak: 0.08,
  },
  caps: {
    maxDailyRecommendations: 5,
    maxReviewPerDay: 10,
  },
});

/**
 * Build a recommendation placeholder.
 * TODO Prompt 6: implement getNextActions(studentModel, masteryMap, reviewMap)
 */
export function buildRecommendationStub(overrides = {}) {
  return createRecommendation(overrides);
}

export class RecommendationService {
  constructor(db) { this.db = db; }

  /** Load current recommendations doc */
  async getCurrent(uid) {
    if (!this.db || !uid) return null;
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await getDoc(doc(this.db, "users", uid, "recommendations", "current"));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn("[recommendations] get failed:", e);
      return null;
    }
  }

  /** Persist recommendations — server will own generation in Prompt 6 */
  async saveCurrent(uid, payload) {
    if (!this.db || !uid) return false;
    try {
      const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await setDoc(doc(this.db, "users", uid, "recommendations", "current"), {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("[recommendations] save failed:", e);
      return false;
    }
  }
}
