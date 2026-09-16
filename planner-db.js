// firebase/planner-db.js
// All Firestore read/write operations for the Study Planner feature.

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

// ── Guard: ensure the caller is authenticated ────────────────
function requireAuth() {
  if (!auth) throw new Error("Firebase is not initialized.");
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in.");
  return user;
}

// ── Sanitise a plain string ───────────────────────────────────
function clean(str, max = 200) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

// ══════════════════════════════════════════════════════════════
// USER PROFILE
// ══════════════════════════════════════════════════════════════

export async function saveExamProfile(profile) {
  const user = requireAuth();

  const rawName = profile.studentName || profile.name || "";
  const safe = {
    uid: user.uid,
    name: clean(rawName, 100),
    studentName: clean(rawName, 100),
    examType: clean(profile.examType || "", 30),
    targetScore: clean(profile.targetScore || "", 100),
    subjects: (profile.subjects || []).slice(0, 10).map((s) => clean(s, 80)),
    dailyHours: Math.min(18, Math.max(1, Number(profile.dailyHours) || 4)),
    startDate: profile.startDate || "",
    examDate: profile.examDate || "",
    weakTopics: (profile.weakTopics || []).slice(0, 20).map((t) => clean(t, 80)),
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), safe, { merge: true });

  // ── Also persist to AI memory (learning/profile) so chat can recall onboarding ──
  try {
    const learningRef = doc(db, "users", user.uid, "learning", "profile");
    const snap = await getDoc(learningRef);
    const existing = snap.exists() ? snap.data() : {};
    const memoryPayload = {
      studentName: safe.studentName,
      examType: safe.examType,
      targetScore: safe.targetScore,
      subjects: safe.subjects,
      weakTopics: safe.weakTopics,
      dailyHours: safe.dailyHours,
      startDate: safe.startDate,
      examDate: safe.examDate,
      onboardingComplete: true,
      onboardingAt: serverTimestamp(),
      conceptMastery: existing.conceptMastery || {},
      confidence: existing.confidence || {},
      memoryStrength: existing.memoryStrength || {},
      learningVelocity: existing.learningVelocity || 0,
      preferredStyle: existing.preferredStyle || null,
      motivationIndicators: existing.motivationIndicators || [],
      learningGoals: safe.examType ? [safe.examType + " preparation"] : (existing.learningGoals || []),
      sessionCount: existing.sessionCount || 0,
      totalInteractions: existing.totalInteractions || 0,
      createdAt: existing.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(learningRef, memoryPayload, { merge: true });
  } catch (e) {
    console.warn("AI memory save failed (non-blocking):", e?.message || e);
  }

  return safe;
}

export async function getExamProfile() {
  const user = requireAuth();
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? snap.data() : null;
}

// ══════════════════════════════════════════════════════════════
// STUDY PLANS
// ══════════════════════════════════════════════════════════════

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
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(planRef, record);
  return record;
}

export async function getActivePlan() {
  const user = requireAuth();

  // Requires composite index: studyPlans → userId ASC, status ASC, createdAt DESC
  const q = query(
    collection(db, "studyPlans"),
    where("userId", "==", user.uid),
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function archivePlan(planId) {
  const user = requireAuth();
  const ref = doc(db, "studyPlans", planId);

  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().userId !== user.uid) {
    throw new Error("Plan not found.");
  }

  await updateDoc(ref, {
    status: "archived",
    updatedAt: serverTimestamp(),
  });
}

// ══════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════

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
          durationMinutes: Math.min(
            480,
            Math.max(5, Number(session.durationMinutes) || 60)
          ),
          type: ["learn", "revise", "practice", "test"].includes(session.type)
            ? session.type
            : "learn",
          priority: ["high", "medium", "low"].includes(session.priority)
            ? session.priority
            : "medium",
          status: "pending",
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

export async function getTasksByPlan(planId) {
  const user = requireAuth();

  // Requires composite index: tasks → userId ASC, planId ASC, createdAt ASC
  const q = query(
    collection(db, "tasks"),
    where("userId", "==", user.uid),
    where("planId", "==", planId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getTodaysTasks(planId) {
  const user = requireAuth();
  const today = new Date().toISOString().split("T")[0];

  // Requires composite index: tasks → userId ASC, planId ASC, scheduledDate ASC, createdAt ASC
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

export async function updateTaskStatus(taskId, status, newDate = null) {
  const user = requireAuth();

  const validStatuses = ["completed", "skipped", "rescheduled", "pending"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status.");
  }

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

  await _updateProgressCounters(user.uid, snap.data(), status);

  return { taskId, status };
}

// ══════════════════════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════════════════════

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

  await setDoc(ref, updates, { merge: true });
}

export async function getProgress() {
  const user = requireAuth();
  const snap = await getDoc(doc(db, "progress", user.uid));

  return snap.exists()
    ? snap.data()
    : { tasksCompleted: 0, totalMinutesStudied: 0, subjectHours: {} };
}

export async function updateStreak() {
  const user = requireAuth();
  const ref = doc(db, "progress", user.uid);
  const snap = await getDoc(ref);

  const data = snap.exists() ? snap.data() : {};

  const today = new Date().toISOString().split("T")[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = data.currentStreak || 0;

  if (data.lastStudiedDate === today) return newStreak;

  if (data.lastStudiedDate === yesterdayStr) newStreak += 1;
  else newStreak = 1;

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
// ANALYTICS
// ══════════════════════════════════════════════════════════════

export async function logEvent(type, metadata = {}) {
  const user = requireAuth();
  const ref = doc(collection(db, "analytics", user.uid, "events"));

  await setDoc(ref, {
    eventId: ref.id,
    type: clean(type, 50),
    timestamp: serverTimestamp(),
    metadata,
  });
}

// ══════════════════════════════════════════════════════════════
// DELETE PLAN (FIXED STRUCTURE)
// ══════════════════════════════════════════════════════════════

export async function deletePlan(planId) {
  const user = requireAuth();

  const batch = writeBatch(db);

  // delete tasks from global tasks collection
  const tasksQ = query(
    collection(db, "tasks"),
    where("planId", "==", planId),
    where("userId", "==", user.uid)
  );

  const taskSnap = await getDocs(tasksQ);
  taskSnap.forEach((d) => batch.delete(d.ref));

  // delete plan from studyPlans collection (consistent with rest of file)
  batch.delete(doc(db, "studyPlans", planId));

  await batch.commit();
}
