# Firestore Migration — Additive Plan

## Existing structure (DO NOT DELETE)
- `users/{uid}` — root profile
- `users/{uid}/chats/{id}/messages/{id}`
- `users/{uid}/quizAttempts/{id}` → powers `analyze.html`
- `users/{uid}/studySessions/{id}` → `study-session.html`
- `users/{uid}/learning/profile`, `users/{uid}/learning/memory`, `users/{uid}/cards`, `users/{uid}/interactions`, `users/{uid}/misconceptions`, `users/{uid}/analytics`, `users/{uid}/dailyQuestions`
- `studyPlans/{id}`, `tasks/{id}`, `progress/{uid}`, `usage/{uid}`, `analytics/{uid}/events/{id}`

## New structure (Prompt 1 contracts, writes start in Prompt 4+)
- `users/{uid}/learning/studentModel`  (single doc)
- `users/{uid}/mastery/{conceptId}`
- `users/{uid}/sessions/{sessionId}`   (unified; studySessions stays until cutover)
- `users/{uid}/recommendations/current`
- `users/{uid}/reviews/{conceptId}`
- `learningPlans/{planId}` (new top-level; studyPlans coexists)
- `curriculum/{examId}` (future, server-writable only)

## Prompt 2 additions (all additive, client append-only until server authoritative)
- `users/{uid}/learning/profile` — expanded with `academic: AcademicContext` + `preferences` (merge:true, Prompt 1 already used this path)
- `users/{uid}/learning/goals/{goalId}` — new subcollection for prioritized goals (Prompt 2)
- `users/{uid}/learningEvents/{eventId}` — append-only evidence events (Prompt 2, types from LearningEventType)
- `users/{uid}/diagnostics/{sessionId}` — optional initial diagnostic sessions (Prompt 2, bounded 8–12 items)
- `users/{uid}/misconceptions/{id}` — reuses existing collection, now versioned with `evidence[]`, `confidence`, `resolutionEvidence`, `learningSchemaVersion`
- `Mastery` docs gain `confidenceScore 0..1`, `attempts`, `correct`, `accuracy`, `subject` fields (backward-compatible, additive)

## Migration safety
- All new writes include `learningSchemaVersion: 1` for forward migrations.
- Readers accept both `Timestamp` and ISO string for `lastReviewed`/`nextReviewDue`/`startedAt`/`updatedAt` via `toDate()` fallback.
- `studySessions` → `sessions` migration (Prompt 4) will be copy-on-read: if `sessions` empty but `studySessions` non-empty, surface legacy sessions in UI without duplicating writes.

## Required firestore.rules additions (apply in Prompt 4, not now)
```
match /users/{userId}/mastery/{conceptId} { allow read: if isOwner(userId); allow create, update: if isOwner(userId) && request.resource.data.conceptId is string && request.resource.data.masteryScore is number && request.resource.data.masteryScore >= 0 && request.resource.data.masteryScore <= 1; allow delete: if isOwner(userId); }
match /users/{userId}/sessions/{sessionId} { allow read: if isOwner(userId); allow create: if isOwner(userId) && request.resource.data.subject is string && request.resource.data.topic is string; allow update: if isOwner(userId); allow delete: if isOwner(userId); }
match /users/{userId}/recommendations/{doc} { allow read, write: if isOwner(userId); }
match /users/{userId}/reviews/{conceptId} { allow read, write: if isOwner(userId); }
match /users/{userId}/learning/goals/{goalId} { allow read, write: if isOwner(userId) && request.resource.data.title is string && request.resource.data.title.size() >= 1 && request.resource.data.title.size() <= 120; }
match /users/{userId}/learningEvents/{eventId} { allow read: if isOwner(userId); allow create: if isOwner(userId) && request.resource.data.type is string && request.resource.data.type in ["lesson_started","lesson_completed","question_answered","question_correct","question_incorrect","quiz_completed","assessment_completed","hint_requested","explanation_requested","mistake_detected","misconception_detected","topic_reviewed","study_session_completed","goal_created","goal_completed","onboarding_answered","diagnostic_answered"]; allow update, delete: if false; }
match /users/{userId}/diagnostics/{sessionId} { allow read, write: if isOwner(userId); }
match /learningPlans/{planId} { allow read: if isSignedIn() && resource.data.uid == request.auth.uid; allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid; allow update: if isSignedIn() && resource.data.uid == request.auth.uid; allow delete: if isSignedIn() && resource.data.uid == request.auth.uid; }
match /curriculum/{document=**} { allow read: if isSignedIn(); allow write: if false; }
```

Prompt 5 will further restrict `mastery` writes to server-only (`allow update: if false`) once `/api/mastery` is the source of truth, and will move `learningEvents` to server-validated `POST /api/learning-event` (client append-only until then).
