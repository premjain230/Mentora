// test_tutor_flow.js
// Exercises the shared teaching engine with a stubbed AI provider and no
// Firestore. This is what verifies the fallback paths, structured output
// validation, authored-content reuse and "no AI call where none is needed",
// without spending provider tokens or touching production data.

const assert = require("assert");

let providerMode = "lesson";
let providerCalls = 0;
const providerPayloads = [];

function fakeLesson() {
  return {
    kind: "lesson",
    title: "Resistance in a circuit",
    directAnswer: "Resistance is how strongly a conductor opposes current.",
    sections: [
      { heading: "What it is", body: "Resistance measures the opposition to charge flow and is measured in ohms." },
      { heading: "What changes it", body: "A longer or thinner wire has more resistance." },
    ],
    example: {
      problem: "A 6 V battery drives 2 A through a resistor. Find R.",
      steps: ["Use R = V / I.", "Substitute: R = 6 / 2 = 3 Ω."],
      answer: "3 Ω",
    },
    check: { prompt: "If the voltage doubles at constant resistance, what happens to the current?", hint: "Use I = V/R.", answerKey: "The current doubles." },
    visualId: "circuit-series",
    visualParams: { cells: 2, resistanceOhms: 6 },
    visualObserve: "Watch the markers move faster when the current is larger.",
    personalization: null,
  };
}

function fakeEvaluation(overrides = {}) {
  return {
    verdict: "partially_correct",
    whatWorked: ["You recognised that the current changes."],
    missing: ["You did not say how the current changes or why."],
    misconception: null,
    feedback: "Your direction is right, but the relationship I = V/R is missing.",
    next: { difficulty: "same", step: "retry", message: "Use the equation to say exactly how much the current changes." },
    ...overrides,
  };
}

const aiPath = require.resolve("./api/_ai");
const adminPath = require.resolve("./api/_admin");

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
function fakeDoc(path) {
  return {
    id: path.split("/").pop(),
    collection: (name) => fakeQuery(`${path}/${name}`),
    async get() {
      return fakeSnapshot(path.split("/").pop(), store.get(path));
    },
    async set(data, options = {}) {
      const current = store.get(path);
      store.set(path, options && options.merge ? { ...(current || {}), ...data } : { ...data });
    },
  };
}
function fakeQuery(path, filters = []) {
  const query = {
    where: (field, op, value) => fakeQuery(path, [...filters, { field, op, value }]),
    limit: () => query,
    async get() {
      const prefix = `${path}/`;
      const docs = [...store.entries()].filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"));
      const matched = docs.filter(([, value]) =>
        filters.every(({ field, op, value: expected }) => (op === "==" ? value && value[field] === expected : true))
      );
      const snapshot = {
        forEach: (fn) => matched.forEach(([key, value]) => fn(fakeSnapshot(key.split("/").pop(), value))),
      };
      return snapshot;
    },
    doc: (id) => fakeDoc(`${path}/${id}`),
  };
  return query;
}
const fakeDb = {
  doc: fakeDoc,
  collection: (path) => fakeQuery(path),
};

require.cache[aiPath] = {
  id: aiPath,
  filename: aiPath,
  loaded: true,
  exports: {
    groqComplete: async (options) => {
      providerCalls += 1;
      providerPayloads.push(options);
      if (providerMode === "throw") throw new Error("Groq error (429) rate limit exceeded");
      if (providerMode === "bad-json") return { nope: true };
      if (providerMode === "evaluation") return fakeEvaluation();
      if (providerMode === "evaluation-correct") return fakeEvaluation({ verdict: "correct", missing: [], next: { difficulty: "harder", step: "continue", message: "Move on." } });
      if (providerMode === "short") {
        return { kind: "short", title: null, directAnswer: "You are welcome. Ask me another question whenever you are ready.", sections: [] };
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
    verifyIdToken: async () => null,
  },
};

const core = require("./api/_learn-core");

const emptyState = {
  profile: { board: "cbse", classNum: 10, language: "en", prioritySubject: null, subjects: [], weakTopics: [] },
  mastery: null,
  review: null,
  misconceptions: [],
  weakConcepts: [],
  hub: { last: null, topics: {} },
};

let passed = 0;
let failed = 0;
async function test(name, fn) {
  providerCalls = 0;
  providerPayloads.length = 0;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

(async () => {
  console.log("\n--- Tutor flow (stubbed provider) ---");

  await test("authored lesson is served with zero AI calls", async () => {
    providerMode = "lesson";
    const result = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 0, "reviewed packs must not call the provider");
    assert(result.lesson);
    assert.strictEqual(result.lesson.source, "authored");
    assert.strictEqual(result.lesson.reviewed, true);
    assert(result.lesson.sections.length >= 2);
    assert(result.lesson.check && result.lesson.check.questionId, "practice question missing");
    assert(!("answerKey" in result.lesson), "answer key must never be returned to the client");
    assert(result.lesson.visual && result.lesson.visual.id, "authored visual missing");
    assert.strictEqual(result.meta.aiCalls, 0);
  });

  await test("correct authored answer is graded without an AI call", async () => {
    providerMode = "evaluation";
    const result = await core.evaluateTutor({
      uid: "test-user",
      body: {
        conceptId: "cbse.10.science.electricity",
        track: "cbse",
        classNum: 10,
        questionId: "ohm-q1",
        question: "A 12 V battery is connected across a 4 Ω resistor. What current flows?",
        answer: "3 A",
        level: "foundation",
        difficulty: 1,
        attempts: [],
        surface: "hub",
      },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 0, "a matching authored answer must not spend an AI call");
    assert.strictEqual(result.evaluation.verdict, "correct");
    assert.strictEqual(result.evaluation.basis, "authored-accept");
    assert(result.nextQuestion, "the next authored question should be selected locally");
    assert.strictEqual(result.learningEvent.source, "study_session");
  });

  await test("ambiguous answer is evaluated by AI and keeps a misconception labelled", async () => {
    providerMode = "evaluation";
    const result = await core.evaluateTutor({
      uid: "test-user",
      body: {
        conceptId: "cbse.10.science.electricity",
        track: "cbse",
        classNum: 10,
        questionId: "ohm-q2",
        question: "The resistance doubles while voltage stays the same. What happens to the current, and why?",
        answer: "It changes somehow but I am not sure of the direction.",
        level: "intermediate",
        difficulty: 2,
        attempts: [],
        surface: "hub",
      },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1, "one evaluation call expected");
    assert.strictEqual(result.evaluation.verdict, "partially_correct");
    assert(result.evaluation.missing.length > 0);
    assert.strictEqual(result.learningEvent.payload.correct, false);
    assert.strictEqual(result.learningEvent.source, "study_session");
  });

  await test("chat returns validated structured content in one AI call", async () => {
    providerMode = "lesson";
    const result = await core.chatTutor({
      uid: "test-user",
      body: {
        question: "What is resistance in an electric circuit?",
        context: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10 },
        history: [],
      },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1, "one chat call expected");
    assert.strictEqual(result.reply.kind, "lesson");
    assert.strictEqual(result.reply.visual.id, "circuit-series");
    assert(result.reply.sections.length >= 1);
    assert.strictEqual(result.meta.aiCalls, 1);
    const prompt = providerPayloads[0].messages.map((m) => m.content).join("\n");
    assert(prompt.includes("Student question:"), "the prompt must include the actual question");
    assert(prompt.includes("Approved visual candidates"), "the prompt must constrain visual choice");
  });

  await test("simple conversational question stays short", async () => {
    providerMode = "short";
    const result = await core.chatTutor({
      uid: "test-user",
      body: { question: "thanks", context: {}, history: [] },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1);
    assert.strictEqual(result.reply.kind, "short");
    assert.strictEqual(result.reply.sections.length, 0);
    assert(result.reply.directAnswer.length < 300);
  });

  await test("provider failure uses reviewed content instead of inventing an answer", async () => {
    providerMode = "throw";
    const result = await core.chatTutor({
      uid: "test-user",
      body: {
        question: "What is resistance in a circuit?",
        context: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10 },
        history: [],
      },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1);
    assert.strictEqual(result.reply.kind, "lesson");
    assert.strictEqual(result.reply.source, "authored");
    assert.strictEqual(result.reply.fallback, true);
    assert.strictEqual(result.meta.source, "authored-fallback");
    assert(result.reply.sections.length > 0, "reviewed content should still teach");
  });

  await test("provider failure with no matching content reports the failure honestly", async () => {
    providerMode = "throw";
    const result = await core.chatTutor({
      uid: "test-user",
      body: { question: "How do I cite a source in APA style?", context: {}, history: [] },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1, "a rate limit must not be retried into a second call");
    assert.strictEqual(result.reply.kind, "fallback");
    assert.strictEqual(result.reply.retry, true);
    assert(result.reply.directAnswer.includes("could not reach"));
    assert.strictEqual(result.reply.sections.length, 0);
  });

  await test("unsafe AI output is rejected rather than rendered", async () => {
    providerMode = "bad-json";
    const result = await core.chatTutor({
      uid: "test-user",
      body: { question: "Explain inductance", context: {}, history: [] },
      state: emptyState,
    });
    assert.strictEqual(result.reply.kind, "fallback");
    assert.strictEqual(result.reply.source, "unavailable");
  });

  await test("generated lesson keeps its answer key server-side and attaches a cache key", async () => {
    providerMode = "lesson";
    const result = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId: "cbse.10.science.life_processes", track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 1);
    assert.strictEqual(result.lesson.source, "ai");
    assert.strictEqual(result.lesson.reviewed, false);
    assert(result.lesson.generatedNotice, "unreviewed content must say so");
    assert(!("answerKey" in result.lesson), "answer key must be stripped from the response");
    assert(result.lesson.cacheKey, "a generated question needs its cache key for server-side grading");
    assert(result.lesson.check.questionId.startsWith("gen-"));
  });

  await test("provider failure for an unauthored chapter shows the curriculum outline only", async () => {
    providerMode = "throw";
    const result = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId: "cbse.10.science.heredity", track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    assert.strictEqual(result.lesson.source, "unavailable");
    assert.strictEqual(result.lesson.retry, true);
    assert(result.lesson.sections[0].heading.toLowerCase().includes("covers"));
    assert(result.lesson.sections.length === 1, "must not fabricate a full lesson");
  });

  await test("catalogue and state actions never call the provider", async () => {
    providerMode = "lesson";
    const catalog = await core.catalogAction({ uid: "test-user", body: {}, state: emptyState });
    const state = await core.stateAction({ uid: "test-user", body: {}, state: emptyState });
    assert.strictEqual(providerCalls, 0);
    assert.strictEqual(catalog.catalog.step, "board");
    assert.strictEqual(state.meta.aiCalls, 0);
  });

  await test("a reteach request is not served from the stale cached explanation", async () => {
    providerMode = "lesson";
    const first = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId: "cbse.10.science.life_processes", track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    const callsAfterFirst = providerCalls;
    const reteach = await core.lessonTutor({
      uid: "test-user",
      body: {
        conceptId: "cbse.10.science.life_processes",
        track: "cbse",
        classNum: 10,
        mode: "reteach",
        focus: "The student still cannot explain why the light reaction stops in the dark.",
      },
      state: emptyState,
    });
    assert(first.lesson.source === "ai");
    assert.strictEqual(providerCalls, callsAfterFirst + 1, "reteaching must ask for a different explanation");
    assert(reteach.lesson.source === "ai");
    const prompt = providerPayloads[providerPayloads.length - 1].messages.map((m) => m.content).join("\n");
    assert(prompt.includes("The student still cannot explain"), "the reteach focus must reach the model");
    assert(prompt.includes("DIFFERENT"), "the reteach prompt must demand a different approach");
  });

  await test("a struggling student gets a changed authored explanation, not a repeat", async () => {
    providerMode = "lesson";
    const result = await core.lessonTutor({
      uid: "test-user",
      body: {
        conceptId: "cbse.10.science.electricity",
        track: "cbse",
        classNum: 10,
        mode: "reteach",
        attempts: [{ questionId: "ohm-q1", difficulty: 1, verdict: "incorrect" }],
      },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, 0, "reviewed packs must still avoid generation");
    assert.strictEqual(result.lesson.source, "authored");
    assert(result.lesson.sections[0].heading.toLowerCase().includes("water-pipe"), "the alternate explanation should lead");
    assert(result.lesson.reteach && result.lesson.reteach.changedApproach);
    assert(result.lesson.check.difficulty <= 2, "the next question should not jump in difficulty");
  });

  await test("an evaluation outage is not recorded as a wrong answer", async () => {
    providerMode = "throw";
    const result = await core.evaluateTutor({
      uid: "test-user",
      body: {
        conceptId: "cbse.10.science.electricity",
        track: "cbse",
        classNum: 10,
        questionId: "ohm-q1",
        question: "A 12 V battery is connected across a 4 Ω resistor. What current flows?",
        answer: "I am not sure",
        level: "foundation",
        difficulty: 1,
        attempts: [],
        surface: "hub",
      },
      state: emptyState,
    });
    assert.strictEqual(result.evaluation.verdict, "unknown");
    assert.strictEqual(result.evaluation.retry, true);
    assert.strictEqual(result.learningEvent, null, "no evidence should be written from a failed evaluation");
    assert.strictEqual(result.attempts.length, 0);
  });

  await test("repeated generic chat question reuses cached content with zero AI calls", async () => {
    providerMode = "lesson";
    const question = "Define resistance";
    const first = await core.chatTutor({
      uid: "test-user",
      body: { question, context: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10 }, history: [] },
      state: emptyState,
    });
    assert.strictEqual(first.meta.cached, false);
    const callsAfterFirst = providerCalls;
    const second = await core.chatTutor({
      uid: "test-user",
      body: { question, context: { conceptId: "cbse.10.science.electricity", track: "cbse", classNum: 10 }, history: [] },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, callsAfterFirst, "a repeated generic question must not generate again");
    assert.strictEqual(second.meta.cached, true);
    assert.strictEqual(second.meta.aiCalls, 0);
  });

  await test("repeated topic without a curriculum id still reuses its cache", async () => {
    providerMode = "lesson";
    const question = "Explain photosynthesis in plants";
    const first = await core.chatTutor({ uid: "test-user", body: { question, context: {}, history: [] }, state: emptyState });
    assert.strictEqual(first.meta.cached, false);
    const callsAfterFirst = providerCalls;
    const second = await core.chatTutor({ uid: "test-user", body: { question, context: {}, history: [] }, state: emptyState });
    assert.strictEqual(providerCalls, callsAfterFirst, "a repeated topic anchored by a reviewed pack must not regenerate");
    assert.strictEqual(second.meta.cached, true);
  });

  await test("a generated lesson is cached by curriculum + level and reused", async () => {
    providerMode = "lesson";
    const conceptId = "cbse.10.science.periodic_classification_of_elements";
    const first = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId, track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    assert.strictEqual(first.lesson.source, "ai");
    const callsAfterFirst = providerCalls;
    const second = await core.lessonTutor({
      uid: "test-user",
      body: { conceptId, track: "cbse", classNum: 10, mode: "start" },
      state: emptyState,
    });
    assert.strictEqual(providerCalls, callsAfterFirst);
    assert.strictEqual(second.meta.cached, true);
    assert.strictEqual(second.meta.aiCalls, 0);
  });

  await test("hub progress is persisted for continuation", async () => {
    const state = await core.loadStudentState("test-user", {});
    assert(state.hub.last, "last opened topic should be persisted");
    assert(state.hub.topics["cbse.10.science.electricity"].attempts >= 1);
  });

  await test("state recommends the next chapter from the concept alone", async () => {
    const result = await core.stateAction({
      uid: "test-user",
      body: { conceptId: "cbse.10.science.electricity" },
      state: emptyState,
    });
    assert(result.nextChapter, "the next chapter should be derived from the curriculum order");
    assert(result.nextChapter.conceptId.startsWith("cbse.10.science."));
    assert(result.nextChapter.name);
  });

  await test("existing onboarding profile fields are understood", async () => {
    store.set("users/profile-user/learning/profile", {
      academic: { board: "CBSE", grade: "10", track: "school" },
      subjects: ["Science", "Mathematics"],
      prioritySubject: "Science",
    });
    const state = await core.loadStudentState("profile-user", {});
    assert.strictEqual(state.profile.board, "cbse");
    assert.strictEqual(state.profile.classNum, 10);
    assert.strictEqual(state.profile.prioritySubject, "Science");
    assert.deepStrictEqual(state.profile.subjects, ["Science", "Mathematics"]);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
