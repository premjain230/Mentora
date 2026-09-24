/**
 * Learning Allied Learning — Mastery Engine (Prompt 1 foundation)
 * Defines the single mastery calculation contract. Full spaced-repetition
 * algorithm is Prompt 5. No client may implement a divergent formula.
 */

import { masteryStateFromScore, clamp01 } from "./schema.js";
import { createMastery } from "./contracts.js";

/**
 * Pure: derive masteryState from masteryScore.
 * Both Web + Android must call this — no bespoke thresholds.
 */
export function deriveMasteryState(score) {
  return masteryStateFromScore(score);
}

/**
 * Stub for the future server-authoritative update.
 * Prompt 5: move increment logic to a trusted Cloud Function / API route so
 * clients cannot forge mastery by writing arbitrary scores.
 *
 * For now this is a placeholder that validates and normalises.
 * @returns {{ mastery: import('./contracts.js').Mastery, errors: string[] }}
 */
export function applyMasteryDelta(existingMastery, delta) {
  // TODO Prompt 5: implement SM-2 / FSRS delta; currently identity transform
  const base = existingMastery || createMastery("", "");
  const nextScore = clamp01((Number(base.masteryScore) || 0) + (Number(delta?.scoreDelta) || 0));
  const next = {
    ...base,
    masteryScore: nextScore,
    masteryState: deriveMasteryState(nextScore),
    updatedAt: new Date().toISOString(),
  };
  return { mastery: next, errors: [] };
}

export class MasteryService {
  constructor(db) { this.db = db; }

  /** Load all mastery docs for a user. TODO Prompt 5: paginate */
  async list(uid) {
    if (!this.db || !uid) return [];
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      // NEW path — requires firestore.rules addition (documented, not yet enforced)
      // users/{uid}/mastery/{conceptId}
      const snap = await getDocs(collection(this.db, "users", uid, "mastery"));
      return snap.docs.map((d) => d.data());
    } catch (e) {
      console.warn("[mastery] list failed:", e);
      return [];
    }
  }

  /** Load single mastery. */
  async get(uid, conceptId) {
    if (!this.db || !uid || !conceptId) return null;
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap = await getDoc(doc(this.db, "users", uid, "mastery", conceptId));
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn("[mastery] get failed:", e);
      return null;
    }
  }

  // TODO Prompt 5: write via /api/mastery (server-authoritative) instead of direct Firestore
  async save(uid, mastery) {
    if (!this.db || !uid || !mastery?.conceptId) return false;
    try {
      const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await setDoc(doc(this.db, "users", uid, "mastery", mastery.conceptId), {
        ...mastery,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("[mastery] save failed:", e);
      return false;
    }
  }
}
