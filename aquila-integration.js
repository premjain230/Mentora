import { auth, db } from "./firebase-config.js";
import { loadProfile, saveProfile } from "./modules/memory-system.js";
import { createProfile, getWeakestConcepts, getSessionSummary } from "./modules/student-model.js";

let currentProfile = null;
let currentSession = null;

export async function initializeModules(uid) {
  if (!uid) return;
  var profile = await loadProfile(uid);
  if (!profile) {
    profile = createProfile(uid);
    await saveProfile(uid, profile);
  }
  currentProfile = profile;
  currentSession = { interactions: 0, mistakes: 0, startTime: Date.now() };
}

export function getStudentProfile() {
  return currentProfile;
}

export function getCurrentSession() {
  return currentSession || { interactions: 0, mistakes: 0, startTime: Date.now() };
}

export function buildEnhancedSystemPrompt() {
  if (!currentProfile) return "";
  var weakConcepts = getWeakestConcepts(currentProfile, 5);
  var summary = getSessionSummary(currentProfile);
  var parts = [];
  if (weakConcepts.length > 0) {
    parts.push("Weak areas: " + weakConcepts.map(function(c) { return c.conceptId; }).join(", "));
  }
  if (summary.averageMastery > 0) {
    parts.push("Avg mastery: " + summary.averageMastery + "%");
  }
  if (summary.conceptsLearned > 0) {
    parts.push("Concepts learned: " + summary.conceptsLearned);
  }
  return parts.length > 0 ? "\n\nStudent Context:\n" + parts.join("\n") : "";
}

export function recordInteraction(data) {
  if (!currentProfile || !currentSession) return;
  currentProfile.totalInteractions++;
  currentSession.interactions++;
  if (!data.correct) currentSession.mistakes++;
}
