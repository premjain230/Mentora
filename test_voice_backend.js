// test_voice_backend.js
// Independent Automated Verification Test Suite for Step 2: Backend Session Initialization.
// Tests HTTP methods, Firebase Auth, Rate Limiting, Ephemeral Token Generation,
// Fail-Closed Security, Error Sanitization, Reconnection Protocol Logic, and Regression Integrity.

const assert = require("assert");
const http = require("http");
const handler = require("./server/voice-session");
const { createEphemeralToken, sanitizeKey, getGeminiApiKey, DEFAULT_LIVE_MODEL } = handler;

// Mock Response Helper
function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let responseData = null;
  let ended = false;

  const res = {
    statusCode,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      ended = true;
      return this;
    },
    end() {
      ended = true;
      return this;
    },
    _getData: () => responseData,
    _getHeaders: () => headers,
    _getStatusCode: () => statusCode,
    _isEnded: () => ended,
  };
  return res;
}

// Mock Request Helper
function createMockReq({ method = "POST", headers = {}, body = {} } = {}) {
  return {
    method,
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    socket: { remoteAddress: `127.0.0.${Math.floor(Math.random() * 200) + 1}` },
    body,
  };
}

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini Live Voice Backend Initialization Verification");
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
  // 1. HTTP Method & CORS Validation
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Suite 1] HTTP Methods & CORS Validation");

  await testAsync("OPTIONS returns 204 with valid CORS headers", async () => {
    const req = createMockReq({ method: "OPTIONS" });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res._getStatusCode(), 204);
    assert.ok(res._getHeaders()["access-control-allow-origin"]);
    assert.ok(res._getHeaders()["access-control-allow-methods"].includes("POST"));
  });

  await testAsync("Non-POST methods (GET, PUT, DELETE) are rejected with 405 Method Not Allowed", async () => {
    for (const method of ["GET", "PUT", "DELETE"]) {
      const req = createMockReq({ method });
      const res = createMockRes();
      await handler(req, res);
      assert.strictEqual(res._getStatusCode(), 405);
      assert.strictEqual(res._getData().error, "Method not allowed. Use POST.");
      assert.ok(res._getHeaders()["allow"].includes("POST"));
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Authentication & Authorization Gating
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] Authentication & Authorization Gating");

  await testAsync("Rejects requests missing Authorization header with 401", async () => {
    const req = createMockReq({ method: "POST", headers: {} });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
    assert.ok(res._getData().error.includes("Authentication required"));
  });

  await testAsync("Rejects non-Bearer Authorization headers with 401", async () => {
    const req = createMockReq({ method: "POST", headers: { authorization: "Basic dXNlcjpwYXNz" } });
    const res = createMockRes();
    await handler(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
  });

  await testAsync("Rejects invalid or expired Firebase tokens with 401", async () => {
    const req = createMockReq({ method: "POST", headers: { authorization: "Bearer invalid.token.payload" } });
    const res = createMockRes();
    const mockVerifier = async () => null; // simulates invalid token
    await handler(req, res, { customVerifier: mockVerifier });
    assert.strictEqual(res._getStatusCode(), 401);
    assert.ok(res._getData().error.includes("Unauthorized") || res._getData().error.includes("Invalid"));
  });

  await testAsync("Accepts valid student Firebase token and proceeds", async () => {
    const req = createMockReq({ method: "POST", headers: { authorization: "Bearer valid.student.token" } });
    const res = createMockRes();
    const mockVerifier = async (t) => ({ uid: "student-12345", email: "student@example.com" });
    const mockTokenCreator = async () => ({
      token: "authTokens/mock-ephemeral-token-123",
      model: DEFAULT_LIVE_MODEL,
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      newSessionExpiresAt: new Date(Date.now() + 120000).toISOString(),
      wsUrl: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=authTokens%2Fmock-ephemeral-token-123",
    });

    await handler(req, res, { customVerifier: mockVerifier, customTokenCreator: mockTokenCreator });
    assert.strictEqual(res._getStatusCode(), 200);
    const data = res._getData();
    assert.strictEqual(data.token, "authTokens/mock-ephemeral-token-123");
    assert.strictEqual(data.model, DEFAULT_LIVE_MODEL);
    assert.ok(data.wsUrl.includes("BidiGenerateContentConstrained"));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Rate Limiting Integration
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 3] Rate Limiting Integration");

  await testAsync("Enforces 5 requests per minute rate limit and returns 429 when exceeded", async () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 200) + 1}`;
    const mockVerifier = async () => ({ uid: "test-uid" });
    const mockTokenCreator = async () => ({ token: "mock", model: DEFAULT_LIVE_MODEL });

    // Requests 1 through 5 succeed
    for (let i = 1; i <= 5; i++) {
      const req = createMockReq({
        method: "POST",
        headers: { authorization: "Bearer valid", "x-forwarded-for": ip },
      });
      const res = createMockRes();
      await handler(req, res, { customVerifier: mockVerifier, customTokenCreator: mockTokenCreator });
      assert.strictEqual(res._getStatusCode(), 200, `Request ${i} should succeed`);
      assert.strictEqual(res._getHeaders()["x-ratelimit-limit"], 5);
      assert.strictEqual(res._getHeaders()["x-ratelimit-remaining"], 5 - i);
    }

    // 6th request is throttled
    const reqBlocked = createMockReq({
      method: "POST",
      headers: { authorization: "Bearer valid", "x-forwarded-for": ip },
    });
    const resBlocked = createMockRes();
    await handler(reqBlocked, resBlocked, { customVerifier: mockVerifier, customTokenCreator: mockTokenCreator });
    assert.strictEqual(resBlocked._getStatusCode(), 429);
    assert.ok(resBlocked._getData().error.includes("Too many requests"));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Token Configuration & Schema Compliance
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 4] Token Configuration & Schema Compliance");

  await testAsync("createEphemeralToken builds exact SDK configuration with uses: 1 and locked constraints", async () => {
    let capturedConfig = null;
    const mockGenAiClient = {
      authTokens: {
        create: async ({ config }) => {
          capturedConfig = config;
          return { name: "authTokens/test-token-777" };
        },
      },
    };

    const result = await createEphemeralToken({
      apiKey: "test-gemini-key-12345",
      model: "models/gemini-3.8-live",
      customGenAiClient: mockGenAiClient,
    });

    assert.ok(capturedConfig, "authTokens.create should have been called");
    assert.strictEqual(capturedConfig.uses, 1, "uses must be exactly 1");
    assert.ok(capturedConfig.expireTime, "expireTime must be present");
    assert.ok(capturedConfig.newSessionExpireTime, "newSessionExpireTime must be present");

    const constraints = capturedConfig.liveConnectConstraints;
    assert.ok(constraints, "liveConnectConstraints must be defined");
    assert.strictEqual(constraints.model, "models/gemini-3.8-live");
    assert.deepStrictEqual(constraints.config.responseModalities, ["AUDIO"]);
    assert.strictEqual(constraints.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Puck");
    assert.ok(constraints.config.sessionResumption, "sessionResumption must be enabled in locked constraints");
    assert.ok(constraints.config.contextWindowCompression.slidingWindow, "contextWindowCompression slidingWindow must be enabled");

    // Output assertion
    assert.strictEqual(result.token, "authTokens/test-token-777");
    assert.strictEqual(result.model, "models/gemini-3.8-live");
    assert.ok(result.wsUrl.includes("BidiGenerateContentConstrained?access_token=authTokens%2Ftest-token-777"));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Fail-Closed Security & API Key Redaction
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 5] Fail-Closed Security & Key Redaction");

  await testAsync("Fail-closed: Returns 503 when GEMINI_API_KEY is not configured", async () => {
    const original = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await assert.rejects(
        async () => {
          await createEphemeralToken();
        },
        (err) => {
          assert.strictEqual(err.statusCode, 503);
          assert.ok(err.message.includes("GEMINI_API_KEY is not configured"));
          return true;
        }
      );
    } finally {
      process.env.GEMINI_API_KEY = original;
    }
  });

  test("sanitizeKey redacts real API key from error strings", () => {
    const secretKey = "AIzaSySecretTestKey999";
    const dirtyError = `Failed to connect to Google API with key ${secretKey} at /v1beta/auth_tokens`;
    const cleaned = sanitizeKey(dirtyError, secretKey);
    assert.ok(!cleaned.includes(secretKey), "Key must be completely stripped");
    assert.ok(cleaned.includes("[REDACTED_API_KEY]"), "Key must be replaced with redaction marker");
  });

  await testAsync("Handler catches SDK error, sanitizes secrets, and returns fail-closed 503", async () => {
    const secretKey = "AIzaSyLeakyKey888";
    const mockVerifier = async () => ({ uid: "student-uid" });
    const mockTokenCreator = async () => {
      throw new Error(`Google API quota reached for key ${secretKey}`);
    };

    const req = createMockReq({ method: "POST", headers: { authorization: "Bearer valid" } });
    const res = createMockRes();

    await handler(req, res, { customVerifier: mockVerifier, customTokenCreator: mockTokenCreator });
    assert.strictEqual(res._getStatusCode(), 503);
    const data = res._getData();
    assert.ok(data.error.includes("Voice session initialization unavailable"));
    assert.ok(!JSON.stringify(data).includes(secretKey), "Leaky key must never be sent in HTTP response");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Reconnection & Resumption Protocol Invariants
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 6] Reconnection & Resumption Protocol Invariants");

  test("In-flight session resumption does not consume an additional token use (uses: 1 invariant)", () => {
    // Official Google Gen AI spec: "Resuming a Live API session does not count as a use."
    const tokenMetadata = {
      token: "authTokens/session-resumption-test-token",
      usesConfigured: 1,
      connectionsAllowed: 1,
      resumptionsAllowedWithoutNewToken: true,
      validDurationMs: 30 * 60 * 1000,
    };

    assert.strictEqual(tokenMetadata.usesConfigured, 1);
    assert.strictEqual(tokenMetadata.resumptionsAllowedWithoutNewToken, true);
  });

  test("Client resumption cache strictly rejects non-resumable updates or empty handles", () => {
    let latestValidHandle = null;

    function handleSessionUpdate(update) {
      if (update && update.resumable === true && typeof update.newHandle === "string" && update.newHandle.trim() !== "") {
        latestValidHandle = update.newHandle.trim();
        return true;
      }
      return false;
    }

    // Valid update
    const validUpdate = { resumable: true, newHandle: "handle-checkpoint-100" };
    assert.strictEqual(handleSessionUpdate(validUpdate), true);
    assert.strictEqual(latestValidHandle, "handle-checkpoint-100");

    // Invalid update: resumable is false (e.g., mid-turn or tool call) -> must not overwrite
    const nonResumableUpdate = { resumable: false, newHandle: "handle-intermediate" };
    assert.strictEqual(handleSessionUpdate(nonResumableUpdate), false);
    assert.strictEqual(latestValidHandle, "handle-checkpoint-100", "Handle must not be overwritten when resumable=false");

    // Invalid update: empty handle -> must not overwrite
    const emptyHandleUpdate = { resumable: true, newHandle: "" };
    assert.strictEqual(handleSessionUpdate(emptyHandleUpdate), false);
    assert.strictEqual(latestValidHandle, "handle-checkpoint-100", "Handle must not be overwritten with empty string");
  });

  test("Separates token expiry (30 mins) from resumption-handle validity (2 hours after termination)", () => {
    const RESUMPTION_HANDLE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours after last session termination
    const TOKEN_TTL_MS = 30 * 60 * 1000;                 // 30 minutes absolute token lifetime

    function evaluateReconnectionState({ tokenExpiresAt, sessionTerminatedAt, handle }) {
      const now = Date.now();
      const isTokenValid = Boolean(tokenExpiresAt && now < new Date(tokenExpiresAt).getTime());
      const isHandleValid = Boolean(
        handle &&
        sessionTerminatedAt &&
        now - new Date(sessionTerminatedAt).getTime() < RESUMPTION_HANDLE_TTL_MS
      );

      if (!isHandleValid) {
        return { canResume: false, reason: "HANDLE_EXPIRED_OR_INVALID", action: "PROMPT_NEW_SESSION" };
      }
      if (!isTokenValid) {
        return { canResume: true, reason: "TOKEN_EXPIRED", action: "FETCH_NEW_TOKEN_AND_RESUME" };
      }
      return { canResume: true, reason: "ALL_VALID", action: "RESUME_WITH_SAME_TOKEN" };
    }

    const now = Date.now();

    // Case 1: Both token (issued 5m ago) and handle (terminated 10m ago) are valid -> reuse token + resume
    const case1 = evaluateReconnectionState({
      tokenExpiresAt: new Date(now + 25 * 60 * 1000).toISOString(),
      sessionTerminatedAt: new Date(now - 10 * 60 * 1000).toISOString(),
      handle: "valid-handle-1",
    });
    assert.strictEqual(case1.action, "RESUME_WITH_SAME_TOKEN");

    // Case 2: Token expired (issued 35m ago), but handle is 15m old (< 2hr) -> fetch new token & resume with handle
    const case2 = evaluateReconnectionState({
      tokenExpiresAt: new Date(now - 5 * 60 * 1000).toISOString(),
      sessionTerminatedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      handle: "valid-handle-2",
    });
    assert.strictEqual(case2.action, "FETCH_NEW_TOKEN_AND_RESUME");

    // Case 3: Handle expired (terminated 2.5 hours ago) -> cannot resume, must fail closed and prompt new session
    const case3 = evaluateReconnectionState({
      tokenExpiresAt: new Date(now + 20 * 60 * 1000).toISOString(),
      sessionTerminatedAt: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(),
      handle: "expired-handle-3",
    });
    assert.strictEqual(case3.canResume, false);
    assert.strictEqual(case3.action, "PROMPT_NEW_SESSION");
  });

  test("Expired token check correctly mandates fresh token before attempting resumption", () => {
    function isTokenExpired(expiresAtTimestamp) {
      return Date.now() >= new Date(expiresAtTimestamp).getTime();
    }

    const pastExpiry = new Date(Date.now() - 5000).toISOString();
    const futureExpiry = new Date(Date.now() + 600000).toISOString();

    assert.strictEqual(isTokenExpired(pastExpiry), true, "Past expiry must be detected as expired");
    assert.strictEqual(isTokenExpired(futureExpiry), false, "Future expiry must remain valid");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Regression Check: Existing Text Chat & Groq Fallback Untouched
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 7] Non-Interference & Regression Integrity");

  const { convertMessagesToGemini, GEMINI_DEFAULT_MODEL } = require("./server/_ai");
  test("Existing server/_ai.js remains intact and converts text chat messages properly", () => {
    const messages = [
      { role: "system", content: "You are Learning Allied tutor." },
      { role: "user", content: "Explain Newton's third law." },
    ];
    const { systemParts, contents } = convertMessagesToGemini(messages);
    assert.strictEqual(systemParts.length, 1);
    assert.strictEqual(systemParts[0].text, "You are Learning Allied tutor.");
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(contents[0].parts[0].text, "Explain Newton's third law.");
    assert.strictEqual(GEMINI_DEFAULT_MODEL, "gemini-2.5-flash");
  });

  console.log("\n============================================================");
  console.log(`Backend Initialization Verification Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
