// Learning Allied Integration — bridges onboarding memory + learning profile into chat
import { auth, db } from "./firebase-config.js";

let _cachedProfile = null;
let _cachedUid = null;

export async function initializeModules(uid) {
  if (!uid) return;
  _cachedUid = uid;
  try {
    const { loadLearningProfile } = await import("./js/learning/learning-profile.js");
    if (db) {
      const p = await loadLearningProfile(db, uid);
      _cachedProfile = p || null;
    }
  } catch (e) {
    console.warn("[aquila-integration] init failed", e?.message);
  }
  // Also try to enrich from users/{uid} and users/{uid}/learning/profile directly (fallback)
  if (!_cachedProfile || !_cachedProfile.studentName) {
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const ref = doc(db, "users", uid, "learning", "profile");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        _cachedProfile = { ...(_cachedProfile || {}), ...d };
      }
      // fallback to root users doc for onboarding
      const rootRef = doc(db, "users", uid);
      const rootSnap = await getDoc(rootRef);
      if (rootSnap.exists()) {
        const r = rootSnap.data();
        if (r.studentName || r.name || r.examType) {
          _cachedProfile = {
            ...(_cachedProfile || {}),
            studentName: _cachedProfile?.studentName || r.studentName || r.name || "",
            examType: _cachedProfile?.examType || r.examType || "",
            targetScore: _cachedProfile?.targetScore || r.targetScore || "",
            subjects: _cachedProfile?.subjects || r.subjects || [],
            weakTopics: _cachedProfile?.weakTopics || r.weakTopics || [],
            dailyHours: _cachedProfile?.dailyHours || r.dailyHours || null,
            startDate: _cachedProfile?.startDate || r.startDate || "",
            examDate: _cachedProfile?.examDate || r.examDate || "",
          };
        }
      }
    } catch {}
  }
}

export function buildEnhancedSystemPrompt() {
  const p = _cachedProfile;
  if (!p) return "";
  const parts = [];
  const hasOnboarding = p.studentName || p.examType || (p.subjects && p.subjects.length);
  if (hasOnboarding) {
    parts.push("=== STUDENT ONBOARDING MEMORY (persisted from planner-onboarding.html) ===");
    if (p.studentName) parts.push("Student name: " + p.studentName);
    if (p.examType) parts.push("Target exam: " + p.examType + (p.targetScore ? " (Goal: " + p.targetScore + ")" : ""));
    if (p.subjects && p.subjects.length) parts.push("Subjects: " + p.subjects.join(", "));
    if (p.weakTopics && p.weakTopics.length) parts.push("Weak topics to prioritise: " + p.weakTopics.join(", "));
    if (p.dailyHours) parts.push("Daily study hours: " + p.dailyHours + " hrs/day");
    if (p.startDate) parts.push("Plan start date: " + p.startDate);
    if (p.examDate) parts.push("Exam date: " + p.examDate);
    parts.push("Use this to personalise every answer — adapt examples, depth, and exam-specific tips to this student's goal. Address them by name when natural.");
  }
  // also surface mastery hints if present
  if (p.conceptMastery && typeof p.conceptMastery === "object" && Object.keys(p.conceptMastery).length) {
    const weak = Object.entries(p.conceptMastery).sort(([,a],[,b]) => (Number(a)||0)-(Number(b)||0)).slice(0,3);
    if (weak.length) parts.push("Weak areas (low mastery): " + weak.map(([id,m])=> `${id} (${Math.round((Number(m)||0)*100)}%)`).join(", "));
  }
  return parts.length ? "\n\nStudent Context:\n" + parts.join("\n") : "";
}

export function getStudentProfile() {
  return _cachedProfile || { conceptMastery: {} };
}

export function getCurrentSession() {
  return {};
}

export function recordInteraction() {
  // No-op — real evidence is recorded via emitLearningEvent; keep for chat.js compat
}

export function getOnboardingContext() {
  if (!_cachedProfile) return null;
  return {
    studentName: _cachedProfile.studentName || "",
    examType: _cachedProfile.examType || "",
    targetScore: _cachedProfile.targetScore || "",
    subjects: _cachedProfile.subjects || [],
    weakTopics: _cachedProfile.weakTopics || [],
    dailyHours: _cachedProfile.dailyHours || null,
    startDate: _cachedProfile.startDate || "",
    examDate: _cachedProfile.examDate || "",
  };
}
