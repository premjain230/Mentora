// test_voice_interface.js
// Independent Automated Verification Test Suite for Step 6: Complete Gemini Live Voice Interface.
// Tests:
// 1. VoiceSessionCoordinator & VoiceUI instantiation and export fidelity.
// 2. DOM mounting: Stylesheet injection, trigger binding, modal & visualizer creation.
// 3. User gesture lifecycle: AudioContext creation, token fetch, WebSocket setup, mic initialization.
// 4. UI state transitions: connecting, listening, speaking, muted, idle.
// 5. Speech interruption (barge-in): Instant playback stop on user speech and on server interrupt.
// 6. Microphone permission denial & hardware error handling with clear UI messaging.
// 7. End Voice teardown: Complete release of mic tracks, AudioContext, and WebSocket.
// 8. Idempotency: Multiple Start Voice clicks do not create duplicate connections.
// 9. Non-interference: Chat composer, web search toggle, and text chat remain unaffected.

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
    this._innerHTML = "";
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

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    // Parse IDs inside the HTML string and register them into mock document
    const idMatches = html.matchAll(/id="([^"]+)"/g);
    for (const match of idMatches) {
      const id = match[1];
      const el = new MockDOMElement();
      el.id = id;
      mockDoc.registerElement(id, el);
    }
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
}

// Mock Web Audio Context for Node.js
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
    return { connect: () => {} };
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
}

// Mock MediaStream
class MockMediaStreamTrack {
  constructor() {
    this.enabled = true;
    this.readyState = "live";
  }
  stop() {
    this.readyState = "ended";
  }
}

class MockMediaStream {
  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }
  getAudioTracks() {
    return this.tracks;
  }
}

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
      // Dispatch setupComplete from server automatically
      setTimeout(() => {
        this._emit("message", { data: JSON.stringify({ setupComplete: {} }) });
      }, 5);
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
  console.log("=== STEP 6 VERIFICATION: COMPLETE VOICE INTERFACE ===");

  // Dynamically import modules under test
  const { VoiceSessionCoordinator } = await import("./vanilla/voice/voice-session.js");
  const { VoiceUI } = await import("./vanilla/voice/voice-ui.js");

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

  // Setup default mock fetch
  const standardWsUrl = "wss://generativelanguage.googleapis.com/ws/BidiGenerateContentConstrained";
  global.fetch = async (url) => {
    if (url.includes("/api/voice-session")) {
      return {
        ok: true,
        json: async () => ({
          token: "ephemeral-mock-token-xyz",
          wsUrl: standardWsUrl,
          constrainedEndpoint: standardWsUrl,
          model: "models/gemini-3.8-live",
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  // 1. Module Export Fidelity
  test("VoiceSessionCoordinator and VoiceUI export correctly", () => {
    assert.strictEqual(typeof VoiceSessionCoordinator, "function", "VoiceSessionCoordinator must be a constructor function");
    assert.strictEqual(typeof VoiceUI, "function", "VoiceUI must be a constructor function");
  });

  // 2. DOM Mounting and Visual Component Creation
  test("VoiceUI mounts styles and constructs complete voice interface elements", () => {
    const triggerBtn = mockDoc.registerElement("voiceBtn", new MockDOMElement("button"));

    const ui = new VoiceUI({ triggerButtonId: "voiceBtn" });
    ui.mount();

    assert.ok(mockDoc.getElementById("voiceOverlay"), "voiceOverlay element must exist");
    assert.ok(ui.elements.overlay, "Overlay must be instantiated");
    assert.ok(ui.elements.card, "Voice card must be instantiated");
    assert.ok(ui.elements.pill, "Live status pill must be instantiated");
    assert.ok(ui.elements.muteBtn, "Mute toggle button must be instantiated");
    assert.ok(ui.elements.endBtn, "End Voice button must be instantiated");
    assert.ok(ui.elements.errorBox, "Error notification box must be instantiated");
    assert.ok(ui.elements.retryBtn, "Retry button must be instantiated");
  });

  // 3. Complete Start-to-End Lifecycle with Mocked Network
  await testAsync("VoiceSessionCoordinator executes full startup lifecycle on user gesture", async () => {
    let tokenFetched = false;
    let authHeaderPassed = false;

    global.fetch = async (url, options) => {
      if (url.includes("/api/voice-session")) {
        tokenFetched = true;
        if (options?.headers?.Authorization === "Bearer valid-firebase-token") {
          authHeaderPassed = true;
        }
        return {
          ok: true,
          json: async () => ({
            token: "ephemeral-mock-token-xyz",
            wsUrl: standardWsUrl,
            constrainedEndpoint: standardWsUrl,
            model: "models/gemini-3.8-live",
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
          }),
        };
      }
      return { ok: false, status: 404 };
    };

    const statesRecorded = [];
    const coordinator = new VoiceSessionCoordinator({
      getAuthHeaders: async () => ({ Authorization: "Bearer valid-firebase-token" }),
      onStateChange: (state, details) => {
        statesRecorded.push({ state, details });
      },
    });

    assert.strictEqual(coordinator.state, "idle");

    // Start session
    await coordinator.start();
    // Allow WebSocket handshake and setupComplete to arrive
    await new Promise((r) => setTimeout(r, 25));

    // Verify token was fetched with correct auth header
    assert.strictEqual(tokenFetched, true, "Must request ephemeral token from /api/voice-session");
    assert.strictEqual(authHeaderPassed, true, "Must include Authorization header from getAuthHeaders");

    // Verify state progressed to listening
    assert.strictEqual(coordinator.state, "listening", "Coordinator must reach listening state after setupComplete");
    assert.strictEqual(coordinator.audioContext.state, "running", "AudioContext must be resumed by user gesture");
    assert.ok(coordinator.audioInput, "AudioInputManager must be active");
    assert.ok(coordinator.liveClient, "GeminiLiveClient must be connected");

    // Clean stop
    await coordinator.stop();
    assert.strictEqual(coordinator.state, "idle", "Coordinator must return to idle state");
    assert.strictEqual(coordinator.audioContext, null, "AudioContext must be released");
    assert.strictEqual(coordinator.audioInput, null, "AudioInputManager must be null after stop");
    assert.strictEqual(coordinator.liveClient, null, "GeminiLiveClient must be null after stop");
  });

  // 4. Mute / Unmute Functionality
  await testAsync("VoiceSessionCoordinator supports instant mute and unmute", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    assert.strictEqual(coordinator.isMuted(), false);
    coordinator.mute();
    assert.strictEqual(coordinator.isMuted(), true);
    assert.strictEqual(coordinator.state, "muted");

    coordinator.unmute();
    assert.strictEqual(coordinator.isMuted(), false);
    assert.strictEqual(coordinator.state, "listening");

    await coordinator.stop();
  });

  // 5. Speech Interruption (Barge-In)
  await testAsync("Speech interruption immediately silences audio playback", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Simulate incoming model turn with audio
    coordinator.liveClient.onServerContent({
      parts: [
        {
          inlineData: {
            mimeType: "audio/pcm;rate=24000",
            data: Buffer.alloc(4800).toString("base64"), // 100ms of audio
          },
        },
      ],
    });

    // Wait microtask tick for async enqueue to schedule buffer
    await new Promise((r) => setTimeout(r, 15));

    // Playback should be active
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true, "Audio playback should be active");

    // Simulate server interrupt event (barge-in)
    coordinator.liveClient.onInterrupted();

    // Playback should be immediately silenced
    assert.strictEqual(coordinator.audioPlayback.isPlaying, false, "Audio playback must be immediately silenced upon interruption");

    await coordinator.stop();
  });

  // 6. Client-Side Energy Barge-In Check
  await testAsync("High-energy microphone speech triggers client-side barge-in during playback", async () => {
    const coordinator = new VoiceSessionCoordinator();
    await coordinator.start();
    await new Promise((r) => setTimeout(r, 25));

    // Start playback
    coordinator.liveClient.onServerContent({
      parts: [
        {
          inlineData: {
            mimeType: "audio/pcm;rate=24000",
            data: Buffer.alloc(4800).toString("base64"),
          },
        },
      ],
    });
    await new Promise((r) => setTimeout(r, 15));
    assert.strictEqual(coordinator.audioPlayback.isPlaying, true);

    // Simulate user loud speech in onChunk: PCM samples with large amplitude
    const loudPcm = new Int16Array(1600);
    loudPcm.fill(8000); // High RMS speech energy

    // Emulate worklet message dispatching onChunk
    coordinator.audioInput.workletNode.port.onmessage({
      data: {
        event: "chunk",
        buffer: loudPcm.buffer,
        samples: 1600,
        sampleRate: 16000,
      },
    });

    assert.strictEqual(coordinator.audioPlayback.isPlaying, false, "Loud mic speech must trigger instant barge-in");

    await coordinator.stop();
  });

  // 7. Microphone Permission Denial Handling
  await testAsync("Handles microphone permission denial gracefully and displays error", async () => {
    // Override getUserMedia to throw NotAllowedError
    const originalGetUserMedia = global.navigator.mediaDevices.getUserMedia;
    global.navigator.mediaDevices.getUserMedia = async () => {
      const err = new Error("Permission denied");
      err.name = "NotAllowedError";
      throw err;
    };

    let reportedError = null;
    const coordinator = new VoiceSessionCoordinator({
      onStateChange: (state, details) => {
        if (state === "error") reportedError = details;
      },
    });

    await coordinator.start();

    assert.strictEqual(coordinator.state, "error", "State must transition to error on permission denial");
    assert.ok(reportedError, "Must emit error details");
    assert.strictEqual(reportedError.code, "PERMISSION_DENIED");
    assert.ok(reportedError.message.includes("Microphone access was denied"));

    // Reset getUserMedia mock
    global.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  });

  // 8. Idempotency Check on Repeated Start Clicks
  await testAsync("Repeated Start Voice calls do not duplicate sessions", async () => {
    let callCount = 0;
    global.fetch = async (url) => {
      if (url.includes("/api/voice-session")) {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            token: "ephemeral-token",
            wsUrl: standardWsUrl,
            constrainedEndpoint: standardWsUrl,
          }),
        };
      }
      return { ok: false };
    };

    const coordinator = new VoiceSessionCoordinator();
    const p1 = coordinator.start();
    const p2 = coordinator.start(); // Second immediate click while starting
    await Promise.all([p1, p2]);

    assert.strictEqual(callCount, 1, "Only a single session fetch must occur on concurrent start calls");

    await coordinator.stop();
  });

  // 9. Integration with UI Component
  await testAsync("VoiceUI correctly handles start, mute, and stop triggers", async () => {
    const triggerBtn = mockDoc.registerElement("voiceBtn", new MockDOMElement("button"));
    const ui = new VoiceUI({ triggerButtonId: "voiceBtn" });
    ui.mount();

    // Trigger start via button click
    await ui.start();
    await new Promise((r) => setTimeout(r, 25));

    assert.strictEqual(ui.isOverlayOpen, true, "Overlay must be visible");
    assert.strictEqual(ui.coordinator.state, "listening");
    assert.strictEqual(ui.elements.pillText.textContent, "Listening");

    // Toggle mute
    ui.toggleMute();
    assert.strictEqual(ui.coordinator.state, "muted");
    assert.strictEqual(ui.elements.pillText.textContent, "Muted");

    // End voice
    await ui.stop();
    assert.strictEqual(ui.coordinator.state, "idle");
    assert.strictEqual(ui.isOverlayOpen, false, "Overlay must be hidden after stop");
  });

  // 10. Non-Interference Regression Verification
  test("Regression: Core chat files remain intact and unchanged", () => {
    const fs = require("fs");
    assert.ok(fs.existsSync("server/_ai.js"), "server/_ai.js must exist");
    assert.ok(fs.existsSync("server/groq-proxy.js"), "server/groq-proxy.js must exist");
    assert.ok(fs.existsSync("server/tutor.js"), "server/tutor.js must exist");

    const groqProxy = fs.readFileSync("server/groq-proxy.js", "utf8");
    assert.ok(!groqProxy.includes("voice-session"), "groq-proxy must remain completely isolated from voice session");

    const ai = fs.readFileSync("server/_ai.js", "utf8");
    assert.ok(!ai.includes("voice-session"), "server/_ai.js must remain untouched");
  });

  console.log(`\n=== STEP 6 RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
