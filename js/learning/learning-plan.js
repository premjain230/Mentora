/**
 * Aquila Learning — LearningPlan service (Prompt 1 foundation)
 * Coexists with existing studyPlans / tasks collections.
 * New path: users/{uid}/learningPlans/{planId}
 */

import { createLearningPlan } from "./contracts.js";

export class LearningPlanService {
  constructor(db) { this.db = db; }

  async getActive(uid) {
    if (!this.db || !uid) return null;
    try {
      const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const q = query(
        collection(this.db, "learningPlans"),
        where("uid", "==", uid),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      return snap.empty ? null : snap.docs[0].data();
    } catch (e) {
      console.warn("[learning-plan] getActive failed:", e);
      return null;
    }
  }

  async create(uid, payload) {
    if (!this.db || !uid) throw new Error("Firestore not available");
    const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(collection(this.db, "learningPlans"));
    const plan = createLearningPlan(uid, { planId: ref.id, ...payload });
    await setDoc(ref, { ...plan, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return plan;
  }

  // TODO Prompt 7: planning algorithm + /api/learning-plan (server-owned)
}
