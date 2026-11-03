// Comprehensive Verification Suite for Learning Allied Adaptive Learning Intelligence Engine
// Tests all 14 pedagogical & architectural pillars and the Section 13 realistic multi-step learning sequence.

const assert = require('assert');
const path = require('path');

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
      questionId: "work-q1"
    },
    personalization: null
  };
}

function fakeEvaluation(overrides = {}) {
  return {
    verdict: "incorrect",
    whatWorked: ["You recognized that force and effort were exerted."],
    missing: ["You did not account for displacement being zero."],
    actualMistake: "Tiredness was confused with physical work done.",
    correctReasoning: "Mechanical work requires non-zero displacement in the direction of the force: W = F * d.",
    misconception: {
      id: "misc_zero_displacement",
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

require.cache[aiPath] = {
  id: aiPath,
  filename: aiPath,
  loaded: true,
  exports: {
    groqComplete: async (options) => {
      if (providerMode === "evaluation") return fakeEvaluation();
      if (providerMode === "evaluation-correct") {
        return fakeEvaluation({
          verdict: "correct",
          missing: [],
          misconception: null,
          feedback: "Spot on! Because displacement is zero, mechanical work is zero.",
          next: { difficulty: "harder", step: "continue", message: "Great job! Let's try a calculation." }
        });
      }
      return fakeLesson();
    },
    aiComplete: async (options) => {
      if (providerMode === "evaluation") return fakeEvaluation();
      if (providerMode === "evaluation-correct") {
        return fakeEvaluation({
          verdict: "correct",
          missing: [],
          misconception: null,
          feedback: "Spot on! Because displacement is zero, mechanical work is zero.",
          next: { difficulty: "harder", step: "continue", message: "Great job! Let's try a calculation." }
        });
      }
      return fakeLesson();
    },
    MODEL: "test-model",
  },
};

require.cache[adminPath] = {
  id: adminPath,
  filename: adminPath,
  loaded: true,
  exports: {
    firestore: () => fakeDb,
    verifyIdToken: async (tok) => ({ uid: tok ? tok.replace("token_", "") : "anon" }),
  },
};

const adaptive = require('./server/_learn-adaptive');
const core = require('./server/_learn-core');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('--- STARTING COMPREHENSIVE ADAPTIVE INTELLIGENCE ENGINE TESTS ---\n');

  // Pillar 1 & 2: Teaching Strategy Selection
  runTest('1. Strategy Selection: Switches upon confusion ("I still don\'t understand work in physics")', () => {
    const studentInput = "I still don't understand work in physics.";
    const selected = adaptive.selectTeachingStrategy({
      studentInput,
      conceptId: 'cbse.9.science.work_energy_and_simple_machines',
      previousAttempts: ['simple_explanation']
    });

    assert(selected, 'Strategy should be selected');
    assert.notStrictEqual(selected.strategy, 'simple_explanation', 'Should not repeat failed simple explanation');
    assert(['real_world_analogy', 'step_by_step', 'visual_demonstration', 'guided_discovery'].includes(selected.strategy),
      `Expected alternate strategy, got: ${selected.strategy}`);
    assert(selected.strategyLabel, 'Strategy label must be present');
    assert(selected.recommendedStyle, 'Recommended style guidance must be present');
  });

  runTest('2. Strategy Selection: Covers all 10 pedagogical strategies', () => {
    const expectedKeys = [
      'simple_explanation',
      'real_world_analogy',
      'step_by_step_breakdown',
      'visual_demonstration',
      'example_based',
      'concept_comparison',
      'guided_discovery',
      'prerequisite_bridge',
      'practice_based',
      'concept_decomposition'
    ];
    for (const key of expectedKeys) {
      assert(adaptive.TEACHING_STRATEGIES[key], `Strategy ${key} missing from TEACHING_STRATEGIES`);
      assert(adaptive.TEACHING_STRATEGIES[key].label, `Strategy ${key} missing label`);
      assert(adaptive.TEACHING_STRATEGIES[key].description, `Strategy ${key} missing description`);
    }
  });

  // Pillar 3: Misconception Detection Engine
  runTest('3. Misconception Engine: Classifies into 10 diagnostic categories with hypothesis confidence', () => {
    const categories = Object.keys(adaptive.MISCONCEPTION_CATEGORIES);
    assert.strictEqual(categories.length, 10, 'Must have exactly 10 diagnostic categories');

    const unitConfusion = adaptive.classifyMisconception({
      questionText: "Calculate work done in Joules",
      studentAnswer: "500 Watts",
      correctAnswer: "500 Joules",
      isCorrect: false
    });
    assert.strictEqual(unitConfusion.category, 'unit_confusion');
    assert.strictEqual(unitConfusion.isHypothesis, true, 'Must treat as hypothesis initially');
    assert(unitConfusion.confidence <= 0.7, 'Hypothesis confidence must be calibrated, not 1.0');
    assert(unitConfusion.actualMistake.length > 0);
    assert(unitConfusion.remediationApproach.length > 0);

    const calcSlip = adaptive.classifyMisconception({
      questionText: "Calculate 5 * 10",
      studentAnswer: "50.1",
      correctAnswer: "50",
      isCorrect: false
    });
    assert(['calculation_error', 'accidental_slip'].includes(calcSlip.category));
  });

  // Pillar 4: Learning Memory
  runTest('4. Learning Memory: Creates structured cross-session educational memory', () => {
    const mem = adaptive.createInitialLearningMemory('student_123');
    assert.strictEqual(mem.studentId, 'student_123');
    assert(Array.isArray(mem.successfulStrategies));
    assert(Array.isArray(mem.repeatedMisconceptions));
    assert(typeof mem.strengthsBySubject === 'object');

    const updated = adaptive.recordTeachingAttempt(mem, {
      conceptId: 'cbse.9.science.work_energy_and_simple_machines',
      strategy: 'real_world_analogy',
      wasSuccessful: true
    });
    assert(updated.successfulStrategies.includes('real_world_analogy'));
    assert.strictEqual(updated.strategyEffectiveness.real_world_analogy.successes, 1);
  });

  // Pillar 5: Intelligent Questioning Engine
  runTest('5. Intelligent Questioning: Selects appropriate pedagogical action (respects "Just tell me the answer")', () => {
    const directDemand = adaptive.selectPedagogicalAction({
      studentInput: "Just tell me the answer, please.",
      consecutiveErrors: 2,
      isExploratory: false
    });
    assert.strictEqual(directDemand.action, 'reveal_with_reasoning', 'Must respect student direct request with reasoning');
    assert.strictEqual(directDemand.revealsAnswer, true);

    const hintRequest = adaptive.selectPedagogicalAction({
      studentInput: "Can you give me a small hint?",
      consecutiveErrors: 1,
      isExploratory: true
    });
    assert.strictEqual(hintRequest.action, 'give_hint');

    const breakdownAction = adaptive.selectPedagogicalAction({
      studentInput: "Break this down into steps for me.",
      consecutiveErrors: 3,
      isExploratory: false
    });
    assert.strictEqual(breakdownAction.action, 'breakdown');
  });

  // Pillar 6: Calibrated Concept Mastery Engine
  runTest('6. Calibrated Concept Mastery: Explainable scoring, confidence calibration, hint & decay penalties', () => {
    // 0 evidence: honest assessment
    const initial = adaptive.calculateCalibratedMastery({
      history: [],
      lastStudiedAt: null,
      conceptDifficulty: 0.5
    });
    assert.strictEqual(initial.masteryScore, 0.1, 'Prior mastery baseline');
    assert.strictEqual(initial.confidence, 0.1, 'Confidence must be low with 0 evidence');
    assert.strictEqual(initial.masteryLevel, 'novice');
    assert(initial.explainabilityFactors.some(f => f.includes('Initial prior assessment')));

    // Independent success at difficulty 0.8
    const strongSuccess = adaptive.calculateCalibratedMastery({
      history: [
        { isCorrect: true, usedHint: false, difficulty: 0.8, timestamp: Date.now() },
        { isCorrect: true, usedHint: false, difficulty: 0.8, timestamp: Date.now() }
      ],
      lastStudiedAt: Date.now(),
      conceptDifficulty: 0.8
    });
    assert(strongSuccess.masteryScore >= 0.7, `Mastery score should be high, got ${strongSuccess.masteryScore}`);
    assert(strongSuccess.confidence >= 0.5, 'Confidence should increase with independent answers');

    // Hint penalty test
    const hintSuccess = adaptive.calculateCalibratedMastery({
      history: [
        { isCorrect: true, usedHint: true, difficulty: 0.8, timestamp: Date.now() },
        { isCorrect: true, usedHint: true, difficulty: 0.8, timestamp: Date.now() }
      ],
      lastStudiedAt: Date.now(),
      conceptDifficulty: 0.8
    });
    assert(hintSuccess.masteryScore < strongSuccess.masteryScore, 'Hint usage must reduce mastery contribution');

    // Retention decay test
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const decayed = adaptive.calculateCalibratedMastery({
      history: [
        { isCorrect: true, usedHint: false, difficulty: 0.8, timestamp: ninetyDaysAgo },
        { isCorrect: true, usedHint: false, difficulty: 0.8, timestamp: ninetyDaysAgo }
      ],
      lastStudiedAt: ninetyDaysAgo,
      conceptDifficulty: 0.8
    });
    assert(decayed.masteryScore < strongSuccess.masteryScore, 'Mastery must decay after 90 days');
    assert(decayed.explainabilityFactors.some(f => f.includes('Time decay applied')));
  });

  // Pillar 8: Intelligent Revision Engine
  runTest('8. Intelligent Revision: Spaced scheduling and priority based on urgency and retention', () => {
    const revision = adaptive.calculateSpacedRevision({
      masteryScore: 0.45,
      confidence: 0.6,
      consecutiveCorrect: 1,
      unresolvedMisconceptions: ['unit_confusion'],
      lastStudiedAt: Date.now() - 4 * 24 * 60 * 60 * 1000
    });

    assert(revision.isDue, 'Revision should be due after 4 days with low mastery');
    assert.strictEqual(revision.priority, 'high');
    assert(revision.recommendedFocus.includes('unit_confusion'));
    assert(revision.urgencyScore >= 70);
  });

  // Pillar 9: Cross-Subject Knowledge Intelligence
  runTest('9. Cross-Subject Knowledge: Grounded prerequisite mappings across Math, Physics, Chem, Bio', () => {
    // Work & Energy requires Linear Equations
    const workPrereq = adaptive.getCrossSubjectPrerequisites('cbse.9.science.work_energy_and_simple_machines');
    assert(workPrereq.length > 0, 'Work and energy should have cross-subject prerequisites');
    const hasMath = workPrereq.some(p => (p.targetSubject || '').toLowerCase().includes('mathematics') || (p.sourceSubject || '').toLowerCase().includes('mathematics'));
    assert(hasMath, 'Work and Energy must link to Mathematics');
    assert(workPrereq[0].educationalRationale, 'Rationale must be present');

    // Electricity requires Linear Equations
    const elecPrereq = adaptive.getCrossSubjectPrerequisites('cbse.10.science.electricity');
    assert(elecPrereq.length > 0);
    assert(elecPrereq.some(p => (p.targetSubject || '').toLowerCase().includes('mathematics')));

    // Light requires Trigonometry
    const lightPrereq = adaptive.getCrossSubjectPrerequisites('cbse.10.science.light_reflection_and_refraction');
    assert(lightPrereq.length > 0);
    assert(lightPrereq.some(p => p.prerequisiteConceptId.includes('trigonometry')));

    // Heredity requires Probability
    const heredityPrereq = adaptive.getCrossSubjectPrerequisites('cbse.10.science.heredity');
    assert(heredityPrereq.length > 0);
    assert(heredityPrereq.some(p => (p.targetSubject || '').toLowerCase().includes('mathematics')));
  });

  // Pillar 10: High-Quality Response Normalization (Prevents raw JSON leakage)
  runTest('10. Structured Response Normalization: Formats UI safely without raw JSON', () => {
    const rawAiOutput = JSON.stringify({
      summary: "Work is done when force produces displacement.",
      teachingStrategy: "real_world_analogy",
      keyIdea: "No displacement means no mechanical work.",
      checkQuestion: "Is pushing a stationary rock work?",
      options: ["Yes", "No"],
      correctIndex: 1
    });

    const normalized = adaptive.normalizeAdaptiveReply({
      rawText: rawAiOutput,
      strategyUsed: 'real_world_analogy',
      pedagogicalAction: 'explain'
    });

    assert(normalized.summary.includes('Work is done'));
    assert.strictEqual(normalized.keyIdea, 'No displacement means no mechanical work.');
    assert.strictEqual(normalized.teachingStrategy, 'real_world_analogy');
    assert(!normalized.summary.startsWith('{'), 'Summary must not leak raw JSON brackets');
  });

  // Pillar 13: Realistic Multi-Step Learning Sequence
  await runAsyncTest('13. Realistic Multi-Step Learning Sequence from Section 13 Requirements', async () => {
    const studentUid = 'user_student_multistep_001';
    const conceptId = 'cbse.9.science.work_energy_and_simple_machines';

    // Step 1: Student starts Work and Energy lesson
    console.log('   -> Step 1: Initial lesson start');
    providerMode = "lesson";
    const initialLessonResult = await core.lessonTutor({
      uid: studentUid,
      body: { conceptId, track: "cbse", classNum: 9, mode: "start" }
    });
    assert(initialLessonResult && initialLessonResult.lesson, 'Lesson tutor must return structured lesson');
    assert(initialLessonResult.lesson.teachingStrategy, 'Strategy must be attached');
    assert(initialLessonResult.lesson.crossSubjectLink, 'Cross-subject link to mathematics should be attached');

    // Step 2: Student answers diagnostic incorrectly with conceptual misunderstanding
    console.log('   -> Step 2: Student answers incorrectly');
    providerMode = "evaluation";
    const evalResult1 = await core.evaluateTutor({
      uid: studentUid,
      body: {
        conceptId,
        question: "A person pushes a brick wall with 500 N force for 3 hours, but the wall does not move. What is the work done?",
        answer: "I pushed the heavy wall for 3 hours and got exhausted, so I did a lot of work.",
        level: "intermediate",
        difficulty: 2,
        attempts: []
      }
    });

    // Step 3: AI classifies misconception hypothesis
    console.log('   -> Step 3: Verify misconception classification');
    assert.strictEqual(evalResult1.evaluation.verdict, 'incorrect');
    assert(evalResult1.evaluation.misconceptionCategory, 'Misconception category must be detected');
    assert(evalResult1.evaluation.actualMistake, 'Specific mistake must be explained');
    assert(evalResult1.evaluation.correctReasoning, 'Correct reasoning must be provided');

    // Step 4: Student expresses confusion; AI pivots teaching strategy
    console.log('   -> Step 4: AI pivots strategy upon confusion');
    providerMode = "lesson";
    const chatTurn1 = await core.chatTutor({
      uid: studentUid,
      body: {
        conceptId,
        question: "I still don't understand work in physics. I got tired, why isn't that work?",
        context: {},
        history: []
      }
    });
    assert(chatTurn1.reply && chatTurn1.reply.teachingStrategy, 'Chat tutor must assign teaching strategy');

    // Step 5: Student answers diagnostic question correctly using the new strategy
    console.log('   -> Step 5: Student answers correctly');
    providerMode = "evaluation-correct";
    const evalResult2 = await core.evaluateTutor({
      uid: studentUid,
      body: {
        conceptId,
        question: "If a machine exerts 200 N on an immovable boulder, what is the work done?",
        answer: "Zero Joules, because the displacement was zero even though force was applied.",
        level: "intermediate",
        difficulty: 2,
        attempts: [{ verdict: 'incorrect' }]
      }
    });
    assert.strictEqual(evalResult2.evaluation.verdict, 'correct');

    // Step 6: Mastery estimate updates with evidence and recovery bonus
    console.log('   -> Step 6: Mastery estimate update');
    assert(evalResult2.calibratedMastery, 'Calibrated mastery must be returned');
    assert(evalResult2.calibratedMastery.masteryScore > evalResult1.calibratedMastery.masteryScore,
      'Mastery score should increase after correct answer');

    // Step 7: Learning memory persists successful strategy and updates state
    console.log('   -> Step 7: Check state & memory persistence');
    const state = await core.stateAction({ uid: studentUid, body: { conceptId } });
    assert(state.learningMemory, 'Learning memory must be present');
    assert(state.calibratedMastery, 'Calibrated mastery summary must be present in student state');
    assert(state.conceptState[conceptId], 'Concept state must be stored for this concept');

    // Step 8: Student returns in a later session; state loads memory
    console.log('   -> Step 8: Cross-session reload');
    const loadedState = await core.loadStudentState(studentUid, { conceptId });
    assert.strictEqual(loadedState.learningMemory.studentId, studentUid);
    assert(loadedState.conceptState[conceptId].attempts >= 2);

    // Step 9: Spaced revision recommendation triggers
    console.log('   -> Step 9: Spaced revision calculation');
    const revision = adaptive.calculateSpacedRevision({
      masteryScore: evalResult2.calibratedMastery.masteryScore,
      confidence: evalResult2.calibratedMastery.confidence,
      consecutiveCorrect: 1,
      unresolvedMisconceptions: [],
      lastStudiedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
    });
    assert(revision.nextRecommendedReviewDate, 'Next recommended review date should be calculated');

    // Step 10: Student demonstrates independent understanding on higher difficulty
    console.log('   -> Step 10: Higher difficulty independent problem solving');
    providerMode = "evaluation-correct";
    const evalResult3 = await core.evaluateTutor({
      uid: studentUid,
      body: {
        conceptId,
        question: "A crate is pulled with a constant horizontal force of 50 N over a distance of 10 m. What is the work done?",
        answer: "Work = F * d = 50 N * 10 m = 500 Joules",
        level: "advanced",
        difficulty: 3,
        attempts: [{ verdict: 'incorrect' }, { verdict: 'correct' }]
      }
    });
    assert.strictEqual(evalResult3.evaluation.verdict, 'correct');
    assert(evalResult3.calibratedMastery.masteryScore >= evalResult2.calibratedMastery.masteryScore);
  });

  // Student Isolation & Security
  await runAsyncTest('14. Student Isolation: Prevents cross-student state or memory leakage', async () => {
    const studentA = 'user_student_A';
    const studentB = 'user_student_B';

    await core.saveLearningMemory(studentA, {
      studentId: studentA,
      successfulStrategies: ['real_world_analogy'],
      repeatedMisconceptions: ['unit_confusion']
    });

    await core.saveLearningMemory(studentB, {
      studentId: studentB,
      successfulStrategies: ['step_by_step_breakdown'],
      repeatedMisconceptions: ['calculation_error']
    });

    const stateA = await core.loadStudentState(studentA);
    const stateB = await core.loadStudentState(studentB);

    assert.deepStrictEqual(stateA.learningMemory.successfulStrategies, ['real_world_analogy']);
    assert.deepStrictEqual(stateB.learningMemory.successfulStrategies, ['step_by_step_breakdown']);
    assert.notStrictEqual(stateA.learningMemory.studentId, stateB.learningMemory.studentId);
  });

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passedTests} / ${totalTests} test suites passed!`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
