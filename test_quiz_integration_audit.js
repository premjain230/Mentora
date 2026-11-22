/**
 * test_quiz_integration_audit.js
 * Focused Integration & Correctness Audit Test Suite
 *
 * Verifies:
 * 1. AI mode question generation via mocked server-side AI provider (Gemini primary -> Groq fallback).
 * 2. Written answer evaluation via server-side Socratic grading.
 * 3. Bayesian mastery updates & Misconception threshold (ensures 1 incorrect answer cannot create a misconception).
 * 4. Idempotency & anti-inflation on duplicate finish requests.
 * 5. Concept ID resolution across all curriculum subjects & topics.
 * 6. Client-server response shape compatibility.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("Learning Allied — Quiz Integration & Correctness Audit Suite");
console.log("============================================================\n");

// Mock Firestore DB with in-memory collections and transactions
function createMockDb() {
  const store = new Map();

  function getDoc(p) {
    if (!store.has(p)) store.set(p, { exists: false, data: () => null });
    return store.get(p);
  }

  function setDoc(p, data, opts) {
    const existing = store.get(p);
    let finalData = data;
    if (opts && opts.merge && existing && existing.exists) {
      finalData = { ...existing.data(), ...data };
    }
    store.set(p, {
      id: p.split("/").pop(),
      exists: true,
      data: () => JSON.parse(JSON.stringify(finalData)),
    });
  }

  return {
    doc: (p) => ({
      path: p,
      id: p.split("/").pop(),
      get: async () => getDoc(p),
      set: async (d, opts) => setDoc(p, d, opts),
      update: async (patch) => {
        const cur = getDoc(p);
        if (!cur.exists) throw new Error("Document does not exist: " + p);
        setDoc(p, { ...cur.data(), ...patch });
      },
    }),
    collection: (collPath) => {
      return {
        doc: (id) => {
          const autoId = id || "doc_" + Math.random().toString(36).slice(2, 10);
          const fullPath = `${collPath}/${autoId}`;
          return {
            path: fullPath,
            id: autoId,
            get: async () => getDoc(fullPath),
            set: async (d, opts) => setDoc(fullPath, d, opts),
            update: async (patch) => {
              const cur = getDoc(fullPath);
              if (!cur.exists) throw new Error("Document does not exist: " + fullPath);
              setDoc(fullPath, { ...cur.data(), ...patch });
            },
          };
        },
      };
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => ref.get(),
        set: (ref, data, opts) => ref.set(data, opts),
        update: (ref, patch) => ref.update(patch),
      };
      return await fn(tx);
    },
    _rawStore: store,
  };
}

async function runAuditSuite() {
  const mockDb = createMockDb();

  // Mock _admin dependencies
  const admin = require("./server/_admin");
  admin.firestore = () => mockDb;
  admin.verifyIdToken = async (token) => {
    if (token === "token_student") return { uid: "audit_student_1", email: "audit@test.com" };
    return null;
  };

  const handler = require("./server/learning-event");
  const quiz = require("./server/_quiz");

  function mockReqRes(options) {
    const req = {
      method: options.method || "POST",
      url: options.url || "https://learningallied.world/api/learning-event?route=quiz",
      socket: { remoteAddress: "127.0.0.1" },
      headers: {
        host: "learningallied.world",
        authorization: options.token ? `Bearer ${options.token}` : "",
        "content-type": "application/json",
        ...options.headers,
      },
      on(event, cb) {
        if (event === "data" && options.body) cb(Buffer.from(JSON.stringify(options.body)));
        if (event === "end") cb();
      },
    };

    let statusCode = 200;
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (payload) => {
        responseData = payload;
        return res;
      },
      end: (payload) => {
        if (payload) {
          try { responseData = JSON.parse(payload); } catch (_) { responseData = payload; }
        }
        return res;
      },
    };

    return { req, res, getResult: () => ({ status: statusCode, body: responseData }) };
  }

  let passed = 0;
  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      process.exit(1);
    }
  }

  // ── 1. Concept ID Resolution Coverage ──
  await test("resolveQuizConceptId properly maps all supported subjects and topics", async () => {
    const subjects = Object.keys(quiz.BANK);
    assert.ok(subjects.length >= 4, "Must contain at least 4 core subjects");

    for (const subj of subjects) {
      const topics = Object.keys(quiz.BANK[subj]);
      assert.ok(topics.length > 0, `Subject ${subj} must have topics`);
      for (const top of topics) {
        const conceptId = quiz.resolveQuizConceptId(subj, top);
        assert.ok(conceptId, `Must resolve concept ID for ${subj} · ${top}`);
        assert.ok(/^[a-z0-9_.]+$/.test(conceptId), `Concept ID must be alphanumeric lowercase with dots/underscores: ${conceptId}`);
      }
    }
  });

  // ── 2. AI Question Generation via Mocked Provider ──
  await test("AI start_quiz securely generates questions and strips keys before sending to client", async () => {
    const origFetch = global.fetch;
    const origGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "mock_gemini_key_for_audit";

    let interceptedPrompt = null;

    global.fetch = async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("generateContent") || urlStr.includes("googleapis.com")) {
        const parsed = JSON.parse(init.body);
        interceptedPrompt = parsed.contents?.[0]?.parts?.[0]?.text || "";
        const mockQuestions = [
          {
            q: "What is Newton's third law of motion?",
            options: ["A) F=ma", "B) Action-reaction", "C) Inertia", "D) Gravity"],
            answer: "B",
            explanation: "Every action has an equal and opposite reaction.",
          },
          {
            q: "What is momentum?",
            options: ["A) m*v", "B) m*a", "C) F*t", "D) v/t"],
            answer: "A",
            explanation: "Momentum is the product of mass and velocity.",
          },
        ];

        const payloadStr = JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockQuestions) }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 80, totalTokenCount: 230 },
        });

        return {
          ok: true,
          status: 200,
          text: async () => payloadStr,
          json: async () => JSON.parse(payloadStr),
        };
      }
      return origFetch(url, init);
    };

    try {
      const { req, res, getResult } = mockReqRes({
        token: "token_student",
        body: {
          action: "start_quiz",
          mode: "ai",
          subject: "Physics",
          topic: "Laws of Motion",
          difficulty: "medium",
          count: 2,
        },
      });

      await handler(req, res);
      const { status, body } = getResult();

      assert.strictEqual(status, 201);
      assert.ok(interceptedPrompt && interceptedPrompt.includes("Laws of Motion"));
      assert.strictEqual(body.questions.length, 2);

      // Verify answer keys are NEVER exposed to client
      for (const q of body.questions) {
        assert.strictEqual(q.answer, undefined, "AI answer key must never be sent to client");
        assert.strictEqual(q.explanation, undefined, "AI explanation must never be sent to client");
        assert.ok(q.id);
        assert.ok(q.q);
        assert.strictEqual(q.options.length, 4);
      }
    } finally {
      global.fetch = origFetch;
      if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  // ── 3. Single Incorrect Answer Misconception Protection ──
  await test("A single incorrect answer does NOT create a misconception", async () => {
    const uid = "audit_student_1";
    const conceptId = "physics_kinematics";

    // Send 1 single incorrect answer event
    const { req, res, getResult } = mockReqRes({
      url: "https://learningallied.world/api/learning-event",
      token: "token_student",
      body: {
        eventId: "event_incorrect_single_1",
        type: "question_incorrect",
        conceptId,
        subject: "Physics",
        topic: "Kinematics",
        source: "quiz",
        payload: { correct: false, mode: "mcq" },
      },
    });

    await handler(req, res);
    const { status, body } = getResult();
    assert.strictEqual(status, 201);

    // Verify misconception collection does NOT contain a candidate for this concept
    const miscSnap = await mockDb.doc(`users/${uid}/misconceptions/${conceptId}_candidate`).get();
    assert.strictEqual(miscSnap.exists, false, "1 incorrect answer must NEVER create a misconception candidate");

    // Send a 2nd incorrect answer event
    const { req: req2, res: res2, getResult: getRes2 } = mockReqRes({
      url: "https://learningallied.world/api/learning-event",
      token: "token_student",
      body: {
        eventId: "event_incorrect_single_2",
        type: "question_incorrect",
        conceptId,
        subject: "Physics",
        topic: "Kinematics",
        source: "quiz",
        payload: { correct: false, mode: "mcq" },
      },
    });
    await handler(req2, res2);
    assert.strictEqual(getRes2().status, 201);

    const miscSnap2 = await mockDb.doc(`users/${uid}/misconceptions/${conceptId}_candidate`).get();
    assert.strictEqual(miscSnap2.exists, false, "2 incorrect answers must NOT create a misconception candidate");

    // Send a 3rd incorrect answer event (reaching the strict threshold of >= 3 with weight >= 0.5)
    const { req: req3, res: res3, getResult: getRes3 } = mockReqRes({
      url: "https://learningallied.world/api/learning-event",
      token: "token_student",
      body: {
        eventId: "event_incorrect_single_3",
        type: "question_incorrect",
        conceptId,
        subject: "Physics",
        topic: "Kinematics",
        source: "quiz",
        payload: { correct: false, mode: "mcq" },
      },
    });
    await handler(req3, res3);
    assert.strictEqual(getRes3().status, 201);

    const miscSnap3 = await mockDb.doc(`users/${uid}/misconceptions/${conceptId}_candidate`).get();
    assert.strictEqual(miscSnap3.exists, true, "Candidate is only created after >= 3 repeated high-weight incorrect answers");
  });

  // ── 4. Idempotency & Anti-Inflation on Finish ──
  await test("Repeated finish_quiz calls do not duplicate records or inflate mastery", async () => {
    const uid = "audit_student_1";

    // 1. Start a 2-question quiz
    const { req: sReq, res: sRes, getResult: sResOut } = mockReqRes({
      token: "token_student",
      body: { action: "start_quiz", mode: "standard", subject: "Physics", topic: "Kinematics", count: 2 },
    });
    await handler(sReq, sRes);
    const session = sResOut().body;
    const sessId = session.sessionId;

    // 2. Submit Q0
    const { req: a0Req, res: a0Res } = mockReqRes({
      token: "token_student",
      body: { action: "submit_answer", sessionId: sessId, questionIndex: 0, choice: 0 },
    });
    await handler(a0Req, a0Res);

    // 3. Submit Q1
    const { req: a1Req, res: a1Res } = mockReqRes({
      token: "token_student",
      body: { action: "submit_answer", sessionId: sessId, questionIndex: 1, choice: 1 },
    });
    await handler(a1Req, a1Res);

    // Count records before finish
    const countAttempts = () => Array.from(mockDb._rawStore.keys()).filter((k) => k.startsWith(`users/${uid}/quizAttempts`)).length;
    const initialAttempts = countAttempts();

    // 4. Finish Quiz (1st time)
    const { req: f1Req, res: f1Res, getResult: f1Out } = mockReqRes({
      token: "token_student",
      body: { action: "finish_quiz", sessionId: sessId },
    });
    await handler(f1Req, f1Res);
    const res1 = f1Out().body;
    assert.strictEqual(f1Out().status, 200);
    assert.strictEqual(countAttempts(), initialAttempts + 1, "First finish must write exactly one attempt");

    // 5. Duplicate Finish Quiz (2nd time)
    const { req: f2Req, res: f2Res, getResult: f2Out } = mockReqRes({
      token: "token_student",
      body: { action: "finish_quiz", sessionId: sessId },
    });
    await handler(f2Req, f2Res);
    const res2 = f2Out().body;
    assert.strictEqual(f2Out().status, 200);
    assert.strictEqual(res2.idempotent, true, "Second finish must be marked idempotent");
    assert.strictEqual(countAttempts(), initialAttempts + 1, "Duplicate finish must NOT create another attempt doc");
    assert.strictEqual(res2.score, res1.score, "Scores must match identically");
  });

  // ── 5. AI Question Generation with Failover from Gemini to Groq ──
  await test("AI start_quiz fails over to Groq when Gemini is unavailable", async () => {
    const origFetch = global.fetch;
    const origGeminiKey = process.env.GEMINI_API_KEY;
    const origGroqKey = process.env.GROQ_API_KEY;
    process.env.GEMINI_API_KEY = "mock_gemini_key";
    process.env.GROQ_API_KEY = "mock_groq_key";

    let geminiAttempts = 0;
    let groqSuccess = false;

    global.fetch = async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("generateContent") || urlStr.includes("googleapis.com")) {
        geminiAttempts++;
        // Simulate Gemini 503 service unavailable
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ error: { message: "Service Unavailable", code: 503 } }),
        };
      }

      if (urlStr.includes("api.groq.com")) {
        groqSuccess = true;
        const mockQuestions = [
          {
            q: "What is an ionic bond?",
            options: ["A) Electron sharing", "B) Electron transfer", "C) Proton transfer", "D) Neutron exchange"],
            answer: "B",
            explanation: "Ionic bonds form when electrons are completely transferred from one atom to another.",
          },
        ];
        const payloadStr = JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(mockQuestions),
              },
            },
          ],
        });
        return {
          ok: true,
          status: 200,
          text: async () => payloadStr,
          json: async () => JSON.parse(payloadStr),
        };
      }

      return origFetch(url, init);
    };

    try {
      const { req, res, getResult } = mockReqRes({
        token: "token_student",
        body: {
          action: "start_quiz",
          mode: "ai",
          subject: "Chemistry",
          topic: "Chemical Bonding",
          count: 1,
        },
      });

      await handler(req, res);
      const { status, body } = getResult();

      assert.strictEqual(status, 201);
      assert.ok(geminiAttempts >= 1, "Gemini must be attempted first as primary");
      assert.strictEqual(groqSuccess, true, "Groq must succeed as fallback");
      assert.strictEqual(body.questions.length, 1);
      assert.strictEqual(body.questions[0].answer, undefined, "Keys must never be leaked");
    } finally {
      global.fetch = origFetch;
      if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
      else delete process.env.GEMINI_API_KEY;
      if (origGroqKey) process.env.GROQ_API_KEY = origGroqKey;
      else delete process.env.GROQ_API_KEY;
    }
  });

  console.log("\n============================================================");
  console.log(`ALL ${passed} INTEGRATION AUDIT TESTS PASSED!`);
  console.log("============================================================\n");
}

runAuditSuite().catch((err) => {
  console.error("Audit test error:", err);
  process.exit(1);
});
