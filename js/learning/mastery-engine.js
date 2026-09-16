/**
 * Aquila Mastery Engine — Prompt 5 deterministic estimator
 * Pure, no side effects, same logic must be mirrored server-side.
 */
import { clamp01, getSourceWeight, getHintFactor, getRecencyFactor, normalizeConfidence, masteryStateV2, MASTERY_PRIOR } from "./schema.js";

/**
 * Calculate weighted mastery from evidence items.
 * Each evidence: { correct: 0|1, source, hintCount, createdAt, confidence? }
 * Returns { masteryScore, evidenceStrength, weightedCorrectness, effectiveWeight }
 */
export function calculateMastery(evidenceItems) {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) {
    return { masteryScore: 0.5, evidenceStrength: 0, weightedCorrectness: 0.5, effectiveWeight: 0, rawMastery: 0.5 };
  }
  let sumW = 0;
  let sumWC = 0;
  let hasConfidence = false;
  let confidenceSum = 0;
  let confCount = 0;
  for (const e of evidenceItems) {
    const sourceWeight = getSourceWeight(e.source);
    const hintFactor = getHintFactor(e.hintCount ?? 0);
    const recencyFactor = getRecencyFactor(e.createdAt);
    const w = sourceWeight * hintFactor * recencyFactor;
    if (w <= 0) continue;
    const perf = e.correct ? 1 : 0;
    sumW += w;
    sumWC += perf * w;
    if (e.confidence != null) {
      hasConfidence = true;
      confidenceSum += normalizeConfidence(e.confidence) ?? 0.5;
      confCount++;
    }
  }
  if (sumW === 0) {
    return { masteryScore: 0.5, evidenceStrength: 0, weightedCorrectness: 0.5, effectiveWeight: 0, rawMastery: 0.5 };
  }
  const weightedCorrectness = sumWC / sumW;
  let confidenceAdjustment = 0;
  if (hasConfidence && confCount > 0) {
    const avgConf = confidenceSum / confCount;
    confidenceAdjustment = (avgConf - 0.5) * 0.10;
  }
  const rawMastery = clamp01(weightedCorrectness + confidenceAdjustment);
  const sampleFactor = Math.min(1, sumW / 3);
  const masteryScore = clamp01(MASTERY_PRIOR * (1 - sampleFactor) + rawMastery * sampleFactor);
  const evidenceStrength = clamp01(sumW / 5);
  return { masteryScore, evidenceStrength, weightedCorrectness, effectiveWeight: sumW, rawMastery };
}

export function masteryStateFor(score, evidenceStrength) {
  return masteryStateV2(score, evidenceStrength);
}
