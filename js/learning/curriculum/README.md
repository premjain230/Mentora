# Curriculum data — what is authoritative

**Read this before editing anything in this folder.**

## The short version

| What | Status |
|---|---|
| `js/learning/curriculum-data.js` (`CURRICULUM_CONCEPTS`) | **THE source of truth.** 378 concepts. This is what `arena.html` loads, via `arena-curriculum.js`. |
| `2026-27/*.json` + `index.json` (this folder) | **NOT loaded at runtime.** Provenance archive only — see below. |
| `js/learning/curriculum-engine.js` | **Dead code.** Imported by nothing. |
| `mobile/assets/curriculum/` | **Not bundled.** `pubspec.yaml` has no `assets:` section. |

## Why this folder is not the source of truth

`arena.html` never fetches these files. The runtime chain is:

```
arena.html
  -> js/learning/arena-curriculum.js
      -> js/learning/curriculum-data.js   <-- CURRICULUM_CONCEPTS
          -> js/learning/curriculum-schema.js  (createConceptV1)
```

`curriculum-engine.js` is the only reader of this folder, and **nothing imports it**.
Editing anything here changes nothing a learner sees.

## Verified redundancy

As of the 2026-27 audit, **100% of the chapter names in these JSON files are already
present in `curriculum-data.js`** (324/324 checked across all 10 curricula). These files
were the staging area from which the live data was hand-ported; the port is complete.

| curriculum | live concepts | JSON chapters | JSON placeholders |
|---|---|---|---|
| maharashtra 9 / 10 / 11 / 12 | 62 / 47 / 53 / 62 | same | 0 |
| cbse 9 / 10 | 28 / 40 | same | 2 / 1 |
| cbse 11 | 25 | same | **25 (100% placeholder)** |
| cbse 12 | 4 | same | **4 (100% placeholder)** |
| jee main 2026 | 54 | **0 chapters** (54 empty unit stubs) | — |
| neet ug 2026 | 3 | 3 | 0 |

## What this folder IS still good for

It is the only record of **provenance** — which official document each chapter was extracted
from. That metadata (`official_source`, `official_source_pdf`, `verified_at`) does **not**
exist in `curriculum-data.js`. Keep it for that reason.

## Why it cannot simply be wired up as the source of truth

1. **Every `chapter_id` would be rejected by the server.**
   `api/learning-event.js` validates `conceptId` against
   `/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/` (dotted). All 324 JSON ids are underscore-namespaced
   (`msb_09_science1_ch01`), so an `init` would drop all of them and return
   `400 {"error":"chapters required for init"}`.
2. **No prerequisites anywhere.** 0 occurrences of `prerequisites` in all 11 files. The
   runtime's unlock gating and in-order defeat are prerequisite-driven, so this model cannot
   express it.
3. **Four incompatible node shapes**: `subjects[].chapters[]` (maharashtra_*),
   `subjects[].units[].chapters[]` (cbse_*, neet), `units[]` with empty `topics[]` (jee),
   `subjects[]` with empty `units[]` (cbse_09 social).
4. **Contradicts `curriculum-schema.js`**: 0% of the schema's required fields
   (`conceptId`, `difficulty`, `prerequisites`, `tags`, `version`) appear in any file.
5. **`index.json` `status` disagrees with each file's own `status` on 8 of 10 entries**, and
   `neet_ug_2026` is marked `source_pending` with the note *"stop import until verified"*.

## If you want to make this authoritative

That is a real project, not a config change. Minimum work: publish one dotted id scheme,
add `difficulty`/`prerequisites`/`tags`, unify the four node shapes, regenerate
`index.json` counts from the files, then write an id-migration for existing learner
progress (`users/{uid}/arenaProgress/{subjectKey}`, `mastery/`, `reviews/`). Changing a
`conceptId` today silently restarts that chapter and shifts every downstream count — there
is no migration hook.

## Adding or changing a chapter — do it here

Edit `js/learning/curriculum-data.js`. Then regenerate the Dart mirror so mobile stays in
step:

```
node tools/gen-arena-dart.mjs
```

`tools/gen-arena-dart.mjs` is the only supported way to edit
`mobile/lib/services/arena_curriculum.dart`. The server enforces in-order chapter defeat
against the stored `chapterOrder`, so any web/mobile divergence surfaces as
`403 {"error":"Defeat chapters in order"}` when a learner switches devices.
