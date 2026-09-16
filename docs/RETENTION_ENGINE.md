# Retention Engine V1 — Deterministic Heuristic Foundation

**Purpose:** Answer "when should this concept be reviewed again?" Retention ≠ Mastery. Mastery = how well evidence suggests understanding; retention/review = likelihood to need review now.

> Retention Engine V1 is a deterministic heuristic foundation. It is not a scientifically calibrated retention predictor.

## Review Model
`REVIEW_MODEL_VERSION=1`, stored in `users/{uid}/reviews/{conceptId}` with fields `reviewState, priority, lastReviewed, nextReviewAt, intervalDays, reviewCount, retentionScore, masteryScore, evidenceStrength, recentIncorrectCount, attempts, lastOutcome, lastSource`.

## Review States (deterministic thresholds)
- `not_ready`: `evidenceStrength <0.10` — insufficient evidence, no aggressive schedule.
- `practice`: `masteryScore <0.45` — needs practice, not spaced waiting.
- `review_soon`: `nextReviewAt` within 2 days or `mastery 0.45-0.75` and future.
- `due`: `now >= nextReviewAt` (within 3 days overdue threshold).
- `overdue`: `now > nextReviewAt +3 days`.
- `stable`: `mastery≥0.75 && evidenceStrength≥0.70 && reviewCount≥2 && nextReviewAt >7d future`.

## Interval Rules (`RETENTION_CONFIG min1 max30`)
Base by mastery: ≤0.30→1d, ≤0.45→2d, ≤0.60→3d, ≤0.75→7d, ≤0.85→14d, >0.85→21d.
Evidence strength factor: `interval *= (0.6+0.4*evidenceStrength)` (weak evidence → shorter).
Recent errors: `recentIncorrectCount>=3 → min 2d`, `>=2 → min 3d`.
Last outcome: correct → `interval*1.6+1` capped 30; incorrect → `interval*0.5` floor 1; reviewCount>3 correct → +2.

## Priority Formula (0..1)
`priority = overdueFactor*0.30 + (1-mastery)*0.30 + (1-evidenceStrength)*0.15 + (recentIncorrectCount/5)*0.20 (+ goalRelevance*0.05)`
`overdueFactor = clamp01(overdueDays/14)`. Bounded 0..1, explainable. Goal relevance tie-break only.

## Retention Score (0..1)
`base = mastery*(0.6+0.4*evidenceStrength)` + `attemptBonus 0.05 if attempts≥5` - `penalty 0.08*recentIncorrectCount` capped 0.3 → `raw*(0.7+0.3*recencyFactor)` where recency from `getRecencyFactor(lastReviewed)`, then `clamp01`.

## Evidence Handling
- Retention consumes mastery (`masteryScore`, `evidenceStrength`, `recentIncorrectCount`, `lastReviewed`) — does not redefine mastery.
- `lastReviewed` = meaningful answered event time; opening review without evidence does not change interval.
- Successful review: `reviewCount++`, interval extends; failed: interval resets shorter, `nextReviewAt` sooner. Bounded 1..30.

## Server Authority
`POST /api/learning-event` → mastery calc → retention calc → writes `mastery/{conceptId}` + `reviews/{conceptId}` in same transaction. Client cannot forge `retentionScore/priority/nextReviewAt/masteryScore`. Firestore `reviews` `allow create/update/delete: if false` (Admin SDK only). Events append-only.

## Migration
Old `reviews/{conceptId}` without `evidenceStrength` → treated as `not_ready` until new evidence. New fields `reviewModelVersion:1` added, historical `intervalDays` not fabricated.

## Known Limitations
- No FSRS/SM-2/BKT/IRT/neural prediction; heuristic only.
- No full offline sync, no automatic study-plan generation, no social learning.
