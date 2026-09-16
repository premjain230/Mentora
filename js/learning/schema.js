/**
 * Aquila Learning Engine — Schema Versioning & Constants
 * Platform-independent. Web + Android must use identical versions.
 *
 * This is Prompt 1/8 foundation: no feature logic yet, only contracts.
 */

// ---------------------------------------------------------------------------
// Versioning — increment only via migration.
// Every document written by the new learning engine MUST include these.
// ---------------------------------------------------------------------------
export const LEARNING_SCHEMA_VERSION = 1;
export const ONBOARDING_VERSION = 1;
export const CURRICULUM_VERSION = 1;

// Stored on users/{uid} root or users/{uid}/learning/profile.
// Future migrations read this to decide transformation path.
export const LEARNING_VERSION_FIELD = "learningSchemaVersion";
export const ONBOARDING_VERSION_FIELD = "onboardingVersion";

// ---------------------------------------------------------------------------
// Enumerations — frozen string unions shared across Web + Android
// ---------------------------------------------------------------------------
export const MasteryState = Object.freeze({
  UNSEEN: "unseen",       // 0.00 — never attempted
  LEARNING: "learning",   // 0.00–0.39
  DEVELOPING: "developing", // 0.40–0.69
  PROFICIENT: "proficient", // 0.70–0.84
  MASTERED: "mastered",   // 0.85–1.00
  // TODO Prompt 5: add "lapsed" when spaced-repetition detects decay beyond threshold
});

export const EvidenceType = Object.freeze({
  QUIZ: "quiz",
  RECALL: "recall",
  APPLY: "apply",
  EXPLAIN: "explain",
  REVISE: "revise",
  SESSION: "session",
  DIAGNOSTIC: "diagnostic",
});

export const RecommendationType = Object.freeze({
  REVIEW: "review",
  STRENGTHEN: "strengthen",
  LEARN: "learn",
  PRACTICE: "practice",
  REVISE: "revise",
  CATCH_UP: "catch_up",
  EXTEND: "extend",
});

export const SessionType = Object.freeze({
  LEARN: "learn",
  REVIEW: "review",
  PRACTICE: "practice",
  DIAGNOSTIC: "diagnostic",
  REVISE: "revise",
});

export const SessionStatus = Object.freeze({
  ACTIVE: "active",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
});

export const ReviewResult = Object.freeze({
  AGAIN: "again",   // 0 — forgot
  HARD: "hard",     // 1
  GOOD: "good",     // 2
  EASY: "easy",     // 3
});

// ---------------------------------------------------------------------------
// Prompt 2 — Academic / Goals / Preferences enumerations
// ---------------------------------------------------------------------------
export const Board = Object.freeze({
  CBSE: "CBSE",
  ICSE: "ICSE",
  STATE: "State",
  IB: "IB",
  IGCSE: "IGCSE",
  OTHER: "Other",
});

export const Track = Object.freeze({
  SCHOOL: "school",
  COMPETITIVE: "competitive",
  BOTH: "both",
});

export const GoalType = Object.freeze({
  PASS_YEAR: "pass_year",
  IMPROVE_SUBJECT: "improve_subject",
  SCORE_TARGET: "score_target",
  BOARD_EXAM: "board_exam",
  COMPETITIVE_EXAM: "competitive_exam",
  DEEP_UNDERSTANDING: "deep_understanding",
  FINISH_SYLLABUS: "finish_syllabus",
  CONSISTENCY: "consistency",
  CUSTOM: "custom",
});

export const GoalStatus = Object.freeze({
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
});

export const LearningStyle = Object.freeze({
  VISUAL: "visual",
  AUDITORY: "auditory",
  READING: "reading",
  PRACTICE: "practice",
  MIXED: "mixed",
});

export const Priority = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
});

export const OnboardingTier = Object.freeze({
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
});

export const LearningEventType = Object.freeze({
  LESSON_STARTED: "lesson_started",
  LESSON_COMPLETED: "lesson_completed",
  QUESTION_ANSWERED: "question_answered",
  QUESTION_CORRECT: "question_correct",
  QUESTION_INCORRECT: "question_incorrect",
  QUIZ_STARTED: "quiz_started",
  QUIZ_COMPLETED: "quiz_completed",
  ASSESSMENT_COMPLETED: "assessment_completed",
  HINT_REQUESTED: "hint_requested",
  EXPLANATION_REQUESTED: "explanation_requested",
  MISTAKE_DETECTED: "mistake_detected",
  MISCONCEPTION_DETECTED: "misconception_detected",
  TOPIC_REVIEWED: "topic_reviewed",
  STUDY_SESSION_STARTED: "study_session_started",
  STUDY_SESSION_COMPLETED: "study_session_completed",
  GOAL_CREATED: "goal_created",
  GOAL_COMPLETED: "goal_completed",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_QUESTION_ANSWERED: "onboarding_question_answered",
  ONBOARDING_ANSWERED: "onboarding_answered",
  ONBOARDING_COMPLETED: "onboarding_completed",
  DIAGNOSTIC_STARTED: "diagnostic_started",
  DIAGNOSTIC_ANSWERED: "diagnostic_answered",
  DIAGNOSTIC_COMPLETED: "diagnostic_completed",
  REVIEW_STARTED: "review_started",
  REVIEW_COMPLETED: "review_completed",
  RECOMMENDATION_CLICKED: "recommendation_clicked",
  SYLLABUS_UPLOADED: "syllabus_uploaded",
});

export const EventSource = Object.freeze({
  QUIZ: "quiz",
  STUDY_SESSION: "study_session",
  DIAGNOSTIC: "diagnostic",
  CHAT: "chat",
  ONBOARDING: "onboarding",
  SELF_REPORT: "self_report",
});

// ---------------------------------------------------------------------------
// Validation helpers — platform-independent rules used by both clients
// ---------------------------------------------------------------------------
export function isValidMasteryScore(v) {
  return typeof v === "number" && v >= 0 && v <= 1;
}

export function isValidMasteryState(s) {
  return Object.values(MasteryState).includes(s);
}

/** Derive MasteryState from score — single source of truth for Web + Android */
export function masteryStateFromScore(score) {
  const n = typeof score === "number" ? score : 0;
  if (n >= 0.85) return MasteryState.MASTERED;
  if (n >= 0.70) return MasteryState.PROFICIENT;
  if (n >= 0.40) return MasteryState.DEVELOPING;
  if (n > 0) return MasteryState.LEARNING;
  return MasteryState.UNSEEN;
}

export function isNonEmptyString(v, max = 500) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

export function isIsoTimestamp(v) {
  if (typeof v !== "string") return false;
  const d = new Date(v);
  return !isNaN(d.getTime()) && d.toISOString() === v;
}

export function clamp01(n) {
  if (typeof n !== "number" || isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function isValidBoard(v) {
  return v == null || Object.values(Board).includes(v);
}
export function isValidTrack(v) {
  return v == null || Object.values(Track).includes(v);
}
export function isValidGoalType(v) {
  return Object.values(GoalType).includes(v);
}
export function isValidPriority(v) {
  return Object.values(Priority).includes(v);
}
export function isValidLearningEventType(v) {
  return Object.values(LearningEventType).includes(v);
}
export function isValidEventSource(v) {
  return v == null || Object.values(EventSource).includes(v);
}

// ---------------------------------------------------------------------------
// Prompt 5 — Evidence quality central config + helpers (server-authoritative)
// ---------------------------------------------------------------------------
export const EVIDENCE_SOURCE_WEIGHTS = Object.freeze({
  diagnostic: 1.0,
  quiz: 0.90,
  study_session: 0.65,
  self_report: 0.20,
  onboarding: 0.20,
});

export function getSourceWeight(source) {
  if (source == null) return 0;
  const v = EVIDENCE_SOURCE_WEIGHTS[source];
  return typeof v === "number" ? v : 0;
}

export function getHintFactor(hintCount) {
  const n = Math.max(0, Math.min(20, Number(hintCount) || 0));
  if (n === 0) return 1.0;
  if (n === 1) return 0.85;
  if (n === 2) return 0.70;
  if (n === 3) return 0.55;
  return 0.40;
}

export function getRecencyFactor(createdAt) {
  try {
    const t = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (isNaN(t.getTime())) return 1.0;
    const ageDays = (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) return 1.0;
    if (ageDays <= 30) return 0.90;
    if (ageDays <= 90) return 0.75;
    if (ageDays <= 180) return 0.60;
    return 0.45;
  } catch {
    return 1.0;
  }
}

export function normalizeConfidence(confidence) {
  if (confidence == null) return null;
  const n = Math.max(1, Math.min(5, Number(confidence)));
  return (n - 1) / 4; // 1→0, 5→1
}

// Prompt 5 mastery state — extends Prompt 1 thresholds with evidenceStrength gate
export const MasteryStateV2 = Object.freeze({
  UNKNOWN: "unknown",
  EMERGING: "emerging",
  DEVELOPING: "developing",
  PROFICIENT: "proficient",
  STRONG: "strong",
});

export function masteryStateV2(score, evidenceStrength) {
  const s = clamp01(score);
  const e = clamp01(evidenceStrength);
  if (e < 0.10) return MasteryStateV2.UNKNOWN;
  if (e < 0.35) {
    // low evidence: cap at developing
    if (s < 0.30) return MasteryStateV2.EMERGING;
    return MasteryStateV2.DEVELOPING;
  }
  if (s < 0.30) return MasteryStateV2.EMERGING;
  if (s < 0.50) return MasteryStateV2.DEVELOPING;
  if (s < 0.70) return MasteryStateV2.PROFICIENT;
  return MasteryStateV2.STRONG;
}

export const MASTERY_PRIOR = 0.5;
export const MASTERY_MODEL_VERSION = 2;
