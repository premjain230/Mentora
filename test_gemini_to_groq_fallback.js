// test_gemini_to_groq_fallback.js
// Verifies Gemini-to-Groq fallback resilience and diagnoses:
// 1. Original Gemini HTTP errors (429, 503, timeout)
// 2. Fallback trigger confirmation
// 3. Groq HTTP execution and error handling
// 4. Backend chatTutor resolution avoiding "Intermediate — I could not reach..."
// 5. Signal and timeout preservation across provider boundaries

const assert = require("assert");
const http = require("http");

async function runFallbackVerification() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini-to-Groq Fallback End-to-End Test");
  console.log("============================================================\n");

  let mockServer;
  let mockMode = "gemini-429";
  let geminiCalls = 0;
  let groqCalls = 0;
  let lastGroqModel = null;
  let lastGroqHeaders = null;
  let lastGroqPayload = null;

  const validStructuredReply = {
    kind: "lesson",
    title: "Understanding Photosynthesis",
    directAnswer: "Photosynthesis is the process by which green plants convert light energy into chemical energy to synthesize glucose from carbon dioxide and water.",
    keyIdea: "Light energy is captured by chlorophyll to convert CO2 and H2O into glucose and oxygen.",
    sections: [
      { heading: "The Light Phase", body: "Chlorophyll absorbs photons, splitting water molecules into hydrogen and oxygen." },
      { heading: "The Dark Phase", body: "Carbon dioxide is fixed into glucose through the Calvin cycle." }
    ],
    example: {
      problem: "Identify the main byproduct of photosynthesis released into the atmosphere.",
      steps: ["Water (H2O) is split during the light reaction.", "Oxygen (O2) gas is released as a byproduct."],
      answer: "Oxygen gas (O2)"
    },
    check: {
      prompt: "What gas do plants take in for photosynthesis?",
      hint: "Think about what humans breathe out.",
      answerKey: "Carbon dioxide"
    },
    visualId: null,
    visualParams: null,
    visualObserve: null,
    personalization: "Tailored for Class 9 Biology foundation",
    advanced: null
  };

  await new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        // Gemini endpoint
        if (req.url.includes("generateContent") || req.url.includes("generativelanguage")) {
          geminiCalls++;
          if (mockMode === "gemini-429") {
            res.writeHead(429, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({
              error: {
                code: 429,
                message: "Resource has been exhausted (e.g. check quota).",
                status: "RESOURCE_EXHAUSTED"
              }
            }));
          }
          if (mockMode === "gemini-503") {
            res.writeHead(503, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({
              error: {
                code: 503,
                message: "The model is overloaded. Please try again later.",
                status: "UNAVAILABLE"
              }
            }));
          }
          if (mockMode === "gemini-timeout") {
            // Delay longer than effective timeout to simulate hung connection
            await new Promise((r) => setTimeout(r, 250));
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validStructuredReply) }] } }] }));
          }
        }

        // Groq endpoint
        if (req.url.includes("/openai/v1/chat/completions") || req.url.includes("chat/completions") || req.url.includes("groq")) {
          groqCalls++;
          lastGroqHeaders = req.headers;
          try {
            lastGroqPayload = JSON.parse(body);
            lastGroqModel = lastGroqPayload.model;
          } catch (_) {}

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            id: "chatcmpl-groq-fallback-test",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: JSON.stringify(validStructuredReply),
                },
              },
            ],
            usage: { prompt_tokens: 150, completion_tokens: 280, total_tokens: 430 },
          }));
        }

        res.writeHead(404);
        res.end();
      });
    });

    mockServer.listen(0, "127.0.0.1", resolve);
  });

  const port = mockServer.address().port;
  const mockBase = `http://127.0.0.1:${port}`;

  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    let target = url;
    if (typeof url === "string") {
      if (url.startsWith("https://generativelanguage.googleapis.com")) {
        target = url.replace("https://generativelanguage.googleapis.com", mockBase);
      } else if (url.startsWith("https://api.groq.com")) {
        target = url.replace("https://api.groq.com", mockBase);
      }
    }
    return realFetch(target, opts);
  };

  let origVerify;
  let origCheck;

  try {
    process.env.GEMINI_API_KEY = "test_gemini_active_key_123456";
    process.env.GROQ_API_KEY = "test_groq_active_key_abcdef";
    delete process.env.GEMINI_TIMEOUT_MS;
    delete process.env.GROQ_TIMEOUT_MS;

    const { aiComplete } = require("./server/_ai");
    const { chatTutor } = require("./server/_learn-core");

    console.log("[Test 1] Gemini 429 Rate Limit -> Groq fallback triggers & succeeds");
    mockMode = "gemini-429";
    geminiCalls = 0;
    groqCalls = 0;

    const res1 = await aiComplete({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
    });

    assert.ok(res1, "Response must not be null");
    assert.strictEqual(geminiCalls, 1, "Gemini should be attempted first");
    assert.strictEqual(groqCalls, 1, "Groq fallback must be triggered on Gemini 429");
    assert.strictEqual(res1.kind, "lesson");
    assert.strictEqual(lastGroqModel, "llama-3.3-70b-versatile", "Groq should receive sanitized production model");
    console.log("  ✓ Confirmed: Gemini 429 triggered Groq fallback successfully.\n");

    console.log("[Test 2] Gemini 503 Unavailable -> Groq fallback triggers & succeeds");
    mockMode = "gemini-503";
    geminiCalls = 0;
    groqCalls = 0;

    const res2 = await aiComplete({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
    });

    assert.ok(res2, "Response must not be null");
    assert.strictEqual(geminiCalls, 1);
    assert.strictEqual(groqCalls, 1, "Groq fallback must be triggered on Gemini 503");
    console.log("  ✓ Confirmed: Gemini 503 triggered Groq fallback successfully.\n");

    console.log("[Test 3] Gemini timeout handling -> signal does NOT kill Groq fallback");
    mockMode = "gemini-timeout";
    geminiCalls = 0;
    groqCalls = 0;
    process.env.GEMINI_TIMEOUT_MS = "80"; // Force fast 80ms timeout on Gemini

    const res3 = await aiComplete({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
    });

    assert.ok(res3, "Groq fallback must succeed despite Gemini timing out");
    assert.strictEqual(geminiCalls, 1);
    assert.strictEqual(groqCalls, 1, "Groq fallback must be executed with clean un-aborted signal");
    console.log("  ✓ Confirmed: Gemini timeout did NOT kill Groq fallback; Groq succeeded cleanly.\n");

    console.log("[Test 4] chatTutor end-to-end integration: Gemini 429 -> Groq response without 'could not reach' error");
    mockMode = "gemini-429";
    delete process.env.GEMINI_TIMEOUT_MS;
    geminiCalls = 0;
    groqCalls = 0;

    const tutorResult = await chatTutor({
      uid: "test-student-fallback-user",
      body: {
        question: "How does photosynthesis convert sunlight into glucose?",
        context: { subject: "Biology", track: "cbse", classNum: 9 },
        history: [],
      },
    });

    assert.ok(tutorResult, "chatTutor must return result object");
    assert.ok(tutorResult.reply, "chatTutor must return reply");
    assert.strictEqual(tutorResult.reply.kind, "lesson", "chatTutor reply kind must be lesson");
    assert.strictEqual(tutorResult.reply.source, "ai", "chatTutor source must be 'ai' from Groq fallback");
    assert.strictEqual(tutorResult.reply.retry, undefined, "Must not set retry: true fallback");
    assert.strictEqual(
      tutorResult.reply.directAnswer.includes("could not reach the teaching model"),
      false,
      "MUST NOT contain the failure error message"
    );
    assert.ok(
      tutorResult.reply.directAnswer.includes("Photosynthesis"),
      "Must contain real educational explanation from Groq fallback"
    );
    assert.strictEqual(groqCalls >= 1, true, "Groq must have been called during tutor chat flow");

    console.log("  ✓ Confirmed: chatTutor gracefully handled Gemini failure via Groq fallback!");
    console.log("    Direct Answer returned to student:");
    console.log(`    "${tutorResult.reply.directAnswer.slice(0, 100)}..."\n`);

    console.log("[Test 5] Manual Gemini Routing: allowFallback=false rejects Groq fallback on failure");
    mockMode = "gemini-429";
    geminiCalls = 0;
    groqCalls = 0;

    const admin = require("./server/_admin");
    origVerify = admin.verifyIdToken;
    origCheck = admin.checkAndIncrementChat;
    admin.verifyIdToken = async () => ({ uid: "test_student_manual_provider" });
    admin.checkAndIncrementChat = async () => ({ allowed: true, plan: "pro", used: 1, limit: Infinity });

    const groqProxyHandler = require("./server/groq-proxy");
    let proxyStatus = 0;
    let proxyJson = null;
    const mockProxyRes = {
      setHeader: () => {},
      status: (code) => {
        proxyStatus = code;
        return mockProxyRes;
      },
      json: (data) => {
        proxyJson = data;
        return mockProxyRes;
      },
    };

    // User explicitly requests Gemini with allowFallback: false
    const manualGeminiReq = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      body: {
        provider: "gemini",
        allowFallback: false,
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: "What is photosynthesis?" }],
      },
    };

    await groqProxyHandler(manualGeminiReq, mockProxyRes);
    assert.strictEqual(geminiCalls, 1, "Gemini must be called");
    assert.strictEqual(groqCalls, 0, "Groq must NEVER be called when student selected manual Gemini without fallback");
    assert.strictEqual(proxyStatus, 429, "Must preserve the Gemini 429 status code");
    console.log("  ✓ Confirmed: Student's explicit Gemini provider choice was strictly respected.\n");

    console.log("[Test 6] Manual Groq Routing: Never calls Gemini");
    geminiCalls = 0;
    groqCalls = 0;
    proxyStatus = 0;
    proxyJson = null;

    const manualGroqReq = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      body: {
        provider: "groq",
        allowFallback: false,
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "What is photosynthesis?" }],
      },
    };

    await groqProxyHandler(manualGroqReq, mockProxyRes);
    assert.strictEqual(geminiCalls, 0, "Gemini must NEVER be called when student selected Groq");
    assert.strictEqual(groqCalls, 1, "Groq must be called directly");
    assert.strictEqual(proxyStatus, 200, "Groq returned 200 OK");
    console.log("  ✓ Confirmed: Student's explicit Groq provider choice was strictly respected.\n");

    console.log("============================================================");
    console.log("ALL GEMINI-TO-GROQ FALLBACK TESTS PASSED!");
    console.log("============================================================");
  } finally {
    const admin = require("./server/_admin");
    if (origVerify) admin.verifyIdToken = origVerify;
    if (origCheck) admin.checkAndIncrementChat = origCheck;
    global.fetch = realFetch;
    mockServer.close();
  }
}

runFallbackVerification().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
