/**
 * Learning Allied Learning — StudentModel service (Prompt 1 foundation)
 * Web equivalent of modules/student-model.js but versioned and scoped to the
 * new learning engine Firestore paths.
 */

import { LEARNING_SCHEMA_VERSION } from "./schema.js";
import { createStudentModel } from "./contracts.js";

// Firestore path: users/{uid}/learning/studentModel  (additive, single doc)
export async function loadStudentModel(db, uid) {
  if (!db || !uid) return createStudentModel(uid);
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(db, "users", uid, "learning", "studentModel");
    const snap = await getDoc(ref);
    if (!snap.exists()) return createStudentModel(uid);
    const data = snap.data();
    // TODO Prompt 4: migrate if data.learningSchemaVersion < LEARNING_SCHEMA_VERSION
    return createStudentModel(uid, { ...data });
  } catch (e) {
    console.warn("[student-model] load failed:", e);
    return createStudentModel(uid);
  }
}

export async function saveStudentModel(db, uid, modelPatch) {
  if (!db || !uid) return false;
  try {
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(db, "users", uid, "learning", "studentModel");
    await setDoc(ref, {
      ...modelPatch,
      learningSchemaVersion: LEARNING_SCHEMA_VERSION,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("[student-model] save failed:", e);
    return false;
  }
}

// Pure helpers — identical algorithm on Android (see lib/learning/student_model.dart)
export function getWeakestConcepts(studentModel, limit = 5) {
  const entries = Object.entries(studentModel?.conceptMastery || {});
  return entries
    .sort(([, a], [, b]) => (Number(a) || 0) - (Number(b) || 0))
    .slice(0, limit)
    .map(([conceptId, mastery]) => ({ conceptId, mastery: Number(mastery) || 0 }));
}

export function getAverageMastery(studentModel) {
  const vals = Object.values(studentModel?.conceptMastery || {});
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + (Number(b) || 0), 0) / vals.length;
}

export class StudentModelService {
  constructor(db) { this.db = db; }
  load(uid) { return loadStudentModel(this.db, uid); }
  save(uid, patch) { return saveStudentModel(this.db, uid, patch); }
}
