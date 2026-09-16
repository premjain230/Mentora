/**
 * Aquila Adaptive Learning Engine V1 — The central learning loop
 * 
 * Connects: Events → Evidence → Mastery → Retention → Curriculum → Recommendations → Actions → New Evidence
 * 
 * This is the central orchestrator that makes the learning loop adaptive.
 */
import { clamp01 } from "./schema.js";
import { calculateMastery, masteryStateFor } from "./mastery-engine.js";
import { calculateReview, calculateRetentionScore, calculatePriority, deriveReviewState, calculateInterval } from "./retention-engine.js";
import { getRecommendations, getNextBestAction } from "./recommendation-engine.js";
import { getPrerequisiteReadiness, getPrerequisiteRisks, getLearningPath, getAdaptiveLearningPath, isBlockedByPrerequisites } from "./curriculum-graph.js";
import { emitLearningEvent } from "./evidence.js";

export const ADAPTIVE_CONFIG = Object.freeze({
  // Evidence thresholds
  EVIDENCE_THRESHOLD_LEARN: 0.35,
  EVIDENCE_THRESHOLD_DIAGNOSTIC: 0.10,
  MASTERY_THRESHOLD_PRACTICE: 0.45,
  RECENT_INCORRECT_THRESHOLD: 2,
  RECENT_INCORRECT_PRACTICE_THRESHOLD: 2,
  EVIDENCE_LEARN_THRESHOLD: 0.35,
  EVIDENCE_DIAGNOSTIC: 0.10,
  
  // Readiness thresholds (matching curriculum-graph.js)
  READINESS_EVIDENCE_THRESHOLD: 0.35,
  READINESS_MASTERY_THRESHOLD: 0.60,
  
  // Action thresholds
  MASTERY_PRACTICE_THRESHOLD: 0.45,
  RECENT_INCORRECT_PRACTICE_THRESHOLD: 2,
  EVIDENCE_LEARN_THRESHOLD: 0.35,
  EVIDENCE_DIAGNOSTIC: 0.10,
};

export const AdaptiveAction = Object.freeze({
  DIAGNOSTIC: "diagnostic",
  LEARN: "learn",
  PRACTICE: "practice",
  REVIEW: "review",
  MAINTENANCE: "maintenance",
});

/**
 * Central adaptive learning engine.
 * Determines what action a learner should take next based on their full learning state.
 */
export class AdaptiveLearningEngine {
  constructor(db, uid) {
    this.db = db;
    this.uid = uid;
  }

  /**
   * Determine the next best action for a concept based on full learner state.
   * This is the core decision engine.
   */
  async determineNextAction(conceptId, learnerState) {
    const {
      masteryMap = {},
      reviewsMap = {},
      misconceptions = [],
      profile = {},
      curriculumGraph = null,
    } = learnerState;

    const mastery = masteryMap[conceptId] || { masteryScore: 0.5, evidenceStrength: 0, recentIncorrectCount: 0 };
    const review = reviewsMap[conceptId] || { reviewState: "not_ready", priority: 0, intervalDays: 0 };
    const misconceptionSet = new Set(misconceptions?.filter(m => !m.resolved).map(m => String(m.conceptId)) || []);
    
    const masteryScore = clamp01(mastery.masteryScore ?? 0.5);
    const evidenceStrength = clamp01(mastery.evidenceStrength ?? 0);
    const recentIncorrectCount = Number(mastery.recentIncorrectCount ?? 0);
    const reviewState = review.reviewState || "not_ready";
    const hasMisconception = misconceptionSet.has(conceptId);
    
    // Check prerequisite blocking
    const prerequisiteRisks = getPrerequisiteRisks(conceptId, masteryMap);
    const blockedByPrereqs = prerequisiteRisks.filter(r => !r.ready).length > 0;
    const prerequisiteBlocked = blockedByPrereqs;
    
    // Determine action based on evidence-aware safety
    const action = this.chooseAction({
      masteryScore: clamp01(mastery.masteryScore ?? 0.5),
      evidenceStrength: clamp01(mastery.evidenceStrength ?? 0),
      reviewState,
      recentIncorrectCount,
      hasMisconception,
      prerequisiteBlocked,
    });

    // Determine reason
    const reason = this.chooseReason({
      masteryScore: clamp01(mastery.masteryScore ?? 0.5),
      evidenceStrength,
      reviewState,
      recentIncorrectCount,
      hasMisconception,
      prerequisiteBlocked,
    });

    return {
      conceptId,
      action,
      reason,
      masteryScore: clamp01(mastery.masteryScore ?? 0.5),
      evidenceStrength,
      reviewState,
      reason,
    };
  }

  /**
   * Choose action based on evidence-aware safety principles
   * Evidence-aware safety: low evidence + low mastery = needs evidence, NOT proven weak
   */
  chooseAction({ masteryScore, evidenceStrength, reviewState, recentIncorrectCount, hasMisconception, prerequisiteBlocked = false }) {
    // Evidence-aware safety: low evidence + low mastery => needs evidence, NOT proven weak
    if (evidenceStrength < 0.10) return "diagnostic";
    if (evidenceStrength < 0.35) return "learn";
    
    if (reviewState === "overdue" || reviewState === "due") return "review";
    if (prerequisiteBlocked) return "learn"; // Blocked by prerequisites -> learn prerequisites first
    if (masteryScore < 0.45 || recentIncorrectCount >= 2) return "practice";
    if (evidenceStrength < 0.35) return "learn";
    if (reviewState === "review_soon" || reviewState === "practice") return "practice";
    return "review";
  }

  /**
   * Choose reason for recommendation - priority ordered
   */
  chooseReason({ masteryScore, evidenceStrength, reviewState, recentIncorrectCount, hasMisconception, prerequisiteBlocked = false }) {
    // Priority order (matches recommendation-engine.js)
    if (reviewState === "overdue") return "overdue_review";
    if (reviewState === "due") return "due_review";
    if (hasMisconception) return "misconception_risk";
    if (recentIncorrectCount >= 2) return "recent_mistakes";
    if (evidenceStrength >= 0.35 && masteryScore < 0.45) return "low_mastery";
    if (evidenceStrength < 0.35) return evidenceStrength < 0.10 ? "low_evidence" : "low_evidence";
    if (reviewState === "review_soon") return "review_soon";
    return "stable_maintenance";
  }

  /**
   * Get adaptive learning path for a target concept
   * Returns ordered path with readiness status for each step
   */
  async getAdaptiveLearningPath(targetConceptId, learnerState) {
    const path = getLearningPath(targetConceptId, learnerState.masteryMap || {});
    const result = [];
    
    for (const step of path) {
      const conceptId = step.conceptId;
      const status = step.status;
      const mastery = learnerState.masteryMap[conceptId];
      
      let readiness = "unknown";
      if (step.conceptId === targetConceptId) {
        readiness = "target";
      } else if (!mastery) {
        readiness = "unknown";
      } else if (Number(step.evidenceStrength ?? 0) < 0.35) {
        readiness = "needs_evidence";
      } else if (Number(mastery.masteryScore ?? 0) >= 0.60) {
        readiness = "ready";
      } else {
        readiness = "needs_learning";
      }
      
      result.push({
        conceptId: step.conceptId,
        concept: getConcept(step.conceptId),
        readiness,
        status: step.status,
        isPrerequisite: step.conceptId !== targetConceptId,
      });
    }
    
    // Determine overall recommendation
    const targetMastery = learnerState.masteryMap[targetConceptId];
    const blockedBy = [];
    for (const step of path) {
      if (step.conceptId === targetConceptId) break;
      const mastery = learnerState.masteryMap[step.conceptId];
      if (!mastery || Number(mastery.evidenceStrength ?? 0) < 0.35) {
        blockedBy.push(step.conceptId);
      }
    }
    
    return {
      targetConceptId,
      path,
      blockedBy,
      canStart: blockedBy.length === 0,
    };
  }

  /**
   * Check if a concept is blocked by prerequisite readiness
   */
  isBlockedByPrerequisites(conceptId, learnerState) {
    const risks = getPrerequisiteRisks(conceptId, learnerState.masteryMap || {});
    return risks.filter(r => !r.ready).map(r => r.conceptId);
  }

  /**
   * Get prerequisite readiness for a concept
   */
  getPrerequisiteReadiness(conceptId, learnerState) {
    return getPrerequisiteReadiness(conceptId, learnerState.masteryMap || {});
  }

  /**
   * Get prerequisite risks for a concept
   */
  getPrerequisiteRisks(conceptId, learnerState) {
    return getPrerequisiteRisks(conceptId, learnerState.masteryMap || {});
  }

  /**
   * Process a learning event through the full adaptive pipeline
   * This is the main entry point for the adaptive learning loop
   */
  async processLearningEvent(event, learnerState) {
    const { type, conceptId, correct, confidence, hintCount, source, sessionId } = event;
    
    // 1. Emit learning event (creates evidence)
    await emitLearningEvent(this.db, this.uid, event.type, {
      conceptId: event.conceptId,
      subject: event.subject,
      topic: event.topic,
      source: event.source,
      sessionId: event.sessionId,
      questionId: event.questionId,
      payload: { correct: event.correct, hintCount: event.hintCount, mode: event.mode },
      confidence: event.confidence,
    });

    // 2. Update mastery & retention (handled by server via /api/learning-event)
    // Client just emits event; server handles aggregation
    
    // 3. Check for new recommendations after evidence
    const updatedLearnerState = await this.refreshLearnerState();
    
    // 4. Check for new recommendations
    const recommendations = getRecommendations({
      masteryMap: updatedLearnerState.masteryMap || {},
      reviewsMap: updatedLearnerState.reviewsMap || {},
      misconceptions: updatedLearnerState.misconceptions || [],
      profile: updatedLearnerState.profile || {},
      limit: 5,
    });
    
    return {
      updatedLearnerState,
      recommendations,
      nextBestAction: getNextBestAction({
        masteryMap: updatedLearnerState.masteryMap || {},
        reviewsMap: updatedLearnerState.reviewsMap || {},
        misconceptions: updatedLearnerState.misconceptions || [],
        profile: updatedLearnerState.profile || {},
      }),
    };
  }

  /**
   * Refresh learner state from Firestore
   */
  async refreshLearnerState() {
    const { getDocs, collection, query, orderBy, limit, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    
    const [masterySnap, reviewsSnap, miscSnap, profileSnap] = await Promise.all([
      getDocs(collection(this.db, "users", this.uid, "mastery")),
      getDocs(collection(this.db, "users", this.uid, "reviews")),
      getDocs(query(collection(this.db, "users", this.uid, "misconceptions"), limit(20))),
      getDoc(doc(this.db, "users", this.uid, "learning", "profile")),
    ]);
    
    return {
      masteryMap: Object.fromEntries(masterySnap.docs.map(d => [d.id, d.data()])),
      reviewsMap: Object.fromEntries(reviewsSnap.docs.map(d => [d.id, d.data()])),
      misconceptions: miscSnap.docs.map(d => d.data()),
      profile: profileSnap.data() || {},
    };
  }
}

/**
 * Get next best action for the learner (convenience wrapper)
 */
export async function getNextBestActionForLearner(db, uid, learnerState) {
  const engine = new AdaptiveLearningEngine(db, uid);
  return engine.getNextBestActionForLearner(learnerState);
}

export { AdaptiveLearningEngine, ADAPTIVE_CONFIG, AdaptiveAction };
