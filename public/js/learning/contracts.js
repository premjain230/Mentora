/**
 * Learning Allied Learning Engine — Shared Data Contracts (Platform-Independent)
 *
 * Web (js/learning/*) and Android (lib/learning/*) MUST use identical shapes.
 * All timestamps are ISO-8601 strings (new Date().toISOString()).
 * Firestore stores them as Timestamp or string — both are accepted on read,
 * but writes use serverTimestamp() when available.
 *
 * Prompt 1: types/interfaces/schema definitions only. No algorithm implementations.
 *
 * @file Data contracts for: UserLearningProfile, StudentModel, Curriculum,
 *       Concept, Mastery, LearningSession, Recommendation, LearningPlan,
 *       ReviewItem, and their Firestore mappings.
 */

import {
  LEARNING_SCHEMA_VERSION,
  ONBOARDING_VERSION,
  CURRICULUM_VERSION,
  MasteryState,
  EvidenceType,
  RecommendationType,
  SessionType,
  Board,
  Track,
  GoalType,
  GoalStatus,
  Priority,
  LearningEventType,
  EventSource,
  masteryStateFromScore,
  clamp01,
} from "./schema.js";

// ---------------------------------------------------------------------------
// UserLearningProfile — single source of onboarding + goal state
// Firestore: users/{uid}/learning/profile  (existing) + versioned fields
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} UserLearningProfile
 * @property {string} uid
 * @property {number} learningSchemaVersion - == LEARNING_SCHEMA_VERSION
 * @property {number} onboardingVersion - == ONBOARDING_VERSION
 * @property {string} displayName
 * @property {string} exam - e.g. "JEE" | "NEET" | "Boards" | "UPSC" | ""
 * @property {string[]} subjects - e.g. ["Physics","Chemistry"]
 * @property {string[]} goals - free-form learning goals
 * @property {string|null} targetScore
 * @property {string|null} examDate - ISO date YYYY-MM-DD
 * @property {number} dailyHours - 1..18
 * @property {string[]} weakTopics
 * @property {boolean} onboardingComplete
 * @property {string|null} preferredStyle - "visual"|"auditory"|"reading"|null
 * @property {string} createdAt - ISO
 * @property {string} updatedAt - ISO
 */
export function createUserLearningProfile(uid, overrides = {}) {
  const now = new Date().toISOString();
  return {
    uid: String(uid || ""),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
    onboardingVersion: ONBOARDING_VERSION,
    displayName: String(overrides.displayName || ""),
    exam: String(overrides.exam || ""),
    subjects: Array.isArray(overrides.subjects) ? overrides.subjects.slice(0, 10) : [],
    goals: Array.isArray(overrides.goals) ? overrides.goals.slice(0, 10) : [],
    targetScore: overrides.targetScore ?? null,
    examDate: overrides.examDate ?? null,
    dailyHours: Math.min(18, Math.max(1, Number(overrides.dailyHours) || 4)),
    weakTopics: Array.isArray(overrides.weakTopics) ? overrides.weakTopics.slice(0, 20) : [],
    onboardingComplete: Boolean(overrides.onboardingComplete),
    preferredStyle: overrides.preferredStyle ?? null,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

// ---------------------------------------------------------------------------
// StudentModel — dynamic learner state updated after every interaction
// Firestore: users/{uid}/learning/studentModel  (NEW — additive)
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} StudentModel
 * @property {string} uid
 * @property {number} learningSchemaVersion
 * @property {Object<string, number>} conceptMastery - conceptId -> 0..1
 * @property {Object<string, number>} confidence - conceptId -> 0..1
 * @property {number} learningVelocity - 0..1 rolling accuracy
 * @property {number[]} confidenceHistory - last N self-rated 1..5 → normalised 0..1
 * @property {Object[]} misconceptions - { conceptId, text, detectedAt, resolved }
 * @property {number} totalInteractions
 * @property {number} sessionCount
 * @property {string} createdAt
 * @property {string} updatedAt
 */
export function createStudentModel(uid, overrides = {}) {
  const now = new Date().toISOString();
  return {
    uid: String(uid || ""),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
    conceptMastery: overrides.conceptMastery && typeof overrides.conceptMastery === "object" ? { ...overrides.conceptMastery } : {},
    confidence: overrides.confidence && typeof overrides.confidence === "object" ? { ...overrides.confidence } : {},
    learningVelocity: clamp01(overrides.learningVelocity ?? 0),
    confidenceHistory: Array.isArray(overrides.confidenceHistory) ? overrides.confidenceHistory.slice(-100) : [],
    misconceptions: Array.isArray(overrides.misconceptions) ? overrides.misconceptions.slice(-100) : [],
    totalInteractions: Number(overrides.totalInteractions) || 0,
    sessionCount: Number(overrides.sessionCount) || 0,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
  };
}

// ---------------------------------------------------------------------------
// Curriculum / Concept — static (or slowly evolving) graph, server-owned
// Firestore (future): curriculum/{subject}/concepts/{conceptId}
// For Prompt 1 the data lives as JSON constants on the client.
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} Concept
 * @property {string} conceptId - stable id, e.g. "phy_kinematics_01"
 * @property {string} subject - e.g. "Physics"
 * @property {string} topic - e.g. "Kinematics"
 * @property {string} name - human title
 * @property {string} description
 * @property {string[]} prerequisites - conceptIds
 * @property {number} difficulty - 0..1
 * @property {number} estimatedMinutes - 5..120
 * @property {string[]} tags
 */

/**
 * @typedef {Object} Curriculum
 * @property {number} curriculumVersion - == CURRICULUM_VERSION
 * @property {string} exam - e.g. "JEE"
 * @property {SubjectNode[]} subjects
 */
/**
 * @typedef {Object} SubjectNode
 * @property {string} subjectId
 * @property {string} name
 * @property {TopicNode[]} topics
 */
/**
 * @typedef {Object} TopicNode
 * @property {string} topicId
 * @property {string} name
 * @property {Concept[]} concepts
 */

export function createConcept(overrides = {}) {
  return {
    conceptId: String(overrides.conceptId || ""),
    subject: String(overrides.subject || ""),
    topic: String(overrides.topic || ""),
    name: String(overrides.name || overrides.topic || overrides.conceptId || ""),
    description: String(overrides.description || ""),
    prerequisites: Array.isArray(overrides.prerequisites) ? overrides.prerequisites.slice() : [],
    difficulty: clamp01(overrides.difficulty ?? 0.5),
    estimatedMinutes: Math.min(120, Math.max(5, Number(overrides.estimatedMinutes) || 15)),
    tags: Array.isArray(overrides.tags) ? overrides.tags.slice() : [],
  };
}

// ---------------------------------------------------------------------------
// Mastery — per-concept mastery record
// Firestore: users/{uid}/mastery/{conceptId}  (NEW)
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} MasteryEvidence
 * @property {string} type - EvidenceType
 * @property {number} scoreDelta - e.g. +0.08 or -0.04
 * @property {string} sourceId - quizAttemptId | sessionId | etc
 * @property {string} at - ISO timestamp
 */
/**
 * @typedef {Object} Mastery
 * @property {string} uid
 * @property {string} conceptId
 * @property {number} masteryScore - 0..1
 * @property {string} masteryState - MasteryState
 * @property {number} reviewCount
 * @property {string|null} lastReviewed - ISO or null
 * @property {string|null} nextReviewDue - ISO or null
 * @property {MasteryEvidence[]} evidence - last N deltas, newest first
 * @property {string} updatedAt - ISO
 * @property {number} learningSchemaVersion
 */
export function createMastery(uid, conceptId, overrides = {}) {
  const score = clamp01(overrides.masteryScore ?? 0);
  return {
    uid: String(uid || ""),
    conceptId: String(conceptId || ""),
    masteryScore: score,
    masteryState: overrides.masteryState || masteryStateFromScore(score),
    reviewCount: Math.max(0, Number(overrides.reviewCount) || 0),
    lastReviewed: overrides.lastReviewed ?? null,
    nextReviewDue: overrides.nextReviewDue ?? null,
    evidence: Array.isArray(overrides.evidence) ? overrides.evidence.slice(0, 20) : [],
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

// ---------------------------------------------------------------------------
// LearningSession — single focus block (new unified model)
// Firestore: users/{uid}/sessions/{sessionId}  (NEW; coexists with studySessions)
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} LearningSession
 * @property {string} sessionId
 * @property {string} uid
 * @property {string} type - SessionType
 * @property {string} subject
 * @property {string} topic
 * @property {string[]} conceptIds - concepts covered
 * @property {number} durationMinutes - 5..480
 * @property {number} timeFocusedSeconds
 * @property {string} status - SessionStatus
 * @property {string|null} goal
 * @property {Object|null} plan - { title, objectives, keyPoints, practiceQuestions, focusTips }
 * @property {string} startedAt - ISO
 * @property {string|null} completedAt
 * @property {string} updatedAt
 * @property {number} learningSchemaVersion
 */
export function createLearningSession(uid, overrides = {}) {
  const now = new Date().toISOString();
  return {
    sessionId: String(overrides.sessionId || ""),
    uid: String(uid || ""),
    type: Object.values(SessionType).includes(overrides.type) ? overrides.type : SessionType.LEARN,
    subject: String(overrides.subject || ""),
    topic: String(overrides.topic || ""),
    conceptIds: Array.isArray(overrides.conceptIds) ? overrides.conceptIds.slice(0, 20) : [],
    durationMinutes: Math.min(480, Math.max(5, Number(overrides.durationMinutes) || 25)),
    timeFocusedSeconds: Math.max(0, Number(overrides.timeFocusedSeconds) || 0),
    status: Object.values(SessionType).includes(overrides.status) ? overrides.status : undefined,
    // status uses SessionStatus set
    goal: overrides.goal ?? null,
    plan: overrides.plan ?? null,
    startedAt: overrides.startedAt || now,
    completedAt: overrides.completedAt ?? null,
    updatedAt: overrides.updatedAt || now,
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Recommendation — computed suggestion for what to do next
// Firestore: users/{uid}/recommendations/current  (NEW — single doc, overwritten)
// In future: recommendations/history/{id} for audit
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} Recommendation
 * @property {string} recommendationId
 * @property {string} type - RecommendationType
 * @property {string} priority - "high"|"medium"|"low"
 * @property {string} title
 * @property {string} description
 * @property {string|null} conceptId
 * @property {string|null} subject
 * @property {string|null} topic
 * @property {string} actionLabel - e.g. "Start Review"
 * @property {Object} meta - { forgettingRisk?, mastery?, reason? }
 * @property {string} generatedAt - ISO
 * @property {number} learningSchemaVersion
 */
export function createRecommendation(overrides = {}) {
  return {
    recommendationId: String(overrides.recommendationId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    type: Object.values(RecommendationType).includes(overrides.type) ? overrides.type : RecommendationType.REVIEW,
    priority: ["high", "medium", "low"].includes(overrides.priority) ? overrides.priority : "medium",
    title: String(overrides.title || ""),
    description: String(overrides.description || ""),
    conceptId: overrides.conceptId ?? null,
    subject: overrides.subject ?? null,
    topic: overrides.topic ?? null,
    actionLabel: String(overrides.actionLabel || "Start"),
    meta: overrides.meta && typeof overrides.meta === "object" ? { ...overrides.meta } : {},
    generatedAt: overrides.generatedAt || new Date().toISOString(),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

// ---------------------------------------------------------------------------
// LearningPlan — week/day plan derived from curriculum + mastery
// Firestore: users/{uid}/learningPlans/{planId}  (NEW; coexists with studyPlans)
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} LearningPlan
 * @property {string} planId
 * @property {string} uid
 * @property {string} title
 * @property {string} examType
 * @property {string} status - "active"|"archived"|"completed"
 * @property {number} daysUntilExam
 * @property {Object} subjectAllocation
 * @property {Object} revisionSchedule
 * @property {Object[]} milestones
 * @property {Object[]} weeklyPlan
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {number} learningSchemaVersion
 */
export function createLearningPlan(uid, overrides = {}) {
  const now = new Date().toISOString();
  return {
    planId: String(overrides.planId || ""),
    uid: String(uid || ""),
    title: String(overrides.title || "My Learning Plan"),
    examType: String(overrides.examType || ""),
    status: ["active", "archived", "completed"].includes(overrides.status) ? overrides.status : "active",
    daysUntilExam: Math.max(0, Number(overrides.daysUntilExam) || 0),
    subjectAllocation: overrides.subjectAllocation && typeof overrides.subjectAllocation === "object" ? { ...overrides.subjectAllocation } : {},
    revisionSchedule: overrides.revisionSchedule && typeof overrides.revisionSchedule === "object" ? { ...overrides.revisionSchedule } : {},
    milestones: Array.isArray(overrides.milestones) ? overrides.milestones.slice() : [],
    weeklyPlan: Array.isArray(overrides.weeklyPlan) ? overrides.weeklyPlan.slice() : [],
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

// ---------------------------------------------------------------------------
// ReviewItem — spaced-repetition card state
// Firestore: users/{uid}/reviews/{conceptId}  (NEW)
// ---------------------------------------------------------------------------
/**
 * @typedef {Object} ReviewItem
 * @property {string} uid
 * @property {string} conceptId
 * @property {string} subject
 * @property {string} topic
 * @property {number} intervalDays - current SM-2 interval
 * @property {number} easeFactor - 1.3..2.8
 * @property {number} repetitions
 * @property {string|null} lastReviewed - ISO
 * @property {string|null} nextReviewDue - ISO
 * @property {string|null} lastResult - ReviewResult
 * @property {number} learningSchemaVersion
 */
export function createReviewItem(uid, conceptId, overrides = {}) {
  return {
    uid: String(uid || ""),
    conceptId: String(conceptId || ""),
    subject: String(overrides.subject || ""),
    topic: String(overrides.topic || ""),
    intervalDays: Math.max(0, Number(overrides.intervalDays) || 0),
    easeFactor: Math.min(2.8, Math.max(1.3, Number(overrides.easeFactor) || 2.5)),
    repetitions: Math.max(0, Number(overrides.repetitions) || 0),
    lastReviewed: overrides.lastReviewed ?? null,
    nextReviewDue: overrides.nextReviewDue ?? null,
    lastResult: overrides.lastResult ?? null,
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Prompt 2 — AcademicContext / Goals / Evidence / Misconception / Snapshot
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} AcademicContext
 * @property {string|null} country - ISO 3166-1 alpha-2
 * @property {string|null} state
 * @property {string|null} board
 * @property {string|null} grade
 * @property {string|null} curriculumId
 * @property {string|null} academicYear
 * @property {string|null} track - Track enum
 * @property {string|null} schoolName
 */
export function createAcademicContext(overrides = {}) {
  return {
    country: overrides.country ?? null,
    state: overrides.state ? String(overrides.state).slice(0, 80) : null,
    board: overrides.board ?? null,
    grade: overrides.grade ? String(overrides.grade).slice(0, 40) : null,
    curriculumId: overrides.curriculumId ?? null,
    academicYear: overrides.academicYear ? String(overrides.academicYear).slice(0, 20) : null,
    track: overrides.track ?? null,
    schoolName: overrides.schoolName ? String(overrides.schoolName).slice(0, 120) : null,
  };
}

/**
 * @typedef {Object} Goal
 * @property {string} goalId
 * @property {string} uid
 * @property {string} type - GoalType
 * @property {string} title
 * @property {string|null} target
 * @property {string|null} subject
 * @property {string} priority
 * @property {number} importance 0..1
 * @property {{start: string|null, due: string|null}} timeline
 * @property {string} status - GoalStatus
 */
export function createGoal(uid, overrides = {}) {
  const now = new Date().toISOString();
  return {
    goalId: String(overrides.goalId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    uid: String(uid || ""),
    type: Object.values(GoalType).includes(overrides.type) ? overrides.type : GoalType.CUSTOM,
    title: String(overrides.title || "").slice(0, 120),
    target: overrides.target ?? null,
    subject: overrides.subject ?? null,
    priority: Object.values(Priority).includes(overrides.priority) ? overrides.priority : Priority.MEDIUM,
    importance: clamp01(overrides.importance ?? 0.5),
    timeline: { start: overrides.timeline?.start ?? null, due: overrides.timeline?.due ?? null },
    status: Object.values(GoalStatus).includes(overrides.status) ? overrides.status : GoalStatus.ACTIVE,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

/**
 * @typedef {Object} LearningEvent
 * @property {string} eventId
 * @property {string} uid
 * @property {string} type - LearningEventType
 * @property {string|null} conceptId
 * @property {string|null} subject
 * @property {string|null} topic
 * @property {Object} payload
 * @property {number|null} confidence
 * @property {string} createdAt
 */
export function createLearningEvent(uid, overrides = {}) {
  return {
    eventId: String(overrides.eventId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    uid: String(uid || ""),
    type: Object.values(LearningEventType).includes(overrides.type) ? overrides.type : LearningEventType.QUESTION_ANSWERED,
    conceptId: overrides.conceptId ?? null,
    subject: overrides.subject ?? null,
    topic: overrides.topic ?? null,
    source: overrides.source ?? null,
    sessionId: overrides.sessionId ?? null,
    questionId: overrides.questionId ?? null,
    payload: overrides.payload && typeof overrides.payload === "object" ? { ...overrides.payload } : {},
    confidence: overrides.confidence != null ? Math.min(5, Math.max(1, Number(overrides.confidence))) : null,
    createdAt: overrides.createdAt || new Date().toISOString(),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

/**
 * @typedef {Object} Misconception
 * @property {string} misconceptionId
 * @property {string} uid
 * @property {string} conceptId
 * @property {string} concept
 * @property {string} misconception
 * @property {string|null} correction
 * @property {Object[]} evidence
 * @property {number} confidence 0..1
 * @property {string} firstDetected
 * @property {string} lastDetected
 * @property {boolean} resolved
 */
export function createMisconception(uid, conceptId, overrides = {}) {
  const now = new Date().toISOString();
  return {
    misconceptionId: String(overrides.misconceptionId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    uid: String(uid || ""),
    conceptId: String(conceptId || ""),
    concept: String(overrides.concept || conceptId || ""),
    misconception: String(overrides.misconception || "").slice(0, 300),
    correction: overrides.correction ?? null,
    evidence: Array.isArray(overrides.evidence) ? overrides.evidence.slice(0, 10) : [],
    confidence: clamp01(overrides.confidence ?? 0.4),
    firstDetected: overrides.firstDetected || now,
    lastDetected: overrides.lastDetected || now,
    resolved: Boolean(overrides.resolved),
    resolvedAt: overrides.resolvedAt ?? null,
    resolutionEvidence: overrides.resolutionEvidence ?? null,
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

/**
 * @typedef {Object} SubjectState — derived, not stored
 * @property {string} subjectId
 * @property {number} mastery 0..1
 * @property {number} confidence 0..1
 * @property {string} priority
 * @property {string[]} weakAreas
 * @property {string[]} strongAreas
 * @property {number} gap |mastery - confidence|
 */

/**
 * @typedef {Object} LearnerSnapshot — assembled read model
 */
export function createLearnerSnapshot(uid, overrides = {}) {
  return {
    uid: String(uid || ""),
    academic: overrides.academic || createAcademicContext(),
    goals: Array.isArray(overrides.goals) ? overrides.goals.slice(0, 10) : [],
    subjectStates: overrides.subjectStates && typeof overrides.subjectStates === "object" ? { ...overrides.subjectStates } : {},
    preferences: overrides.preferences || { preferredStyle: null, availableMin: null, preferredSlot: null, studyBehaviorTags: [] },
    activeMisconceptions: Array.isArray(overrides.activeMisconceptions) ? overrides.activeMisconceptions.slice(0, 20) : [],
    recentEvents: Array.isArray(overrides.recentEvents) ? overrides.recentEvents.slice(0, 20) : [],
    progress: overrides.progress || { streak: 0, totalEvents: 0, avgMastery: 0, calibrationSummary: null },
    snapshotAt: overrides.snapshotAt || new Date().toISOString(),
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

/**
 * @typedef {Object} DiagnosticSession
 */
export function createDiagnosticSession(uid, overrides = {}) {
  return {
    sessionId: String(overrides.sessionId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    uid: String(uid || ""),
    subject: String(overrides.subject || ""),
    conceptIds: Array.isArray(overrides.conceptIds) ? overrides.conceptIds.slice(0, 20) : [],
    items: Array.isArray(overrides.items) ? overrides.items.slice() : [],
    responses: Array.isArray(overrides.responses) ? overrides.responses.slice() : [],
    startedAt: overrides.startedAt || new Date().toISOString(),
    completedAt: overrides.completedAt ?? null,
    status: ["active", "completed", "abandoned"].includes(overrides.status) ? overrides.status : "active",
    learningSchemaVersion: LEARNING_SCHEMA_VERSION,
  };
}

export function validateAcademicContext(a) {
  const errors = [];
  if (!a || typeof a !== "object") return ["AcademicContext must be an object"];
  if (a.board != null && !Object.values(Board).includes(a.board) && typeof a.board !== "string") errors.push("board invalid");
  if (a.track != null && !Object.values(Track).includes(a.track)) errors.push("track invalid");
  if (a.country != null && (typeof a.country !== "string" || a.country.length !== 2)) errors.push("country must be 2-char ISO");
  return errors;
}

export function validateGoal(g) {
  const errors = [];
  if (!g || typeof g !== "object") return ["Goal must be an object"];
  if (!isNonEmptyString(g.title, 120)) errors.push("title required 1..120");
  if (g.type && !Object.values(GoalType).includes(g.type)) errors.push("invalid goal type");
  if (g.priority && !Object.values(Priority).includes(g.priority)) errors.push("invalid priority");
  if (g.importance != null && (typeof g.importance !== "number" || g.importance < 0 || g.importance > 1)) errors.push("importance 0..1");
  return errors;
}

export function validateLearningEvent(e) {
  const errors = [];
  if (!e || typeof e !== "object") return ["LearningEvent must be an object"];
  if (!Object.values(LearningEventType).includes(e.type)) errors.push("invalid event type");
  if (e.conceptId != null && (typeof e.conceptId !== "string" || e.conceptId.length > 120)) errors.push("conceptId ≤120");
  if (e.source != null && !Object.values(EventSource).includes(e.source)) errors.push("invalid source");
  if (e.sessionId != null && (typeof e.sessionId !== "string" || e.sessionId.length > 120)) errors.push("sessionId ≤120");
  if (e.questionId != null && (typeof e.questionId !== "string" || e.questionId.length > 120)) errors.push("questionId ≤120");
  if (e.confidence != null && (typeof e.confidence !== "number" || e.confidence < 1 || e.confidence > 5)) errors.push("confidence 1..5");
  if (e.payload && typeof e.payload !== "object") errors.push("payload must be object");
  if (e.eventId != null && (typeof e.eventId !== "string" || e.eventId.length > 120 || e.eventId.length < 3)) errors.push("eventId 3..120");
  // reject forged mastery fields
  if (e.masteryScore != null || e.mastery != null) errors.push("masteryScore not allowed in event (server-derived)");
  // cap payload JSON size
  try { if (JSON.stringify(e.payload || {}).length > 4000) errors.push("payload too large"); } catch {}
  if (e.payload && e.payload.hintCount != null && (typeof e.payload.hintCount !== "number" || e.payload.hintCount < 0 || e.payload.hintCount > 20)) errors.push("hintCount 0..20");
  return errors;
}

// ---------------------------------------------------------------------------
// Validation — light, shared across clients. Full validation lives server-side.
// ---------------------------------------------------------------------------
export function validateMastery(m) {
  const errors = [];
  if (!m || typeof m !== "object") return ["Mastery must be an object"];
  if (!isNonEmptyString(m.conceptId, 120)) errors.push("conceptId required (≤120)");
  if (typeof m.masteryScore !== "number" || m.masteryScore < 0 || m.masteryScore > 1) errors.push("masteryScore must be 0..1");
  if (!Object.values(MasteryState).includes(m.masteryState)) errors.push("invalid masteryState");
  return errors;
}

export function validateLearningSession(s) {
  const errors = [];
  if (!s || typeof s !== "object") return ["Session must be an object"];
  if (!isNonEmptyString(s.subject, 100)) errors.push("subject required");
  if (!isNonEmptyString(s.topic, 200)) errors.push("topic required");
  if (typeof s.durationMinutes !== "number" || s.durationMinutes < 5 || s.durationMinutes > 480) errors.push("durationMinutes 5..480");
  return errors;
}

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}
