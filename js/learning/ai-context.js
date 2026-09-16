/**
 * Aquila Learning — AI Context Builder (Prompt 2)
 * Filters LearnerSnapshot to the minimal relevant context for the current turn.
 * Privacy: never includes email/photoURL/account PII.
 */

export function buildLearningContext({ snapshot, currentSubject = null, currentTopic = null, currentConceptId = null, tokenBudget = 800 }) {
  if (!snapshot) return { academic: null, goals: [], subjectState: null, topicState: null, misconceptions: [], recentEvidence: [], preferences: null, meta: {} };
  const subjectKey = currentSubject ? String(currentSubject).toLowerCase().replace(/\s+/g, "_") : null;
  const subjectState = subjectKey ? (snapshot.subjectStates?.[subjectKey] || snapshot.subjectStates?.[currentSubject] || null) : null;

  // topicState: try concept mastery, else subject aggregate
  let topicState = null;
  if (currentConceptId && snapshot.subjectStates) {
    // look up mastery via recentEvents evidenceRefs is not enough — caller should pass masteryMap separately;
    // for Prompt 2 we surface subjectState as proxy and let the caller inject exact concept mastery if available
    topicState = subjectState;
  }

  // Prompt 5: expose masteryMap-driven concept state if caller provided via snapshot.masteryMap
  const masteryMap = snapshot.masteryMap || snapshot._masteryMap || {};
  let conceptState = null;
  if (currentConceptId && masteryMap[currentConceptId]) {
    const m = masteryMap[currentConceptId];
    conceptState = { conceptId: m.conceptId, masteryScore: m.masteryScore, masteryState: m.masteryState, evidenceStrength: m.evidenceStrength, accuracy: m.accuracy, attempts: m.attempts, confidenceScore: m.confidenceScore, recentIncorrectCount: m.recentIncorrectCount, lastReviewed: m.lastReviewed };
  }
  const goals = Array.isArray(snapshot.goals) ? snapshot.goals.filter(g => g.status === "active").slice(0, 3).map(g => ({ title: g.title, priority: g.priority, type: g.type })) : [];
  const misconceptions = (snapshot.activeMisconceptions || [])
    .filter(m => !currentConceptId || m.conceptId === currentConceptId || (!m.subject || m.subject === currentSubject))
    .slice(0, 3)
    .map(m => ({ conceptId: m.conceptId, misconception: m.misconception, confidence: m.confidence }));

  const recentEvidence = (snapshot.recentEvents || [])
    .filter(e => !currentConceptId || e.conceptId === currentConceptId)
    .slice(0, 5)
    .map(e => ({ type: e.type, conceptId: e.conceptId, payload: e.payload, confidence: e.confidence }));

  const reviewState = snapshot.reviewStats ? {
    due: snapshot.reviewStats.due || 0,
    overdue: snapshot.reviewStats.overdue || 0,
    practice: snapshot.reviewStats.practice || 0,
    reviewSoon: snapshot.reviewStats.reviewSoon || 0,
  } : null;
  const recommendations = snapshot.nextBestAction ? {
    nextBestAction: { subject: snapshot.nextBestAction.subject, topic: snapshot.nextBestAction.topic, action: snapshot.nextBestAction.action, reason: snapshot.nextBestAction.reason },
    counts: snapshot.recommendationStats || { review:0, practice:0, learn:0, diagnostic:0 },
  } : (snapshot.recommendationStats ? { counts: snapshot.recommendationStats } : null);
  const ctx = {
    academic: snapshot.academic ? { board: snapshot.academic.board, grade: snapshot.academic.grade, track: snapshot.academic.track, country: snapshot.academic.country } : null,
    goals,
    priorities: subjectState ? { currentSubject, mastery: subjectState.mastery, evidenceStrength: subjectState.evidenceStrength, gap: subjectState.gap } : null,
    subjectState,
    topicState: conceptState || topicState,
    conceptState,
    reviewState,
    recommendations,
    activeMisconceptions: misconceptions,
    recentEvidence,
    preferences: snapshot.preferences || null,
    meta: { snapshotAt: snapshot.snapshotAt, learningSchemaVersion: snapshot.learningSchemaVersion, note: "masteryScore=estimated mastery (not accuracy), accuracy=observed correctness, evidenceStrength=evidence quantity/quality, confidenceScore=learner-reported, recentIncorrectCount=recent difficulty" },
  };

  // token budget: crude JSON length cap (≈ 4 chars/token)
  const maxChars = tokenBudget * 4;
  let json = JSON.stringify(ctx);
  if (json.length > maxChars) {
    // truncate cheapest first: recentEvidence tail
    ctx.recentEvidence = ctx.recentEvidence.slice(0, 2);
    json = JSON.stringify(ctx);
    if (json.length > maxChars) {
      ctx.activeMisconceptions = ctx.activeMisconceptions.slice(0, 1);
      json = JSON.stringify(ctx);
    }
  }
  return ctx;
}

export function contextToPromptSection(context) {
  if (!context) return "";
  return `LEARNER CONTEXT (filtered, relevant only):
Academic: ${JSON.stringify(context.academic)}
Goals: ${JSON.stringify(context.goals)}
Subject state: ${JSON.stringify(context.subjectState)}
Misconceptions: ${JSON.stringify(context.activeMisconceptions)}
Recent evidence: ${JSON.stringify(context.recentEvidence)}
Preferences: ${JSON.stringify(context.preferences)}`;
}
