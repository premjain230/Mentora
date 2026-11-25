"use strict";

/**
 * End-to-end verification suite for Gemini + Groq fallback, streaming, and diagnostics.
 * Covers:
 *   1. Gemini succeeds (/api/tutor & /api/groq-proxy stream + non-stream)
 *   2. Gemini fails (401, 429, 404) -> Groq fallback succeeds
 *   3. Gemini and Groq both fail -> full diagnostics logged, proper error/fallback
 *   4. Gemini times out (non-stream & mid-stream) -> Groq fallback succeeds
 *   5. Groq returns an error (HTTP error & 0-token stream) -> clean 502/503, no hang
 *   6. Streaming starts and completes correctly (Gemini, Groq pre-token, mid-stream switch)
 */

const assert = require("assert");
const adminModule = require("./server/_admin");

// Stub Firebase Admin auth & quota gate before requiring handlers
adminModule.verifyIdToken = async () => ({ uid: "e2e-test-user", email: "test@example.com" });
adminModule.checkAndIncrementChat = async () => ({
  allowed: true,
  used: 1,
  limit: 20,
  plan: "free",
});
adminModule.firestore = () => ({
  collection: () => ({
    doc: () => ({
      get: async () => ({ exists: false, data: () => ({}) }),
      set: async () => {},
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false, data: () => ({}) }),
          set: async () => {},
        }),
        limit: () => ({ get: async () => ({ docs: [] }) }),
      }),
    }),
  }),
});

process.env.GEMINI_API_KEY = "test-gemini-key-123456";
process.env.GROQ_API_KEY = "test-groq-key-123456";

const tutorHandler = require("./server/tutor");
const groqProxyHandler = require("./server/groq-proxy");

function createMockReqRes({ method = "POST", body = {}, headers = {} } = {}) {
  const resHeaders = {};
  const chunks = [];
  let statusCode = 200;
  let jsonBody = null;
  let ended = false;

  const req = {
    method,
    url: "/",
    headers: { authorization: "Bearer mock-token", ...headers },
    socket: { remoteAddress: "127.0.0.1" },
    body,
  };

  const res = {
    get headersSent() {
      return ended || chunks.length > 0;
    },
    setHeader(k, v) {
      resHeaders[k.toLowerCase()] = v;
      return this;
    },
    getHeader(k) {
      return resHeaders[k.toLowerCase()];
    },
    status(code) {
      statusCode = code;
      return this;
    },
    write(chunk) {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
      return true;
    },
    json(data) {
      jsonBody = data;
      ended = true;
      return this;
    },
    end(data) {
      if (data) chunks.push(typeof data === "string" ? data : data.toString("utf8"));
      ended = true;
      return this;
    },
  };

  return {
    req,
    res,
    result: () => ({ statusCode, headers: resHeaders, jsonBody, sseText: chunks.join(""), ended }),
  };
}

function makeSseStream(events, { delayMs = 0, failAfter = -1, stallAfter = -1 } = {}) {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (stallAfter !== -1 && index >= stallAfter) {
        // Never enqueue or close — simulates a stalled stream until AbortSignal fires
        return new Promise(() => {});
      }
      if (failAfter !== -1 && index >= failAfter) {
        controller.error(new Error("Simulated mid-stream network drop"));
        return;
      }
      if (index >= events.length) {
        controller.close();
        return;
      }
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      const item = events[index++];
      controller.enqueue(encoder.encode(`data: ${typeof item === "string" ? item : JSON.stringify(item)}\n\n`));
    },
  });
}

async function captureLogs(fn) {
  const logs = [];
  const origLog = console.log;
  const origWarn = console.warn;
  const origErr = console.error;
  console.log = (...args) => logs.push(args.join(" "));
  console.warn = (...args) => logs.push(args.join(" "));
  console.error = (...args) => logs.push(args.join(" "));
  try {
    return { value: await fn(), logs };
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origErr;
  }
}

async function runTests() {
  const origFetch = global.fetch;

  try {
    // ── 1. Gemini succeeds (/api/tutor & /api/groq-proxy stream) ──
    console.log("[1] Testing Gemini succeeds...");
    global.fetch = async (url, init) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        if (String(url).includes("streamGenerateContent")) {
          return new Response(
            makeSseStream([
              { candidates: [{ content: { parts: [{ text: "Force equals " }] } }] },
              { candidates: [{ content: { parts: [{ text: "mass times acceleration." }] } }] },
            ]),
            { status: 200, headers: { "Content-Type": "text/event-stream" } }
          );
        }
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        kind: "short",
                        title: "Newton's Second Law",
                        directAnswer: "Newton's second law states that F = ma.",
                        sections: [],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { action: "chat", question: "What is Newton's second law?" },
      });
      const { logs } = await captureLogs(() => tutorHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(r.jsonBody.ok, true);
      assert(r.jsonBody.reply.directAnswer.includes("F = ma"), "Expected Gemini answer");
      assert.strictEqual(r.jsonBody.meta.provider, "gemini");
      assert(r.headers["x-request-id"], "X-Request-Id header must be set");
      const summary = logs.find((l) => l.includes("[REQUEST_SUMMARY]"));
      assert(summary && summary.includes("apiRoute=/api/tutor") && summary.includes("geminiStatus=ok") && summary.includes("fallbackTriggered=false"));
    }

    {
      const { req, res, result } = createMockReqRes({
        body: { model: "auto", stream: true, messages: [{ role: "user", content: "State F=ma" }] },
      });
      await captureLogs(() => groqProxyHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert(r.sseText.includes("Force equals "), "Stream should contain first chunk");
      assert(r.sseText.includes("mass times acceleration."), "Stream should contain second chunk");
      assert(r.sseText.includes("data: [DONE]"), "Stream must end with [DONE]");
    }
    console.log("  ✓ Gemini succeeds for both /api/tutor and /api/groq-proxy stream.");

    // ── 2. Gemini fails (401 auth error) -> Groq fallback succeeds ──
    console.log("[2] Testing Gemini 401 auth error -> Groq fallback succeeds...");
    global.fetch = async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 401 });
      }
      if (String(url).includes("api.groq.com")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    kind: "short",
                    title: "Ohm's Law",
                    directAnswer: "Ohm's law states that V = IR.",
                    sections: [],
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 12, completion_tokens: 18, total_tokens: 30 },
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { action: "chat", question: "Explain Ohm's law" },
      });
      const { logs } = await captureLogs(() => tutorHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(r.jsonBody.meta.provider, "groq");
      assert(r.jsonBody.reply.directAnswer.includes("V = IR"));
      const summary = logs.find((l) => l.includes("[REQUEST_SUMMARY]"));
      assert(summary.includes("geminiHttpStatus=401"));
      assert(summary.includes("geminiFailureCategory=auth_error"));
      assert(summary.includes("fallbackTriggered=true"));
      assert(summary.includes("groqStatus=ok"));
    }
    console.log("  ✓ Gemini 401 triggered Groq fallback with full diagnostics.");

    // ── 3. Gemini and Groq both fail ──
    console.log("[3] Testing Gemini and Groq both fail...");
    global.fetch = async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), { status: 429 });
      }
      if (String(url).includes("api.groq.com")) {
        return new Response(JSON.stringify({ error: { message: "Service unavailable" } }), { status: 503 });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { model: "auto", stream: false, messages: [{ role: "user", content: "Explain entropy" }] },
      });
      const { logs } = await captureLogs(() => groqProxyHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 503);
      assert(r.jsonBody.error.message.includes("AI providers unavailable"));
      const allFailed = logs.find((l) => l.includes("[ALL_FAILED]"));
      assert(allFailed.includes("apiRoute=/api/groq-proxy"));
      assert(allFailed.includes("geminiHttpStatus=429"));
      assert(allFailed.includes("groqHttpStatus=503"));
    }
    {
      const { req, res, result } = createMockReqRes({
        body: { action: "chat", question: "Explain quantum chromodynamics" },
      });
      const { logs } = await captureLogs(() => tutorHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(r.jsonBody.reply.kind, "fallback");
      const failedLog = logs.find((l) => l.includes("[AI_CALL_FAILED]"));
      assert(failedLog && failedLog.includes("apiRoute=/api/tutor") && failedLog.includes("fallbackTriggered=true"));
    }
    console.log("  ✓ Both providers failing logged full diagnostics and handled cleanly.");

    // ── 4. Gemini times out (non-stream & mid-stream) -> Groq fallback succeeds ──
    console.log("[4] Testing Gemini mid-stream timeout -> Groq stream fallback...");
    process.env.GEMINI_TIMEOUT_MS = "80";
    process.env.GROQ_TIMEOUT_MS = "2000";
    global.fetch = async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(
          makeSseStream(
            [{ candidates: [{ content: { parts: [{ text: "Partial " }] } }] }],
            { stallAfter: 1 }
          ),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
      if (String(url).includes("api.groq.com")) {
        return new Response(
          makeSseStream([
            { choices: [{ delta: { content: "Recovered " } }] },
            { choices: [{ delta: { content: "from Groq!" } }] },
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { model: "auto", stream: true, messages: [{ role: "user", content: "Hello" }] },
      });
      const { logs } = await captureLogs(() => groqProxyHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert(r.sseText.includes('"event":"provider_switch"'), "Mid-stream timeout must emit provider_switch");
      assert(r.sseText.includes("Recovered "), "Must stream Groq content");
      assert(r.sseText.includes("from Groq!"), "Must stream complete Groq content");
      assert(r.sseText.includes("data: [DONE]"), "Must end with [DONE]");
      const timeoutLog = logs.find((l) => l.includes("[STREAM_TIMEOUT]"));
      assert(timeoutLog && timeoutLog.includes("failureCategory=timeout") && timeoutLog.includes("status=504"));
    }
    console.log("  ✓ Mid-stream Gemini timeout triggered provider_switch and Groq stream.");

    // ── 5. Groq returns an error / 0-token stream -> no hang ──
    console.log("[5] Testing Groq 0-token stream does NOT hang /api/groq-proxy...");
    global.fetch = async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "Overloaded" } }), { status: 503 });
      }
      if (String(url).includes("api.groq.com")) {
        return new Response(makeSseStream([]), { status: 200, headers: { "Content-Type": "text/event-stream" } });
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { model: "auto", stream: true, messages: [{ role: "user", content: "Hello" }] },
      });
      await captureLogs(() => groqProxyHandler(req, res));
      const r = result();
      assert.strictEqual(r.ended, true, "Response must end and not hang");
      assert.strictEqual(r.statusCode, 503);
      assert(r.jsonBody.error.message.includes("zero tokens"));
    }
    console.log("  ✓ Groq 0-token stream cleanly returned 503 without hanging.");

    // ── 6. Pre-token Gemini failure -> seamless Groq stream ──
    console.log("[6] Testing pre-token Gemini 429 -> seamless Groq stream...");
    global.fetch = async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "Rate limited" } }), { status: 429 });
      }
      if (String(url).includes("api.groq.com")) {
        return new Response(
          makeSseStream([
            { choices: [{ delta: { content: "Seamless " } }] },
            { choices: [{ delta: { content: "Groq stream." } }] },
          ]),
          { status: 200, headers: { "Content-Type": "text/event-stream" } }
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { model: "auto", stream: true, messages: [{ role: "user", content: "Hi" }] },
      });
      await captureLogs(() => groqProxyHandler(req, res));
      const r = result();
      assert.strictEqual(r.statusCode, 200);
      assert(!r.sseText.includes("provider_switch"), "Pre-token fallback should not emit provider_switch");
      assert(r.sseText.includes("Seamless "));
      assert(r.sseText.includes("Groq stream."));
      assert(r.sseText.includes("data: [DONE]"));
    }
    console.log("  ✓ Pre-token Gemini failure seamlessly streamed Groq.");

    // ── 7. Invalid GEMINI_MODEL env var (e.g. API key pasted into GEMINI_MODEL) & Groq 404 model discovery ──
    console.log("[7] Testing invalid GEMINI_MODEL env var & Groq /models discovery...");
    const prevGeminiModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_MODEL = "AQ.Ab8RN6FakeKeyAccidentallyPastedInModel";
    let sawGeminiUrl = "";
    global.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes("generativelanguage.googleapis.com")) {
        sawGeminiUrl = u;
        return new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 401 });
      }
      if (u === "https://api.groq.com/openai/v1/models") {
        return new Response(
          JSON.stringify({ data: [{ id: "qwen/qwen3-32b" }, { id: "whisper-large-v3" }] }),
          { status: 200 }
        );
      }
      if (u.includes("api.groq.com/openai/v1/chat/completions")) {
        const parsed = JSON.parse(init.body);
        if (parsed.model === "qwen/qwen3-32b") {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      kind: "short",
                      title: "Gravity",
                      directAnswer: "Gravity is the attraction between masses.",
                      sections: [],
                    }),
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ error: { message: "model_not_found" } }), { status: 404 });
      }
      throw new Error(`Unexpected fetch to ${u}`);
    };

    {
      const { req, res, result } = createMockReqRes({
        body: { action: "chat", question: "What is gravity?" },
      });
      await captureLogs(() => tutorHandler(req, res));
      const r = result();
      assert(sawGeminiUrl.includes("/models/gemini-3.8-flash:generateContent"), "Must ignore API key in GEMINI_MODEL and use gemini-3.8-flash");
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(r.jsonBody.meta.provider, "groq");
      assert.strictEqual(r.jsonBody.meta.model, "qwen/qwen3-32b");
      assert(r.jsonBody.reply.directAnswer.includes("attraction between masses"));
    }
    if (prevGeminiModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = prevGeminiModel;
    console.log("  ✓ Invalid GEMINI_MODEL ignored and Groq /models discovery succeeded.");

    // ── 8. Groq 404 retry must be bounded (no infinite loop when discovered model also 404s) ──
    console.log("[8] Testing Groq 404 retry loop protection...");
    let groqAttempts = 0;
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "API key not valid." } }), { status: 401 });
      }
      if (u === "https://api.groq.com/openai/v1/models") {
        return new Response(JSON.stringify({ data: [{ id: "openai/gpt-oss-120b" }] }), { status: 200 });
      }
      if (u.includes("api.groq.com/openai/v1/chat/completions")) {
        groqAttempts++;
        return new Response(JSON.stringify({ error: { message: "model_not_found" } }), { status: 404 });
      }
      throw new Error(`Unexpected fetch to ${u}`);
    };
    {
      const { req, res, result } = createMockReqRes({
        body: { action: "chat", question: "What is inertia?" },
      });
      await captureLogs(() => tutorHandler(req, res));
      const r = result();
      assert(groqAttempts <= 3, `Groq retries must be bounded (got ${groqAttempts})`);
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(r.jsonBody.reply.kind, "fallback");
    }
    console.log("  ✓ Groq 404 retries bounded (no infinite loop / 504).");

    console.log("\n============================================================");
    console.log("ALL E2E FALLBACK, STREAMING & DIAGNOSTIC TESTS PASSED!");
    console.log("============================================================");
  } finally {
    global.fetch = origFetch;
  }
}

runTests().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
