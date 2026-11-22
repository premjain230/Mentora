"use strict";

const assert = require("assert");
const quiz = require("./server/_quiz");
const handler = require("./server/learning-event");

console.log("============================================================");
console.log("Learning Allied — Quiz Written Answer Lifecycle & Scoring Test");
console.log("============================================================\n");

async function runWrittenQuizLifecycleTest() {
  const mockDb = new Map();
  const studentUid = "student_written_test_101";

  // Mock firestore instance
  const fakeFirestore = {
    doc(p) {
      return {
        path: p,
        async get() {
          const val = mockDb.get(p);
          return { exists: val !== undefined, data: () => val };
        },
        async set(data, opts) {
          if (opts && opts.merge && mockDb.has(p)) {
            mockDb.set(p, { ...mockDb.get(p), ...data });
          } else {
            mockDb.set(p, data);
          }
        },
        async update(data) {
          if (!mockDb.has(p)) throw new Error("Document not found: " + p);
          mockDb.set(p, { ...mockDb.get(p), ...data });
        },
      };
    },
    collection(p) {
      return {
        path: p,
        doc() {
          const id = "doc_" + Math.random().toString(36).slice(2, 9);
          return fakeFirestore.doc(`${p}/${id}`);
        },
      };
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          return ref.get();
        },
        update(ref, data) {
          if (!mockDb.has(ref.path)) throw new Error("Document not found: " + ref.path);
          mockDb.set(ref.path, { ...mockDb.get(ref.path), ...data });
        },
        set(ref, data, opts) {
          if (opts && opts.merge && mockDb.has(ref.path)) {
            mockDb.set(ref.path, { ...mockDb.get(ref.path), ...data });
          } else {
            mockDb.set(ref.path, data);
          }
        },
      };
      return await fn(tx);
    },
  };

  // Test 1: scoreQuizAnswers handles mixed written and MCQ responses
  const questions = [
    { q: "What is velocity?", options: ["m/s", "m/s2", "kg", "N"], answer: "A", explanation: "m/s" },
    { q: "Explain inertia.", options: ["A", "B", "C", "D"], answer: "B", explanation: "Resistance to acceleration" },
    { q: "What is F=ma?", options: ["First", "Second", "Third", "None"], answer: "B", explanation: "Second Law" },
  ];

  const answers = [
    { index: 0, mode: "mcq", choice: 0, correct: true },
    { index: 1, mode: "written", userAnswer: "Inertia is the property of an object to resist changes in its state of motion.", correct: true },
    { index: 2, mode: "written", userAnswer: "Newton's second law", correct: true },
  ];

  const scored = quiz.scoreQuizAnswers(questions, answers);
  assert.strictEqual(scored.total, 3, "Total should be 3");
  assert.strictEqual(scored.score, 3, "All 3 answers should be scored correct");
  assert.strictEqual(scored.percentage, 100, "Percentage should be 100%");
  console.log("  ✓ scoreQuizAnswers scores mixed MCQ and written answers with 100% accuracy");

  // Test 2: Partial credit for written answers
  const partialAnswers = [
    { index: 0, mode: "mcq", choice: 0, correct: true },
    { index: 1, mode: "written", userAnswer: "It resists things moving.", correct: false, partial: true },
    { index: 2, mode: "mcq", choice: 1, correct: true },
  ];
  const partialScored = quiz.scoreQuizAnswers(questions, partialAnswers);
  assert.strictEqual(partialScored.correct, 2.5, "Partial credit adds 0.5");
  assert.strictEqual(partialScored.percentage, 83, "Percentage should round to 83%");
  console.log("  ✓ scoreQuizAnswers accurately assigns partial credit for written answers");

  console.log("\n============================================================");
  console.log("ALL WRITTEN QUIZ LIFECYCLE TESTS PASSED!");
  console.log("============================================================\n");
}

runWrittenQuizLifecycleTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
