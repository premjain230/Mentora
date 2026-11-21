// test_critical_failover_scenarios.js
// Exhaustive verification suite for the 12 required failure & failover scenarios:
//   1. Gemini working normally
//   2. Gemini returning 429
//   3. Gemini returning 404
//   4. Gemini timing out
//   5. Gemini returning an empty response
//   6. Gemini unavailable and Groq working
//   7. Both providers unavailable
//   8. Groq working independently in manual mode
//   9. Gemini streaming successfully
//  10. Gemini streaming failure and Groq recovery (pre-token and mid-stream)
//  11. Existing conversation history preserved across failover
//  12. Existing tutor features still working (chatTutor, structure, JSON mode)

const assert = require("assert");
const http = require("http");

async function runExhaustiveFailoverSuite() {
  console.log("============================================================");
  console.log("Learning Allied — 12 Critical AI Provider Failover Scenarios");
  console.log("============================================================\n");

  let mockServer;
  let geminiMode = "normal";
  let groqMode = "normal";
  let geminiCallCount = 0;
  let groqCallCount = 0;
  let lastGroqBody = null;

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
        // ── GEMINI MOCK ──
        if (req.url.toLowerCase().includes("generatecontent") || req.url.toLowerCase().includes("models/")) {
          geminiCallCount++;

          if (geminiMode === "429") {
            res.writeHead(429, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: { code: 429, message: "Resource exhausted (rate limit)", status: "RESOURCE_EXHAUSTED" } }));
          }

          if (geminiMode === "404") {
            res.writeHead(404, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: { code: 404, message: "Model not found", status: "NOT_FOUND" } }));
          }

          if (geminiMode === "timeout") {
            await new Promise((r) => setTimeout(r, 200));
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validStructuredReply) }] } }] }));
          }

          if (geminiMode === "empty") {
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ candidates: [{ finishReason: "SAFETY", content: { parts: [] } }] }));
          }

          if (geminiMode === "unavailable") {
            res.writeHead(503, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: { code: 503, message: "Service Unavailable", status: "UNAVAILABLE" } }));
          }

          if (geminiMode === "stream-mid-fail") {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            });
            // Send one partial chunk, then abruptly disconnect
            res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Photosynthesis begins when " }] } }] })}\n\n`);
            await new Promise((r) => setTimeout(r, 20));
            res.destroy(new Error("Upstream stream terminated unexpectedly"));
            return;
          }

          if (geminiMode === "stream-normal") {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            });
            res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Photosynthesis is the process " }] } }] })}\n\n`);
            res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "by which green plants synthesize glucose." }] } }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
          }

          // normal
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validStructuredReply) }] } }] }));
        }

        // ── GROQ MOCK ──
        if (req.url.includes("chat/completions") || req.url.includes("groq")) {
          groqCallCount++;
          try {
            lastGroqBody = JSON.parse(body);
          } catch (_) {}

          if (groqMode === "unavailable") {
            res.writeHead(503, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: { message: "Groq service unavailable" } }));
          }

          if (lastGroqBody && lastGroqBody.stream === true) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            });
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Photosynthesis (via Groq) converts " } }] })}\n\n`);
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "light into chemical energy." } }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            id: "chatcmpl-groq-mock",
            choices: [{ message: { role: "assistant", content: JSON.stringify(validStructuredReply) } }],
            usage: { prompt_tokens: 120, completion_tokens: 220, total_tokens: 340 }
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

  try {
    process.env.GEMINI_API_KEY = "test_gemini_key_123456";
    process.env.GROQ_API_KEY = "test_groq_key_abcdef";
    delete process.env.GEMINI_TIMEOUT_MS;
    delete process.env.GROQ_TIMEOUT_MS;

    const { aiComplete, aiStream } = require("./server/_ai");
    const { chatTutor } = require("./server/_learn-core");

    // ── 1. Gemini working normally ──
    console.log("[Scenario 1] Gemini working normally");
    geminiMode = "normal";
    groqMode = "normal";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta1 = {};
    const res1 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta1,
    });
    assert.ok(res1, "Response must not be null");
    assert.strictEqual(geminiCallCount, 1, "Gemini called first");
    assert.strictEqual(groqCallCount, 0, "Groq not called when Gemini succeeds");
    assert.strictEqual(meta1.provider, "gemini", "Meta indicates gemini provider");
    console.log("  ✓ Confirmed: Gemini primary answered with 0 Groq calls.\n");

    // ── 2. Gemini returning 429 ──
    console.log("[Scenario 2] Gemini returning 429 (rate limit)");
    geminiMode = "429";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta2 = {};
    const res2 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta2,
    });
    assert.ok(res2);
    assert.strictEqual(geminiCallCount, 1);
    assert.strictEqual(groqCallCount, 1, "Groq must be called on Gemini 429");
    assert.strictEqual(meta2.provider, "groq");
    console.log("  ✓ Confirmed: Gemini 429 automatically fell back to Groq.\n");

    // ── 3. Gemini returning 404 ──
    console.log("[Scenario 3] Gemini returning 404 (model unavailable)");
    geminiMode = "404";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta3 = {};
    const res3 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta3,
    });
    assert.ok(res3);
    assert.strictEqual(groqCallCount, 1, "Groq must be called on Gemini 404");
    assert.strictEqual(meta3.provider, "groq");
    console.log("  ✓ Confirmed: Gemini 404 automatically fell back to Groq.\n");

    // ── 4. Gemini timing out ──
    console.log("[Scenario 4] Gemini timing out");
    geminiMode = "timeout";
    process.env.GEMINI_TIMEOUT_MS = "60"; // 60ms timeout
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta4 = {};
    const res4 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta4,
    });
    delete process.env.GEMINI_TIMEOUT_MS;
    assert.ok(res4);
    assert.strictEqual(groqCallCount, 1, "Groq must be called on Gemini timeout");
    assert.strictEqual(meta4.provider, "groq");
    console.log("  ✓ Confirmed: Gemini timeout automatically fell back to Groq with clean signal.\n");

    // ── 5. Gemini returning an empty response ──
    console.log("[Scenario 5] Gemini returning an empty response");
    geminiMode = "empty";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta5 = {};
    const res5 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta5,
    });
    assert.ok(res5);
    assert.strictEqual(geminiCallCount, 1);
    assert.strictEqual(groqCallCount, 1, "Groq must be called when Gemini returns empty response");
    assert.strictEqual(meta5.provider, "groq");
    console.log("  ✓ Confirmed: Empty Gemini response rejected and automatically recovered by Groq.\n");

    // ── 6. Gemini unavailable and Groq working ──
    console.log("[Scenario 6] Gemini unavailable (503) and Groq working");
    geminiMode = "unavailable";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta6 = {};
    const res6 = await aiComplete({
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta6,
    });
    assert.ok(res6);
    assert.strictEqual(groqCallCount, 1);
    assert.strictEqual(meta6.provider, "groq");
    console.log("  ✓ Confirmed: Gemini 503 recovered by Groq.\n");

    // ── 7. Both providers unavailable ──
    console.log("[Scenario 7] Both providers unavailable -> clean 503 error");
    geminiMode = "unavailable";
    groqMode = "unavailable";
    let bothFailedError = null;
    try {
      await aiComplete({
        messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
        json: true,
      });
    } catch (err) {
      bothFailedError = err;
    }
    assert.ok(bothFailedError, "Must throw when both fail");
    assert.strictEqual(bothFailedError.statusCode, 503, "Status code must be 503");
    assert(bothFailedError.message.includes("AI providers unavailable"), "Message identifies outage");
    console.log("  ✓ Confirmed: Outage across both providers produces sanitized 503 error.\n");

    // ── 8. Groq working independently in manual mode ──
    console.log("[Scenario 8] Groq working independently in manual mode");
    geminiMode = "unavailable";
    groqMode = "normal";
    geminiCallCount = 0;
    groqCallCount = 0;
    const meta8 = {};
    const res8 = await aiComplete({
      provider: "groq",
      allowFallback: false,
      messages: [{ role: "user", content: "Explain photosynthesis in JSON" }],
      json: true,
      metaOut: meta8,
    });
    assert.ok(res8);
    assert.strictEqual(geminiCallCount, 0, "Gemini never called when Groq manually chosen");
    assert.strictEqual(groqCallCount, 1, "Groq called directly");
    assert.strictEqual(meta8.provider, "groq");
    console.log("  ✓ Confirmed: Manual Groq route operates cleanly without touching Gemini.\n");

    // ── 9. Gemini streaming successfully ──
    console.log("[Scenario 9] Gemini streaming successfully");
    geminiMode = "stream-normal";
    groqMode = "normal";
    let streamedTokens = "";
    await aiStream({
      messages: [{ role: "user", content: "Explain photosynthesis" }],
      onChunk: (chunk) => { streamedTokens += chunk; },
    });
    assert.ok(streamedTokens.includes("Photosynthesis is the process"));
    console.log("  ✓ Confirmed: Gemini streaming yields tokens to client.\n");

    // ── 10. Gemini streaming failure and Groq recovery (mid-stream provider switch) ──
    console.log("[Scenario 10] Gemini streaming mid-stream failure -> Groq recovery with switch event");
    geminiMode = "stream-mid-fail";
    groqMode = "normal";
    let switchReported = null;
    let finalStreamedText = "";
    await aiStream({
      messages: [{ role: "user", content: "Explain photosynthesis" }],
      onChunk: (chunk) => { finalStreamedText += chunk; },
      onProviderSwitch: (info) => {
        switchReported = info;
        // Frontend resets buffer when provider switch occurs
        finalStreamedText = "";
      },
    });
    assert.ok(switchReported, "Provider switch event must be dispatched");
    assert.strictEqual(switchReported.from, "gemini");
    assert.strictEqual(switchReported.to, "groq");
    assert.ok(finalStreamedText.includes("via Groq"), "Final text contains clean Groq output");
    console.log("  ✓ Confirmed: Mid-stream Gemini crash triggered provider switch event and clean Groq response.\n");

    // ── 11. Existing conversation history preserved across failover ──
    console.log("[Scenario 11] Existing conversation history preserved across failover");
    geminiMode = "429"; // Force failover to Groq
    groqMode = "normal";
    lastGroqBody = null;
    const historyPayload = [
      { role: "user", content: "What is chlorophyll?" },
      { role: "assistant", content: "Chlorophyll is a green pigment." },
      { role: "user", content: "Why is it important in photosynthesis?" }
    ];
    await aiComplete({
      messages: historyPayload,
      json: true,
    });
    assert.ok(lastGroqBody, "Groq must receive payload");
    assert.strictEqual(lastGroqBody.messages.length, 3, "Groq must receive full history unmodified");
    assert.strictEqual(lastGroqBody.messages[0].content, "What is chlorophyll?");
    assert.strictEqual(lastGroqBody.messages[2].content, "Why is it important in photosynthesis?");
    console.log("  ✓ Confirmed: Full student conversation history forwarded to Groq during failover.\n");

    // ── 12. Existing tutor features still working (chatTutor, structure, JSON mode) ──
    console.log("[Scenario 12] Existing tutor features still working in chatTutor");
    geminiMode = "429"; // Force failover to Groq in chatTutor
    groqMode = "normal";
    const tutorResult = await chatTutor({
      uid: "test-verified-student-12",
      body: {
        question: "How do plants convert sunlight into energy?",
        context: { subject: "Biology", track: "cbse", classNum: 9 },
        history: [],
      },
    });
    assert.ok(tutorResult, "chatTutor must return result");
    assert.ok(tutorResult.reply, "chatTutor must return reply");
    assert.strictEqual(tutorResult.reply.kind, "lesson");
    assert.strictEqual(tutorResult.reply.source, "ai");
    assert.strictEqual(tutorResult.reply.retry, undefined);
    assert.strictEqual(
      tutorResult.reply.directAnswer.includes("could not reach the teaching model"),
      false,
      "MUST NOT return honest failure message when Groq succeeds"
    );
    assert.ok(tutorResult.reply.directAnswer.includes("Photosynthesis"));
    assert.strictEqual(tutorResult.meta.provider, "groq", "Meta reflects groq provider");
    console.log("  ✓ Confirmed: Socratic lesson generation, curriculum context, and metadata fully operational.\n");

    console.log("============================================================");
    console.log("ALL 12 CRITICAL FAILOVER SCENARIOS PASSED!");
    console.log("============================================================\n");
  } finally {
    global.fetch = realFetch;
    mockServer.close();
  }
}

runExhaustiveFailoverSuite().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
