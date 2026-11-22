// test_consecutive_404_fallback.js
// Dedicated automated verification suite for consecutive 404 model unavailable errors:
// 1. Standard aiComplete: sequences through all GEMINI_FALLBACK_MODELS on repeated 404s -> Groq fallback
// 2. Standard aiComplete: recovers mid-sequence if a secondary Gemini model succeeds (no Groq)
// 3. Streaming aiStream: sequences through all GEMINI_FALLBACK_MODELS on repeated 404s -> Groq stream
// 4. Streaming aiStream: recovers mid-sequence if a secondary Gemini model succeeds (no Groq)

const assert = require("assert");
const http = require("http");

async function runConsecutive404Suite() {
  console.log("============================================================");
  console.log("Learning Allied — Multi-Model Consecutive 404 Fallback Tests");
  console.log("============================================================\n");

  let mockServer;
  let requestedGeminiUrls = [];
  let geminiResponseHandler = null;
  let groqCalls = 0;
  let lastGroqBody = null;

  const validStructuredReply = {
    kind: "lesson",
    title: "Newton's Third Law",
    directAnswer: "For every action, there is an equal and opposite reaction.",
  };

  await new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        // ── GEMINI MOCK ──
        if (req.url.toLowerCase().includes("generatecontent") || req.url.toLowerCase().includes("models/")) {
          requestedGeminiUrls.push(req.url);
          if (geminiResponseHandler) {
            return geminiResponseHandler(req, res, body);
          }
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { code: 404, message: "Model not found", status: "NOT_FOUND" } }));
        }

        // ── GROQ MOCK ──
        if (req.url.includes("chat/completions") || req.url.includes("groq")) {
          groqCalls++;
          try {
            lastGroqBody = JSON.parse(body);
          } catch (_) {}

          if (lastGroqBody && lastGroqBody.stream === true) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive"
            });
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "Action and reaction are equal and opposite." } }] })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            id: "chatcmpl-groq-mock",
            choices: [{ message: { role: "assistant", content: JSON.stringify(validStructuredReply) } }],
            usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 }
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

  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GROQ_API_KEY = "test-groq-key";

  const { aiComplete, aiStream, GEMINI_FALLBACK_MODELS } = require("./server/_ai");

  try {
    // ── Test 1: Standard endpoint consecutive 404s (all 3 models fail -> Groq fallback) ──
    console.log("[Test 1] Standard endpoint: all 3 Gemini models 404 -> Groq fallback");
    requestedGeminiUrls = [];
    groqCalls = 0;
    geminiResponseHandler = (req, res) => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: 404, message: "Model not found", status: "NOT_FOUND" } }));
    };

    const meta1 = {};
    const res1 = await aiComplete({
      messages: [{ role: "user", content: "Explain Newton's third law" }],
      json: true,
      metaOut: meta1,
    });

    assert.ok(res1, "Response must exist");
    assert.strictEqual(requestedGeminiUrls.length, 3, "All 3 configured Gemini candidate models must be attempted");
    assert.ok(requestedGeminiUrls[0].includes("gemini-2.5-flash"), "First attempt must be gemini-2.5-flash");
    assert.ok(requestedGeminiUrls[1].includes("gemini-2.0-flash"), "Second attempt must be gemini-2.0-flash");
    assert.ok(requestedGeminiUrls[2].includes("gemini-1.5-flash"), "Third attempt must be gemini-1.5-flash");
    assert.strictEqual(groqCalls, 1, "Groq fallback must be called once candidate Gemini models are exhausted");
    assert.strictEqual(meta1.provider, "groq", "Final provider must be groq");
    console.log("  ✓ Confirmed: Standard endpoint sequenced gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash -> Groq fallback.\n");

    // ── Test 2: Standard endpoint partial 404 recovery (gemini-2.5-flash 404, gemini-2.0-flash succeeds 200) ──
    console.log("[Test 2] Standard endpoint: 1st model 404, 2nd model succeeds 200 -> Gemini returns successfully");
    requestedGeminiUrls = [];
    groqCalls = 0;
    geminiResponseHandler = (req, res) => {
      if (req.url.includes("gemini-2.5-flash")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { code: 404, message: "Model not found" } }));
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validStructuredReply) }] } }] }));
    };

    const meta2 = {};
    const res2 = await aiComplete({
      messages: [{ role: "user", content: "Explain Newton's third law" }],
      json: true,
      metaOut: meta2,
    });

    assert.ok(res2, "Response must exist");
    assert.strictEqual(requestedGeminiUrls.length, 2, "Must stop retrying after gemini-2.0-flash succeeds");
    assert.strictEqual(groqCalls, 0, "Groq must NOT be called when secondary Gemini model succeeds");
    assert.strictEqual(meta2.provider, "gemini", "Provider must remain gemini");
    assert.strictEqual(meta2.model, "gemini-2.0-flash", "Winning model must be gemini-2.0-flash");
    console.log("  ✓ Confirmed: Standard endpoint recovered on gemini-2.0-flash without triggering Groq fallback.\n");

    // ── Test 3: Streaming endpoint consecutive 404s (all 3 models fail -> Groq stream fallback) ──
    console.log("[Test 3] Streaming endpoint: all 3 Gemini models 404 -> Groq stream fallback");
    requestedGeminiUrls = [];
    groqCalls = 0;
    geminiResponseHandler = (req, res) => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: 404, message: "Model not found", status: "NOT_FOUND" } }));
    };

    const chunks3 = [];
    await aiStream({
      messages: [{ role: "user", content: "Explain Newton's third law" }],
      onChunk: (chunk) => { chunks3.push(chunk); },
    });

    assert.strictEqual(requestedGeminiUrls.length, 3, "Streaming must attempt all 3 Gemini candidate models");
    assert.ok(requestedGeminiUrls[0].includes("gemini-2.5-flash"), "Stream attempt 1: gemini-2.5-flash");
    assert.ok(requestedGeminiUrls[1].includes("gemini-2.0-flash"), "Stream attempt 2: gemini-2.0-flash");
    assert.ok(requestedGeminiUrls[2].includes("gemini-1.5-flash"), "Stream attempt 3: gemini-1.5-flash");
    assert.strictEqual(groqCalls, 1, "Groq stream must be invoked after 3rd Gemini 404");
    assert.ok(chunks3.length > 0, "Stream must deliver tokens from Groq fallback");
    console.log("  ✓ Confirmed: Streaming endpoint sequenced gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash -> Groq stream.\n");

    // ── Test 4: Streaming endpoint partial 404 recovery (1st model 404, 2nd model streams successfully) ──
    console.log("[Test 4] Streaming endpoint: 1st model 404, 2nd model succeeds 200 -> Gemini streams successfully");
    requestedGeminiUrls = [];
    groqCalls = 0;
    geminiResponseHandler = (req, res) => {
      if (req.url.includes("gemini-2.5-flash")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { code: 404, message: "Model not found" } }));
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });
      res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "Action and reaction are equal. " }] } }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: "They act on different bodies." }] } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    };

    const chunks4 = [];
    await aiStream({
      messages: [{ role: "user", content: "Explain Newton's third law" }],
      onChunk: (chunk) => { chunks4.push(chunk); },
    });

    assert.strictEqual(requestedGeminiUrls.length, 2, "Stream must stop on 2nd model once 200 OK");
    assert.strictEqual(groqCalls, 0, "Groq stream must NOT be called when secondary Gemini stream succeeds");
    assert.ok(chunks4.join("").includes("Action and reaction are equal"), "Tokens must be from Gemini");
    console.log("  ✓ Confirmed: Streaming endpoint recovered on gemini-2.0-flash without Groq fallback.\n");

    console.log("============================================================");
    console.log("ALL MULTI-MODEL CONSECUTIVE 404 FALLBACK TESTS PASSED!");
    console.log("============================================================\n");
  } finally {
    global.fetch = realFetch;
    await new Promise((resolve) => mockServer.close(resolve));
  }
}

if (require.main === module) {
  runConsecutive404Suite().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}

module.exports = { runConsecutive404Suite };
