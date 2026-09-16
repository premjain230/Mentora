/**
 * Aquila Learning — History Model (Prompt 2)
 * Append-only learningEvents + derived LearnerSnapshot.
 * Never overwrites history; corrections emit new events.
 */

import { createLearnerSnapshot, createAcademicContext } from "./contracts.js";
import { getRecommendations, getNextBestAction } from "./recommendation-engine.js";

function toIso(v) {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v.toDate) { try { return v.toDate().toISOString(); } catch {} }
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function subjectMasteryFromMap(conceptMastery, subject) {
  // subjectMastery = mean of concepts whose conceptId starts with subject prefix
  // Fallback: if no prefix convention, use all concepts (caller should filter)
  const vals = Object.values(conceptMastery || {});
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + (Number(b) || 0), 0) / vals.length;
}

/**
 * Build a LearnerSnapshot from fetched pieces.
 * Pure — same derivation on Web and Android.
 */
export function buildLearnerSnapshot({ uid, profile, studentModel, masteryMap, goals, misconceptions, recentEvents, progress, reviewsMap }) {
  const academic = createAcademicContext(profile?.academic || profile || {});
  const subjectStates = {};
  // derive per-subject aggregates from masteryMap
  const bySubject = {};
  for (const [conceptId, m] of Object.entries(masteryMap || {})) {
    const subj = m.subject || m.subjectId || conceptId.split("_")[0] || "general";
    (bySubject[subj] = bySubject[subj] || []).push(m);
  }
  for (const [subj, list] of Object.entries(bySubject)) {
    // Prompt 5: evidence-weighted aggregation (§23) — unknown if no evidence
    const withEvidence = list.filter(x => (Number(x.evidenceStrength) || 0) > 0 || (Number(x.attempts)||0)>0);
    let mastery = null;
    let evidenceStrengthAvg = null;
    if (withEvidence.length === 0) {
      mastery = null;
    } else {
      let sumW = 0, sumWM = 0, sumE = 0;
      for (const m of withEvidence) {
        const w = Number(m.evidenceStrength) || 0;
        const weight = w > 0 ? w : 0.05; // minimal weight for low-evidence concepts
        sumW += weight;
        sumWM += (Number(m.masteryScore)||0) * weight;
        sumE += w;
      }
      mastery = sumW > 0 ? sumWM / sumW : null;
      evidenceStrengthAvg = withEvidence.length ? sumE / withEvidence.length : 0;
    }
    const confs = list.map(x => Number(x.confidenceScore) || 0);
    const confidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
    // Weak/strong per §24: needs evidenceStrength >= threshold
    const WEAK_THRESHOLD = 0.35;
    const STRONG_THRESHOLD = 0.35;
    const weakCandidates = list.filter(x => (Number(x.evidenceStrength)||0) >= WEAK_THRESHOLD && Number(x.masteryScore) < 0.45);
    const strongCandidates = list.filter(x => (Number(x.evidenceStrength)||0) >= STRONG_THRESHOLD && Number(x.masteryScore) >= 0.75);
    const needsEvidence = list.filter(x => (Number(x.evidenceStrength)||0) < 0.35);
    const sorted = [...list].sort((a, b) => (Number(a.masteryScore) || 0) - (Number(b.masteryScore) || 0));
    subjectStates[subj] = {
      subjectId: subj,
      mastery,
      evidenceStrength: evidenceStrengthAvg,
      confidence,
      priority: list[0]?.priority || "medium",
      weakAreas: weakCandidates.slice(0,3).map(x=>x.conceptId),
      strongAreas: strongCandidates.slice(0,3).map(x=>x.conceptId),
      needsEvidence: needsEvidence.slice(0,3).map(x=>x.conceptId),
      lastActivity: list.reduce((latest, x) => {
        const t = toIso(x.lastReviewed) || toIso(x.updatedAt);
        return !latest || (t && t > latest) ? t : latest;
      }, null),
      evidenceCount: list.reduce((s, x) => s + (Number(x.attempts) || 0), 0),
      gap: mastery==null ? null : Math.abs(mastery - confidence),
    };
  }

  // Review overview (Prompt 7)
  const reviews = reviewsMap ? Object.values(reviewsMap) : [];
  const reviewStats = {
    due: reviews.filter(r=>r.reviewState==='due').length,
    overdue: reviews.filter(r=>r.reviewState==='overdue').length,
    practice: reviews.filter(r=>r.reviewState==='practice').length,
    reviewSoon: reviews.filter(r=>r.reviewState==='review_soon').length,
    notReady: reviews.filter(r=>r.reviewState==='not_ready').length,
    stable: reviews.filter(r=>r.reviewState==='stable').length,
  };
  // Subject-level review needs
  const subjectReviewNeeds = {};
  for (const [subj, state] of Object.entries(subjectStates)) {
    const subjReviews = reviews.filter(r=> (r.subject||"").toLowerCase()===subj);
    subjectReviewNeeds[subj] = {
      overdue: subjReviews.filter(r=>r.reviewState==='overdue').length,
      due: subjReviews.filter(r=>r.reviewState==='due').length,
      practice: subjReviews.filter(r=>r.reviewState==='practice').length,
    };
  }
  // Recommendation V1 (Prompt 8) — derived, not persisted
  let recommendationStats = { total:0, review:0, practice:0, learn:0, diagnostic:0, topScore:0 };
  let nextBestAction = null;
  try {
    const recs = getRecommendations({ masteryMap: masteryMap||{}, reviewsMap: reviewsMap||{}, misconceptions: misconceptions||[], profile: profile||{}, limit:5 });
    recommendationStats = {
      total: recs.length,
      review: recs.filter(r=>r.action==="review").length,
      practice: recs.filter(r=>r.action==="practice").length,
      learn: recs.filter(r=>r.action==="learn").length,
      diagnostic: recs.filter(r=>r.action==="diagnostic").length,
      topScore: recs[0]?.score ?? 0,
    };
    nextBestAction = getNextBestAction({ masteryMap, reviewsMap, misconceptions, profile });
  } catch {}
  const snap = createLearnerSnapshot(uid, {
    academic,
    goals: Array.isArray(goals) ? goals : [],
    subjectStates,
    preferences: profile?.preferences || { preferredStyle: profile?.preferredStyle || null, availableMin: profile?.dailyHours ? profile.dailyHours * 60 : null },
    activeMisconceptions: Array.isArray(misconceptions) ? misconceptions.filter(m => !m.resolved).slice(0, 20) : [],
    recentEvents: Array.isArray(recentEvents) ? recentEvents.slice(0, 20) : [],
    progress: progress || { streak: studentModel?.sessionCount || 0, totalEvents: recentEvents?.length || 0, avgMastery: subjectMasteryFromMap(studentModel?.conceptMastery || {}, null) },
  });
  snap.reviewsMap = reviewsMap || {};
  snap.reviewStats = reviewStats;
  snap.subjectReviewNeeds = subjectReviewNeeds;
  snap.recommendationStats = recommendationStats;
  snap.nextBestAction = nextBestAction;
  return snap;
}

export function explainMastery(mastery) {
  if (!mastery) return "No evidence yet.";
  const parts = [];
  if (mastery.attempts != null) parts.push(`${mastery.attempts} attempts, ${mastery.correct ?? 0} correct`);
  if (typeof mastery.accuracy === "number") parts.push(`${Math.round(mastery.accuracy * 100)}% accuracy`);
  if (mastery.lastReviewed) parts.push(`last practiced ${mastery.lastReviewed.slice(0, 10)}`);
  if (mastery.evidence?.length) parts.push(`${mastery.evidence.length} evidence items`);
  return parts.join(" · ") || `Mastery ${(Number(mastery.masteryScore) * 100).toFixed(0)}%`;
}
