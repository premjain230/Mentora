/**
 * Learning Allied Learning — Evidence Architecture (Prompt 2)
 * LearningEvent emit → validation → append to users/{uid}/learningEvents
 * Client optimistic; server will be authoritative in Prompt 5.
 */

import { createLearningEvent, validateLearningEvent } from "./contracts.js";

export function validateEventPayload(event) {
  return validateLearningEvent(event);
}

async function authHeaders() {
  try {
    const { auth } = await import("../../firebase-config.js");
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    }
  } catch {}
  return { "Content-Type": "application/json" };
}

/**
 * Emit a learning event — server-authoritative via POST /api/learning-event.
 * Idempotent via eventId. Falls back to direct write only if API unreachable (offline).
 */
export async function emitLearningEvent(db, uid, type, fields = {}) {
  const event = createLearningEvent(uid, { type, ...fields });
  const errors = validateLearningEvent(event);
  if (errors.length) throw new Error(errors.join("; "));
  if (!db || !uid) return event;
  // Prefer server endpoint
  const body = {
    eventId: event.eventId,
    type: event.type,
    conceptId: event.conceptId,
    subject: event.subject,
    topic: event.topic,
    source: event.source ?? fields.source ?? null,
    sessionId: event.sessionId ?? fields.sessionId ?? null,
    questionId: event.questionId ?? fields.questionId ?? null,
    payload: event.payload,
    confidence: event.confidence,
  };
  // strip null eventId? keep for idempotency
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/learning-event", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ...event, eventId: data.eventId || event.eventId, deduped: data.deduped || false };
    }
    if (res.status === 401 || res.status === 403) throw new Error(`auth ${res.status}`);
    // validation error — surface
    if (res.status === 400) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `validation ${res.status}`);
    }
    throw new Error(`api ${res.status}`);
  } catch (e) {
    // Fallback only for network/offline — still validates client-side, but mastery will be reconciled on next server write
    console.warn("[evidence] api emit failed, fallback direct:", e.message || e);
    try {
      const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const ref = doc(collection(db, "users", uid, "learningEvents"), event.eventId);
      const toWrite = { ...event, eventId: ref.id, createdAt: serverTimestamp() };
      await setDoc(ref, toWrite);
      return { ...event, eventId: ref.id };
    } catch (fallbackErr) {
      console.warn("[evidence] fallback failed:", fallbackErr);
      return event;
    }
  }
}

/**
 * Stub aggregator — increments counts; full Bayesian/FSRS in Prompt 5.
 * Kept pure so Android can mirror exactly.
 */
export function aggregateEvidenceStub(mastery, event) {
  const m = mastery ? { ...mastery } : null;
  if (!m) return null;
  const correct = event.type === "question_correct" || event.type === "diagnostic_answered" && event.payload?.correct === true;
  const answered = event.type === "question_correct" || event.type === "question_incorrect" || event.type === "question_answered" || event.type === "diagnostic_answered";
  if (answered) {
    m.attempts = (Number(m.attempts) || 0) + 1;
    if (correct) m.correct = (Number(m.correct) || 0) + 1;
    m.accuracy = m.attempts ? m.correct / m.attempts : 0;
    // keep evidence window bounded
    const ref = { eventId: event.eventId, type: event.type, at: event.createdAt };
    m.evidence = [ref, ...(Array.isArray(m.evidence) ? m.evidence : [])].slice(0, 20);
  }
  if (event.confidence != null) {
    // normalize 1..5 → 0..1
    m.confidenceScore = (Number(event.confidence) - 1) / 4;
    m.lastConfidenceAt = event.createdAt;
  }
  return m;
}

export async function listRecentEvents(db, uid, limitCount = 20) {
  if (!db || !uid) return [];
  try {
    const { collection, query, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(db, "users", uid, "learningEvents"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("[evidence] list failed:", e);
    return [];
  }
}
