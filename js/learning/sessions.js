/**
 * Aquila Learning — Learning Sessions (Prompt 1 foundation)
 * Unified session model co-existing with existing users/{uid}/studySessions.
 * New path: users/{uid}/sessions/{sessionId}
 */

import { SessionStatus, SessionType } from "./schema.js";
import { createLearningSession, validateLearningSession } from "./contracts.js";

export function validateSessionPayload(payload) {
  return validateLearningSession(payload);
}

export class SessionService {
  constructor(db) { this.db = db; }

  async create(uid, payload) {
    const errors = validateSessionPayload(payload);
    if (errors.length) throw new Error(errors.join("; "));
    if (!this.db) throw new Error("Firestore not available");
    const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(collection(this.db, "users", uid, "sessions"));
    const session = createLearningSession(uid, { sessionId: ref.id, ...payload, status: SessionStatus.ACTIVE });
    await setDoc(ref, { ...session, startedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return session;
  }

  async complete(uid, sessionId, timeFocusedSeconds) {
    if (!this.db || !uid || !sessionId) return false;
    try {
      const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      await updateDoc(doc(this.db, "users", uid, "sessions", sessionId), {
        status: SessionStatus.COMPLETED,
        timeFocusedSeconds: Math.max(0, Number(timeFocusedSeconds) || 0),
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.warn("[sessions] complete failed:", e);
      return false;
    }
  }

  async list(uid, limitCount = 20) {
    if (!this.db || !uid) return [];
    try {
      const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const q = query(collection(this.db, "users", uid, "sessions"), orderBy("startedAt", "desc"), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("[sessions] list failed:", e);
      return [];
    }
  }
}
