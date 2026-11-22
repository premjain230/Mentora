// test_quiz_core.js
// Automated verification suite for server-authoritative Quiz core logic (Phase 1).
// Verifies pure functions in server/_quiz.js:
// 1. Normalization of questions (bank + AI) and answer key canonicalization
// 2. Complete stripping of answer keys in publicQuizQuestions
// 3. Choice normalization and range validation
// 4. Server-side answer correctness evaluation
// 5. Session usability, lifecycle assertion, and ownership security
// 6. Score computation, duplicate answer rejection, and passing threshold
// 7. Canonical conceptId mapping for Bayesian mastery integration

const assert = require("assert");
const quiz = require("./server/_quiz");

function runQuizCoreSuite() {
  console.log("============================================================");
  console.log("Learning Allied — Server-Authoritative Quiz Core Test Suite");
  console.log("============================================================\n");

  let passed = 0;
  function check(name, fn) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      process.exit(1);
    }
  }

  // ── 1. Bank integrity & Normalization ──
  check("BANK contains required subjects and topics", () => {
    assert.ok(quiz.BANK.Physics.Kinematics.length >= 10);
    assert.ok(quiz.BANK.Physics["Laws of Motion"].length >= 10);
    assert.ok(quiz.BANK.Chemistry["Atomic Structure"].length >= 10);
    assert.ok(quiz.BANK.Chemistry["Chemical Bonding"].length >= 8);
    assert.ok(quiz.BANK.Biology["Cell Biology"].length >= 10);
    assert.ok(quiz.BANK.Biology.Genetics.length >= 8);
    assert.ok(quiz.BANK.Mathematics.Algebra.length >= 8);
    assert.ok(quiz.BANK.Mathematics.Trigonometry.length >= 8);
  });

  check("normalizeQuizQuestions converts numerical bank answers (0..3) to canonical letters (A..D)", () => {
    const raw = [
      { q: "What is 1+1?", options: ["1", "2", "3", "4"], answer: 1, explanation: "1+1=2" },
      { q: "What is 2+2?", options: ["2", "3", "4", "5"], answer: 2, explanation: "2+2=4" },
    ];
    const normalized = quiz.normalizeQuizQuestions(raw, 5);
    assert.strictEqual(normalized.length, 2);
    assert.strictEqual(normalized[0].answer, "B");
    assert.strictEqual(normalized[1].answer, "C");
    assert.strictEqual(normalized[0].explanation, "1+1=2");
  });

  check("normalizeQuizQuestions converts letter answers from AI (a, b, c, d) to canonical uppercase", () => {
    const raw = [
      { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Mitochondria"], answer: "b", explanation: "Mitochondria" },
      { q: "Solve x: x-5=0", options: ["A) 5", "B) 10"], answer: "A", explanation: "x=5" },
    ];
    const normalized = quiz.normalizeQuizQuestions(raw, 5);
    assert.strictEqual(normalized.length, 2);
    assert.strictEqual(normalized[0].answer, "B");
    assert.strictEqual(normalized[1].answer, "A");
  });

  check("normalizeQuizQuestions rejects questions with invalid or out-of-range answers", () => {
    const raw = [
      { q: "Valid Q", options: ["A", "B"], answer: 0 },
      { q: "Invalid Q1", options: ["A", "B"], answer: 5 }, // index out of options range
      { q: "Invalid Q2", options: ["A", "B"], answer: "Z" }, // invalid letter
      { q: "Invalid Q3", options: ["Only One Option"], answer: 0 }, // options < 2
    ];
    const normalized = quiz.normalizeQuizQuestions(raw, 10);
    assert.strictEqual(normalized.length, 1);
    assert.strictEqual(normalized[0].q, "Valid Q");
  });

  // ── 2. Security: Never send answer keys to browser ──
  check("publicQuizQuestions strips answer keys and explanations", () => {
    const questions = [
      { q: "Question 1", options: ["Opt A", "Opt B", "Opt C", "Opt D"], answer: "B", explanation: "Secret explanation" },
      { q: "Question 2", options: ["Opt 1", "Opt 2"], answer: "A", explanation: "Secret 2" },
    ];
    const pub = quiz.publicQuizQuestions(questions);
    assert.strictEqual(pub.length, 2);
    for (const q of pub) {
      assert.strictEqual(q.answer, undefined, "answer must not be present");
      assert.strictEqual(q.explanation, undefined, "explanation must not be present");
      assert.ok(q.id.startsWith("q_"), "id must be provided");
      assert.ok(Array.isArray(q.options));
      assert.ok(typeof q.q === "string");
    }
  });

  // ── 3. Choice normalization & bounds checking ──
  check("normalizeChoice accepts valid integer and letter choices", () => {
    assert.strictEqual(quiz.normalizeChoice(0, 4), 0);
    assert.strictEqual(quiz.normalizeChoice(3, 4), 3);
    assert.strictEqual(quiz.normalizeChoice("A", 4), 0);
    assert.strictEqual(quiz.normalizeChoice("b", 4), 1);
    assert.strictEqual(quiz.normalizeChoice("D", 4), 3);
    assert.strictEqual(quiz.normalizeChoice(" 2 ", 4), 2);
  });

  check("normalizeChoice rejects negative, out-of-range, and malformed choices", () => {
    assert.throws(() => quiz.normalizeChoice(-1, 4), /out of range/i);
    assert.throws(() => quiz.normalizeChoice(4, 4), /out of range/i);
    assert.throws(() => quiz.normalizeChoice("E", 4), /out of range/i);
    assert.throws(() => quiz.normalizeChoice("invalid", 4), /out of range/i);
    assert.throws(() => quiz.normalizeChoice(null, 4), /out of range/i);
  });

  // ── 4. Server-side answer evaluation ──
  check("isCorrectChoice accurately compares against question answer key", () => {
    const q = { q: "Sample", options: ["A", "B", "C", "D"], answer: "C" };
    assert.strictEqual(quiz.isCorrectChoice(q, 2), true); // C is index 2
    assert.strictEqual(quiz.isCorrectChoice(q, 0), false);
    assert.strictEqual(quiz.isCorrectChoice(q, 1), false);
    assert.strictEqual(quiz.isCorrectChoice(q, 3), false);
  });

  // ── 5. Session lifecycle & security assertions ──
  check("assertUsableQuizSession enforces ownership, active state, and TTL", () => {
    const validSession = {
      uid: "user_123",
      status: "active",
      expiresAt: Date.now() + 60000,
      questions: [{ q: "Q1", options: ["A", "B"], answer: "A" }],
      answers: [],
    };

    // Valid caller succeeds
    const usable = quiz.assertUsableQuizSession(validSession, { uid: "user_123" });
    assert.strictEqual(usable.questions.length, 1);

    // Foreign user rejected
    assert.throws(() => quiz.assertUsableQuizSession(validSession, { uid: "attacker_456" }), /belongs to another user/i);

    // Already completed session rejected
    assert.throws(() => quiz.assertUsableQuizSession({ ...validSession, status: "completed" }, { uid: "user_123" }), /already completed/i);

    // Expired session rejected
    assert.throws(() => quiz.assertUsableQuizSession({ ...validSession, expiresAt: Date.now() - 1000 }, { uid: "user_123" }), /expired/i);

    // Require complete rejects unfinished session
    assert.throws(() => quiz.assertUsableQuizSession(validSession, { uid: "user_123", requireComplete: true }), /answer every question/i);
  });

  // ── 6. Score calculation & anti-tampering ──
  check("scoreQuizAnswers computes verified scores exclusively from server answer keys", () => {
    const questions = [
      { q: "Q0", options: ["A", "B"], answer: "A" },
      { q: "Q1", options: ["A", "B", "C"], answer: "B" },
      { q: "Q2", options: ["A", "B", "C", "D"], answer: "D" },
      { q: "Q3", options: ["A", "B"], answer: "A" },
    ];
    const answers = [
      { index: 0, choice: 0 }, // Correct (A)
      { index: 1, choice: 1 }, // Correct (B)
      { index: 2, choice: 0 }, // Incorrect (A instead of D)
      { index: 3, choice: 0 }, // Correct (A)
    ];

    const result = quiz.scoreQuizAnswers(questions, answers);
    assert.strictEqual(result.total, 4);
    assert.strictEqual(result.correct, 3);
    assert.strictEqual(result.incorrect, 1);
    assert.strictEqual(result.percentage, 75);
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.accuracy, 0.75);
  });

  check("scoreQuizAnswers rejects duplicate submissions or mismatched lengths", () => {
    const questions = [
      { q: "Q0", options: ["A", "B"], answer: "A" },
      { q: "Q1", options: ["A", "B"], answer: "B" },
    ];
    // Incomplete answers
    assert.throws(() => quiz.scoreQuizAnswers(questions, [{ index: 0, choice: 0 }]), /answer every question/i);

    // Duplicate answer index
    assert.throws(() => quiz.scoreQuizAnswers(questions, [{ index: 0, choice: 0 }, { index: 0, choice: 0 }]), /duplicate/i);

    // Out of range index
    assert.throws(() => quiz.scoreQuizAnswers(questions, [{ index: 0, choice: 0 }, { index: 5, choice: 0 }]), /out of range/i);
  });

  // ── 7. ConceptId resolution for Bayesian mastery pipeline ──
  check("resolveQuizConceptId maps subject and topic to canonical curriculum conceptId", () => {
    assert.strictEqual(quiz.resolveQuizConceptId("Physics", "Kinematics"), "jee.main.physics.kinematics.projectile_motion");
    assert.strictEqual(quiz.resolveQuizConceptId("Physics", "Laws of Motion"), "jee.main.physics.laws_of_motion.friction");
    assert.strictEqual(quiz.resolveQuizConceptId("Chemistry", "Atomic Structure"), "jee.main.chemistry.atomic_structure.bohr_model");
    assert.strictEqual(quiz.resolveQuizConceptId("Chemistry", "Chemical Bonding"), "jee.main.chemistry.chemical_bonding.hybridization");
    assert.strictEqual(quiz.resolveQuizConceptId("Biology", "Cell Biology"), "neet.biology.cell_structure.organelles");
    assert.strictEqual(quiz.resolveQuizConceptId("Mathematics", "Algebra"), "cbse.10.mathematics.polynomials.quadratic");
    assert.strictEqual(quiz.resolveQuizConceptId("Unknown", "Random"), null);
  });

  console.log(`\n============================================================`);
  console.log(`ALL ${passed} QUIZ CORE TESTS PASSED!`);
  console.log(`============================================================\n`);
}

if (require.main === module) {
  runQuizCoreSuite();
}

module.exports = { runQuizCoreSuite };
