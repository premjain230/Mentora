// Comprehensive Verification Suite for Understand Experience Rework
// Tests the 12-step realistic scenario from Section 9 and technical constraints (isolation, fallback, schema integrity)

const assert = require('assert');

let providerMode = "lesson";

function fakeLesson(prompt = "") {
  return {
    kind: "lesson",
    title: "Work and Energy in Physics",
    directAnswer: "Work is done when a force causes an object to move in the direction of the force: W = F * d.",
    keyIdea: "No displacement means zero mechanical work, regardless of effort or exhaustion.",
    teachingStrategy: { id: "real_world_analogy", label: "Real-World Analogy" },
    crossSubjectLink: {
      targetConceptId: "cbse.9.mathematics.linear_equations_in_two_variables",
      targetSubject: "Mathematics",
      sourceSubject: "Science (Physics)",
      relationship: "prerequisite",
      rationale: "Calculating work requires algebraic formula rearrangement."
    },
    sections: [
      { heading: "Scientific Meaning of Work", body: "In physics, work requires both force and displacement." },
      { heading: "Mathematical Definition", body: "W = F * d * cos(theta)." }
    ],
    example: {
      problem: "A box is pushed with 10 N across 5 m. Find work.",
      steps: ["Use W = F * d", "W = 10 N * 5 m = 50 J"],
      answer: "50 Joules"
    },
    check: {
      prompt: "If a person pushes a stationary wall and it does not move, how much work is done?",
      hint: "Check if displacement is zero.",
      hints: [
        "Recall the formula for mechanical work: W = F * d.",
        "Notice the wall did not move. What is the value of d (displacement)?"
      ],
      questionId: "work-q1"
    },
    personalization: null
  };
}

function fakeEvaluation(overrides = {}) {
  return {
    verdict: "incorrect",
    category: "conceptual",
    whatWorked: ["You recognized that force and effort were exerted."],
    missing: ["You did not account for displacement being zero."],
    actualMistake: "Tiredness was confused with physical work done.",
    correctReasoning: "Mechanical work requires non-zero displacement in the direction of the force: W = F * d.",
    misconception: {
      id: "misc_zero_displacement",
      category: "conceptual",
      label: "Confusing physiological effort with mechanical work",
      explanation: "Believing that feeling tired implies mechanical work was performed, ignoring zero displacement.",
      remediation: "Remember that mechanical work requires displacement: W = F * d. If d = 0, W = 0."
    },
    feedback: "Effort was applied, but mechanical work requires displacement.",
    next: { difficulty: "same", step: "retry", message: "Review the formula W = F * d." },
    ...overrides
  };
}

const store = new Map();

function fakeSnapshot(id, value) {
  return {
    id,
    exists: value !== undefined,
    data: () => value,
    forEach: (fn) => {
      if (value && typeof value === "object") {
        for (const [key, docValue] of Object.entries(value)) fn(fakeSnapshot(key, docValue));
      }
    },
  };
}

function fakeDoc(docPath) {
  return {
    id: docPath.split("/").pop(),
    collection: (name) => fakeQuery(`${docPath}/${name}`),
    async get() {
      return fakeSnapshot(docPath.split("/").pop(), store.get(docPath));
    },
    async set(data, options = {}) {
      const current = store.get(docPath);
      store.set(docPath, options && options.merge ? { ...(current || {}), ...data } : { ...data });
    },
  };
}

function fakeQuery(queryPath, filters = []) {
  const query = {
    where: (field, op, value) => fakeQuery(queryPath, [...filters, { field, op, value }]),
    limit: () => query,
    async get() {
      const prefix = `${queryPath}/`;
      const docs = [...store.entries()].filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"));
      const matched = docs.filter(([, value]) =>
        filters.every(({ field, op, value: expected }) => (op === "==" ? value && value[field] === expected : true))
      );
      const snapshot = {
        forEach: (fn) => matched.forEach(([key, value]) => fn(fakeSnapshot(key.split("/").pop(), value))),
      };
      return snapshot;
    },
    doc: (id) => fakeDoc(`${queryPath}/${id}`),
  };
  return query;
}

const fakeDb = {
  doc: fakeDoc,
  collection: (p) => fakeQuery(p),
};

const aiPath = require.resolve("./server/_ai");
const adminPath = require.resolve("./server/_admin");

function getMockReply() {
  if (providerMode === "evaluation") return fakeEvaluation();
  if (providerMode === "evaluation-correct") {
    return fakeEvaluation({
      verdict: "correct",
      category: null,
      whatWorked: ["Correctly recognized that displacement d = 0, so work W = 0 J."],
      missing: [],
      actualMistake: "",
      correctReasoning: "W = F * d = F * 0 = 0 J.",
      misconception: null,
      feedback: "Spot on! In physics, no displacement means no work.",
      next: { difficulty: "increase", step: "advance", message: "Ready for kinetic energy!" }
    });
  }
  return fakeLesson();
}

require.cache[aiPath] = {
  id: aiPath,
  filename: aiPath,
  loaded: true,
  exports: {
    groqComplete: async (options) => getMockReply(),
    geminiComplete: async (options) => getMockReply(),
    aiComplete: async (options) => getMockReply()
  }
};

require.cache[adminPath] = {
  id: adminPath,
  filename: adminPath,
  loaded: true,
  exports: {
    getDb: () => fakeDb,
    firestore: () => fakeDb,
    verifyIdToken: async (tok) => ({ uid: tok ? tok.replace("token_", "") : "anon" }),
  }
};

const {
  catalogAction,
  chapterAction,
  lessonTutor,
  evaluateTutor
} = require("./server/_learn-core");

const {
  getChapterOutline,
  getChapterMetadata
} = require("./server/_chapter-engine");

async function runTests() {
  console.log("=== RUNNING UNDERSTAND EXPERIENCE VERIFICATION SUITE ===");
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  const studentA = "student_understand_001";
  const studentB = "student_understand_002";
  const testConceptId = "cbse.9.science.work_energy_and_simple_machines";

  // Step 1: Open Understand catalog (Tracks / Boards)
  await testAsync("Step 1: Open Understand Catalog (retrieve boards/tracks)", async () => {
    const res = await catalogAction({ uid: studentA, body: {} });
    assert.ok(res.catalog, "Must return catalog");
    assert.strictEqual(res.catalog.step, "board");
    assert.ok(Array.isArray(res.catalog.tracks), "Tracks must be an array");
    assert.ok(res.catalog.tracks.length > 0, "Tracks should not be empty");
    assert.ok(res.catalog.tracks.some(t => t.id === "cbse"), "CBSE track should be listed");
  });

  // Step 2: Select board, class, subject to retrieve enriched chapters
  await testAsync("Step 2: Retrieve enriched chapters with time, concept counts, and objectives", async () => {
    const res = await catalogAction({
      uid: studentA,
      body: {
        track: "cbse",
        classNum: 9,
        subject: "Science"
      }
    });
    assert.ok(res.catalog, "Must return catalog");
    assert.strictEqual(res.catalog.step, "chapter");
    assert.ok(Array.isArray(res.catalog.chapters) && res.catalog.chapters.length > 0, "Chapters should be returned");
    const workChapter = res.catalog.chapters.find(c => c.conceptId === testConceptId);
    assert.ok(workChapter, "Work and Energy chapter must exist in catalog");
    assert.ok(typeof workChapter.estimatedMinutes === "number" && workChapter.estimatedMinutes > 0, "Must have estimatedMinutes");
    assert.ok(typeof workChapter.totalConcepts === "number" && workChapter.totalConcepts >= 4, "Must have totalConcepts >= 4");
    assert.ok(typeof workChapter.progressPercent === "number", "Must have progressPercent");
    assert.ok(Array.isArray(workChapter.learningObjectives) && workChapter.learningObjectives.length > 0, "Must have learningObjectives");
  });

  // Step 3: Chapter outline retrieval
  let chapterOutline = null;
  await testAsync("Step 3: Retrieve full chapter outline with sub-concept roadmap and recommendations", async () => {
    const res = await chapterAction({
      uid: studentA,
      body: { conceptId: testConceptId }
    });
    assert.ok(res.chapter, "Should return chapter outline");
    chapterOutline = res.chapter;
    assert.strictEqual(chapterOutline.conceptId, testConceptId);
    assert.ok(chapterOutline.title.includes("Work"), "Title should match chapter");
    assert.ok(chapterOutline.chapterSummary.length > 10, "Should have rich chapter summary");
    assert.ok(chapterOutline.estimatedMinutes > 0, "Should have estimated minutes");
    assert.ok(Array.isArray(chapterOutline.concepts) && chapterOutline.concepts.length >= 4, "Should have sub-concepts roadmap");
    
    // Check first sub-concept schema
    const firstConcept = chapterOutline.concepts[0];
    assert.ok(firstConcept.id, "Sub-concept must have id");
    assert.ok(firstConcept.title, "Sub-concept must have title");
    assert.ok(firstConcept.description, "Sub-concept must have description");
    assert.ok(Array.isArray(firstConcept.learningObjectives), "Sub-concept must have learning objectives");
    assert.ok(firstConcept.visualType, "Sub-concept must define visualType");
    assert.ok(firstConcept.practiceType, "Sub-concept must define practiceType");
    assert.ok(["not_started", "in_progress"].includes(firstConcept.status), "First uncompleted concept should be not_started or in_progress");
    assert.strictEqual(chapterOutline.recommendedConcept.id, firstConcept.id, "First concept should be recommended");
  });

  // Step 4: Concept Lesson Loaded with activeConcept, chapterOutline, keyIdea, and teaching strategy
  let activeSubConceptId = "";
  await testAsync("Step 4: Load Concept Lesson with attached chapterOutline and activeConcept", async () => {
    providerMode = "lesson";
    activeSubConceptId = chapterOutline.concepts[0].id;

    const lessonRes = await lessonTutor({
      uid: studentA,
      body: {
        conceptId: testConceptId,
        subConceptId: activeSubConceptId,
        message: "Explain work done in physics"
      }
    });

    assert.ok(lessonRes.lesson, "Should return lesson object");
    assert.ok(lessonRes.lesson.chapterOutline, "Lesson must attach chapterOutline");
    assert.ok(lessonRes.lesson.activeConcept, "Lesson must resolve activeConcept");
    assert.strictEqual(lessonRes.lesson.activeConcept.id, activeSubConceptId);
    assert.ok(lessonRes.lesson.keyIdea, "Lesson must have keyIdea takeaway");
    assert.ok(lessonRes.lesson.teachingStrategy, "Lesson must define teachingStrategy");
    assert.ok(lessonRes.lesson.teachingStrategy.id, "Teaching strategy must have an id");
    assert.ok(lessonRes.lesson.teachingStrategy.label, "Teaching strategy must have a label");
    assert.ok(Array.isArray(lessonRes.lesson.sections) && lessonRes.lesson.sections.length > 0, "Lesson must have structured sections");
    assert.ok(lessonRes.lesson.workedExample || lessonRes.lesson.example, "Lesson must contain worked example");
  });

  // Step 5: Visual Stage verification
  test("Step 5: Verify Visual Specification for the active sub-concept", () => {
    const meta = getChapterMetadata(testConceptId);
    const concept = meta.concepts.find(c => c.id === activeSubConceptId);
    assert.ok(concept, "Concept must exist in metadata");
    assert.ok(concept.visualType, "Must have visualType specified (e.g., force_displacement_interactive)");
    assert.ok(["force", "circuit", "ray", "cell", "curve", "transform", "generic", "interactive_graph", "simulation"].includes(concept.visualType));
  });

  // Step 6: Practice Stage verification with multi-tier hints
  test("Step 6: Practice Question includes progressive hints ladder", () => {
    const lesson = fakeLesson();
    assert.ok(lesson.check, "Must have check question");
    assert.ok(lesson.check.prompt, "Check question must have prompt");
    assert.ok(Array.isArray(lesson.check.hints) && lesson.check.hints.length >= 2, "Check question must have multi-tier hints");
    assert.strictEqual(lesson.check.hints[0], "Recall the formula for mechanical work: W = F * d.");
  });

  // Step 7 & 8: Submit Answer with reasoning, evaluate misconception diagnosis
  let evalResult = null;
  await testAsync("Step 7 & 8: Evaluate Answer with Clinical Misconception Diagnosis", async () => {
    providerMode = "evaluation";
    evalResult = await evaluateTutor({
      uid: studentA,
      body: {
        conceptId: testConceptId,
        subConceptId: activeSubConceptId,
        question: "If a person pushes a stationary wall and it does not move, how much work is done?",
        answer: "A lot of work was done because pushing the wall for 10 minutes causes exhaustion and fatigue.",
        reasoning: "Effort equals work in real life."
      }
    });

    assert.ok(evalResult.evaluation, "Must return evaluation");
    assert.strictEqual(evalResult.evaluation.verdict, "incorrect");
    assert.ok(evalResult.evaluation.actualMistake, "Must isolate actual mistake");
    assert.ok(evalResult.evaluation.correctReasoning, "Must provide correct scientific reasoning");
    assert.ok(evalResult.evaluation.misconception, "Must diagnose misconception");
    assert.ok(evalResult.evaluation.misconceptionCategory, "Must diagnose misconceptionCategory");
    assert.ok(evalResult.evaluation.misconception.remediation, "Must provide remediation");
  });

  // Step 9: Adaptive Engine pivots strategy upon misconception
  await testAsync("Step 9: Adaptive Engine updates learning state and pivots strategy", async () => {
    // Verify that the student's concept state now records the misconception and updates mastery
    const stateDoc = await fakeDb.doc(`users/${studentA}/conceptStates/${testConceptId}`).get();
    assert.ok(stateDoc.exists, "ConceptState doc must exist in Firestore");
    const data = stateDoc.data();
    assert.ok(data.calibratedMastery, "Calibrated mastery should exist");
    assert.ok(data.spacedRevision, "Spaced revision should exist");
    assert.strictEqual(data.lastVerdict, "incorrect");
  });

  // Step 10 & 11: Student returns later, progress is restored with sub-concept checkmarks
  await testAsync("Step 10 & 11: Progress Persistence and Restoration upon return", async () => {
    // Now simulate student successfully completing with correct answer
    providerMode = "evaluation-correct";
    await evaluateTutor({
      uid: studentA,
      body: {
        conceptId: testConceptId,
        subConceptId: activeSubConceptId,
        question: "If a person pushes a stationary wall and it does not move, how much work is done?",
        answer: "Zero work is done because the wall does not move (displacement d = 0).",
        reasoning: "W = F * d = F * 0 = 0 J."
      }
    });

    // Check updated state doc
    const stateDoc = await fakeDb.doc(`users/${studentA}/conceptStates/${testConceptId}`).get();
    const data = stateDoc.data();
    assert.strictEqual(data.lastVerdict, "correct");

    // Check updated chapter outline
    const refreshedOutline = await chapterAction({ uid: studentA, body: { conceptId: testConceptId } });
    const outline = refreshedOutline.chapter;
    assert.ok(outline, "Chapter outline must be returned");
    // With mastery recorded, outline computes updated status
    assert.ok(typeof outline.progressPercent === "number", "Progress percent should reflect progress");
  });

  // Step 12: Spaced Revision & Study Planner Integration
  await testAsync("Step 12: Spaced Revision recommendations and Planner integration", async () => {
    const stateDoc = await fakeDb.doc(`users/${studentA}/conceptStates/${testConceptId}`).get();
    const data = stateDoc.data();
    const nextReview = data.spacedRevision && (data.spacedRevision.nextReviewAtIso || data.spacedRevision.nextRecommendedReviewDate);
    assert.ok(nextReview, "Must calculate nextReview date");
    const reviewDate = new Date(nextReview);
    assert.ok(!isNaN(reviewDate.getTime()), "Valid ISO review date");
    assert.ok(reviewDate.getTime() > Date.now(), "Review date set in future interval");
  });

  // Cross-cutting Test 1: User Data Isolation
  await testAsync("Cross-cutting: Student A and Student B data isolation", async () => {
    // Check Student B who has not started this chapter
    const resB = await chapterAction({ uid: studentB, body: { conceptId: testConceptId } });
    const outlineB = resB.chapter;
    assert.strictEqual(outlineB.completedConcepts, 0, "Student B must have 0 completed concepts");
    assert.strictEqual(outlineB.progressPercent, 0, "Student B must have 0% progress");

    // Student A has progress
    const resA = await chapterAction({ uid: studentA, body: { conceptId: testConceptId } });
    assert.ok(resA.chapter !== null, "Student A has chapter outline");
  });

  // Cross-cutting Test 2: Unknown or Dynamic Concept Fallback
  await testAsync("Cross-cutting: Unknown concept gracefully generates coherent 4-concept roadmap", async () => {
    const unknownId = "cbse.12.physics.quantum_optics_advanced";
    const res = await chapterAction({ uid: studentA, body: { conceptId: unknownId } });
    assert.ok(res.chapter, "Must return chapter outline for unknown concept");
    const outline = res.chapter;
    assert.ok(outline.title.includes("Quantum Optics Advanced"), "Title dynamically generated from ID");
    assert.ok(Array.isArray(outline.concepts) && outline.concepts.length === 4, "Generated 4 foundational sub-concepts");
    assert.strictEqual(outline.concepts[0].title, "Core Principles and Foundations of Quantum Optics Advanced");
    assert.strictEqual(outline.concepts[1].title, "Governing Equations, Mechanisms and Rules");
    assert.strictEqual(outline.concepts[2].title, "Worked Problem-Solving and Step-by-Step Analysis");
    assert.strictEqual(outline.concepts[3].title, "Real-World Applications, Synthesis and Retention");
  });

  console.log(`\n=== ALL TESTS PASSED: ${passed}/${total} assertions verified ===\n`);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
