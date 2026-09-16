# Aquila Learning System — Final Architecture

## 1. Learning Architecture
User → Learning Event → Evidence (sourceWeight*hint*recency) → Mastery V2 (weighted + small-sample + confidence) → Retention V1 (interval/priority/reviewState) + Misconceptions → Curriculum Graph (22 concepts, prerequisites, learningPath) → Recommendation V1 (score 0..1, diversity max3) → NextBestAction → Learn/Practice/Review/Diagnostic → New Evidence → loop. Server = truth.

## 2. Learning Events
`users/{uid}/learningEvents/{eventId}` 27 types allowlist, append-only, validated. Payload ≤4KB, hintCount 0..20, confidence 1..5, conceptId stable `math.*`, source `quiz|diagnostic|study_session|self_report`.

## 3. Evidence
Source weights diagnostic1.0>quiz0.90>study_session0.65>self_report0.20, hintFactor 1.00→0.40, recency 1.00→0.45, confidence ±0.10, small-sample shrinkage to prior 0.5.

## 4. Mastery V2
`masteryScore = prior*(1-sampleFactor)+raw*sampleFactor`, `evidenceStrength=sumW/5`, `masteryStateV2` gated by evidence, separate from `accuracy`. `masteryModelVersion:2`.

## 5. Diagnostic
12Q adaptive `prioritizeConcepts` (no evidence→low evidence→weak→misconception), `source:diagnostic` weight 1.0, no hints, minimal feedback, `diagnostics/{id}` status active→completed.

## 6. Retention V1
Base interval by mastery 1/2/3/7/14/21 × evidenceFactor + recent errors cap + lastOutcome → `nextReviewAt`, `retentionScore`, `priority`, `reviewState` 6 states.

## 7. Review
`users/{uid}/reviews/{conceptId}` server-only, `reviewState` human-friendly Due today/Overdue by N, `retention` timeline graph.

## 8. Curriculum Graph
22 concepts math.* + science.* with `curriculumPaths` (maharashtra.9, cbse.9, jee.*), aliases for legacy, `validateGraph` circular check, `getAncestors/getLearningPath` deterministic, language-independent IDs.

## 9. Recommendations V1
Score urgency*0.25+weakness*0.25+evidenceGap*0.15+misconception*0.15+goal*0.10+priority*0.10, action diagnostic/learn/practice/review, reason priority, diversity, NextBestAction.

## 10. Adaptive Learning Loop
`NORMAL_CHAT→STUCK(threshold 0.6 from repeatedIncorrect/explanation/misconception)→LEARNING_LOOP(Diagnose→Simplify→Analogy→MicroPractice→Evaluate→Reinforce)→Return`, maxDepth 3, always exitable, bounded Go Deeper 1/session.

## 11. AI Context
`buildLearningContext` compact: academic, goals(3), subjectState, conceptState{masteryScore,evidenceStrength,accuracy,attempts,confidenceScore,recentIncorrectCount,reviewState,prerequisiteRisks}, reviewState, recommendations{nextBestAction,counts}, misconceptions(3), recentEvidence(5), tokenBudget 800, no email/photoURL.

## 12. Web Architecture
`js/learning/*` shared, `home.js` onboarding gate + Recommended for You, `chat.js` stuck offer, `quiz.html`/`study-session.html` concept-aware, `review.html` graphs, `diagnostic.html`.

## 13. Android Architecture
`lib/learning/*` parity, `ApiClient` Bearer token, same Firestore paths, same formulas.

## 14. Server Authority
`/api/learning-event` validates, derives uid from token, transaction mastery+retention+misconception+review, idempotency via eventId. `/api/recommendations` derived. Client cannot write mastery/reviews.

## 15. Security
`firestore.rules` mastery/reviews server-only, learningEvents append-only, diagnostics create/update only if owner, input validation, rate limits, XSS `escapeHtml`, no secrets in client.

## 16. Versioning
`learningSchemaVersion:1, masteryModelVersion:2, reviewModelVersion:1, curriculumModelVersion:1`, aliases for migration.

## 17. Migration
Legacy `quizAttempts/studySessions` kept, `conceptId` alias, `evidenceStrength<0.10→not_ready`, no deletions.

## 18. Testing
`test_prompt9.js` PASS, `test_final_learning_system.js` lifecycle.

## 19. Known Limitations
Deterministic heuristic, not FSRS/BKT/IRT/neural/RL; 22-concept seed not official board curriculum; skill layer minimal; no full offline sync.
