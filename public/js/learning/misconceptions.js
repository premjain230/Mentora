/**
 * Learning Allied Learning — Misconception Model (Prompt 2)
 * Distinguishes "does not know" vs "believes something incorrect".
 */

import { createMisconception } from "./contracts.js";

export async function detectMisconception(db, uid, conceptId, text, evidenceRef = null) {
  if (!db || !uid || !conceptId || !text) return null;
  const trimmed = String(text).slice(0, 300).trim();
  if (!trimmed) return null;
  try {
    const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    // naive dedup: if same concept+text exists unresolved, bump lastDetected + confidence
    // For Prompt 2 we create a new doc; dedup moves to server in Prompt 5.
    const ref = doc(collection(db, "users", uid, "misconceptions"));
    const m = createMisconception(uid, conceptId, { misconception: trimmed, evidence: evidenceRef ? [evidenceRef] : [], firstDetected: new Date().toISOString(), lastDetected: new Date().toISOString() });
    await setDoc(ref, { ...m, misconceptionId: ref.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { ...m, misconceptionId: ref.id };
  } catch (e) {
    console.warn("[misconception] detect failed:", e);
    return null;
  }
}

export async function resolveMisconception(db, uid, misconceptionId, resolutionEvidence = null) {
  if (!db || !uid || !misconceptionId) return false;
  try {
    const { doc, updateDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await updateDoc(doc(db, "users", uid, "misconceptions", misconceptionId), {
      resolved: true,
      resolvedAt: serverTimestamp(),
      resolutionEvidence: resolutionEvidence || null,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn("[misconception] resolve failed:", e);
    return false;
  }
}

export async function listActiveMisconceptions(db, uid, limitCount = 20) {
  if (!db || !uid) return [];
  try {
    const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(db, "users", uid, "misconceptions"), where("resolved", "==", false), orderBy("lastDetected", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("[misconception] list failed:", e);
    // fallback: unfiltered query then filter client-side (no index)
    try {
      const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const snap2 = await getDocs(collection(db, "users", uid, "misconceptions"));
      return snap2.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !m.resolved).slice(0, limitCount);
    } catch { return []; }
  }
}

export function calibrationLabel(masteryScore, confidenceScore) {
  if (typeof masteryScore !== "number" || typeof confidenceScore !== "number") return null;
  const gap = Math.abs(masteryScore - confidenceScore);
  if (gap < 0.25) return "calibrated";
  return confidenceScore > masteryScore ? "overconfident" : "underconfident";
}
