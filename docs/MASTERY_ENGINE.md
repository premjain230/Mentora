# Prompt 5 — Mastery Engine (Deterministic)

## What masteryScore means
Estimated probability learner can answer correctly on that concept *right now*, derived from weighted observed evidence. NOT raw accuracy. Range 0..1, `clamp01`.

## What accuracy means
Observed `correct / attempts` from answered events (quiz/study_session/diagnostic). Separate from mastery. Example `accuracy 0.80` with `mastery 0.68` = 80% correct but insufficient/high-quality evidence to claim 80% mastery.

## What evidenceStrength means
`clamp01(effectiveWeight / 5)` where `effectiveWeight = sum(sourceWeight*hintFactor*recencyFactor)`. 0..1 indicating quantity+quality. `0.15` = little evidence, should not be called "strong".

## Source weighting (centralized `EVIDENCE_SOURCE_WEIGHTS`)
`diagnostic 1.0 > quiz 0.90 > study_session 0.65 > self_report/onboarding 0.20`; unknown → 0 (ignored, not silently high).

## Hints
`getHintFactor(hintCount)`: 0→1.00, 1→0.85, 2→0.70, 3→0.55, ≥4→0.40. Reduces weight, never flips correct→incorrect.

## Confidence
`1→0.00 .. 5→1.00` via `(c-1)/4`. Adjustment `(avgConf-0.5)*0.10` added to weighted correctness, bounded, only if supplied. Never overrides correctness (correct+conf1 still >0.5, incorrect+conf5 still <0.5).

## Recency
`getRecencyFactor(age)`: ≤7d 1.00, ≤30d 0.90, ≤90d 0.75, ≤180d 0.60, older 0.45; invalid →1.0.

## Why not raw accuracy
`weightedCorrectness = sum(perf*weight)/sum(weight)` then `rawMastery = weightedCorrectness + confidenceAdjustment` then small-sample shrinkage `mastery = prior*(1-sampleFactor)+raw*sampleFactor` with `sampleFactor=min(1, effectiveWeight/3)`, prior 0.5. So 1 correct → ~0.60 not 1.0; 3c2i → ~0.60 not 0.66.

## Misconception candidates
From latest 10 answered evidence: `recentIncorrectCount` = count correct==false. Candidate created only if `recentIncorrectCount>=3` AND ≥2 of those 5 have weight≥0.5 (meaningful). Doc `misconceptions/{conceptId}_candidate` with confidence 0.5→0.9, candidate not confirmed.

## MasteryStateV2
`unknown` if evidenceStrength<0.10; `emerging/developing` capped if <0.35; else <0.30 emerging, <0.50 developing, <0.70 proficient, ≥0.70 strong. Prevents false certainty.

## Server authoritative
`POST /api/learning-event` validates, writes event, recalculates mastery in transaction, writes `mastery/{conceptId}` with `masteryScore, masteryState, evidenceStrength, attempts, correct, accuracy, confidenceScore, evidence[20], recentIncorrectCount, lastReviewed, masteryModelVersion:2`. Client cannot forge (`firestore.rules: mastery allow create/update/delete: if false`).

## Bounded window
`evidence[20]` minimal `{eventId,type,source,correct,hintCount,confidence,createdAt,at}`; full event in `learningEvents/{eventId}`.

## Migration
Old docs with `masteryScore 0` and no `masteryModelVersion` are treated as prior; next answered event recomputes from new evidence window, preserving attempts/correct where valid.
