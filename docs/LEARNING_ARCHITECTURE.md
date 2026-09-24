# Learning Allied Learning Architecture — Prompt 1 Foundation

> **Prompt 1/8 — Audit → Design → Foundation. No feature UI/algorithms implemented.**

## A. Final Target Architecture

```
                    Learning Allied LEARNING ENGINE (shared logic + contracts)
                            │
              ┌─────────────┴─────────────┐
              │                           │
          Learning Allied WEB                Learning Allied MOBILE (Flutter)
     js/learning/*               lib/learning/*
              │                           │
              └─────────────┬─────────────┘
                            │
                     Shared Backend (/api/*, Admin SDK)
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      Curriculum       Student Model      Learning State
    curriculum/       studentModel        sessions/
    (server-owned)    mastery/            mastery/
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                     Mastery Engine (server-authoritative, Prompt 5)
                            │
                  Recommendation Engine (Prompt 6)
                            │
                    Learning Sessions (Prompt 4/7)
                            │
                    Progress / Planning (Prompt 7)
```

**Principle:** single implementation of mastery/recommendation math → versioned contracts → both clients consume identical state from Firestore; mutations that affect mastery/recommendations go through `/api/*` (trusted).

---

## B. Data Contracts — schemas created in Prompt 1

| Contract | Web file | Mobile file | Firestore example |
|---|---|---|---|
| `UserLearningProfile` | `js/learning/contracts.js` | `lib/learning/contracts.dart` | `users/{uid}/learning/profile` |
| `StudentModel` | `contracts.js` | `contracts.dart` | `users/{uid}/learning/studentModel` |
| `Curriculum` / `Concept` | `curriculum.js` + `contracts.js` | `contracts.dart` | `curriculum/{exam}/{subject}` (future, server-owned) |
| `Mastery` | `contracts.js` + `mastery.js` | `contracts.dart` | `users/{uid}/mastery/{conceptId}` |
| `LearningSession` | `sessions.js` | `contracts.dart` | `users/{uid}/sessions/{sessionId}` |
| `Recommendation` | `recommendations.js` | `contracts.dart` | `users/{uid}/recommendations/current` |
| `LearningPlan` | `learning-plan.js` | `contracts.dart` | `learningPlans/{planId}` (shared with `studyPlans`) |
| `ReviewItem` | `contracts.js` | `contracts.dart` | `users/{uid}/reviews/{conceptId}` |

**Shared fields on every doc:** `learningSchemaVersion: 1`, `updatedAt` (serverTimestamp on write, ISO string on read).

Canonical `Mastery` shape (both platforms identical):
```js
{ conceptId, masteryScore: 0..1, masteryState: "unseen"|"learning"|"developing"|"proficient"|"mastered",
  lastReviewed: ISO|null, nextReviewDue: ISO|null, evidence: [{type, scoreDelta, sourceId, at}] }
```

**Versioning:** `js/learning/schema.js` (`LEARNING_SCHEMA_VERSION=1`, `ONBOARDING_VERSION=1`, `CURRICULUM_VERSION=1`) ↔ `lib/learning/schema.dart` (identical constants). Migration path: read `learningSchemaVersion` on each doc; if < current, transform via TODO in Prompt 2/4.

---

## C. Firestore Changes — Additive Only (Prompt 1)

### Left untouched (must remain safe)
```
users/{uid}                           // root doc (plan, displayName, exam, referralRewards)
users/{uid}/chats                     // chat.js
users/{uid}/quizAttempts              // quiz.html → analyze.html
users/{uid}/studySessions             // study-session.js
users/{uid}/cards, /interactions, /misconceptions, /analytics, /dailyQuestions
studyPlans/{planId} + tasks/{taskId} + progress/{userId}
usage/{userId}, proRequests/{userId}, analytics/{userId}/events
referralCodes, referrals, growth_*
```

### Added in this foundation (no writes yet; rules to be added in Prompt 4/5)
```
users/{uid}/learning/profile       // already existed via modules/memory-system.js — now versioned
users/{uid}/learning/studentModel  // NEW — StudentModel
users/{uid}/learning/memory        // already existed via modules/memory.js — unchanged
users/{uid}/mastery/{conceptId}    // NEW — per-concept mastery
users/{uid}/sessions/{sessionId}   // NEW — unified sessions (coexists with studySessions until migration)
users/{uid}/recommendations/current // NEW
users/{uid}/reviews/{conceptId}    // NEW — spaced repetition state
learningPlans/{planId}             // NEW — coexists with studyPlans
curriculum/{examId}                // FUTURE (server-owned, read-only for clients)
```

**Rule additions required later (documented, NOT applied yet):**
```js
match /users/{userId}/mastery/{conceptId} { allow read, write: if isOwner(userId); } // Prompt 5: tighten write to server only
match /users/{userId}/sessions/{sessionId} { allow read, write: if isOwner(userId); }
match /users/{userId}/recommendations/{doc} { allow read, write: if isOwner(userId); }
match /users/{userId}/reviews/{conceptId} { allow read, write: if isOwner(userId); }
match /users/{userId}/learning/studentModel { allow read, write: if isOwner(userId); }
match /learningPlans/{planId} { allow read, write: if isSignedIn() && resource.data.uid == request.auth.uid; } // mirror studyPlans
match /curriculum/{doc=**} { allow read: if isSignedIn(); allow write: if false; }
```
Until server-authoritative mastery (Prompt 5), client writes to `mastery/` are allowed but will be migrated to `allow update: if false` once `/api/mastery` lands.

---

## D. Web ↔ Android Strategy

```
Web  ── Firebase Auth (ID token) ──┐
                                   ├── same Firebase project (mentora-c6dca)
Android ── Firebase Auth (ID token) ──┘
         │
         ▼
     Firestore (single source of truth)
         │
   Shared contracts (identical field names/types)
         │
   Server APIs (/api/*) verify ID token via Admin SDK / public-key fallback
```

- Both apps fetch `users/{uid}/learning/*`, `mastery/*`, `sessions/*`, `recommendations/current` via identical queries.
- Example flow: `Web starts session → writes users/{uid}/sessions/{id} (status=active) → Android list() reads same doc → sees "active" → resume or display`.
- Auth parity: `firebase-config.js` (web) and `lib/services/firebase_service.dart` (mobile) both fetch config from `/api/firebase-config` at runtime — same `projectId` → tokens always verifiable.
- Offline sync deferred (Prompt 8). For now both clients are online-first; writes use `serverTimestamp()` so ordering is server-defined.

---

## E. Security Findings (Prompt 1 audit)

1. **Firestore rules already deny `usage` client writes** — correct; limits enforced in `/api/groq-proxy` via `checkAndIncrementChat`. New learning collections MUST follow same pattern: allow read, but mastery/recommendation mutations should become server-only in Prompt 5/6.
2. **`users/{uid}/learning/{doc}` rule exists but shallow** — `match /learning/{doc}` does not cover `learning/*/*` subpaths. New store `learning/studentModel` is covered; deeper paths like `learning/mastery/...` would not be — which is why the proposal uses sibling collections `mastery/`, `sessions/` instead.
3. **API keys not exposed:** `GROQ_API_KEY` accessed only server-side (`api/groq-proxy.js`, `study-session.js`, `generate-plan.js`). Client `firebase-config.js` fetches Firebase JS config from `/api/firebase-config` — no secrets in bundle. Mobile `firebase_service.dart` mirrors this.
4. **No XSS regression:** existing `xss.js` + `escapeHtml` usage in chat/planner remains required for any new UI that renders user/LLM content. Contracts validation (`isNonEmptyString`, max lengths) prevents stored XSS payloads in new fields.
5. **Input validation gaps to close in Prompt 2–5:** `study-session.js` and `quiz.html` now validate topic/subject lengths but new `masteryScore`/`conceptId` fields must be validated both client-side (contracts) and server-side before any Cloud Function trusts them.

---

## F. What was NOT built (per spec)

- No new onboarding UI, dashboard, diagnostic test, adaptive teaching session, spaced-repetition algorithm, recommendation algorithm, curriculum content, AI student analysis, mastery calculations, planning algorithm, or major redesign.

---

## G. Files Created in Prompt 1 (foundation only)

```
Web:  js/learning/schema.js
      js/learning/contracts.js
      js/learning/curriculum.js
      js/learning/learning-profile.js
      js/learning/student-model.js
      js/learning/mastery.js
      js/learning/recommendations.js
      js/learning/sessions.js
      js/learning/learning-plan.js
      js/learning/index.js
      docs/LEARNING_ARCHITECTURE.md
      docs/FIRESTORE_MIGRATION.md  (below)
Mobile: lib/learning/schema.dart
        lib/learning/contracts.dart
        lib/learning/learning_services.dart
```
