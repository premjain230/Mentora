/**
 * retention.js — Aquila AI Retention Engine
 *
 * Turns every study action into a reason to come back tomorrow:
 *  - Daily streaks  (reused across planner + dashboard via progress/{uid})
 *  - XP + Levels    (every action earns XP; levels unlock achievement badges)
 *  - Daily Missions (personalized, generated per day)
 *  - Continue Learning (remembers the last subject / chat / quiz / planner)
 *  - Mistake Notebook (every wrong quiz answer is saved automatically)
 *  - Daily Review    (spaced-repetition review queue, powered by retrieval-scheduler)
 *
 * Storage (all covered by existing Firestore rules):
 *  - progress/{uid}                    → streak, XP, daily counters, achievements
 *  - users/{uid}/learning/profile      → concept mastery (shared with learning model)
 *  - users/{uid}/learning/missions     → today's missions + progress
 *  - users/{uid}/learning/lastSession  → continue-learning pointer
 *  - users/{uid}/cards/{id}            → spaced-repetition cards
 *  - users/{uid}/misconceptions/{id}   → mistake notebook entries
 */

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { calculateNextReview } from "./modules/retrieval-scheduler.js";

// ─── XP table ────────────────────────────────────────────────────────────────
export const XP = {
  dailyLogin: 5,
  dailyQuestion: 10,
  chatMessage: 10,
  quizCorrect: 5,
  quizCompleted: 25,
  reviewCard: 5,
  missionBonus: 20,
  plannerTask: 15,
};

// ─── Date helpers ────────────────────────────────────────────────────────────
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function toTs(v) {
  if (!v) return 0;
  if (v.toDate) return v.toDate().getTime();
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.seconds) return v.seconds * 1000;
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ─── XP ⇄ Level math ─────────────────────────────────────────────────────────
export function xpForLevel(level) {
  return 100 + (level - 1) * 50;
}

export function totalXpForLevel(level) {
  return 25 * (level - 1) * (level + 2);
}

export function computeLevel(totalXp) {
  const t = Math.max(0, Math.floor(Number(totalXp) || 0));
  const n = Math.floor((-1 + Math.sqrt(9 + (4 * t) / 25)) / 2);
  const level = Math.max(1, n);
  const start = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  return { level, levelXp: t - start, xpForNext: next - start, totalXp: t };
}

// ─── Progress helpers ────────────────────────────────────────────────────────
function progressRef(uid) {
  return doc(db, "progress", uid);
}

async function getProgress(uid) {
  try {
    const snap = await getDoc(progressRef(uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * Daily login: updates streak, awards daily-login XP once per day.
 * Returns { streak, level, newDay }.
 */
export async function trackDailyLogin(uid) {
  if (!uid || !db) return null;
  const today = todayKey();
  const data = (await getProgress(uid)) || {};

  let streak = Number(data.currentStreak) || 0;
  const last = data.lastStudiedDate;
  if (last === today) {
    // already counted today
  } else if (last === yesterdayKey()) {
    streak += 1;
  } else {
    streak = 1;
  }

  const newDay = data.lastLoginDate !== today;
  const updates = {
    currentStreak: streak,
    longestStreak: Math.max(streak, Number(data.longestStreak) || 0),
    lastStudiedDate: today,
    lastUpdated: serverTimestamp(),
  };

  if (newDay) {
    updates.lastLoginDate = today;
    updates.todayDate = today;
    updates.todayXp = increment(XP.dailyLogin);
    updates.totalXp = increment(XP.dailyLogin);
  }

  try {
    await setDoc(progressRef(uid), updates, { merge: true });
  } catch {}

  if (newDay) {
    try {
      await syncAchievements(uid);
    } catch {}
  }

  const base = Number(data.totalXp) || 0;
  return {
    streak,
    newDay,
    level: computeLevel(base + (newDay ? XP.dailyLogin : 0)).level,
  };
}

/**
 * Award XP for a study action and push mission progress.
 * type: chat | quiz_correct | quiz_completed | review | daily_question | planner_task
 */
export async function recordXpEvent(uid, type, qty = 1, meta = {}) {
  if (!uid || !db) return null;
  const today = todayKey();
  const data = (await getProgress(uid)) || {};

  const sameDay = data.todayDate === today;
  const base = sameDay
    ? {}
    : {
        todayXp: 0,
        questionsToday: 0,
        reviewsToday: 0,
        chatToday: 0,
        missionsCompleted: 0,
        todayDate: today,
      };

  let gained = 0;

  switch (type) {
    case "chat":
      base.chatToday = increment(1);
      gained = XP.chatMessage;
      break;
    case "quiz_correct":
      base.questionsToday = increment(qty);
      gained = XP.quizCorrect * qty;
      break;
    case "quiz_completed":
      base.quizzesCompleted = increment(1);
      gained = XP.quizCompleted;
      break;
    case "review":
      base.reviewsToday = increment(qty);
      gained = XP.reviewCard * qty;
      break;
    case "daily_question":
      gained = XP.dailyQuestion;
      break;
    case "planner_task":
      gained = XP.plannerTask;
      break;
    default:
      gained = 0;
  }

  const oldTotal = Number(data.totalXp) || 0;
  const oldLevel = computeLevel(oldTotal).level;

  if (gained > 0) {
    base.totalXp = increment(gained);
    base.todayXp = increment(gained);
  }

  try {
    await setDoc(progressRef(uid), base, { merge: true });
  } catch {}

  const newTotal = oldTotal + gained;
  const levelInfo = computeLevel(newTotal);

  if (levelInfo.level > oldLevel) {
    try {
      await syncAchievements(uid);
    } catch {}
  }

  try {
    await addMissionProgress(uid, type, qty, meta);
  } catch {}

  return { gained, ...levelInfo, leveledUp: levelInfo.level > oldLevel };
}

// ─── Daily Missions ──────────────────────────────────────────────────────────
function missionsRef(uid) {
  return doc(db, "users", uid, "learning", "missions");
}

async function readMissions(uid) {
  try {
    const snap = await getDoc(missionsRef(uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function ensureMissions(uid, ctx = {}) {
  if (!uid || !db) return null;
  const today = todayKey();
  const existing = await readMissions(uid);
  if (existing && existing.date === today) return existing;

  const missions = [];
  missions.push({
    id: "quiz",
    type: "quiz_correct",
    label: "Solve 10 quiz questions",
    target: 10,
    xp: XP.missionBonus,
  });

  const dueCount = Math.max(0, Number(ctx.dueCount) || 0);
  if (dueCount > 0) {
    const target = Math.min(dueCount, 5);
    missions.push({
      id: "review",
      type: "review",
      label: `Review ${target} concept${target > 1 ? "s" : ""} before you forget`,
      target,
      xp: XP.missionBonus,
    });
  }

  const mistakeCount = Math.max(0, Number(ctx.mistakeCount) || 0);
  if (mistakeCount > 0) {
    const target = Math.min(mistakeCount, 3);
    missions.push({
      id: "mistakes",
      type: "mistake_review",
      label: `Revisit ${target} mistake${target > 1 ? "s" : ""} from your notebook`,
      target,
      xp: XP.missionBonus,
    });
  }

  const weak = ctx.weakTopics && ctx.weakTopics[0];
  if (weak && weak.name) {
    missions.push({
      id: "practice",
      type: "practice_topic",
      label: `Score 70%+ on ${weak.name}`,
      target: 1,
      topic: weak.name,
      xp: XP.missionBonus,
    });
  }

  if (!ctx.dailyQuestionDone) {
    missions.push({
      id: "dailyQ",
      type: "daily_question",
      label: "Answer your Daily Question",
      target: 1,
      xp: XP.missionBonus,
    });
  }

  missions.push({
    id: "chat",
    type: "chat",
    label: "Ask Aquila 5 questions",
    target: 5,
    xp: XP.missionBonus,
  });

  const record = {
    date: today,
    list: missions,
    progress: {},
    completed: {},
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(missionsRef(uid), record);
  } catch {}

  return record;
}

export async function getTodaysMissions(uid) {
  const data = await readMissions(uid);
  if (!data || data.date !== todayKey()) return null;
  return data;
}

async function addMissionProgress(uid, type, amount = 1, meta = {}) {
  if (!uid || !db) return;
  const today = todayKey();
  const data = await readMissions(uid);
  if (!data || data.date !== today) return;

  const matches = (data.list || []).filter(
    (m) => m.type === type && (!m.topic || m.topic === meta.topic)
  );
  if (matches.length === 0) return;

  const updates = {};
  let completedAny = false;

  matches.forEach((m) => {
    if (data.completed && data.completed[m.id]) return;
    const cur = (data.progress && data.progress[m.id]) || 0;
    const next = Math.min(m.target, cur + amount);
    updates[`progress.${m.id}`] = next;
    if (next >= m.target) {
      updates[`completed.${m.id}`] = true;
      completedAny = true;
    }
  });

  if (Object.keys(updates).length > 0) {
    try {
      await updateDoc(missionsRef(uid), { ...updates, updatedAt: serverTimestamp() });
    } catch {}
  }

  if (completedAny) {
    try {
      await setDoc(
        progressRef(uid),
        {
          totalXp: increment(XP.missionBonus),
          todayXp: increment(XP.missionBonus),
          missionsCompleted: increment(1),
        },
        { merge: true }
      );
    } catch {}
  }
}

/** Public: mark a topic as practiced (for the "score 70%+ on X" mission). */
export async function markTopicPracticed(uid, topic, passed) {
  if (!passed || !topic) return;
  await addMissionProgress(uid, "practice_topic", 1, { topic });
}

// ─── Continue Learning ───────────────────────────────────────────────────────
export async function updateLastSession(uid, session) {
  if (!uid || !db || !session) return;
  try {
    await setDoc(doc(db, "users", uid, "learning", "lastSession"), {
      ...session,
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

export async function getLastSession(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid, "learning", "lastSession"));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ─── Mistake Notebook ────────────────────────────────────────────────────────
export async function recordMistake(uid, entry) {
  if (!uid || !db || !entry || !entry.question) return;
  try {
    await addDoc(collection(db, "users", uid, "misconceptions"), {
      subject: String(entry.subject || "").slice(0, 100),
      topic: String(entry.topic || "").slice(0, 200),
      question: String(entry.question).slice(0, 2000),
      userAnswer: String(entry.userAnswer || "").slice(0, 2000),
      correctAnswer: String(entry.correctAnswer || "").slice(0, 2000),
      explanation: String(entry.explanation || "").slice(0, 3000),
      resolved: false,
      kind: "notebook",
      createdAt: serverTimestamp(),
    });
    await setDoc(progressRef(uid), { mistakesLogged: increment(1) }, { merge: true });
  } catch {}
}

export async function loadMistakes(uid, count = 40) {
  if (!uid || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "misconceptions"), orderBy("createdAt", "desc"), limit(count))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((m) => m.kind === "notebook");
  } catch {
    return [];
  }
}

export async function resolveMistake(uid, mistakeId) {
  if (!uid || !db || !mistakeId) return;
  try {
    await updateDoc(doc(db, "users", uid, "misconceptions", mistakeId), {
      resolved: true,
    });
    await addMissionProgress(uid, "mistake_review", 1);
  } catch {}
}

// ─── Daily Review (spaced repetition) ────────────────────────────────────────
export async function saveReviewCard(uid, { subject, topic, front, back }) {
  if (!uid || !db || !front) return;
  const due = calculateNextReview({ interval: 0, repetitions: 0, ease: 2.5 }, 3);
  try {
    await addDoc(collection(db, "users", uid, "cards"), {
      subject: String(subject || "").slice(0, 100),
      topic: String(topic || "").slice(0, 200),
      front: String(front).slice(0, 3000),
      back: String(back || "").slice(0, 3000),
      conceptId: topic || subject || "general",
      interval: due.interval,
      repetitions: due.repetitions,
      ease: due.ease,
      dueDate: due.dueDate,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {}
}

export async function loadDueCards(uid) {
  if (!uid || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "cards"), orderBy("updatedAt", "desc"), limit(200))
    );
    const today = todayKey();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => !c.dueDate || c.dueDate <= today)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function loadAllCards(uid) {
  if (!uid || !db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "users", uid, "cards"), orderBy("updatedAt", "desc"), limit(300))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

/**
 * Grade a review card.
 * rating: 0 = forgot, 2 = hard, 4 = good, 5 = easy
 */
export async function reviewCard(uid, cardId, rating) {
  if (!uid || !db || !cardId) return null;
  try {
    const ref = doc(db, "users", uid, "cards", cardId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const card = snap.data();
    const next = calculateNextReview(card, rating);
    await updateDoc(ref, {
      ...next,
      reviewCount: (Number(card.reviewCount) || 0) + 1,
      lastReview: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    const xpRes = await recordXpEvent(uid, "review", 1);
    return { card, next, gained: xpRes ? xpRes.gained : XP.reviewCard };
  } catch {
    return null;
  }
}

// ─── Quiz results ────────────────────────────────────────────────────────────
/**
 * Record a finished quiz: award XP, save wrong answers to the mistake
 * notebook + review queue, update continue-learning + topic mastery.
 * answers: array of { q, selected, correct, isCorrect, mode, options?, explanation? }
 */
export async function recordQuizResult(uid, { subject, topic, title, correct, total, answers = [], mode = "standard" }) {
  if (!uid || !db) return { gained: 0, level: 1, mistakes: 0 };

  const list = Array.isArray(answers) ? answers : [];
  const mistakes = list.filter((a) => a && a.isCorrect === false);

  let gained = 0;
  const xpCorrect = await recordXpEvent(uid, "quiz_correct", correct);
  if (xpCorrect) gained += xpCorrect.gained;
  const xpDone = await recordXpEvent(uid, "quiz_completed", 1);
  if (xpDone) gained += xpDone.gained;

  for (const m of mistakes.slice(0, 10)) {
    const selected =
      m.mode === "written"
        ? m.selected
        : Array.isArray(m.options) && typeof m.selected === "number"
        ? m.options[m.selected] || m.selected
        : m.selectedText || m.selected;
    const correctAnswer = Array.isArray(m.options) && typeof m.correct === "number"
      ? m.options[m.correct] || m.correct
      : m.correctText || m.correct;

    await recordMistake(uid, {
      subject,
      topic,
      question: m.q,
      userAnswer: selected,
      correctAnswer,
      explanation: m.explanation || "",
    });
    await saveReviewCard(uid, {
      subject,
      topic,
      front: `Why is this wrong? ${m.q}`,
      back: `Correct answer: ${correctAnswer}. Your answer: ${selected}`,
    });
  }

  if (total > 0 && correct / total >= 0.7) {
    await markTopicPracticed(uid, topic, true);
  }

  await updateLastSession(uid, {
    type: "quiz",
    title: title || topic || "Quiz",
    subject,
    topic,
  });

  try {
    await updateTopicMastery(uid, topic, correct, total);
  } catch {}

  try {
    await syncAchievements(uid);
  } catch {}

  return {
    gained,
    level: xpDone ? xpDone.level : 1,
    mistakes: mistakes.length,
  };
}

async function updateTopicMastery(uid, topic, correct, total) {
  if (!topic) return;
  const ref = doc(db, "users", uid, "learning", "profile");
  const snap = await getDoc(ref);
  const profile = snap.exists() ? snap.data() : {};
  const mastery = profile.conceptMastery || {};
  const acc = total > 0 ? correct / total : 0;
  const prev = Number(mastery[topic]) || 0;
  mastery[topic] = prev === 0 ? acc : Math.min(1, prev * 0.6 + acc * 0.4);
  await setDoc(ref, { conceptMastery: mastery, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Achievements ────────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: "first_xp", icon: "🚀", title: "First XP", desc: "Earned your first XP" },
  { id: "first_quiz", icon: "📝", title: "First Quiz", desc: "Completed your first quiz" },
  { id: "streak_3", icon: "🔥", title: "3-Day Streak", desc: "Studied 3 days in a row" },
  { id: "streak_7", icon: "⚡", title: "7-Day Streak", desc: "One full week of learning" },
  { id: "streak_30", icon: "🌋", title: "30-Day Streak", desc: "A month of daily learning" },
  { id: "streak_100", icon: "💎", title: "100-Day Streak", desc: "Triple digits. Legendary." },
  { id: "level_5", icon: "🌟", title: "Level 5", desc: "Reached level 5" },
  { id: "level_10", icon: "👑", title: "Level 10", desc: "Reached level 10" },
  { id: "mistakes_10", icon: "📓", title: "Mistake Notebook", desc: "Logged 10 mistakes to review" },
];

export async function syncAchievements(uid) {
  if (!uid || !db) return;
  try {
    const data = (await getProgress(uid)) || {};
    const totalXp = Number(data.totalXp) || 0;
    const streak = Number(data.currentStreak) || 0;
    const level = computeLevel(totalXp).level;

    const ids = [];
    if (totalXp >= XP.dailyLogin) ids.push("first_xp");
    if ((Number(data.quizzesCompleted) || 0) >= 1) ids.push("first_quiz");
    if (streak >= 3) ids.push("streak_3");
    if (streak >= 7) ids.push("streak_7");
    if (streak >= 30) ids.push("streak_30");
    if (streak >= 100) ids.push("streak_100");
    if (level >= 5) ids.push("level_5");
    if (level >= 10) ids.push("level_10");
    if ((Number(data.mistakesLogged) || 0) >= 10) ids.push("mistakes_10");

    await setDoc(progressRef(uid), { achievements: ids }, { merge: true });
  } catch {}
}

// ─── Dashboard data ──────────────────────────────────────────────────────────
export async function loadDashboardData(uid) {
  if (!uid || !db) return null;
  const today = todayKey();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekBefore = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const [
    progress,
    userSnap,
    profileSnap,
    lastSession,
    missions,
    chatsSnap,
    attemptsSnap,
    mistakesSnap,
    cardsSnap,
    dqSnap,
  ] = await Promise.all([
    getProgress(uid),
    getDoc(doc(db, "users", uid)).catch(() => null),
    getDoc(doc(db, "users", uid, "learning", "profile")).catch(() => null),
    getLastSession(uid),
    getTodaysMissions(uid),
    getDocs(query(collection(db, "users", uid, "chats"), orderBy("updatedAt", "desc"), limit(6))).catch(() => null),
    getDocs(query(collection(db, "users", uid, "quizAttempts"), orderBy("takenAt", "desc"), limit(100))).catch(() => null),
    getDocs(query(collection(db, "users", uid, "misconceptions"), orderBy("createdAt", "desc"), limit(100))).catch(() => null),
    getDocs(query(collection(db, "users", uid, "cards"), orderBy("updatedAt", "desc"), limit(200))).catch(() => null),
    getDoc(doc(db, "users", uid, "dailyQuestions", today)).catch(() => null),
  ]);

  const chats = chatsSnap ? chatsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const attempts = attemptsSnap ? attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const mistakesList = mistakesSnap
    ? mistakesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.kind === "notebook")
    : [];
  const allCards = cardsSnap ? cardsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  const dueCards = allCards.filter((c) => !c.dueDate || c.dueDate <= today);

  // topic stats from quiz attempts
  const topicMap = {};
  attempts.forEach((a) => {
    const name = a.topic || a.subject || "General";
    topicMap[name] = topicMap[name] || { name, correct: 0, total: 0, attempts: 0 };
    topicMap[name].correct += Number(a.correct) || 0;
    topicMap[name].total += Number(a.totalQ) || 0;
    topicMap[name].attempts += 1;
  });
  const topicStats = Object.values(topicMap).map((t) => ({
    ...t,
    pct: t.total ? Math.round((t.correct / t.total) * 100) : 0,
  }));
  topicStats.sort((a, b) => a.pct - b.pct);
  const weakTopics = topicStats.filter((t) => t.pct < 60).slice(0, 4);
  const strongTopics = topicStats.filter((t) => t.pct >= 80).slice(0, 3);

  // weak concepts from the learning profile
  const profileMastery = (profileSnap && profileSnap.data() && profileSnap.data().conceptMastery) || {};
  const weakConcepts = Object.entries(profileMastery)
    .map(([name, m]) => ({ name, pct: Math.round((Number(m) || 0) * 100) }))
    .filter((c) => c.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);

  // recent accuracy + question counts
  const weekAttempts = attempts.filter((a) => toTs(a.takenAt) >= weekAgo);
  const prevWeekAttempts = attempts.filter((a) => toTs(a.takenAt) >= weekBefore && toTs(a.takenAt) < weekAgo);
  const weekTotal = weekAttempts.reduce((s, a) => s + (Number(a.totalQ) || 0), 0);
  const weekCorrect = weekAttempts.reduce((s, a) => s + (Number(a.correct) || 0), 0);
  const questionsThisWeek = weekAttempts.reduce((s, a) => s + (Number(a.totalQ) || 0), 0);
  const questionsPrevWeek = prevWeekAttempts.reduce((s, a) => s + (Number(a.totalQ) || 0), 0);

  const missionsRecord = await ensureMissions(uid, {
    dueCount: dueCards.length,
    mistakeCount: mistakesList.filter((m) => !m.resolved).length,
    weakTopics: weakTopics.length ? weakTopics : weakConcepts,
    dailyQuestionDone: dqSnap ? dqSnap.exists() : false,
  });

  return {
    user: (userSnap && userSnap.data()) || {},
    progress,
    levelInfo: computeLevel((progress && progress.totalXp) || 0),
    streak: Number((progress && progress.currentStreak) || 0),
    longestStreak: Number((progress && progress.longestStreak) || 0),
    todayXp: (progress && progress.todayDate === today ? Number(progress.todayXp) || 0 : 0),
    questionsToday: (progress && progress.todayDate === today ? Number(progress.questionsToday) || 0 : 0),
    reviewsToday: (progress && progress.todayDate === today ? Number(progress.reviewsToday) || 0 : 0),
    achievements: (progress && progress.achievements) || [],
    chats,
    lastSession,
    attempts,
    weakTopics,
    strongTopics,
    weakConcepts,
    dueCount: dueCards.length,
    unresolvedMistakes: mistakesList.filter((m) => !m.resolved).length,
    accuracy7d: weekTotal ? Math.round((weekCorrect / weekTotal) * 100) : null,
    questionsThisWeek,
    questionsPrevWeek,
    missions: missionsRecord,
    dailyQDone: dqSnap ? dqSnap.exists() : false,
  };
}

// ─── Personalized greeting ───────────────────────────────────────────────────
export function buildGreeting(user, data = {}) {
  const name = (user && (user.displayName || user.email)) || "Student";
  const firstName = String(name).split(" ")[0] || "Student";
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const streak = Number(data.streak) || 0;
  const due = Number(data.dueCount) || 0;
  const levelInfo = data.levelInfo || { level: 1, xpForNext: 100 };
  const weak = data.weakTopics && data.weakTopics[0];
  const delta = (Number(data.questionsThisWeek) || 0) - (Number(data.questionsPrevWeek) || 0);

  let line;
  if (streak === 1) {
    line = "That's day 1 of your streak — let's make today count.";
  } else if (streak === 2) {
    line = "Two days in a row. Consistency is how toppers win.";
  } else if (streak >= 3 && streak < 7) {
    line = `${streak}-day streak! You're building real momentum.`;
  } else if (streak >= 7 && streak < 30) {
    line = `A ${streak}-day streak is elite. Keep it alive today.`;
  } else if (streak >= 30) {
    line = `${streak} days. Unreal — your future self thanks you.`;
  } else if (due > 0) {
    line = `${due} concept${due > 1 ? "s" : ""} are due for review before you forget them.`;
  } else if (weak) {
    line = `${weak.name} needs a little more practice — I'll keep it quick.`;
  } else if (delta > 0) {
    line = `You solved ${delta} more questions than last week. Let's keep the streak alive.`;
  } else if (levelInfo.xpForNext > 0) {
    line = `Only ${levelInfo.xpForNext} XP until Level ${levelInfo.level + 1}.`;
  } else {
    line = "Ready to make today a little smarter than yesterday?";
  }

  return {
    title: `${timeGreet}, ${firstName}`,
    line,
    sub: "Here's what's waiting for you today.",
  };
}
