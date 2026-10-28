// test_adaptive_engine.js
// Focused checks for the shared adaptive teaching engine. These test the
// deterministic parts (curriculum mapping, adaptive selection, grading, visual
// validation, caching keys) without calling the AI provider or Firestore.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const curriculum = require("./api/_curriculum");
const core = require("./api/_learn-core");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n--- Adaptive teaching engine ---");

test("curriculum dataset parses without duplication", () => {
  const stats = curriculum.curriculumStats();
  assert.strictEqual(stats.concepts, 590, `expected 590 concepts, parsed ${stats.concepts}`);
  assert.strictEqual(stats.tracks, 5);
  const seen = new Set();
  for (const concept of curriculum.filterConcepts({ trackId: "cbse", classNum: 10 })) {
    assert(concept.conceptId.startsWith("cbse.10."), `wrong track concept ${concept.conceptId}`);
    assert(concept.name && concept.subject, `missing fields on ${concept.conceptId}`);
    assert(!seen.has(concept.conceptId), `duplicate ${concept.conceptId}`);
    seen.add(concept.conceptId);
  }
});

test("catalogue serves board, class, subject and chapter steps", () => {
  const boards = curriculum.getCatalog({});
  assert.strictEqual(boards.step, "board");
  assert(boards.tracks.length === 5);
  assert(boards.tracks.every((t) => t.chapterCount > 0));

  const classes = curriculum.getCatalog({ trackId: "cbse" });
  assert.strictEqual(classes.step, "class");
  assert.deepStrictEqual(classes.classes, [9, 10, 11, 12]);

  const subjects = curriculum.getCatalog({ trackId: "cbse", classNum: 10 });
  assert.strictEqual(subjects.step, "subject");
  assert(subjects.subjects.some((s) => s.name === "Science"));

  const chapters = curriculum.getCatalog({ trackId: "cbse", classNum: 10, subject: "Science" });
  assert.strictEqual(chapters.step, "chapter");
  assert(chapters.chapters.length > 0);
  assert(chapters.chapters[0].conceptId.startsWith("cbse.10.science."));
});

test("concept matching does not guess from one generic word", () => {
  const weak = curriculum.matchConcept("Explain photosynthesis in plants", { trackId: "cbse", classNum: 10 });
  assert.strictEqual(weak, null, "should not anchor photosynthesis to an unrelated chapter");
  const strong = curriculum.matchConcept("Explain Newton laws of motion", { trackId: "cbse", classNum: 9 });
  assert(strong && strong.name.toLowerCase().includes("motion"), "should find the motion chapter");
});

test("every visual template has a supported renderer and valid default params", () => {
  const supported = new Set([
    "circuit", "force", "ray", "wave", "graph", "transform", "cycle", "cell", "atom", "molecule3d", "solid3d", "photo",
  ]);
  const ids = new Set();
  for (const template of core.listVisualTemplates()) {
    assert(!ids.has(template.id), `duplicate visual id ${template.id}`);
    ids.add(template.id);
    assert(supported.has(template.renderer), `unsupported renderer ${template.renderer}`);
    assert(template.observe && template.altText, `missing accessible text for ${template.id}`);
    const clamped = core.clampVisualParams(template, {});
    for (const [key, spec] of Object.entries(template.params || {})) {
      if (spec.enum) assert(spec.enum.includes(clamped[key]), `${template.id}.${key} default not in enum`);
      else if (spec.type === "stringArray") assert(Array.isArray(clamped[key]) && clamped[key].length >= 3, `${template.id}.${key} default array invalid`);
      else {
        const value = Number(clamped[key]);
        assert(value >= Number(spec.min) && value <= Number(spec.max), `${template.id}.${key} default out of range`);
      }
    }
  }
});

test("visual selection is topic-relevant and rejects unknown ids", () => {
  const circuit = core.selectVisualCandidates("current through a series circuit", "Physics", 3).map((v) => v.id);
  assert(circuit.includes("circuit-series"));
  const molecule = core.selectVisualCandidates("shape of a methane molecule", "Chemistry", 3).map((v) => v.id);
  assert(molecule.includes("molecule-3d"));
  const candidates = core.selectVisualCandidates("current through a series circuit", "Physics", 3);
  const valid = core.validateVisualSelection({ id: "circuit-series", params: { cells: 99, resistanceOhms: -4 } }, candidates, "circuit", "Physics");
  assert(valid.id === "circuit-series");
  assert(valid.params.cells >= 1 && valid.params.cells <= 3, "cells should be clamped");
  assert(valid.params.resistanceOhms >= 1, "resistance should be clamped");
  const invalid = core.validateVisualSelection({ id: "not-a-visual" }, candidates, "circuit", "Physics");
  assert(invalid && invalid.id !== "not-a-visual", "unknown visual must fall back to an approved candidate");
});

test("lesson packs are complete, reviewed and internally consistent", () => {
  const packs = JSON.parse(fs.readFileSync(path.join(__dirname, "lib", "learning", "lesson-packs.json"), "utf8")).packs;
  assert(packs.length >= 8, "expected a reusable starter set");
  const questionIds = new Set();
  for (const pack of packs) {
    assert(pack.id && pack.title && pack.reviewed === true, `pack ${pack.id} must be reviewed`);
    assert(core.listVisualTemplates().some((v) => v.id === pack.visualId), `pack ${pack.id} has an unknown visual`);
    assert(pack.sections.length >= 2, `pack ${pack.id} needs explanation sections`);
    assert(pack.workedExample && pack.workedExample.steps.length >= 2, `pack ${pack.id} needs a worked example`);
    assert(pack.levelIntros.foundation && pack.levelIntros.advanced, `pack ${pack.id} needs level-specific intros`);
    assert(pack.alternate && pack.alternate.body, `pack ${pack.id} needs a different explanation for reteaching`);
    assert(pack.questions.length >= 4, `pack ${pack.id} needs a question bank`);
    const difficulty = new Set(pack.questions.map((q) => q.difficulty));
    assert(difficulty.has(1) && difficulty.has(3), `pack ${pack.id} needs easy and hard questions`);
    for (const q of pack.questions) {
      assert(!questionIds.has(q.id), `duplicate question id ${q.id}`);
      questionIds.add(q.id);
      assert(q.prompt && q.expected && q.explanation, `question ${q.id} incomplete`);
      assert(Array.isArray(q.accept) && q.accept.length, `question ${q.id} needs deterministic accepts`);
      if (q.misconceptionId) {
        assert(pack.misconceptions.some((m) => m.id === q.misconceptionId), `question ${q.id} points to a missing misconception`);
      }
    }
  }
});

test("adaptive difficulty moves with the last verdict", () => {
  assert.strictEqual(core.levelFromMastery(0.2, 0.8, 0.5), "foundation");
  assert.strictEqual(core.levelFromMastery(0.6, 0.8, 0.5), "intermediate");
  assert.strictEqual(core.levelFromMastery(0.9, 0.8, 0.5), "advanced");
  const attempts = [{ questionId: "a", difficulty: 2, verdict: "incorrect" }];
  assert.strictEqual(core.nextTargetDifficulty("intermediate", attempts), 1);
  assert.strictEqual(core.nextTargetDifficulty("intermediate", [{ questionId: "a", difficulty: 2, verdict: "correct" }]), 3);
});

test("next question never repeats and respects the target level", () => {
  const pack = core.getPackById("cell-structure");
  const first = core.pickNextQuestion(pack, [], "foundation");
  assert.strictEqual(first.id, "cell-q1");
  const second = core.pickNextQuestion(pack, [{ questionId: "cell-q1", difficulty: 1, verdict: "correct" }], "foundation");
  assert(second && second.id !== "cell-q1");
  assert.strictEqual(second.difficulty, 2, "a correct easy answer should raise difficulty");
});

test("mastery is not granted from one easy answer", () => {
  const oneEasy = core.completionFor([{ questionId: "a", difficulty: 1, verdict: "correct" }], "foundation");
  assert.strictEqual(oneEasy.completed, false);
  const twoWithHarder = core.completionFor(
    [
      { questionId: "a", difficulty: 1, verdict: "correct" },
      { questionId: "b", difficulty: 2, verdict: "correct" },
    ],
    "foundation"
  );
  assert.strictEqual(twoWithHarder.completed, true);
  const advancedEasyOnly = core.completionFor(
    [
      { questionId: "a", difficulty: 2, verdict: "correct" },
      { questionId: "b", difficulty: 2, verdict: "correct" },
    ],
    "advanced"
  );
  assert.strictEqual(advancedEasyOnly.completed, false, "advanced mastery needs a level-3 answer");
});

test("deterministic grading accepts equivalent answers and rejects empty ones", () => {
  const q = core.getPackById("ohm-law").questions[0];
  assert.strictEqual(core.deterministicVerdict({ packQuestion: q, studentAnswer: "3 A" }).verdict, "correct");
  assert.strictEqual(core.deterministicVerdict({ packQuestion: q, studentAnswer: "12/4 = 3 amperes" }).verdict, "correct");
  assert.strictEqual(core.deterministicVerdict({ packQuestion: q, studentAnswer: "" }).verdict, "incorrect");
  assert.strictEqual(core.deterministicVerdict({ packQuestion: q, studentAnswer: "I am not sure" }), null, "ambiguous answers should go to AI evaluation");
  assert.strictEqual(core.matchesAccept("The current halves", ["half", "halves"]), true);
  const hard = core.getPackById("ohm-law").questions.find((q) => q.difficulty === 3);
  assert.strictEqual(
    core.deterministicVerdict({ packQuestion: hard, studentAnswer: "four times" }),
    null,
    "a bare answer to a reasoning question should go to AI evaluation"
  );
  assert.strictEqual(
    core.deterministicVerdict({
      packQuestion: hard,
      studentAnswer: "It becomes four times larger because the length doubles and the area halves while volume stays constant.",
    }).verdict,
    "correct"
  );
});

test("intent and cache eligibility protect personalised questions", () => {
  assert.strictEqual(core.classifyIntent("What is resistance?"), "definition");
  assert.strictEqual(core.classifyIntent("Calculate the current when 12 V is across 4 ohm"), "problem");
  assert.strictEqual(core.classifyIntent("thanks!"), "conversational");
  const concept = { conceptId: "cbse.10.science.electricity" };
  assert.strictEqual(core.chatCacheEligible({ question: "what is resistance", intent: "definition", concept }), true);
  assert.strictEqual(core.chatCacheEligible({ question: "what is my weakest topic", intent: "definition", concept }), false, "personal questions must not be cached");
  assert.strictEqual(core.chatCacheEligible({ question: "explain question 4", intent: "definition", concept }), false, "numbered problems must not be cached");
});

test("cache keys separate concept, level and language", () => {
  const base = { kind: "lesson", conceptId: "cbse.10.science.electricity", trackId: "cbse", classNum: 10, language: "en", level: "foundation", intent: "core" };
  const keyA = core.lessonCacheKey(base);
  assert.notStrictEqual(keyA, core.lessonCacheKey({ ...base, level: "advanced" }));
  assert.notStrictEqual(keyA, core.lessonCacheKey({ ...base, language: "hi" }));
  assert.notStrictEqual(keyA, core.lessonCacheKey({ ...base, conceptId: "cbse.10.science.light" }));
  assert.strictEqual(keyA, core.lessonCacheKey({ ...base }));
});

test("AI output normalisation rejects unusable content", () => {
  assert.strictEqual(core.normalizeChatReply(null, { candidates: [], text: "", subject: "" }), null);
  assert.strictEqual(core.normalizeChatReply({ directAnswer: "" }, { candidates: [], text: "", subject: "" }), null);
  const reply = core.normalizeChatReply(
    {
      kind: "lesson",
      title: "Ohm's law",
      directAnswer: "Voltage, current and resistance are linked.",
      sections: [{ heading: "The rule", body: "V = IR for a conductor at constant temperature." }],
      check: { prompt: "What happens to I if R doubles at fixed V?" },
      visualId: "circuit-series",
      visualParams: { cells: 2 },
    },
    { candidates: core.selectVisualCandidates("circuit", "Physics", 3), text: "circuit", subject: "Physics" }
  );
  assert(reply && reply.sections.length === 1);
  assert(reply.visual && reply.visual.id === "circuit-series");
});

test("image URLs are restricted to https on trusted educational domains", () => {
  assert.strictEqual(core.isTrustedImageUrl("https://upload.wikimedia.org/a.jpg"), true);
  assert.strictEqual(core.isTrustedImageUrl("http://upload.wikimedia.org/a.jpg"), false, "http must be rejected");
  assert.strictEqual(core.isTrustedImageUrl("https://example.com/a.jpg"), false, "unknown domains must be rejected");
  assert.strictEqual(core.isTrustedImageUrl("javascript:alert(1)"), false);
});

test("a curriculum concept id resolves back to its track", () => {
  const resolved = core.resolveTopic({ conceptId: "cbse.10.science.electricity" });
  assert(resolved.concept && resolved.concept.conceptId === "cbse.10.science.electricity");
  assert.strictEqual(resolved.trackId, "cbse");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
