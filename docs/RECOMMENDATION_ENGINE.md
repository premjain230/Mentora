# Recommendation Engine V1

**Purpose:** Convert existing learner state (mastery, evidenceStrength, reviewState, misconceptions, goals) into deterministic, explainable ranked next actions.

## Architecture
`Learner State (masteryMap+reviewsMap+misconceptions+profile) -> Candidate Concepts -> Scoring -> Ranked -> Diversity -> Learning Plan / Next Action`

Candidate concepts = union of mastery keys + review keys + misconception concepts + profile subjects/weakTopics (for new learner). No invented mastery.

## Candidate Types
- `review`: reviewState overdue/due
- `practice`: masteryScore<0.45 or recentIncorrectCount>=2
- `learn`: evidenceStrength<0.35
- `diagnostic`: evidenceStrength<0.10 (only when important, not repeatedly)

## Scoring Formula (0..1)
`score = urgency*0.25 + weakness*0.25 + evidenceGap*0.15 + misconceptionRisk*0.15 + goalRelevance*0.10 + reviewPriority*0.10`
- urgency: overdue1.00, due0.85, practice0.65, review_soon0.45, not_ready0.25, stable0.05
- weakness = 1-masteryScore
- evidenceGap = 1-evidenceStrength
- misconceptionRisk = recentIncorrectCount/5 +0.3 if hasMisconception, capped 1
- goalRelevance: priority subject 1.0, goal-related 0.8, normal selected subject 0.5, unrelated 0.2
- reviewPriority from reviews.priority else 0

## Evidence-Aware Safety
`mastery 0.30 + evidence 0.08` → not proven weak → recommends `learn/diagnostic` with reason `low_evidence`, not `practice`. Only `evidenceStrength>=0.35 && mastery<0.45` is genuine weak. Prevents false certainty.

## Reasons (priority order)
`overdue_review > due_review > misconception_risk > recent_mistakes > low_mastery > low_evidence > priority_goal > review_soon > stable_maintenance` with human explanations.

## Ranking & Diversity
Sort score desc, tie-breakers: higher urgency → lower mastery → lower evidenceStrength → higher recentIncorrectCount → conceptId alphabetical (deterministic). Diversity: max 3 per subject, fill remaining from next-highest. Limit default 5, max 10, min 1, empty → [].

## Integration
- `history.js` builds `recommendationStats {total,review,practice,learn,diagnostic,topScore}` + `nextBestAction` via `getRecommendations`/`getNextBestAction` (derived, not persisted).
- `ai-context.js` exposes compact `recommendations {nextBestAction:{subject,topic,action,reason}, counts}`.
- Server `GET /api/recommendations` verifies token, loads Firestore state, calculates same formula (authoritative). Client derived matches server.
- Planner/home UI consumes `nextBestAction` and `recommendations` to route to `review`→review.html / `practice`→quiz.html / `learn`→study-session.html / `diagnostic`→diagnostic.html.

## Security
No client can write `masteryScore/evidenceStrength/reviewState/priority/retentionScore`; recommendations derived from trusted state; UID from token; private profile (email/photoURL) never in AI context.

## Web/Android Parity
Same constants/formulas in `js/learning/recommendation-engine.js` and `lib/learning/recommendation_engine.dart`; server authoritative.

## Limitations
- No RL/neural/BKT/IRT/FSRS/knowledge graph/curriculum generation; heuristic V1.
- New learner with empty maps gets diagnostic/learn in priority subject, not "weak at Math".
