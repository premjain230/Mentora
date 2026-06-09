// firebase/planner-db.js
// All Firestore read/write operations for the Study Planner feature.
// Import { auth, db } from this same firebase/ directory.
// Uses Firebase 10.x modular SDK — matches existing firebase-config.js.

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

// ── Guard: ensure the caller is authenticated ────────────────
function requireAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");
  return user;
}

// ── Sanitise a plain string (XSS prevention before Firestore) ─
function clean(str, max = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

// ══════════════════════════════════════════════════════════════
// USER PROFILE
// ══════════════════════════════════════════════════════════════

/**
 * Save or update the student's exam profile.
 * Stored at users/{uid} — merged so existing fields are preserved.
 */
export async function saveExamProfile(profile) {
  const user = requireAuth();

  const safe = {
    uid: user.uid,
    name: clean(profile.name, 100),
    examType: profile.examType, // validated server-side on plan generation
    targetScore: clean(profile.targetScore || "", 100),
    subjects: (profile.subjects || []).slice(0, 10).map((s) => clean(s, 80)),
    dailyHours: Math.min(18, Math.max(1, Number(profile.dailyHours) || 4)),
    startDate: profile.startDate,
    examDate: profile.examDate,
    weakTopics: (profile.weakTopics || []).slice(0, 20).map((t) => clean(t, 80)),
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), safe, { merge: true });
  return safe;
}

/**
 * Load the student's exam profile.
 */
export async function getExamProfile() {
  const user = requireAuth();
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? snap.data() : null;
}

// ══════════════════════════════════════════════════════════════
// STUDY PLANS
// ══════════════════════════════════════════════════════════════

/**
 * Save an AI-generated plan returned by /api/generate-plan.
 * The raw plan JSON is stored alongside metadata.
 */
export async function saveStudyPlan(planData) {
  const user = requireAuth();
  const planRef = doc(collection(db, "studyPlans"));

  const record = {
    planId: planRef.id,
    userId: user.uid,
    title: clean(planData.planTitle || "My Study Plan", 200),
    examType: planData.examType,
    summary: clean(planData.summary || "", 500),
    daysUntilExam: planData.daysUntilExam || 0,
    weeklyPlan: planData.weeklyPlan || [],
    subjectAllocation: planData.subjectAllocation || {},
    revisionSchedule: planData.revisionSchedule || {},
    milestones: planData.milestones || [],
    status: "active", // active | completed | archived
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(planRef, record);
  return record;
}

/**
 * Get the user's most recent active plan.
 */
export async function getActivePlan() {
  const user = requireAuth();
  const q = query(
    collection(db, "studyPlans"),
    where("userId", "==", user.uid),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

/**
 * Archive a plan (soft-delete).
 */
export async function archivePlan(planId) {
  const user = requireAuth();
  const ref = doc(db, "studyPlans", planId);
  const snap = await getDoc(ref);

  if (!snap.exists() || snap.data().userId !== user.uid) {
    throw new Error("Plan not found.");
  }

  await updateDoc(ref, { status: "archived", updatedAt: serverTimestamp() });
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════

/**
 * Bulk-create tasks from a generated weekly plan.
 * Uses a batch write — all or nothing.
 */
export async function createTasksFromPlan(planId, weeklyPlan) {
  const user = requireAuth();
  const batch = writeBatch(db);
  const tasks = [];

  for (const week of weeklyPlan) {
    for (const day of week.days || []) {
      for (const session of day.sessions || []) {
        const ref = doc(collection(db, "tasks"));
        const task = {
          taskId: ref.id,
          planId,
          userId: user.uid,
          week: week.week,
          day: clean(day.day, 20),
          subject: clean(session.subject, 100),
          topic: clean(session.topic, 200),
          durationMinutes: Math.min(480, Math.max(5, Number(session.durationMinutes) || 60)),
          type: ["learn", "revise", "practice", "test"].includes(session.type)
            ? session.type
            : "learn",
          priority: ["high", "medium", "low"].includes(session.priority)
            ? session.priority
            : "medium",
          status: "pending", // pending | completed | skipped | rescheduled
          scheduledDate: day.date || null,
          completedAt: null,
          createdAt: serverTimestamp(),
        };
        batch.set(ref, task);
        tasks.push(task);
      }
    }
  }

  await batch.commit();
  return tasks;
}

/**
 * Get all tasks for a plan, ordered by week then creation.
 */
export async function getTasksByPlan(planId) {
  const user = requireAuth();
  const q = query(
    collection(db, "tasks"),
    where("userId", "==", user.uid),
    where("planId", "==", planId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Get today's pending tasks.
 */
export async function getTodaysTasks(planId) {
  const user = requireAuth();
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "tasks"),
    where("userId", "==", user.uid),
    where("planId", "==", planId),
    where("scheduledDate", "==", today),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Update task status: complete / skip / reschedule.
 */
export async function updateTaskStatus(taskId, status, newDate = null) {
  const user = requireAuth();

  const validStatuses = ["completed", "skipped", "rescheduled", "pending"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status.");

  const ref = doc(db, "tasks", taskId);
  const snap = await getDoc(ref);

  if (!snap.exists() || snap.data().userId !== user.uid) {
    throw new Error("Task not found.");
  }

  const update = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === "completed") update.completedAt = serverTimestamp();
  if (status === "rescheduled" && newDate) update.scheduledDate = newDate;

  await updateDoc(ref, update);

  // Update progress counters
  await _updateProgressCounters(user.uid, snap.data(), status);

  return { taskId, status };
}

// ══════════════════════════════════════════════════════════════
// PROGRESS  (written via client for non-sensitive stats)
// Sensitive stats like total XP should be backend-only.
// ══════════════════════════════════════════════════════════════

/**
 * Internal: update progress document when a task status changes.
 */
async function _updateProgressCounters(uid, task, newStatus) {
  const ref = doc(db, "progress", uid);

  const updates = { lastUpdated: serverTimestamp() };

  if (newStatus === "completed") {
    updates[`subjectHours.${task.subject}`] = increment(
      (task.durationMinutes || 60) / 60
    );
    updates.totalMinutesStudied = increment(task.durationMinutes || 60);
    updates.tasksCompleted = increment(1);
  }

  if (newStatus === "skipped") {
    updates.tasksSkipped = increment(1);
  }

  // Upsert — create if doesn't exist yet
  await setDoc(ref, updates, { merge: true });
}

/**
 * Get progress document for the current user.
 */
export async function getProgress() {
  const user = requireAuth();
  const snap = await getDoc(doc(db, "progress", user.uid));
  return snap.exists() ? snap.data() : { tasksCompleted: 0, totalMinutesStudied: 0, subjectHours: {} };
}

/**
 * Update study streak (call once per day when first task is completed).
 */
export async function updateStreak() {
  const user = requireAuth();
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const today = new Date().toISOString().split("T")[0];
  const lastStudied = data.lastStudiedDate || "";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = data.currentStreak || 0;

  if (lastStudied === today) return; // Already updated today
  if (lastStudied === yesterdayStr) {
    newStreak += 1;
  } else {
    newStreak = 1; // Streak broken
  }

  await setDoc(
    ref,
    {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, data.longestStreak || 0),
      lastStudiedDate: today,
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );

  return newStreak;
}

// ══════════════════════════════════════════════════════════════
// ANALYTICS  (immutable event log)
// ══════════════════════════════════════════════════════════════

/**
 * Log a planner event for analytics.
 * Events are immutable — no update/delete allowed (enforced by Firestore rules).
 */
export async function logEvent(type, metadata = {}) {
  const user = requireAuth();
  const ref = doc(collection(db, "analytics", user.uid, "events"));

  await setDoc(ref, {
    eventId: ref.id,
    type: clean(type, 50),
    timestamp: serverTimestamp(),
    metadata, // Keep shallow — no PII
  });
}
