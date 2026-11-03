// test_gemini_integration.js
// Production-grade verification test suite for Google Gemini AI integration,
// Groq fallback, curriculum awareness, teaching quality, and error handling.

const assert = require("assert");
const http = require("http");

// Save real env
const originalEnv = { ...process.env };

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini AI Integration Verification Suite");
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

  const { convertMessagesToGemini, GEMINI_DEFAULT_MODEL } = require("./server/_ai");

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

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Gemini API Mock Server & End-to-End Network Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] Provider Execution, Mock Server & Fallback Chain");

  // Spin up an ephemeral local HTTP server to act as Google / Groq API endpoints
  let mockMode = "normal"; // "normal" | "gemini-429" | "gemini-504" | "both-fail"
  let receivedGeminiHeaders = null;
  let receivedGeminiBody = null;
  let geminiCalls = 0;
  let groqCalls = 0;

  const mockServer = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      // Mock Gemini endpoint
      if (req.url.includes("/v1beta/models/")) {
        geminiCalls++;
        receivedGeminiHeaders = req.headers;
        try { receivedGeminiBody = JSON.parse(body); } catch (_) { receivedGeminiBody = body; }

        if (mockMode === "gemini-400") {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }));
        }

        if (mockMode === "gemini-504") {
          res.writeHead(504, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 504, message: "Deadline exceeded / gateway timeout", status: "DEADLINE_EXCEEDED" } }));
        }

        if (mockMode === "gemini-429") {
          res.writeHead(429, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 429, message: "Resource has been exhausted (rate limit)", status: "RESOURCE_EXHAUSTED" } }));
        }

        if (mockMode === "both-fail") {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 503, message: "Service Unavailable", status: "UNAVAILABLE" } }));
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
                      directAnswer: "Photosynthesis is the process where green plants convert sunlight into energy.",
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
                      visualId: "cycle-photosynthesis",
                      visualParams: { stage: "light" },
                      visualObserve: "Watch the energy transformation.",
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
        if (mockMode === "both-fail") {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "Groq service unavailable" } }));
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

  const { geminiComplete, aiComplete } = require("./server/_ai");

  await testAsync("Gemini API connection: sends request with secure x-goog-api-key header", async () => {
    process.env.GEMINI_API_KEY = "test_actual_gemini_key_123456";
    geminiCalls = 0;
    mockMode = "normal";

    const res = await geminiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in two simple sentences." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1);
    assert.strictEqual(receivedGeminiHeaders["x-goog-api-key"], "test_actual_gemini_key_123456");
    assert.strictEqual(res.title, "Photosynthesis Explained");
    assert.strictEqual(res.kind, "lesson");
    assert.ok(res.directAnswer.includes("Photosynthesis"));
  });

  await testAsync("Gemini enforces json output mode via responseMimeType", async () => {
    assert.strictEqual(receivedGeminiBody?.generationConfig?.responseMimeType, "application/json");
  });

  await testAsync("Gemini rate-limit (429) automatically falls back to Groq", async () => {
    process.env.GEMINI_API_KEY = "test_gemini_key_active";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-429";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini should be tried first");
    assert.strictEqual(groqCalls, 1, "Groq should be invoked as fallback");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  await testAsync("Gemini 400 Bad Request (invalid key / model) safely falls back to Groq", async () => {
    process.env.GEMINI_API_KEY = "test_gemini_key_active";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-400";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini should be tried first");
    assert.strictEqual(groqCalls, 1, "Groq should be invoked as fallback on 400 error");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  await testAsync("Existing Groq-only mode functions cleanly when Gemini is unconfigured", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "normal";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 0, "Gemini should not be called when unconfigured");
    assert.strictEqual(groqCalls, 1, "Groq should be called directly");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  await testAsync("Gemini 504 gateway timeout cleanly triggers Groq fallback", async () => {
    process.env.GEMINI_API_KEY = "test_gemini_key_active";
    process.env.GROQ_API_KEY = "test_groq_key_active";
    mockMode = "gemini-504";
    geminiCalls = 0;
    groqCalls = 0;

    const res = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis." }],
      json: true,
    });

    assert.strictEqual(geminiCalls, 1, "Gemini was attempted");
    assert.strictEqual(groqCalls, 1, "Groq took over on timeout");
    assert.strictEqual(res.title, "Groq Fallback: Photosynthesis");
  });

  await testAsync("Both providers unavailable throws transparent retryable error without faking", async () => {
    process.env.GEMINI_API_KEY = "test_gemini_key_active";
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
    filterConcepts,
  } = require("./server/_curriculum");

  test("Maharashtra Board Class 9 Science curriculum resolution", () => {
    const track = getTrack("maharashtra");
    assert.ok(track, "Maharashtra track must exist in curriculum");
    assert.strictEqual(track.label, "Maharashtra State Board");

    // Check matching Work and Energy under Maharashtra Class 9
    const workMatch = matchConcept("Work and Energy", { trackId: "maharashtra", classNum: 9 });
    assert.ok(workMatch, "Work and Energy must resolve in Maharashtra class 9");
    assert.strictEqual(workMatch.conceptId, "maharashtra.9.science1.work_and_energy");
    assert.strictEqual(workMatch.subject, "Science & Technology - Part 1");

    // Check matching Life Processes in Living Organisms (plant biology)
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
  // 4. Clean up mock server
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
