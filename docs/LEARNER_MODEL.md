# Learning Allied Learner Model — Prompt 2 Technical Design

> **Prompt 2/8 — Personalized Learner Profile + Learner Modeling System**
> Builds on `docs/LEARNING_ARCHITECTURE.md` (Prompt 1). No UI, no recommendation engine, no full adaptive tutor in this prompt.

---

## 1. Learner Model Architecture

### Goal
Move from *“AI that answers questions”* → *“AI that understands the student’s learning state and continuously adapts.”* The Learner Model is the **central source of truth for personalization**.

### Layered Model (separation of concerns)

```
┌─────────────────────────────────────────────────────────┐
│ IDENTITY / DEMOGRAPHICS (account, not learning)         │
│  uid, displayName, email, photoURL, createdAt           │  → users/{uid} root (already exists)
├─────────────────────────────────────────────────────────┤
│ A. ACADEMIC CONTEXT (curriculum-agnostic)               │
│  country, state, board, grade/class, academicYear,      │  → users/{uid}/learning/profile.academic
│  curriculumId, track(school|competitive|both)           │     (expands Prompt 1 profile)
├─────────────────────────────────────────────────────────┤
│ B. GOALS (prioritized, time-bound, explainable)         │
│  [{ goalId, type, title, target, priority, timeline,    │  → users/{uid}/learning/goals/{goalId}
│     status(active|paused|completed|abandoned),          │
│     importance 0..1, createdAt }]                       │
├─────────────────────────────────────────────────────────┤
│ C. SUBJECT MODEL (per-subject rollup)                   │
│  subjects: { [subjectId]: { mastery 0..1, confidence,   │  → derived from Mastery docs (not stored)
│  priority high|medium|low, weakAreas[], strongAreas[],  │     computed + cached in LearnerSnapshot
│  lastActivity, evidenceCount } }                        │
├─────────────────────────────────────────────────────────┤
│ D. TOPIC / CONCEPT KNOWLEDGE                            │
│  Subject → Chapter → Topic → Concept                    │  → users/{uid}/mastery/{conceptId}
│  per-concept: masteryScore, masteryState, confidence,   │     + users/{uid}/reviews/{conceptId}
│  attempts, accuracy, recency, retention, evidence[]     │
├─────────────────────────────────────────────────────────┤
│ E. EVIDENCE + HISTORY (append-only, never overwrite)     │
│  learningEvents/{eventId} → aggregates → Mastery        │  → users/{uid}/learningEvents/** (new)
│ F. MISCONCEPTIONS                                       │  → users/{uid}/misconceptions/** (exists, now versioned)
│ G. PREFERENCES / BEHAVIOR                               │
│  preferredStyle, studyTime {availableMin, preferredSlot},│  → profile.preferences + analytics
│  consistencySignals                                     │
└─────────────────────────────────────────────────────────┘
```

**Key invariants:**
- **Current state** (`LearnerSnapshot` = Academic + Goals + derived Subject/Concept aggregates + active Misconceptions + Preferences) is **derived, cacheable, explainable**.
- **Historical evidence** (`learningEvents` + `reviews`) is **append-only**; state is recomputed from it, never by direct AI edit.
- Identity vs Learning split → privacy: AI context receives only B–G, never email/photoURL unless explicitly needed.

### Component Interaction

```
Onboarding (adaptive interview) ──→ AcademicContext + Goals + Preferences ──┐
                                                                              ├─→ LearnerSnapshot (current state)
Diagnostic Assessment ──→ Evidence (events) ──→ Mastery/Confidence updates ───┘
Learning Interaction (quiz/session/chat) ──→ LearningEvent ──→ Evidence aggregator ──→ Mastery/Confidence/Misconception update ──→ History
                                                                                               │
                                                                                               ▼
                                                                              AI Context Builder ──→ filtered Learner Context ──→ LLM
                                                                                               │
                                                                                               ▼
                                                                              Recommendation input (Prompt 6) — not built yet
```

---

## 2. Data Model — Proposed Schemas / Firestore Documents

All documents carry `learningSchemaVersion: 1` and `updatedAt: serverTimestamp()` on write, `ISO string` on read. Timestamps stored as Firestore `Timestamp` are accepted on read via `toIso()` helper.

### 2.1 AcademicContext (embedded in `users/{uid}/learning/profile`)

```ts
AcademicContext = {
  country: string|null,        // ISO 3166-1 alpha-2, e.g. "IN"
  state: string|null,          // free-form, e.g. "Maharashtra" — validated 1..80 chars
  board: string|null,          // free-form enum — "CBSE"|"ICSE"|"State"|"IB"|"Other"|null — NOT hardcoded to single board
  grade: string|null,          // "9"|"10"|"11"|"12"|"UG1"|…
  curriculumId: string|null,   // refs curriculum/{curriculumId} when curriculum collection exists
  academicYear: string|null,   // "2025-26"
  track: "school"|"competitive"|"both"|null,
  schoolName: string|null,     // optional, minimized — max 120
}
```

### 2.2 Goals — subcollection `users/{uid}/learning/goals/{goalId}` (new)

```ts
Goal = {
  goalId: string,
  uid: string,
  type: "pass_year"|"improve_subject"|"score_target"|"board_exam"|"competitive_exam"|"deep_understanding"|"finish_syllabus"|"consistency"|"custom",
  title: string,               // 1..120, e.g. "Score 90%+ in Mathematics"
  target: string|null,         // e.g. "90%" or "JEE Mains qualified"
  subject: string|null,        // when goal is subject-specific
  priority: "high"|"medium"|"low",
  importance: number,          // 0..1
  timeline: { start: ISO|null, due: ISO|null },
  status: "active"|"paused"|"completed"|"abandoned",
  createdAt: ISO, updatedAt: ISO,
  learningSchemaVersion: 1
}
```

### 2.3 SubjectState (derived, not a document — cached inside `LearnerSnapshot`)

```ts
SubjectState = {
  subjectId: string,           // stable id e.g. "mathematics"
  mastery: number,              // 0..1 aggregate of concept mastery
  confidence: number,           // 0..1 aggregate
  priority: "high"|"medium"|"low",
  weakAreas: string[],          // topic/conceptIds, max 10
  strongAreas: string[],        // max 10
  lastActivity: ISO|null,
  evidenceCount: number,
  gap: number,                  // |mastery - confidence| — calibration signal
}
```

### 2.4 ConceptState / Mastery (per-concept, Prompt 1 refined)

Extends Prompt 1 `Mastery` with Prompt-2 fields; **confidence stored separately from mastery**:

```ts
Mastery = {
  ...Prompt1,
  confidenceScore: number,      // 0..1 self-rated, separate from masteryScore
  attempts: number,
  correct: number,
  accuracy: number,             // correct/attempts
  difficulty: number,           // 0..1 from curriculum
  retention: number|null,       // 0..1 from reviews, null if insufficient data
  lastConfidenceAt: ISO|null,
  calibration: "calibrated"|"overconfident"|"underconfident"|null
}
```

### 2.5 Misconception (extends existing `misconceptions/` but versioned)

```ts
Misconception = {
  misconceptionId: string,
  uid: string,
  conceptId: string,
  concept: string,              // denormalized topic name for display
  misconception: string,        // 1..300 — what the student believes
  correction: string|null,      // canonical correction (filled by teacher/LLM review)
  evidence: EvidenceRef[],      // [{ eventId, excerpt, at }]
  confidence: number,           // 0..1 how sure the system is
  firstDetected: ISO,
  lastDetected: ISO,
  resolved: boolean,
  resolvedAt: ISO|null,
  resolutionEvidence: EvidenceRef|null,
  learningSchemaVersion: 1
}
```

### 2.6 Evidence & Learning Events

Learning interactions never directly mutate mastery. They emit **LearningEvents** → aggregated into **EvidenceRefs** on the Mastery doc.

```ts
LearningEventType =
  "lesson_started"|"lesson_completed"|"question_answered"|"question_correct"|"question_incorrect"|
  "quiz_completed"|"assessment_completed"|"hint_requested"|"explanation_requested"|
  "mistake_detected"|"misconception_detected"|"topic_reviewed"|"study_session_completed"|
  "goal_created"|"goal_completed"|"onboarding_answered"|"diagnostic_answered"

LearningEvent = {
  eventId: string,
  uid: string,
  type: LearningEventType,
  conceptId: string|null,
  subject: string|null,
  topic: string|null,
  payload: object,              // type-specific: { accuracy, durationSec, hintCount, ... }
  confidence: number|null,      // 1..5 self-report when applicable
  createdAt: ISO,               // serverTimestamp on write
  learningSchemaVersion: 1
}

EvidenceRef = { eventId: string, type: LearningEventType, at: ISO, excerpt: string|null }

// Aggregation lives in Mastery.evidence[] (last 20) + Mastery.attempts/correct/accuracy
// Full history lives in users/{uid}/learningEvents/{eventId} (append-only)
```

### 2.7 LearnerSnapshot (read model — assembled on demand, cached 60s)

```ts
LearnerSnapshot = {
  uid: string,
  academic: AcademicContext,
  goals: Goal[],                // active first, then paused
  subjectStates: Record<subjectId, SubjectState>,
  preferences: { preferredStyle, availableMin, preferredSlot, studyBehaviorTags[] },
  activeMisconceptions: Misconception[], // unresolved, last 20
  recentEvents: LearningEvent[],         // last 20
  progress: { streak, totalEvents, avgMastery, calibrationSummary },
  snapshotAt: ISO,
  learningSchemaVersion: 1
}
```

---

## 3. Onboarding Architecture

**Purpose:** collect high-value signals first; never a giant static form. Every question must improve personalization.

### Question Tiering (value order)

```
Tier 0 (required, 15s): displayName?, grade, board, academicYear, country
Tier 1 (high-value, ~60s): subjects[] (multi-select), goals[] (pick 1–3), priority subject, available study time per day
Tier 2 (diagnostic-light, optional, ~90s): difficult subjects, confident topics, upcoming exam + date, studyStyle preference
Tier 3 (deep, optional): how do you study? where do you struggle? preferred explanation mode? (examples|practice|tests|... )
```

If user aborts, Tier 0+1 is enough to seed a usable LearnerSnapshot; Tier 2–3 can be completed later or inferred from behavior.

### Adaptive Onboarding (intelligent interview, not static form)

Defined as a **decision graph**, not imperative `if` chains. `js/learning/onboarding.js:ADAPTIVE_GRAPH`.

```ts
type OnboardingNode = {
  id: string,
  question: string,
  field: string,                // maps to AcademicContext/Goal/Preferences field
  input: "single"|"multi"|"free"|"range",
  options?: string[],
  required: boolean,
  tier: 0|1|2|3,
  next: (answer) => string|null // returns next node id, or null = end; branch logic here
}

Adaptive example:
  board = "Maharashtra State Board" → next = "grade"
  grade = "9th"                     → next = "difficultSubjects"
  difficultSubjects = ["Science","Mathematics"] with len>1 → next = "prioritySubject" (forced choice)
  prioritySubject = "Mathematics"   → next = "timeAvailable"
```

Implementation: **client drives the interview**, but every answer is persisted immediately to `users/{uid}/learning/profile` (partial save) and to a `learningEvents` entry `{type: "onboarding_answered", conceptId: null, payload: {field, value}}`. Server never trusts the full bundle — each field is validated individually (lengths, enums). Branching logic is shared JS/Dart so Web and Android ask identical follow-ups.

**Contracts:** `js/learning/onboarding.js:ONBOARDING_QUESTIONS` + `getNextOnboardingQuestion(current, answers)` — Dart mirrors as `getNextOnboardingQuestion`.

### Persistence

Partial profile saves use `setDoc(..., {merge:true})` so interrupted onboarding never loses progress. `onboardingComplete` flag flips only when Tier 1 is complete. Existing users (migration, §13) get Tier 0 prefilled from legacy `users/{uid}.exam` / `displayName`.

---

## 4. Diagnostic Architecture

**Optional, not mandatory.** Triggered after onboarding when `subjects.length > 0` and `mastery evidenceCount == 0`.

### Structure

```ts
DiagnosticSession = {
  sessionId: string,
  uid: string,
  subject: string,
  conceptIds: string[],         // 8–12 concepts sampled by prerequisites + difficulty spread
  items: DiagnosticItem[],      // [{ conceptId, question, options, correctKey, difficulty 0..1 }]
  responses: DiagnosticResponse[], // [{ conceptId, selected, correct, confidence 1..5, durationSec }]
  startedAt: ISO, completedAt: ISO|null,
  status: "active"|"completed"|"abandoned"
}
```

**Sampling:** not random. Pick 1 prerequisite chain per subject (e.g. arithmetic → algebra → linear equations → factorization) so a single weak prerequisite surfaces as root cause. Difficulty mix: 30% easy, 40% medium, 30% hard — calibrated via `concept.difficulty`.

**Scoring:** NOT a single score. Each response emits a `LearningEvent {type:"diagnostic_answered", conceptId, payload:{correct, confidence, durationSec}}` → aggregated into `Mastery {attempts, correct, accuracy, masteryScore (bayesian update stub in Prompt 5), confidenceScore}`. Three repeated `sign error` in `linear equations` → also creates `Misconception`.

Diagnostic can be resumed (stored `status=active`); abandoning after 3 items still yields useful evidence. Firestore: `users/{uid}/diagnostics/{sessionId}` + `diagnostics/{sessionId}/responses/{itemId}` (or flattened into the doc for <15 items to avoid read amplification).

---

## 5. Evidence Architecture

**Principle:** *Learning interactions produce evidence → evidence updates learner state.* Never *AI response → arbitrary profile mutation*.

### Pipeline

```
Learning interaction (quiz submit, session complete, hint click)
   → emit LearningEvent (client, validated, append-only)          // js/learning/evidence.js:emitEvent
   → POST /api/learning-event  (server validates, writes)          // future, Prompt 5 stub in this prompt is direct write
   → learningEvents/{eventId} stored
   → aggregator (client optimistic + server reconciliation)         // evidence.js:aggregateEvidence
        - increments Mastery.attempts/correct/accuracy
        - pushes Mastery.evidence[] (last 20 EvidenceRefs)
        - updates Mastery.masteryScore stub (Prompt 5 = Bayesian)
        - updates Mastery.confidenceScore if confidence supplied
        - detects repeated error patterns → MisconceptionService
   → LearnerSnapshot recomputed (cached)
```

**Client is optimistic but not authoritative:** in Prompt 2 the client writes `learningEvents` directly (owner-only rule). Prompt 5 will move aggregation to `POST /api/learning-event` which re-derives mastery server-side and discards forged `masteryScore` values. Until then, `validateLearningEvent` (`evidence.js`) caps payload sizes, clamps `confidence 1..5`, and caps `evidence[]` length.

**Evidence quality signals** (stored in event payload, surfaced in explainability):
- `attempts`, `accuracy`, `difficulty`, `retention` (from reviews), `timeTaken`, `hintCount`, `explanationRequested`, `repeatedErrorCount`, `confidence`.

---

## 6. Mastery Model

**Two numbers, not one:**

```ts
masteryScore:   0..1  — estimated probability student can answer correctly (from evidence)
confidenceScore: 0..1  — student’s self-rated confidence (from 1..5 ratings, normalized), separate
calibration:    overconfident | underconfident | calibrated | null
                computed as |mastery - confidence| with threshold 0.25 and direction
```

Derived fields `masteryState` (`schema.masteryStateFromScore`) and `retention` (from `reviews` interval + `lastReviewed` recency — Prompt 5) are not stored redundantly where computable.

**Subject mastery** is **derived** as mean of concept mastery in that subject (`history.js:subjectMastery`), not stored. `weakAreas`/`strongAreas` are sorted slices of that distribution.

**Explainability:** every Mastery doc stores `evidence[]` (type, delta, sourceId, at) plus `attempts/correct/accuracy`. `ai-context.js:explainMastery` can render: *“12 recent questions, 8 correct, 3 repeated sign errors, last practiced 4 days ago, diagnostic: moderate”.*

---

## 7. Misconception Model

Existing `users/{uid}/misconceptions/` is reused and versioned (added `learningSchemaVersion`, `evidence:[]`, `confidence`, `resolutionEvidence`).

Lifecycle:

```
question_incorrect + error pattern match (e.g. "sign error" 2× in same concept)
   → MisconceptionService.detect(conceptId, text)  // confidence 0.4
repeated detection (3×) → confidence 0.8, lastDetected bumped
teacher/quiz-correct streak (3 correct across 7 days) → resolved=true, resolutionEvidence = EvidenceRef
manual resolve (student demonstrates correction in chat) → same
```

Storage: `users/{uid}/misconceptions/{misconceptionId}` (fields in §2.5). `firstDetected` never overwritten; `lastDetected` bumped on each hit. `commonMisconceptions[]` in `StudentModel` (Prompt 1) becomes a **derived view** of this collection for backward compat.

---

## 8. History Model

**Append-only history vs mutable current state:**

```ts
History (append-only):   learningEvents/{eventId}, diagnostics/{id}, reviews/{conceptId} (interval history)
Current state (mutable): learning/profile, learning/studentModel, mastery/{conceptId}, misconceptions/{id}
Snapshot (derived):      LearnerSnapshot = f(Current state + recent History)
```

Queries Learning Allied must support (and how):

- *What has this student learned?* → scan `mastery` where `masteryState != unseen`, sorted by `lastReviewed`.
- *What did they struggle with last month?* → `learningEvents` where `createdAt >= 30d` and `type=question_incorrect`, grouped by `conceptId`.
- *Which concepts improved?* → diff `masteryScore` over `evidence[]` deltas.
- *Which weaknesses keep returning?* → misconceptions where `resolved==false` and `lastDetected` recent.
- *When did they last practice X?* → `mastery/{X}.lastReviewed`.
- *Which mistakes are recurring?* → misconceptions `confidence >=0.7` unresolved.
- *What interventions worked?* → `learningEvents` where `type=lesson_completed` followed by `question_correct` in same concept within 7 days.

All history documents are **never overwritten**; corrections emit new events. `evidence[]` on mastery is a **bounded projection** (last 20) for cheap reads; full history stays queryable.

---

## 9. AI Context Architecture

**Problem:** dumping the full DB into the LLM leaks PII, wastes tokens, and drowns relevance.

**Solution:** `js/learning/ai-context.js:buildLearningContext`.

```ts
buildLearningContext({ snapshot, currentSubject, currentTopic, currentConceptId, tokenBudget=800 })
// selects:
{
  academic: { board, grade, track },   // always, tiny
  goals: [active goals, max 3],
  priorities: [priority subject, current subject state],
  subjectState: subjectStates[currentSubject] | null,
  topicState: mastery[currentConceptId] | topic aggregate | null,
  activeMisconceptions: filtered to currentConceptId/currentSubject (max 3),
  recentEvidence: last 5 events for currentConceptId,
  preferences: { preferredStyle, availableMin },
  meta: { snapshotAt, learningSchemaVersion }
}
```

**Rules:**
- Only fields relevant to the current interaction are sent. Asking a Maths question does **not** attach History learning history.
- Account PII (`email`, `photoURL`) is **never** included.
- Context is structured JSON, not a raw DB dump, so the LLM prompt can be stable (`Learner Context → System Prompt` injection in `conversation-engine.js` future).
- `tokenBudget` caps serialized context to ~800 tokens; truncation is by priority (goals first, then evidence last).

---

## 10. Web / Android Integration

```
Learning Allied Web  ─┐
              ├─ Firebase Auth (same UID) ── Firestore (same project mentora-c6dca) ── /api/* (same token verification _admin.js)
Learning Allied And. ─┘                │
                              └─ Shared contracts (js/learning ↔ lib/learning) + shared service interfaces
                                      │
                              LearnerSnapshot built identically on both
```

Both platforms:

- Use identical graph `ONBOARDING_QUESTIONS` + `getNextQuestion` (so adaptive interview is consistent).
- Write identical `LearningEvent` shapes → server validates identically.
- Read `learning/profile`, `learning/studentModel`, `mastery/*`, `misconceptions/*`, `learningEvents/*`, `learning/goals/*` via identical queries.
- Assemble `LearnerSnapshot` via `history.js:buildSnapshot` ↔ `lib/learning/history.dart:buildSnapshot` (same derivation).

**Sync example:** Student completes diagnostic on Android → writes `learningEvents` + updates `mastery/linear_equations` → opens Web → `LearnerSnapshot` builder reads same `mastery` doc → sees updated `masteryScore` + `confidence` → Web chat injects new `Learner Context`.

---

## 11. Firebase / Firestore Mapping

Reuses `firestore.rules` patterns from `LEARNING_ARCHITECTURE.md`. New collections added in Prompt 2 (all additive, all additive rules documented but not yet enforced):

```
users/{uid}/learning/profile              // AcademicContext + preferences (doc, merge:true)
users/{uid}/learning/studentModel         // aggregates (doc)
users/{uid}/learning/goals/{goalId}       // new subcollection
users/{uid}/learningEvents/{eventId}      // new top-level user subcollection (append-only)
users/{uid}/mastery/{conceptId}           // existing from Prompt 1 (now typed with confidenceScore)
users/{uid}/reviews/{conceptId}           // Prompt 1
users/{uid}/misconceptions/{id}            // existing, now versioned with evidence[]
users/{uid}/diagnostics/{sessionId}       // new (optional)
users/{uid}/sessions/{sessionId}          // Prompt 1 (unified sessions)
curriculum/{curriculumId}/{doc}           // future read-only
```

**Indexing:** no new composite indexes needed (queries are by `uid` + equality + `orderBy(createdAt)`). Diagnostic session queries are bounded (`limit 20`). `learningEvents` queries are `orderBy(createdAt desc) limit 50`.

**Read/write frequency:** `LearningEvent` = 1 write per interaction; `Mastery` = 1 read + 1 optimistic write per event (batched where possible). `LearnerSnapshot` = fan-out read (1 profile + 3 goals + N mastery where N = active subjects × top concepts, capped 20) — cheap.

---

## 12. Security Rules / Architecture

**Client vs Server boundary:**

| Data | Client may write | Server must validate/author |
|---|---|---|
| `learning/profile.academic`, `goals` | yes (owner, field length + enum checks) | yes (Prompt 5 tightens with `validateAcademicContext`) |
| `learningEvents` | append-only, validated payload (type in allowlist, conceptId length, confidence 1..5) | yes — future `/api/learning-event` re-derives mastery, discards forged scores |
| `mastery.masteryScore`, `confidenceScore` | optimistic in Prompt 2 (clamped 0..1) | **not authoritative** — Prompt 5 makes `masteryScore` server-only (`allow update: if false`) |
| `misconceptions` | create when pattern detected (confidence capped) | resolve requires evidence linkage (not arbitrary `resolved=true`) |
| `misconceptions.resolved` | no — requires `resolutionEvidence.eventId` | server checks |
| Diagnostics responses | `diagnostic_answered` events only, not direct mastery edits | server computes accuracy |

**Validation (shared client + server):**

- `conceptId` regex `^[a-z0-9]+(?:_[a-z0-9]+)*$`, 3..120.
- `masteryScore`/`confidenceScore` `0..1`.
- `priority importance 0..1`, `Goal.title 1..120`, `dailyHours 1..18`.
- `learningSchemaVersion` must equal `1` on write.
- Rate limits via `_shared.js:rateLimit` on `/api/learning-event` (future).

**Privacy:** AI context builder strips `email`, `photoURL`, `futureMeLetter` (if sensitive) and limits `goals` to 3 titles. No analytics PII leaves the snapshot.

---

## 13. Migration Strategy for Existing Learning Allied Users

No data loss; no forced re-onboarding.

**Legacy fields → new model:**

- `users/{uid}.exam` → `learning/profile.academic.board ?? exam` + `goals[0].title` (seed competitive exam goal).
- `users/{uid}.displayName` → `learning/profile.displayName`.
- `users/{uid}/learning/profile` (if exists from `memory-system.js`) → merged with new `AcademicContext` defaults; `learningSchemaVersion` backfilled to `1` if missing.
- `users/{uid}/cards`, `interactions`, `misconceptions` (legacy flat) → left intact; new `mastery/*` is populated from them on first `buildSnapshot` via `migrateLegacyCards(interactions)` helper (read-only, no delete).
- New users: Tier 0+1 onboarding creates `learning/profile` + first `Goal` + `learningEvents(onboarding_answered)` in one batch.

**Versioning:** if `learningSchemaVersion` missing or `0`, `migrateProfile(profile)` fills defaults (`country=null`, `track=null`, `preferences.availableMin= dailyHours*60`). If `onboardingVersion` missing, treat as `0` and prompt to complete Tier 1.

---

## 14. Implementation Boundaries

### Implemented NOW (Prompt 2 — foundation for the Learner Model)

- Expanded contracts: `AcademicContext`, `Goal`, `SubjectState`, `Evidence`/`LearningEvent`, `Misconception`, `LearnerSnapshot` types + factories + validators.
- Onboarding graph: `ONBOARDING_QUESTIONS`, `getNextOnboardingQuestion`, `validateAcademicContext`, `validateGoal` + persistence helpers `loadLearningProfile`/`saveLearningProfile` updated to handle new fields.
- Diagnostic stub: `DiagnosticSession` type + sampling helpers `sampleDiagnosticConcepts` (no UI, no question bank yet).
- Evidence architecture: `LearningEvent` type, `emitLearningEvent`, `validateLearningEvent`, `aggregateEvidenceStub` (client optimistic, server will own in Prompt 5).
- Misconception service: `Misconception` type + `detectMisconception`/`resolveMisconception` signatures with evidence linkage.
- History model: `learningEvents` collection helpers + `buildLearnerSnapshot` derivation.
- AI Context: `buildLearningContext` with subject/topic filtering + token budget.
- Dart parity mirrors for all of the above (`lib/learning/*`).
- Docs: this file + updated `LEARNING_ARCHITECTURE.md` §B (new contracts).

### Prepared but NOT implemented (later prompts)

- Full mastery calculation (Bayesian / FSRS) — Prompt 5.
- Recommendation ranking — Prompt 6.
- Planning algorithm — Prompt 7.
- Offline sync — Prompt 8.
- Server `POST /api/learning-event` authoritative aggregation — stub noted, not built.

### Must NOT be implemented in Prompt 2

- New onboarding UI pages, dashboard redesign, full diagnostic test bank, adaptive tutoring loop, spaced-repetition scheduling beyond stub, curriculum content population, AI student analysis beyond context filtering.

---

## Appendix: File Map for This Prompt

- `js/learning/schema.js` — added Academic/Goal/LearningStyle enums (this prompt).
- `js/learning/contracts.js` — extended with AcademicContext, Goal, SubjectState, Misconception, LearningEvent, LearnerSnapshot, DiagnosticSession factories + validators (this prompt).
- `js/learning/learner-model.js` — new orchestrator (re-exports + `migrateLegacyProfile`).
- `js/learning/onboarding.js` — new adaptive onboarding graph + helpers.
- `js/learning/evidence.js` — new event emit + validation + aggregation stub.
- `js/learning/misconceptions.js` — new misconception lifecycle.
- `js/learning/history.js` — new event store + `buildLearnerSnapshot`.
- `js/learning/ai-context.js` — new context builder + `explainMastery`.
- `js/learning/index.js` — updated barrel.
- `lib/learning/schema.dart` — parity enums.
- `lib/learning/contracts.dart` — parity types.
- `lib/learning/learner_model.dart` — parity orchestrator.
- `lib/learning/onboarding.dart` — parity graph.
- `lib/learning/evidence.dart` — parity event helpers.
- `lib/learning/misconceptions.dart` — parity.
- `lib/learning/history.dart` — parity.
- `lib/learning/ai_context.dart` — parity.
