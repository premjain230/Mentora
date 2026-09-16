# Aquila Arena — Mobile (Flutter)

Same product, same game, same progress as web.

## Architecture
- `lib/services/arena_curriculum.dart` — Dart mirror of `js/learning/arena-curriculum.js` (same topo-sort, same subjectKey, same tracks).
- `lib/services/arena_progress.dart` — Dart mirror of `js/learning/arena-progress.js` (same states `locked/available/in_progress/defeated/mastered`, same thresholds `0.60/0.65/0.70`, same `computeProgress`).
- `lib/services/arena_api.dart` — Server-authoritative client for `POST /api/arena` (same endpoint as web). Sends Firebase ID token, validates prerequisites server-side. Direct Firestore writes are **denied** by `firestore.rules` (`arenaProgress` → `allow create,update,delete: if false`).
- Firestore collections (shared with web):
  - `users/{uid}/arenaProgress/{subjectKey}` — single source of truth, listened via `onSnapshot` (web) / `snapshots()` (mobile) for real-time cross-platform sync.
  - `users/{uid}/arenaEvents/{eventId}` — append-only audit (chapter_defeated, final_boss_defeated).
- `lib/screens/*` — Landing → Class → Subject → Subject Map → Battle → Victory/Boss, matching web flow pixel-conceptually (platform-specific UX allowed).

## Sync proof
1. Defeat `science.physics.motion` on web → `POST /api/arena {action: defeat_chapter}` → Firestore transaction validates prerequisites, unlocks next, writes event → mobile `snapshots()` listener fires → map recomputes → next chapter shows `available`.
2. Defeat on mobile → same API → web `onSnapshot` fires → web map updates without refresh.

## Run
```bash
flutter pub get
flutter run
```
Configure `lib/firebase_options.dart` with your `mentora-c6dca` project (or use `flutterfire configure`).

## Security
- All progression validated server-side (`api/arena.js` checks token, prerequisite graph, sequential unlock, score ≥0.60, boss ≥0.70).
- Client cannot forge `defeated` — Firestore rules block direct writes.
- `verifyIdToken` uses Admin SDK + public-key fallback (same as `api/learning-event.js`).

## Design
- Premium dark theme (`#070A14`, `#0F1324`), glow, cinematic node transitions — matches `css/arena.css` + `css/tokens.css`.
- Respects `prefers-reduced-motion` on web; on mobile, animations are lightweight (no infinite bounces).
- Share terminology: same `ArenaState`, same `toSubjectKey` (`jee_physics`, `maharashtra_11_mathematics`, etc.).
