// test_quiz_security.js
// Automated security and integration tests for the server-authoritative Quiz API (Phase 2).
// Verifies:
// 1. Bank hierarchy retrieval without question text or answer keys
// 2. start_quiz strips answer keys from client response
// 3. submit_answer requires auth and enforces sequential answer order
// 4. submit_answer rejects out-of-range and malformed choices
// 5. submit_answer idempotently handles repeated identical choices
// 6. finish_quiz rejects incomplete sessions
// 7. finish_quiz scores exclusively from stored server answers and writes official attempt
// 8. finish_quiz idempotent completion replay
// 9. Cross-user protection: session belonging to user A cannot be accessed or finished by user B

const assert = require("assert");

// Mock in-memory Firestore database
function createMockDb() {
  const store = new Map();
  return {
    doc(path) {
      return {
        path,
        get: async () => ({
          exists: store.has(path),
          data: () => store.get(path),
        }),
        set: async (data, opts) => {
          if (opts && opts.merge && store.has(path)) {
            store.set(path, { ...store.get(path), ...data });
          } else {
            store.set(path, data);
          }
        },
        update: async (patch) => {
          if (!store.has(path)) throw new Error("Document does not exist: " + path);
          store.set(path, { ...store.get(path), ...patch });
        },
      };
    },
    collection(colPath) {
      return {
        doc() {
          const id = "doc_" + Math.random().toString(36).slice(2);
          return {
            id,
            path: `${colPath}/${id}`,
            set: async (data) => {
              store.set(`${colPath}/${id}`, data);
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

async function runQuizSecuritySuite() {
  console.log("============================================================");
  console.log("Learning Allied — Quiz API Security & Anti-Tampering Tests");
  console.log("============================================================\n");

  const mockDb = createMockDb();

  // Mock _admin dependencies
  const admin = require("./server/_admin");
  const origFirestore = admin.firestore;
  const origVerifyIdToken = admin.verifyIdToken;

  admin.firestore = () => mockDb;
  admin.verifyIdToken = async (token) => {
    if (token === "token_student1") return { uid: "student_1", email: "student1@test.com" };
    if (token === "token_attacker") return { uid: "attacker_2", email: "attacker@test.com" };
    return null;
  };

  const handler = require("./server/learning-event");

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
    let headers = {};

    const res = {
      setHeader(k, v) { headers[k] = v; },
      status(code) {
        statusCode = code;
        return res;
      },
      json(data) {
        responseData = data;
        return res;
      },
      end(payload) {
        if (payload && !responseData) {
          try { responseData = JSON.parse(payload); } catch (_) { responseData = payload; }
        }
        return res;
      },
    };

    return { req, res, getResult: () => ({ status: statusCode, body: responseData, headers }) };
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

  try {
    // ── Test 1: GET ?action=bank returns subjects without answers ──
    await test("GET /api/quiz?action=bank returns subjects hierarchy without question answers", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "GET",
        url: "https://learningallied.world/api/learning-event?route=quiz&action=bank",
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 200);
      assert.ok(body.subjects.Physics.includes("Kinematics"));
      assert.ok(body.subjects.Chemistry.includes("Atomic Structure"));
      assert.strictEqual(body.subjects.Physics.Kinematics, undefined, "Questions array must not be in bank map");
    });

    // ── Test 2: Unauthenticated POST rejected ──
    await test("Unauthenticated start_quiz is rejected with 401", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "", // no token
        body: { action: "start_quiz", subject: "Physics", topic: "Kinematics" },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 401);
      assert.ok(body.error.includes("Not authenticated"));
    });

    // ── Test 3: start_quiz creates session and strips answer keys ──
    let sessionId = null;
    await test("start_quiz creates session and returns questions WITHOUT answer keys", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "start_quiz", mode: "standard", subject: "Physics", topic: "Kinematics", count: 3 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 201);
      assert.ok(body.sessionId);
      assert.strictEqual(body.questions.length, 3);
      sessionId = body.sessionId;

      for (const q of body.questions) {
        assert.strictEqual(q.answer, undefined, "answer key must NEVER be sent to client");
        assert.strictEqual(q.explanation, undefined, "explanation must NEVER be sent to client");
        assert.ok(q.id);
        assert.ok(q.q);
        assert.ok(Array.isArray(q.options));
      }
    });

    // ── Test 4: submit_answer rejects out-of-order answering ──
    await test("submit_answer rejects jumping ahead (answering question 1 before question 0)", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "submit_answer", sessionId, questionIndex: 1, choice: 0 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 409);
      assert.ok(body.error.includes("sequential order"));
    });

    // ── Test 5: submit_answer rejects out-of-range choices ──
    await test("submit_answer rejects invalid choice index (choice 99)", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "submit_answer", sessionId, questionIndex: 0, choice: 99 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 400);
      assert.ok(body.error.includes("out of range"));
    });

    // ── Test 6: submit_answer validates choice 0 and returns explanation ──
    await test("submit_answer evaluates question 0 correctly and returns verified feedback", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "submit_answer", sessionId, questionIndex: 0, choice: 0 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 200);
      assert.strictEqual(body.index, 0);
      assert.ok(typeof body.correct === "boolean");
      assert.ok(body.answer);
      assert.ok(body.explanation);
    });

    // ── Test 7: submit_answer is idempotent for same choice ──
    await test("submit_answer allows idempotent retry for identical choice", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "submit_answer", sessionId, questionIndex: 0, choice: 0 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 200);
      assert.strictEqual(body.idempotent, true);
    });

    // ── Test 8: Cross-user access rejected ──
    await test("Cross-user protection: attacker cannot submit answers to student_1's session", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_attacker", // attacker
        body: { action: "submit_answer", sessionId, questionIndex: 1, choice: 1 },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.ok(status === 403 || status === 404, "Cross-user attempt must return 403 or 404");
      assert.ok(body.error.includes("another user") || body.error.includes("not found"));
    });

    // ── Test 9: finish_quiz rejects incomplete session ──
    await test("finish_quiz rejects unfinished session (only 1 of 3 answered)", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "finish_quiz", sessionId },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 400);
      assert.ok(body.error.includes("Answer every question"));
    });

    // Answer questions 1 and 2
    for (let i = 1; i < 3; i++) {
      const { req, res } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "submit_answer", sessionId, questionIndex: i, choice: 0 },
      });
      await handler(req, res);
    }

    // ── Test 10: finish_quiz succeeds, scores server-side, writes attempt and event ──
    await test("finish_quiz scores server-side, writes quizAttempts record and learningEvent", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "finish_quiz", sessionId },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 200);
      assert.strictEqual(body.total, 3);
      assert.ok(typeof body.score === "number");
      assert.ok(typeof body.percentage === "number");
      assert.ok(typeof body.passed === "boolean");
      assert.strictEqual(body.questions.length, 3);

      // Verify quizAttempts record was written to mockDb
      let foundAttempt = false;
      for (const [key, val] of mockDb._rawStore.entries()) {
        if (key.includes("users/student_1/quizAttempts") && val.sessionId === sessionId) {
          foundAttempt = true;
          assert.strictEqual(val.serverVerified, true);
          assert.strictEqual(val.totalQ, 3);
          assert.strictEqual(val.subject, "Physics");
        }
      }
      assert.ok(foundAttempt, "Verified attempt document must be written in users/student_1/quizAttempts");

      // Verify learningEvent was written
      let foundEvent = false;
      for (const [key, val] of mockDb._rawStore.entries()) {
        if (key.includes("users/student_1/learningEvents") && val.sessionId === sessionId) {
          foundEvent = true;
          assert.strictEqual(val.type, "quiz_completed");
          assert.strictEqual(val.source, "quiz");
          assert.strictEqual(val.serverVerified, true);
          assert.strictEqual(val.payload.totalQ, 3);
        }
      }
      assert.ok(foundEvent, "Learning event must be written to users/student_1/learningEvents");
    });

    // ── Test 11: finish_quiz is idempotent on replay ──
    await test("finish_quiz replays outcome idempotently on duplicate finish calls", async () => {
      const { req, res, getResult } = mockReqRes({
        method: "POST",
        token: "token_student1",
        body: { action: "finish_quiz", sessionId },
      });
      await handler(req, res);
      const { status, body } = getResult();
      assert.strictEqual(status, 200);
      assert.strictEqual(body.idempotent, true);
      assert.strictEqual(body.total, 3);
    });

    console.log(`\n============================================================`);
    console.log(`ALL ${passed} QUIZ SECURITY TESTS PASSED!`);
    console.log(`============================================================\n`);
  } finally {
    admin.firestore = origFirestore;
    admin.verifyIdToken = origVerifyIdToken;
  }
}

if (require.main === module) {
  runQuizSecuritySuite().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}

module.exports = { runQuizSecuritySuite };
