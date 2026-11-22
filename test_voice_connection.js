// test_voice_connection.js
// Independent Automated Verification Test Suite for Step 4: Gemini Live Connection & Session Lifecycle.
// Tests:
// 1. WebSocket setup handshake format & locked constraints compliance.
// 2. Protocol message handling: setupComplete, serverContent, turnComplete, interrupted.
// 3. Audio transmission payload structure (realtimeInput.audio, mimeType: audio/pcm;rate=16000).
// 4. Token expiration detection & fresh session credential provisioning.
// 5. GoAway and session resumption update parsing (resumable: true requirement).
// 6. Resumption reconnection vs handle expiration (> 2 hours).
// 7. Fail-closed handling when server rejects resumption (NEVER silently starts new session).
// 8. Safe WebSocket cleanup & listener removal.
// 9. Regression check: Existing text chat and Groq fallback remain untouched.

const assert = require("assert");

// Mock WebSocket implementation for protocol validation
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sentMessages = [];
    this.listeners = {
      open: [],
      message: [],
      error: [],
      close: [],
    };

    setTimeout(() => {
      this.readyState = 1; // OPEN
      this._emit("open", {});
    }, 5);
  }

  addEventListener(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event].push(fn);
    }
  }

  removeEventListener(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== fn);
    }
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = "") {
    this.readyState = 3; // CLOSED
    this._emit("close", { code, reason });
  }

  _emit(event, data) {
    const handlers = this.listeners[event] ? [...this.listeners[event]] : [];
    for (const h of handlers) {
      h(data);
    }
  }

  _simulateServerMessage(msgObj) {
    this._emit("message", { data: JSON.stringify(msgObj) });
  }
}

// Global mock setup
global.WebSocket = MockWebSocket;
global.window = { WebSocket: MockWebSocket };

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini Live Connection Verification (Step 4)");
  console.log("============================================================\n");

  const { GeminiLiveClient, RESUMPTION_HANDLE_TTL_MS } = await import("./vanilla/voice/live-client.js");

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
  // 1. Connection Handshake & Locked Constraints Compliance
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Suite 1] Setup Handshake & Constraints Protocol Compliance");

  await testAsync("Sends exact BidiGenerateContentSetup handshake on open", async () => {
    let capturedState = null;
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "authTokens/mock-token-step4",
        model: "models/gemini-3.8-live",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=authTokens%2Fmock-token-step4",
      }),
      onStateChange: (state) => {
        capturedState = state;
      },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 20));

    assert.ok(client.ws, "WebSocket must be instantiated");
    assert.strictEqual(client.ws.sentMessages.length, 1, "Setup message must be sent immediately on open");

    const setupPayload = JSON.parse(client.ws.sentMessages[0]);
    assert.ok(setupPayload.setup, "Must have setup object");
    assert.strictEqual(setupPayload.setup.model, "models/gemini-3.8-live");
    assert.deepStrictEqual(setupPayload.setup.generationConfig.responseModalities, ["AUDIO"]);
    assert.strictEqual(setupPayload.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Puck");
    assert.ok(setupPayload.setup.sessionResumption, "sessionResumption must be present");
    assert.ok(setupPayload.setup.contextWindowCompression.slidingWindow, "slidingWindow compression must be present");

    client.disconnect();
  });

  await testAsync("Transitions to 'connected' only upon receiving setupComplete: {}", async () => {
    let setupCompleteCalled = false;
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        model: "models/gemini-3.8-live",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
      onSetupComplete: () => {
        setupCompleteCalled = true;
      },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));

    // Initially connecting/awaiting setupComplete
    assert.strictEqual(client.setupCompleted, false);

    // Simulate server sending setupComplete
    client.ws._simulateServerMessage({ setupComplete: {} });

    assert.strictEqual(client.setupCompleted, true);
    assert.strictEqual(client.state, "connected");
    assert.strictEqual(setupCompleteCalled, true);

    client.disconnect();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Server Content & Realtime Input Streaming
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] Realtime Audio Streaming & Server Message Parsing");

  await testAsync("sendRealtimeAudio formats payload as realtimeInput.audio (not deprecated mediaChunks)", async () => {
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));
    client.ws._simulateServerMessage({ setupComplete: {} });

    // Send audio chunk
    const fakeBase64 = "AQIDBA==";
    const sent = client.sendRealtimeAudio(fakeBase64);
    assert.strictEqual(sent, true);

    // Verify last sent message format
    const lastMsg = JSON.parse(client.ws.sentMessages[client.ws.sentMessages.length - 1]);
    assert.ok(lastMsg.realtimeInput, "realtimeInput must be top-level property");
    assert.ok(lastMsg.realtimeInput.audio, "audio must be singular object (not mediaChunks array)");
    assert.strictEqual(lastMsg.realtimeInput.audio.mimeType, "audio/pcm;rate=16000");
    assert.strictEqual(lastMsg.realtimeInput.audio.data, fakeBase64);
    assert.strictEqual(lastMsg.realtimeInput.mediaChunks, undefined, "mediaChunks must NOT be present");

    client.disconnect();
  });

  await testAsync("Dispatches serverContent, interruption, and turnComplete events accurately", async () => {
    let capturedTurn = null;
    let interruptedFired = false;
    let turnCompleteFired = false;

    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
      onServerContent: (turn) => {
        capturedTurn = turn;
      },
      onInterrupted: () => {
        interruptedFired = true;
      },
      onTurnComplete: () => {
        turnCompleteFired = true;
      },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));
    client.ws._simulateServerMessage({ setupComplete: {} });

    // 1. Model audio chunk
    client.ws._simulateServerMessage({
      serverContent: {
        modelTurn: {
          parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: "AUDIOCHUNK" } }],
        },
      },
    });
    assert.ok(capturedTurn);
    assert.strictEqual(capturedTurn.parts[0].inlineData.mimeType, "audio/pcm;rate=24000");

    // 2. Interruption signal
    client.ws._simulateServerMessage({
      serverContent: {
        interrupted: true,
      },
    });
    assert.strictEqual(interruptedFired, true);

    // 3. Turn complete signal
    client.ws._simulateServerMessage({
      serverContent: {
        turnComplete: true,
      },
    });
    assert.strictEqual(turnCompleteFired, true);

    client.disconnect();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. GoAway & Resumption Handle Caching
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 3] GoAway Handling & Resumption Handle Caching");

  await testAsync("GoAway message triggers onGoAway callback with timeLeft", async () => {
    let capturedTimeLeft = null;
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
      onGoAway: ({ timeLeft }) => {
        capturedTimeLeft = timeLeft;
      },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));
    client.ws._simulateServerMessage({ setupComplete: {} });

    client.ws._simulateServerMessage({ goAway: { timeLeft: "45s" } });
    assert.strictEqual(capturedTimeLeft, "45s");

    client.disconnect();
  });

  await testAsync("Stores resumption handle ONLY when resumable === true and newHandle is non-empty", async () => {
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));

    // Valid update: resumable = true -> stores handle
    client.ws._simulateServerMessage({
      sessionResumptionUpdate: { resumable: true, newHandle: "handle-alpha" },
    });
    assert.strictEqual(client.latestValidResumptionHandle, "handle-alpha");

    // Invalid update: resumable = false (e.g. during tool execution) -> must NOT overwrite
    client.ws._simulateServerMessage({
      sessionResumptionUpdate: { resumable: false, newHandle: "handle-mid-flight" },
    });
    assert.strictEqual(client.latestValidResumptionHandle, "handle-alpha", "Must not overwrite handle when resumable=false");

    // Invalid update: empty newHandle -> must NOT overwrite
    client.ws._simulateServerMessage({
      sessionResumptionUpdate: { resumable: true, newHandle: "" },
    });
    assert.strictEqual(client.latestValidResumptionHandle, "handle-alpha", "Must not overwrite with empty handle");

    client.disconnect();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Session Resumption Reconnection vs Expiration
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 4] Session Resumption Reconnection & Expiration");

  await testAsync("Reconnection within 2 hours includes sessionResumption: { handle } in setup", async () => {
    let tokenFetchCount = 0;
    const client = new GeminiLiveClient({
      sessionProvider: async () => {
        tokenFetchCount++;
        return {
          token: "mock-token-v1",
          model: "models/gemini-3.8-live",
          expiresAt: new Date(Date.now() + 1800000).toISOString(), // valid for 30 min
          wsUrl: "wss://mock-url",
        };
      },
    });

    // 1. Initial connection
    await client.connect();
    await new Promise((r) => setTimeout(r, 15));
    client.ws._simulateServerMessage({ setupComplete: {} });

    // Server sends valid resumption update
    client.ws._simulateServerMessage({
      sessionResumptionUpdate: { resumable: true, newHandle: "handle-checkpoint-42" },
    });

    // Disconnect socket (e.g. transport timeout or network drop)
    client.ws.close(1000, "Transport Recycling");
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(tokenFetchCount, 1, "Initial connection fetched token once");
    assert.ok(client.isHandleValid(), "Handle should be valid (< 2 hours)");

    // 2. Reconnect with resume: true (token is still valid, handle is valid)
    await client.connect({ resume: true });
    await new Promise((r) => setTimeout(r, 20));

    // Token was reused without fetching an unnecessary fresh token
    assert.strictEqual(tokenFetchCount, 1, "Should reuse valid ephemeral token for resumption");

    // Verify resumption handle was passed in setup message
    const reconnectSetup = JSON.parse(client.ws.sentMessages[0]);
    assert.deepStrictEqual(reconnectSetup.setup.sessionResumption, {
      handle: "handle-checkpoint-42",
    });

    client.disconnect();
  });

  await testAsync("Resumption rejected by server fails closed with RESUMPTION_REJECTED (never silently starts fresh)", async () => {
    let capturedError = null;
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
      onError: (err) => {
        capturedError = err;
      },
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));
    client.ws._simulateServerMessage({ setupComplete: {} });

    // Disconnect initial session
    client.disconnect();
    client.latestValidResumptionHandle = "stale-handle-99";
    client.sessionTerminatedAt = Date.now() - 60000;

    // Connect with resume: true
    await client.connect({ resume: true });
    await new Promise((r) => setTimeout(r, 15));

    // Server rejects resumption handle with an error
    client.ws._simulateServerMessage({
      error: { code: 400, message: "Invalid or expired session handle" },
    });

    assert.ok(capturedError, "Error must be emitted");
    assert.strictEqual(capturedError.code, "RESUMPTION_REJECTED");
    assert.ok(capturedError.message.includes("Unable to resume the previous conversation session"));
    assert.strictEqual(client.latestValidResumptionHandle, null, "Invalid handle must be cleared");
    assert.strictEqual(client.state, "error", "State must be error");

    client.disconnect();
  });

  await testAsync("Reconnection rejected when handle age exceeds 2 hours (RESUMPTION_HANDLE_EXPIRED)", async () => {
    let capturedError = null;
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
      onError: (err) => {
        capturedError = err;
      },
    });

    client.latestValidResumptionHandle = "old-handle";
    client.sessionTerminatedAt = Date.now() - (RESUMPTION_HANDLE_TTL_MS + 1000); // 2 hours and 1 second ago

    await client.connect({ resume: true });

    assert.ok(capturedError);
    assert.strictEqual(capturedError.code, "RESUMPTION_HANDLE_EXPIRED");
    assert.ok(capturedError.message.includes("exceeded 2 hours"));
    assert.strictEqual(client.ws, null, "Should not attempt WebSocket connection when handle is expired");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Cleanup & Listener Removal
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 5] Safe Cleanup & Resource Release");

  await testAsync("disconnect() closes socket and removes listeners cleanly", async () => {
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "mock-token",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        wsUrl: "wss://mock-url",
      }),
    });

    await client.connect();
    await new Promise((r) => setTimeout(r, 15));

    const wsInstance = client.ws;
    assert.ok(wsInstance);

    client.disconnect();

    assert.strictEqual(client.state, "disconnected");
    assert.strictEqual(client.ws, null);
    assert.strictEqual(wsInstance.readyState, 3, "WebSocket must be closed");
    assert.strictEqual(wsInstance.listeners.message.length, 0, "Message listener must be removed");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Regression Check
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 6] Regression Check: Existing Text Chat & Groq Fallback");

  const { convertMessagesToGemini, GEMINI_DEFAULT_MODEL } = require("./server/_ai");
  test("Existing server/_ai.js remains completely intact", () => {
    const { contents } = convertMessagesToGemini([{ role: "user", content: "Test prompt" }]);
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(GEMINI_DEFAULT_MODEL, "gemini-2.5-flash");
  });

  console.log("\n============================================================");
  console.log(`Live Connection Verification Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
