/**
 * Retention Engine V1 — deterministic, explainable, server-authoritative
 * Mastery ≠ Retention. Retention = when to review.
 */
import { clamp01, getRecencyFactor } from "./schema.js";

export const REVIEW_MODEL_VERSION = 1;
export const RETENTION_CONFIG = Object.freeze({
  minIntervalDays: 1,
  maxIntervalDays: 30,
  baseIntervals: [
    { maxMastery: 0.30, days: 1 },
    { maxMastery: 0.45, days: 2 },
    { maxMastery: 0.60, days: 3 },
    { maxMastery: 0.75, days: 7 },
    { maxMastery: 0.85, days: 14 },
    { maxMastery: 1.00, days: 21 },
  ],
});

export const ReviewState = Object.freeze({
  NOT_READY: "not_ready",
  PRACTICE: "practice",
  REVIEW_SOON: "review_soon",
  DUE: "due",
  OVERDUE: "overdue",
  STABLE: "stable",
});

function baseIntervalForMastery(masteryScore) {
  const s = clamp01(masteryScore);
  for (const b of RETENTION_CONFIG.baseIntervals) {
    if (s <= b.maxMastery) return b.days;
  }
  return RETENTION_CONFIG.maxIntervalDays;
}

export function calculateInterval({ masteryScore, evidenceStrength, recentIncorrectCount, lastOutcome, reviewCount }) {
  let interval = baseIntervalForMastery(masteryScore);
  // evidence strength shrinks interval when weak
  const es = clamp01(evidenceStrength);
  const evidenceFactor = 0.6 + 0.4 * es; // 0.6..1.0
  interval = Math.round(interval * evidenceFactor);
  // recent errors force short interval
  if (recentIncorrectCount >= 3) interval = Math.min(interval, 2);
  else if (recentIncorrectCount >= 2) interval = Math.min(interval, 3);
  // last outcome extension / reset
  if (lastOutcome === "correct") {
    interval = Math.min(RETENTION_CONFIG.maxIntervalDays, Math.round(interval * 1.6) + 1);
  } else if (lastOutcome === "incorrect") {
    interval = Math.max(RETENTION_CONFIG.minIntervalDays, Math.round(interval * 0.5));
  }
  // reviewCount gradual growth: each successful review slightly extends (if not already handled)
  if (reviewCount > 3 && lastOutcome === "correct") {
    interval = Math.min(RETENTION_CONFIG.maxIntervalDays, interval + 2);
  }
  return Math.max(RETENTION_CONFIG.minIntervalDays, Math.min(RETENTION_CONFIG.maxIntervalDays, interval));
}

export function calculateRetentionScore({ masteryScore, evidenceStrength, attempts, recentIncorrectCount, lastReviewed, now }) {
  const m = clamp01(masteryScore);
  const e = clamp01(evidenceStrength);
  const base = m * (0.6 + 0.4 * e); // mastery weighted by evidence
  const attemptBonus = attempts >= 5 ? 0.05 : 0;
  const errorPenalty = Math.min(0.3, (recentIncorrectCount || 0) * 0.08);
  const recency = getRecencyFactor(lastReviewed || now);
  const raw = (base + attemptBonus - errorPenalty) * (0.7 + 0.3 * recency);
  return clamp01(raw);
}

export function calculatePriority({ masteryScore, evidenceStrength, recentIncorrectCount, nextReviewAt, lastReviewed, now, goalRelevance = 0 }) {
  const overdueDays = nextReviewAt ? Math.max(0, (new Date(now) - new Date(nextReviewAt)) / (1000*60*60*24)) : 0;
  const overdueFactor = clamp01(overdueDays / 14); // 14 days overdue = 1
  const weakness = clamp01(1 - clamp01(masteryScore));
  const evidenceWeak = clamp01(1 - clamp01(evidenceStrength));
  const recent = clamp01((recentIncorrectCount || 0) / 5);
  const goal = clamp01(goalRelevance);
  const priority = overdueFactor * 0.30 + weakness * 0.30 + evidenceWeak * 0.15 + recent * 0.20 + goal * 0.05;
  return clamp01(priority);
}

export function deriveReviewState({ masteryScore, evidenceStrength, intervalDays, nextReviewAt, lastReviewed, now, recentIncorrectCount, reviewCount }) {
  const es = clamp01(evidenceStrength);
  if (es < 0.10) return ReviewState.NOT_READY;
  if (clamp01(masteryScore) < 0.45) return ReviewState.PRACTICE;
  if (!nextReviewAt) return ReviewState.REVIEW_SOON;
  const nowMs = new Date(now).getTime();
  const nextMs = new Date(nextReviewAt).getTime();
  const diffDays = (nextMs - nowMs) / (1000*60*60*24);
  if (diffDays <= -3) return ReviewState.OVERDUE;
  if (diffDays <= 0) return ReviewState.DUE;
  if (diffDays <= 2) return ReviewState.REVIEW_SOON;
  // stable: strong mastery + strong evidence + future review + at least 2 reviews
  if (clamp01(masteryScore) >= 0.75 && es >= 0.70 && reviewCount >= 2 && diffDays > 7) return ReviewState.STABLE;
  return ReviewState.REVIEW_SOON;
}

export function calculateReview({ masteryScore, evidenceStrength, attempts, correct, confidenceScore, recentIncorrectCount, lastReviewed, lastOutcome, lastSource, reviewCount, now }) {
  const intervalDays = calculateInterval({ masteryScore, evidenceStrength, recentIncorrectCount, lastOutcome, reviewCount: reviewCount || 0 });
  const nextReviewAt = new Date(new Date(lastReviewed || now).getTime() + intervalDays * 24*60*60*1000).toISOString();
  const retentionScore = calculateRetentionScore({ masteryScore, evidenceStrength, attempts, recentIncorrectCount, lastReviewed, now });
  const priority = calculatePriority({ masteryScore, evidenceStrength, recentIncorrectCount, nextReviewAt, lastReviewed, now });
  const reviewState = deriveReviewState({ masteryScore, evidenceStrength, intervalDays, nextReviewAt, lastReviewed, now, recentIncorrectCount, reviewCount });
  return { intervalDays, nextReviewAt, retentionScore, priority, reviewState };
}
