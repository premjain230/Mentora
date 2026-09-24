/**
 * Learning Allied Learning — UserLearningProfile service (Prompt 1 foundation)
 * Additive: reads/writes users/{uid}/learning/profile via existing Firestore rules.
 * Coexists with legacy fields on users/{uid} root doc.
 */

import { LEARNING_SCHEMA_VERSION, ONBOARDING_VERSION } from "./schema.js";
import { createUserLearningProfile } from "./contracts.js";

function profileRef(db, uid) {
  // Existing path used by modules/memory-system.js — no new rule needed.
  // firestore.rules: match /users/{userId}/learning/{doc} { allow read, write: if isOwner }
  const { doc } = window.__aquilaFirestore || {};
  if (doc && db) return doc(db, "users", uid, "learning", "profile");
  return null;
}

/**
 * Load the learning profile for uid. Returns a normalised profile shape.
 * TODO Prompt 2: handle migration when stored version < LEARNING_SCHEMA_VERSION
 */
export async function loadLearningProfile(db, uid) {
  if (!db || !uid) return createUserLearningProfile(uid);
  try {
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = (await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")).doc(db, "users", uid, "learning", "profile");
    const snap = await getDoc(ref);
    if (!snap.exists()) return createUserLearningProfile(uid);
    const data = snap.data();
    // Additive version stamp if missing
    if (data.learningSchemaVersion !== LEARNING_SCHEMA_VERSION) {
      // TODO Prompt 2: migrate
    }
    return createUserLearningProfile(uid, { ...data });
  } catch (e) {
    console.warn("[learning-profile] load failed:", e);
    return createUserLearningProfile(uid);
  }
}

/**
 * Save the learning profile. Merge = true so legacy fields are preserved.
 * TODO Prompt 2: add server-side validation for exam/subjects/weakTopics lengths
 */
export async function saveLearningProfile(db, uid, profilePatch) {
  if (!db || !uid) return false;
  try {
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const ref = doc(db, "users", uid, "learning", "profile");
    await setDoc(ref, {
      ...profilePatch,
      learningSchemaVersion: LEARNING_SCHEMA_VERSION,
      onboardingVersion: ONBOARDING_VERSION,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("[learning-profile] save failed:", e);
    return false;
  }
}

export class LearningProfileService {
  constructor(db) { this.db = db; }
  load(uid) { return loadLearningProfile(this.db, uid); }
  save(uid, patch) { return saveLearningProfile(this.db, uid, patch); }
}
