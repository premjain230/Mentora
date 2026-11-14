// test_gemini_integration.js
// Production-grade verification test suite for Google Gemini AI integration,
// Groq fallback, configurable timeouts, structured logging, curriculum awareness,
// teaching quality, and error handling across all 8 required scenarios.

const assert = require("assert");
const http = require("http");

// Save real env
const originalEnv = { ...process.env };

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini AI Integration & Fallback Verification");
  console.log("============================================================\n");

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

  async function testAsync(name, fn) {
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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Message Converter & Gemini Payload Serialization
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Suite 1] Gemini Message Transformation & Protocol Compliance");

  const {
    convertMessagesToGemini,
    GEMINI_DEFAULT_MODEL,
    geminiToOpenAiResponse,
    geminiChunkToOpenAiSse,
    openAiSseDone,
    getTimeoutMs,
  } = require("./server/_ai");

  test("converts system messages into systemInstruction", () => {
    const messages = [
      { role: "system", content: "You are Learning Allied tutor." },
      { role: "user", content: "Explain gravity." },
    ];
    const { systemParts, contents } = convertMessagesToGemini(messages);
    assert.strictEqual(systemParts.length, 1);
    assert.strictEqual(systemParts[0].text, "You are Learning Allied tutor.");
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(contents[0].role, "user");
    assert.strictEqual(contents[0].parts[0].text, "Explain gravity.");
  });

  test("maps assistant role to model role for Gemini API", () => {
    const messages = [
      { role: "user", content: "What is Ohm's law?" },
      { role: "assistant", content: "V = I * R" },
      { role: "user", content: "What does R stand for?" },
    ];
    const { contents } = convertMessagesToGemini(messages);
    assert.strictEqual(contents.length, 3);
    assert.strictEqual(contents[0].role, "user");
    assert.strictEqual(contents[1].role, "model");
    assert.strictEqual(contents[1].parts[0].text, "V = I * R");
    assert.strictEqual(contents[2].role, "user");
  });

  test("merges consecutive messages with same role (Gemini strict alternating requirement)", () => {
    const messages = [
      { role: "user", content: "First part of my question." },
      { role: "user", content: "Second part of my question." },
    ];
    const { contents } = convertMessagesToGemini(messages);
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(contents[0].role, "user");
    assert.strictEqual(contents[0].parts.length, 2);
    assert.strictEqual(contents[0].parts[0].text, "First part of my question.");
    assert.strictEqual(contents[0].parts[1].text, "Second part of my question.");
  });

  test("verified default model is gemini-2.5-flash", () => {
    assert.strictEqual(GEMINI_DEFAULT_MODEL, "gemini-2.5-flash");
  });

  test("OpenAI format adapter converts Gemini output cleanly", () => {
    const formatted = geminiToOpenAiResponse("Photosynthesis is energy conversion.", "gemini-2.5-flash", {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });
    assert.strictEqual(formatted.object, "chat.completion");
    assert.strictEqual(formatted.choices[0].message.content, "Photosynthesis is energy conversion.");
    assert.strictEqual(formatted.choices[0].message.role, "assistant");
    assert.strictEqual(formatted.usage.total_tokens, 30);
  });

  test("OpenAI SSE adapter converts Gemini streaming chunks cleanly", () => {
    const chunkSse = geminiChunkToOpenAiSse("Hello");
    assert.ok(chunkSse.startsWith("data: "));
    const parsed = JSON.parse(chunkSse.replace("data: ", "").trim());
    assert.strictEqual(parsed.choices[0].delta.content, "Hello");

    const doneSse = openAiSseDone();
    assert.ok(doneSse.includes("[DONE]"));
  });

  test("Configurable timeouts resolve properly from env or defaults", () => {
    delete process.env.GEMINI_TIMEOUT_MS;
    delete process.env.GROQ_TIMEOUT_MS;
    delete process.env.AI_TIMEOUT_MS;
    assert.strictEqual(getTimeoutMs("gemini"), 15000);
    assert.strictEqual(getTimeoutMs("groq"), 20000);

    process.env.GEMINI_TIMEOUT_MS = "8000";
    assert.strictEqual(getTimeoutMs("gemini"), 8000);

    assert.strictEqual(getTimeoutMs("gemini", 5000), 5000); // caller override
    delete process.env.GEMINI_TIMEOUT_MS;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Gemini API Mock Server & End-to-End Fallback Scenarios
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] The 8 Required Provider & Fallback Scenarios");

  // Spin up an ephemeral local HTTP server to act as Google / Groq API endpoints
  let mockMode = "normal";
  let receivedGeminiHeaders = null;
  let receivedGeminiBody = null;
  let geminiCalls = 0;
  let groqCalls = 0;
  let lastGroqModel = null;
  let serverSleepMs = 0;

  const mockServer = http.createServer(async (req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      if (serverSleepMs > 0) {
        await new Promise((r) => setTimeout(r, serverSleepMs));
      }

      // Mock Gemini endpoint
      if (req.url.includes("/v1beta/models/")) {
        geminiCalls++;
        receivedGeminiHeaders = req.headers;
        try { receivedGeminiBody = JSON.parse(body); } catch (_) { receivedGeminiBody = body; }

        if (mockMode === "gemini-timeout") {
          // Keep request open so caller's timeout aborts
          await new Promise((r) => setTimeout(r, 600));
          res.writeHead(504, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "Simulated delay" } }));
        }

        if (mockMode === "gemini-invalid-key" || mockMode === "gemini-400") {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }));
        }

        if (mockMode === "gemini-429") {
          res.writeHead(429, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 429, message: "Resource has been exhausted (rate limit)", status: "RESOURCE_EXHAUSTED" } }));
        }

        if (mockMode === "gemini-500") {
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 500, message: "Internal server error on Gemini", status: "INTERNAL" } }));
        }

        if (mockMode === "gemini-503") {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 503, message: "Service Unavailable", status: "UNAVAILABLE" } }));
        }

        if (mockMode === "gemini-stream-normal") {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Streamed " }] } }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "from Gemini." }] } }] })}\n\n`);
          return res.end("data: [DONE]\n\n");
        }

        if (mockMode === "both-fail") {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 503, message: "Gemini Service Unavailable", status: "UNAVAILABLE" } }));
        }

        // Normal successful Gemini response
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      kind: "lesson",
                      title: "Photosynthesis Explained",
                      directAnswer: "Photosynthesis is the process where green plants convert sunlight into chemical energy.",
                      sections: [
                        { heading: "Concept", body: "Plants use chlorophyll, carbon dioxide, and water." },
                      ],
                      example: {
                        problem: "What is released during photosynthesis?",
                        steps: ["Water is split in light.", "Oxygen is released as a byproduct."],
                        answer: "Oxygen gas.",
                      },
                      check: {
                        prompt: "Which gas do plants release?",
                        hint: "It is essential for humans to breathe.",
                        answerKey: "Oxygen",
                      },
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 200,
            totalTokenCount: 350,
          },
        }));
      }

      // Mock Groq endpoint
      if (req.url.includes("/openai/v1/chat/completions")) {
        groqCalls++;
        try {
          const parsed = JSON.parse(body);
          lastGroqModel = parsed.model;
        } catch (_) {}

        if (mockMode === "groq-404-once" && groqCalls === 1) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "The model does not exist or you do not have access." } }));
        }

        if (mockMode === "both-fail") {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "Groq service unavailable" } }));
        }

        if (mockMode === "groq-stream-normal" || body.includes('"stream":true') || body.includes('"stream": true')) {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Streamed from Groq fallback." } }] })}\n\n`);
          return res.end("data: [DONE]\n\n");
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  kind: "lesson",
                  title: "Groq Fallback: Photosynthesis",
                  directAnswer: "Photosynthesis converts light energy into chemical energy.",
                  sections: [{ heading: "Fallback Section", body: "Chlorophyll absorbs light." }],
                  example: null,
                  check: { prompt: "What pigment absorbs light?", answerKey: "Chlorophyll" },
                }),
              },
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
        }));
      }

      res.writeHead(404);
      res.end();
    });
  });

  await new Promise((resolve) => mockServer.listen(0, "127.0.0.1", resolve));
  const port = mockServer.address().port;
  const mockBase = `http://127.0.0.1:${port}`;

  // Patch global fetch to redirect external API calls to our mock server for isolation
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

  const { geminiComplete, aiComplete, geminiStream } = require("./server/_ai");

  // Scenario 1: Gemini succeeds -> Gemini response
  await testAsync("Scenario 1: Gemini succeeds -> Gemini response", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    geminiCalls = 0;
    groqCalls = 0;
    mockMode = "normal";

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini should be called");
    assert.strictEqual(groqCalls, 0, "Groq should NOT be called when Gemini succeeds");
    assert.strictEqual(res.title, "Photosynthesis Explained");
    assert.ok(res.directAnswer.includes("Photosynthesis"));
  });

  // Scenario 2: Gemini timeout -> Groq response
  await testAsync("Scenario 2: Gemini timeout -> Groq response", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    process.env.GEMINI_TIMEOUT_MS = "100"; // fast timeout for test
    geminiCalls = 0;
    groqCalls = 0;
    mockMode = "gemini-timeout";

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
      timeoutMs: 100,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini was attempted first");
    assert.strictEqual(groqCalls, 1, "Groq was invoked after Gemini timed out");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
    delete process.env.GEMINI_TIMEOUT_MS;
  });

  // Scenario 3: Gemini 429 (rate-limit) -> Groq response
  await testAsync("Scenario 3: Gemini 429 -> Groq response", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    geminiCalls = 0;
    groqCalls = 0;
    mockMode = "gemini-429";

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini was attempted first");
    assert.strictEqual(groqCalls, 1, "Groq took over on 429 rate limit");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  // Scenario 4: Gemini 500/503 -> Groq response
  await testAsync("Scenario 4: Gemini 500/503 -> Groq response", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    geminiCalls = 0;
    groqCalls = 0;
    mockMode = "gemini-500";

    let res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1);
    assert.strictEqual(groqCalls, 1);
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");

    // Also test 503
    mockMode = "gemini-503";
    geminiCalls = 0;
    groqCalls = 0;
    res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });
    assert.strictEqual(geminiCalls, 1);
    assert.strictEqual(groqCalls, 1);
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  // Scenario 5: Gemini invalid API key -> clear error / avoids endless retries
  await testAsync("Scenario 5: Gemini invalid API key -> clear error or clean fallback", async () => {
    // Subcase 5a: Missing key throws immediately with statusCode 500 (no retries)
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;

    let thrown = null;
    try {
      await aiComplete({ messages: [{ role: "user", content: "Hi" }] });
    } catch (e) {
      thrown = e;
    }
    assert.ok(thrown, "Should fail cleanly when keys are unconfigured");
    assert.strictEqual(thrown.statusCode, 500);

    // Subcase 5b: Invalid key on Gemini with Groq present falls back to Groq without endless loop
    process.env.GEMINI_API_KEY = "invalid_gemini_key_bad";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-invalid-key";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });
    assert.strictEqual(geminiCalls, 1, "Gemini tried exactly once");
    assert.strictEqual(groqCalls, 1, "Groq succeeded as fallback");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  // Scenario 6: Groq succeeds after Gemini failure
  await testAsync("Scenario 6: Groq succeeds after Gemini failure", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-429";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "What is Ohm's law?" }],
      json: true,
    });
    assert.strictEqual(groqCalls, 1);
    assert.ok(res.directAnswer || res.title);
  });

  // Scenario 7: Both providers fail -> clean error
  await testAsync("Scenario 7: Both providers fail -> clean 503 error", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "both-fail";

    let caught = null;
    try {
      await aiComplete({
        messages: [{ role: "user", content: "Explain photosynthesis." }],
        json: true,
      });
    } catch (e) {
      caught = e;
    }

    assert.ok(caught, "Expected failure when both providers are down");
    assert.strictEqual(caught.statusCode, 503);
    assert.strictEqual(caught.retryable, true);
    assert.ok(caught.message.includes("AI providers unavailable"));
    // Verify no secret leak in error message
    assert.ok(!caught.message.includes("test_actual_gemini_key_123456"));
    assert.ok(!caught.message.includes("test_groq_key_active"));
  });

  // Scenario 8: Normal chat, tutoring, learning sessions, and replan remain functional
  await testAsync("Scenario 8: Replan endpoint uses unified AI fallback orchestrator", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "normal";

    const replanHandler = require("./server/replan");

    // Mock Express/Node req and res
    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer mock_valid_token",
      },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event, cb) => {
        if (event === "data") {
          cb(
            JSON.stringify({
              missedTasks: [
                { subject: "Physics", topic: "Work and Energy", durationMinutes: 30 },
              ],
              dailyHours: 4,
              examDate: "2026-12-01",
              examType: "academic",
            })
          );
        }
        if (event === "end") cb();
      },
    };

    let responseCode = 0;
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (code) => {
        responseCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      },
    };

    // Patch verifyIdToken for test
    const admin = require("./server/_admin");
    const originalVerify = admin.verifyIdToken;
    admin.verifyIdToken = async () => ({ uid: "test_user_replan_123" });

    try {
      await replanHandler(req, res);
      assert.strictEqual(responseCode, 200);
      assert.ok(responseData && responseData.message);
    } finally {
      admin.verifyIdToken = originalVerify;
    }
  });

  await testAsync("groq-proxy: non-streaming Gemini primary returns standard OpenAI completion", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "normal";

    const proxyHandler = require("./server/groq-proxy");
    const admin = require("./server/_admin");
    const originalVerify = admin.verifyIdToken;
    const originalGate = admin.checkAndIncrementChat;

    let gateCalls = 0;
    admin.verifyIdToken = async () => ({ uid: "test_proxy_user" });
    admin.checkAndIncrementChat = async () => {
      gateCalls++;
      return { allowed: true, plan: "free", used: 1, limit: 10 };
    };

    const req = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Hello tutor" }],
            stream: false,
          }));
        }
        if (event === "end") cb();
      },
    };

    let responseCode = 0;
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (c) => { responseCode = c; return res; },
      json: (d) => { responseData = d; return res; },
    };

    try {
      await proxyHandler(req, res);
      assert.strictEqual(responseCode, 200);
      assert.strictEqual(gateCalls, 1, "Quota gate must be called exactly once");
      assert.strictEqual(responseData.object, "chat.completion");
      assert.strictEqual(responseData.choices[0].message.role, "assistant");
      assert.ok(responseData.choices[0].message.content);
    } finally {
      admin.verifyIdToken = originalVerify;
      admin.checkAndIncrementChat = originalGate;
    }
  });

  await testAsync("groq-proxy: fallback to Groq when Gemini fails does NOT double-increment quota", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-429"; // Gemini fails -> Groq fallback

    const proxyHandler = require("./server/groq-proxy");
    const admin = require("./server/_admin");
    const originalVerify = admin.verifyIdToken;
    const originalGate = admin.checkAndIncrementChat;

    let gateCalls = 0;
    admin.verifyIdToken = async () => ({ uid: "test_proxy_user_fallback" });
    admin.checkAndIncrementChat = async () => {
      gateCalls++;
      return { allowed: true, plan: "free", used: 1, limit: 10 };
    };

    const req = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Explain fallback" }],
            stream: false,
          }));
        }
        if (event === "end") cb();
      },
    };

    let responseCode = 0;
    let responseData = null;
    const res = {
      setHeader: () => res,
      status: (c) => { responseCode = c; return res; },
      json: (d) => { responseData = d; return res; },
    };

    try {
      await proxyHandler(req, res);
      assert.strictEqual(responseCode, 200);
      assert.strictEqual(gateCalls, 1, "Quota must NOT double increment during fallback");
      assert.ok(responseData.choices[0].message.content.includes("Groq Fallback"));
    } finally {
      admin.verifyIdToken = originalVerify;
      admin.checkAndIncrementChat = originalGate;
    }
  });

  await testAsync("groq-proxy: streaming Gemini primary writes OpenAI SSE chunks", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-stream-normal";

    const proxyHandler = require("./server/groq-proxy");
    const admin = require("./server/_admin");
    const originalVerify = admin.verifyIdToken;
    const originalGate = admin.checkAndIncrementChat;

    admin.verifyIdToken = async () => ({ uid: "test_proxy_stream_user" });
    admin.checkAndIncrementChat = async () => ({ allowed: true, plan: "free", used: 1, limit: 10 });

    const req = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Stream me" }],
            stream: true,
          }));
        }
        if (event === "end") cb();
      },
    };

    let writtenData = "";
    let headersSet = {};
    let ended = false;

    const res = {
      setHeader: (k, v) => { headersSet[k] = v; return res; },
      status: () => res,
      write: (chunk) => {
        writtenData += (typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      },
      end: () => { ended = true; },
    };

    try {
      await proxyHandler(req, res);
      assert.ok(ended, "Stream must end");
      assert.strictEqual(headersSet["Content-Type"], "text/event-stream");
      assert.ok(writtenData.includes("Streamed "));
      assert.ok(writtenData.includes("from Gemini."));
      assert.ok(writtenData.includes("[DONE]"));
    } finally {
      admin.verifyIdToken = originalVerify;
      admin.checkAndIncrementChat = originalGate;
    }
  });

  await testAsync("groq-proxy: streaming fails on Gemini before headers sent -> falls back to Groq stream", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-500"; // Gemini fails immediately before stream sends any byte

    const proxyHandler = require("./server/groq-proxy");
    const admin = require("./server/_admin");
    const originalVerify = admin.verifyIdToken;
    const originalGate = admin.checkAndIncrementChat;

    admin.verifyIdToken = async () => ({ uid: "test_proxy_stream_fallback_user" });
    admin.checkAndIncrementChat = async () => ({ allowed: true, plan: "free", used: 1, limit: 10 });

    const req = {
      method: "POST",
      headers: { authorization: "Bearer mock_token" },
      socket: { remoteAddress: "127.0.0.1" },
      on: (event, cb) => {
        if (event === "data") {
          cb(JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: "Stream fallback test" }],
            stream: true,
          }));
        }
        if (event === "end") cb();
      },
    };

    let writtenData = "";
    let headersSet = {};
    let ended = false;

    const res = {
      setHeader: (k, v) => { headersSet[k] = v; return res; },
      status: () => res,
      write: (chunk) => {
        writtenData += (typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      },
      end: () => { ended = true; },
    };

    try {
      await proxyHandler(req, res);
      assert.ok(ended, "Stream must end");
      assert.strictEqual(headersSet["Content-Type"], "text/event-stream");
      assert.ok(writtenData.includes("Streamed from Groq fallback."));
    } finally {
      admin.verifyIdToken = originalVerify;
      admin.checkAndIncrementChat = originalGate;
    }
  });

  await testAsync("Gemini streaming operates and yields text tokens", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    mockMode = "gemini-stream-normal";

    let chunks = [];
    await geminiStream({
      messages: [{ role: "user", content: "Stream test" }],
      onChunk: (text) => chunks.push(text),
    });

    assert.ok(chunks.length >= 2);
    assert.strictEqual(chunks.join(""), "Streamed from Gemini.");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Curriculum Awareness & Teaching Quality Flows
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 3] Curriculum Awareness & Educational Quality");

  const {
    getConcept,
    getTrack,
    matchConcept,
    curriculumStats,
  } = require("./server/_curriculum");

  test("Maharashtra Board Class 9 Science curriculum resolution", () => {
    const track = getTrack("maharashtra");
    assert.ok(track, "Maharashtra track must exist in curriculum");
    assert.strictEqual(track.label, "Maharashtra State Board");

    const workMatch = matchConcept("Work and Energy", { trackId: "maharashtra", classNum: 9 });
    assert.ok(workMatch, "Work and Energy must resolve in Maharashtra class 9");
    assert.strictEqual(workMatch.conceptId, "maharashtra.9.science1.work_and_energy");
    assert.strictEqual(workMatch.subject, "Science & Technology - Part 1");

    const lifeMatch = matchConcept("Life Processes in Living Organisms", { trackId: "maharashtra", classNum: 9 });
    assert.ok(lifeMatch, "Life Processes must resolve in Maharashtra class 9");
    assert.strictEqual(lifeMatch.conceptId, "maharashtra.9.science2.life_processes_in_living_organisms");
    assert.strictEqual(lifeMatch.subject, "Science & Technology - Part 2");
  });

  test("Topic isolation: Work and Energy never resolves to Chemical Bonding", () => {
    const workConcept = matchConcept("Work and Energy", { subject: "Physics" });
    const bondConcept = matchConcept("Chemical Bonding and Molecular Structure", { subject: "Chemistry" });

    assert.notStrictEqual(workConcept?.conceptId, bondConcept?.conceptId);
    assert.ok(workConcept?.conceptId.includes("work") || workConcept?.name.includes("Work"));
    assert.ok(bondConcept?.conceptId.includes("bond") || bondConcept?.name.includes("Bond"));
  });

  test("Curriculum statistics show rich syllabus data across boards", () => {
    const stats = curriculumStats();
    assert.ok(stats.concepts > 50, "Curriculum database must have comprehensive concept bank");
    assert.ok(stats.tracks >= 3, "Curriculum must cover CBSE, Maharashtra, JEE, NEET");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Critical Production Bug Fix Regression Tests (Fallback)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 4] AI Provider Fallback Regression Suite");

  const {
    resolveGroqModel,
    GROQ_DEFAULT_MODEL,
    GROQ_FAST_MODEL,
    groqComplete,
  } = require("./server/_ai");

  test("resolveGroqModel translates Gemini and mock models into valid Groq production models", () => {
    assert.strictEqual(resolveGroqModel("gemini-2.5-flash"), GROQ_DEFAULT_MODEL);
    assert.strictEqual(resolveGroqModel("gemini-1.5-pro"), GROQ_DEFAULT_MODEL);
    assert.strictEqual(resolveGroqModel("openai/gpt-oss-120b"), GROQ_DEFAULT_MODEL);
    assert.strictEqual(resolveGroqModel("openai/gpt-oss-20b"), GROQ_FAST_MODEL);
    assert.strictEqual(resolveGroqModel("llama-3.1-8b-instant"), "llama-3.1-8b-instant");
    assert.strictEqual(resolveGroqModel("auto"), GROQ_DEFAULT_MODEL);
    assert.strictEqual(resolveGroqModel(undefined), GROQ_DEFAULT_MODEL);
  });

  await testAsync("Gemini failure safely sanitizes model name so Groq never receives invalid model string", async () => {
    mockMode = "gemini-429";
    lastGroqModel = null;
    groqCalls = 0;

    const res = await aiComplete({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "What is the speed of light?" }],
      json: true,
    });

    assert.ok(res, "Fallback response must be returned");
    assert.strictEqual(lastGroqModel, GROQ_DEFAULT_MODEL, `Groq should receive ${GROQ_DEFAULT_MODEL}, received: ${lastGroqModel}`);
    assert.ok(groqCalls >= 1, "Groq should have been called on fallback");
  });

  await testAsync("Groq 404 (model decommissioned) automatically recovers with default fallback model", async () => {
    mockMode = "groq-404-once";
    groqCalls = 0;

    const res = await groqComplete({
      model: "llama-3.1-70b-versatile",
      messages: [{ role: "user", content: "Explain momentum" }],
      json: true,
    });

    assert.ok(res, "Groq must succeed on retry after initial 404");
    assert.strictEqual(groqCalls, 2, "Groq should have attempted twice (initial 404 -> retry 200)");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Clean up mock server
  // ──────────────────────────────────────────────────────────────────────────
  global.fetch = realFetch;
  mockServer.close();
  for (const k of Object.keys(process.env)) {
    if (!(k in originalEnv)) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }

  console.log("\n============================================================");
  console.log(`Gemini Integration Test Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
