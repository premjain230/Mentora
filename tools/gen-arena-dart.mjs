/**
 * Regenerates the Dart chapter seed from the web source of truth so the two
 * platforms cannot drift.
 *
 * Why this exists: mobile/lib/services/arena_curriculum.dart was hand-mirrored
 * from js/learning/curriculum-data.js and fell behind — 99/378 difficulty values
 * differed, one conceptId was forked (euclids vs euclid_s geometry), chapter
 * ORDER differed for every JEE/NEET subject (the server enforces in-order
 * defeat, so learners got 403s when switching devices), 9 Chapter() literals
 * omitted `required difficultyLabel` (a hard compile error), and 20 subjectKeys
 * existed on one platform only.
 *
 * Run from the repo root:  node tools/gen-arena-dart.mjs
 * Then diff the output to review changes before committing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { CURRICULUM_CONCEPTS } from "../js/learning/curriculum-data.js";
import { ARENA_TRACKS, normalizeSubject as normalizeSubjectForMirror } from "../js/learning/arena-curriculum.js";

const DART = "mobile/lib/services/arena_curriculum.dart";

/** Mirrors difficultyLabel() in arena-progress.js / the Dart file. */
const label = (d) => (d < 0.35 ? "Foundation" : d < 0.55 ? "Intermediate" : d < 0.75 ? "Advanced" : "Boss");

/** Dart single-quoted string literal with the escapes Dart understands. */
const lit = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\$/g, "\\$") + "'";
const list = (a) => "[" + a.map(lit).join(", ") + "]";

// The subject value stored on each Chapter must be the SAME normalised display
// name the web uses, because Dart's getChapters() matches `c.subject == subject`
// exactly. We import the web normaliser rather than reimplementing it.
const rows = CURRICULUM_CONCEPTS.map((c) => {
  const d = Number(c.difficulty ?? 0);
  return (
    `  Chapter(conceptId:${lit(c.conceptId)}, name:${lit(c.name)}, topic:${lit(c.topic)}, ` +
    `subject:${lit(normalizeSubjectForMirror(c.subject))}, ` +
    `difficulty:${d}, difficultyLabel:${lit(label(d))}, ` +
    `prerequisites:${list(c.prerequisites ?? [])}, curriculumPaths:${list(c.curriculumPaths ?? [])})`
  );
});

const header = `// ────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
// Source of truth: js/learning/curriculum-data.js (CURRICULUM_CONCEPTS)
// Regenerate with:  node tools/gen-arena-dart.mjs
//
// Web and mobile MUST agree on conceptId, difficulty and ordering: the server
// enforces in-order chapter defeat against the stored chapterOrder, so a
// mismatch produces 403 "Defeat chapters in order" when a learner switches
// between web and mobile.
// ────────────────────────────────────────────────────────────────
final List<Chapter> _seedChapters = [`;

const src = readFileSync(DART, "utf8");
const startMarker = "final List<Chapter> _seedChapters = [";
const s = src.indexOf(startMarker);
if (s === -1) throw new Error("could not find _seedChapters declaration");
const endIdx = src.indexOf("\n];", s);
if (endIdx === -1) throw new Error("could not find end of _seedChapters");

const out = src.slice(0, s) + header + "\n" + rows.join(",\n") + "\n];" + src.slice(endIdx + "\n];".length);
writeFileSync(DART, out, "utf8");

console.log(`wrote ${rows.length} chapters to ${DART}`);
console.log(`tracks mirrored: ${Object.keys(ARENA_TRACKS).join(", ")}`);
const byS = new Map();
for (const c of CURRICULUM_CONCEPTS) {
  const s = normalizeSubjectForMirror(c.subject);
  byS.set(s, (byS.get(s) || 0) + 1);
}
console.log(`distinct subjects: ${byS.size}`);
for (const [s, n] of [...byS].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${s}`);
