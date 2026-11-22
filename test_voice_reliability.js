// test_voice_reliability.js
// Automated Reliability & Resilience Verification Test Suite for Step 7: Gemini Live Voice.
// Tests:
// 1. Unexpected WebSocket closure & automated session resumption.
// 2. Fail-closed handling when server rejects session resumption.
// 3. GoAway warning handling before session closure.
// 4. Token expiration vs resumption handle expiration (2-hour ceiling).
// 5. Hardware microphone disconnection during an active call.
// 6. Barge-in acoustic noise filter: Rejects background noise & isolated clicks while supporting fast onset.
// 7. Tab visibility change & automatic AudioContext resumption.
// 8. Stale callback immunity across rapid start/stop cycles.
// 9. Absolute resource cleanup across all failure paths.
// 10. Sensitive credential redaction in errors and logs.
// 11. Regression check on text chat and Groq fallback.

const assert = require("assert");

// DOM Element Mock
class MockDOMElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.id = "";
    this._className = "";
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach((c) => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach((c) => this.classList._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c),
    };
    this.attributes = {};
    this.children = [];
    this.textContent = "";
    this.disabled = false;
    this.listeners = {};
    this.style = {};
  }
  get className() {
    return Array.from(this.classList._classes).join(" ");
  }
  set className(val) {
    this._className = val || "";
    this.classList._classes = new Set(this._className.split(/\s+/).filter(Boolean));
  }
  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }
  getAttribute(name) {
    return this.attributes[name] || null;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }
  dispatchEvent(event) {
    const type = typeof event === "string" ? event : event.type;
    const fns = this.listeners[type] || [];
    for (const fn of fns) {
      fn(typeof event === "string" ? { type: event, target: this } : event);
    }
  }
  click() {
    this.dispatchEvent("click");
  }
  appendChild(child) {
    this.children.push(child);
    if (child.id) mockDoc.registerElement(child.id, child);
    return child;
  }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
    this.head = new MockDOMElement("head");
    this.body = new MockDOMElement("body");
    this.visibilityState = "visible";
    this.listeners = {};
  }
  createElement(tag) {
    return new MockDOMElement(tag);
  }
  getElementById(id) {
    return this.elements.get(id) || null;
  }
  registerElement(id, el) {
    el.id = id;
    this.elements.set(id, el);
    return el;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }
  dispatchDocEvent(type) {
    const fns = this.listeners[type] || [];
    for (const fn of fns) fn({ type });
  }
}

// Mock Web Audio Context
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.audioWorklet = {
      addModule: async () => true,
    };
  }
  async resume() {
    this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
  createBuffer(channels, length, sampleRate) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    const source = {
      buffer: null,
      stopped: false,
      onended: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {
        source.stopped = true;
        if (source.onended) source.onended();
      },
    };
    return source;
  }
  createMediaStreamSource() {
    return { connect: () => {}, disconnect: () => {} };
  }
  get destination() {
    return {};
  }
}

class MockWorkletNode {
  constructor() {
    this.port = {
      onmessage: null,
      postMessage: () => {},
    };
  }
  connect() {}
  disconnect() {}
}

class MockMediaStreamTrack {
  constructor() {
    this.enabled = true;
    this.readyState = "live";
    this.onended = null;
  }
  stop() {
    this.readyState = "ended";
  }
}

class MockMediaStream {
  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks;
  }
}

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
      setTimeout(() => {
        this._emit("message", { data: JSON.stringify({ setupComplete: {} }) });
      }, 5);
    }, 5);
  }

  addEventListener(event, fn) {
    if (this.listeners[event]) this.listeners[event].push(fn);
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
    this.readyState = 3;
    this._emit("close", { code, reason });
  }

  _emit(event, data) {
    const handlers = this.listeners[event] ? [...this.listeners[event]] : [];
    for (const h of handlers) {
      h(data);
    }
  }
}

const mockDoc = new MockDocument();
global.document = mockDoc;

delete global.navigator;
const mockNavigator = {
  mediaDevices: {
    getUserMedia: async () => new MockMediaStream(),
  },
};
global.navigator = mockNavigator;

global.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  AudioWorkletNode: MockWorkletNode,
  navigator: mockNavigator,
  document: mockDoc,
  WebSocket: MockWebSocket,
};
global.AudioWorkletNode = MockWorkletNode;
global.WebSocket = MockWebSocket;
global.btoa = (str) => Buffer.from(str, "binary").toString("base64");
global.atob = (b64) => Buffer.from(b64, "base64").toString("binary");

async function runTests() {
  console.log("=== STEP 7 VERIFICATION: CONVERSATION RELIABILITY ===");

  const { VoiceSessionCoordinator } = await import("./vanilla/voice/voice-session.js");
  const { GeminiLiveClient, sanitizeSensitive } = await import("./vanilla/voice/live-client.js");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  const standardWsUrl = "wss://generativelanguage.googleapis.com/ws/BidiGenerateContentConstrained?access_token=secret-token-12345";
  global.fetch = async (url) => {
    if (url.includes("/api/voice-session")) {
      return {
        ok: true,
        json: async () => ({
          token: "secret-token-12345",
          wsUrl: standardWsUrl,
          constrainedEndpoint: standardWsUrl,
          model: "models/gemini-3.8-live",
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  // 1. Unexpected WebSocket Closure & Auto-Resumption
  await testAsync("Unexpected WebSocket closure triggers automatic resumption with latest handle", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Cache a valid resumption handle
    coordinator.liveClient._onMessage({
      data: JSON.stringify({
        sessionResumptionUpdate: {
          resumable: true,
          newHandle: "handle-xyz-777",
        },
      }),
    });
    assert.strictEqual(coordinator.liveClient.latestValidResumptionHandle, "handle-xyz-777");

    // Simulate unexpected abnormal closure (e.g. code 1006 connection drop)
    coordinator.liveClient.ws.close(1006, "Abnormal Disconnection");
    await new Promise((r) => setTimeout(r, 25));

    // Must be in connecting or reconnected state using resumption handle
    assert.ok(coordinator.liveClient.isAttemptingResumption, "Must attempt resumption with cached handle");

    await coordinator.stop();
  });

  // 2. Session Resumption Rejection (Fail-Closed)
  await testAsync("Server rejecting resumption handle fails closed without starting untracked session", async () => {
    let capturedError = null;
    const coordinator = new VoiceSessionCoordinator({
      onStateChange: (state, details) => {
        if (state === "error") capturedError = details;
      },
    });

    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    coordinator.liveClient.latestValidResumptionHandle = "invalid-handle-404";
    coordinator.liveClient.sessionTerminatedAt = Date.now();
    coordinator.liveClient.disconnect();

    // Reconnect with resume
    coordinator.liveClient.connect({ resume: true });

    // Server sends error rejecting handle
    coordinator.liveClient._onMessage({
      data: JSON.stringify({
        error: {
          code: 400,
          message: "Session resumption handle expired or invalid",
        },
      }),
    });

    assert.strictEqual(coordinator.state, "error", "Must transition to error state on rejection");
    assert.strictEqual(coordinator.liveClient.latestValidResumptionHandle, null, "Invalid handle must be purged");
    assert.ok(capturedError.message.includes("Unable to resume"), "Must show clear resumption failure message");

    await coordinator.stop();
  });

  // 3. GoAway Warning Notification
  await testAsync("GoAway message emits session expiring warning without closing active call", async () => {
    let receivedWarning = null;
    const coordinator = new VoiceSessionCoordinator({
      onStateChange: (state, details) => {
        if (details.warning) receivedWarning = details;
      },
    });

    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    coordinator.liveClient._onMessage({
      data: JSON.stringify({
        goAway: { timeLeft: "15s" },
      }),
    });

    assert.ok(receivedWarning, "Must emit warning details");
    assert.strictEqual(receivedWarning.warning, "SESSION_EXPIRING");
    assert.ok(receivedWarning.message.includes("15s"), "Warning message must specify remaining time");
    assert.strictEqual(coordinator.state, "listening", "Session must remain active until server closes");

    await coordinator.stop();
  });

  // 4. Token Expiration vs Resumption Handle Expiration (2 Hours)
  await testAsync("Reconnection checks 2-hour handle validity and 30-min token validity separately", async () => {
    const client = new GeminiLiveClient({
      sessionProvider: async () => ({
        token: "tok",
        wsUrl: standardWsUrl,
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
      }),
    });

    client.latestValidResumptionHandle = "valid-h";
    client.sessionTerminatedAt = Date.now() - (2 * 60 * 60 * 1000 + 10000); // 2 hours and 10 seconds ago

    let errorRaised = null;
    client.onError = (err) => { errorRaised = err; };

    await client.connect({ resume: true });
    assert.strictEqual(errorRaised.code, "RESUMPTION_HANDLE_EXPIRED", "Expired handle (>2 hrs) must be rejected");

    client.disconnect();
  });

  // 5. Hardware Microphone Disconnection During Active Call
  await testAsync("Hardware microphone disconnection transitions to error and halts session", async () => {
    let capturedError = null;
    const coordinator = new VoiceSessionCoordinator({
      onStateChange: (state, details) => {
        if (state === "error") capturedError = details;
      },
    });

    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Simulate mic cable unplug or hardware stop
    const track = coordinator.audioInput.mediaStream.getAudioTracks()[0];
    track.onended();
    await new Promise((r) => setTimeout(r, 25));

    assert.strictEqual(coordinator.state, "error", "State must be error after hardware disconnection");
    assert.strictEqual(capturedError.code, "DEVICE_DISCONNECTED");
    assert.ok(capturedError.message.includes("Microphone was disconnected"));
    assert.strictEqual(coordinator.audioInput, null, "AudioInput resources must be released");

    await coordinator.stop();
  });

  // 6. Barge-in Noise Filter & Fast Onset
  await testAsync("Acoustic filter rejects low-energy room noise while triggering on sustained speech or loud onset", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Playback active
    coordinator.liveClient.onServerContent({
      parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: Buffer.alloc(4800).toString("base64") } }],
    });
    await new Promise((r) => setTimeout(r, 15));
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true);

    // Test 6a: Low background noise (RMS ~1000) -> Must NOT interrupt
    const noisePcm = new Int16Array(1600);
    noisePcm.fill(1000);
    coordinator.audioInput.workletNode.port.onmessage({
      data: { event: "chunk", buffer: noisePcm.buffer, samples: 1600, sampleRate: 16000 },
    });
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true, "Low noise must not interrupt playback");

    // Test 6b: Single isolated transient click (RMS ~2500 for 1 chunk only) -> Must NOT interrupt
    const clickPcm = new Int16Array(1600);
    clickPcm.fill(2500);
    coordinator.audioInput.workletNode.port.onmessage({
      data: { event: "chunk", buffer: clickPcm.buffer, samples: 1600, sampleRate: 16000 },
    });
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true, "Single transient click must not interrupt playback");

    // Test 6c: Sustained speech chunk 2 (RMS ~2500) -> MUST interrupt
    coordinator.audioInput.workletNode.port.onmessage({
      data: { event: "chunk", buffer: clickPcm.buffer, samples: 1600, sampleRate: 16000 },
    });
    assert.strictEqual(coordinator.audioPlayback.isPlaying, false, "Sustained speech must trigger barge-in");

    // Test 6d: Fast onset loud speech (RMS > 4500 on 1st chunk) -> MUST interrupt immediately
    coordinator.liveClient.onServerContent({
      parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: Buffer.alloc(4800).toString("base64") } }],
    });
    await new Promise((r) => setTimeout(r, 15));
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true);

    const loudPcm = new Int16Array(1600);
    loudPcm.fill(5000);
    coordinator.audioInput.workletNode.port.onmessage({
      data: { event: "chunk", buffer: loudPcm.buffer, samples: 1600, sampleRate: 16000 },
    });
    assert.strictEqual(coordinator.audioPlayback.isPlaying, false, "Loud speech onset must trigger instant barge-in");

    await coordinator.stop();
  });

  // 7. Tab Visibility Change & AudioContext Resumption
  await testAsync("Tab visibility change resumes suspended AudioContext during active session", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Simulate tab backgrounding: AudioContext becomes suspended
    coordinator.audioContext.state = "suspended";
    assert.strictEqual(coordinator.audioContext.state, "suspended");

    // Simulate user returning to tab (visibilityState = visible)
    mockDoc.visibilityState = "visible";
    mockDoc.dispatchDocEvent("visibilitychange");
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(coordinator.audioContext.state, "running", "AudioContext must resume on tab return");

    await coordinator.stop();
  });

  // 8. Stale Callback Immunity Across Rapid Start/Stop Cycles
  await testAsync("Stale callbacks from previous sessions do not mutate subsequent sessions", async () => {
    const states = [];
    const coordinator = new VoiceSessionCoordinator({
      onStateChange: (state) => states.push(state),
    });

    await coordinator.start();
    const oldClient = coordinator.liveClient;

    // Immediately stop session 1
    await coordinator.stop();
    assert.strictEqual(coordinator.state, "idle");

    // Stale delayed serverContent event from old client arrives
    oldClient.onServerContent({
      parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: Buffer.alloc(4800).toString("base64") } }],
    });

    // Must still be idle (stale callback rejected by session ID)
    assert.strictEqual(coordinator.state, "idle", "Coordinator must remain idle when stale callback arrives");
  });

  // 9. Resource Teardown Across Failure Paths
  await testAsync("Failure during connection cleanly releases all allocated resources", async () => {
    global.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "Temporary service outage" }),
    });

    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();

    assert.strictEqual(coordinator.state, "error");
    assert.strictEqual(coordinator.audioInput, null);
    assert.strictEqual(coordinator.audioPlayback, null);
    assert.strictEqual(coordinator.liveClient, null);
    assert.strictEqual(coordinator.audioContext, null);
  });

  // 10. Credential Redaction in Errors & Logs
  test("Sensitive tokens and API keys are redacted from logs and error strings", () => {
    const leakyString = "WebSocket connection to wss://example.com?access_token=AIzaSyLeaky12345&foo=bar with Bearer ya29.a0AfH6SM... failed";
    const safeString = sanitizeSensitive(leakyString);

    assert.ok(!safeString.includes("AIzaSyLeaky12345"), "Must redact API key");
    assert.ok(!safeString.includes("ya29.a0AfH6SM"), "Must redact Bearer token");
    assert.ok(safeString.includes("access_token=[REDACTED]"), "Must redact access_token parameter");
  });

  // 11. Regression Check: Existing Text Chat & Groq Fallback
  test("Regression: Core chat files remain completely intact and uncoupled", () => {
    const fs = require("fs");
    assert.ok(fs.existsSync("server/_ai.js"));
    assert.ok(fs.existsSync("server/groq-proxy.js"));
    assert.ok(fs.existsSync("server/tutor.js"));

    const groqProxy = fs.readFileSync("server/groq-proxy.js", "utf8");
    assert.ok(!groqProxy.includes("voice-session"));

    const ai = fs.readFileSync("server/_ai.js", "utf8");
    assert.ok(!ai.includes("voice-session"));
  });

  console.log(`\n=== STEP 7 RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
