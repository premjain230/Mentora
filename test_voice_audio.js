// test_voice_audio.js
// Independent Automated Verification Test Suite for Step 3: Audio Input & Worklet Pipeline.
// Tests:
// 1. AudioWorklet resampling accuracy across native rates (48kHz -> 16kHz, 44.1kHz -> 16kHz, 16kHz -> 16kHz).
// 2. Signed 16-bit Little-Endian PCM integer conversion & clamping.
// 3. Exact chunk sizing (1,600 samples / 3,200 bytes = 100ms at 16 kHz).
// 4. Base64 encoding fidelity.
// 5. AudioInputManager state machine and permission denial handling.
// 6. Device disconnection and hardware track release.
// 7. Non-interference regression check.

const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Mock browser global environment for Node.js unit testing of AudioInputManager
function setupBrowserMock({
  permissionAllowed = true,
  deviceFound = true,
  deviceBusy = false,
  sampleRate = 48000,
} = {}) {
  const tracks = [
    {
      kind: "audio",
      enabled: true,
      stopped: false,
      onended: null,
      stop() {
        this.stopped = true;
      },
    },
  ];

  const mediaStream = {
    getAudioTracks: () => tracks,
    getTracks: () => tracks,
  };

  class MockAudioNode {
    constructor() {
      this.connectedTo = null;
      this.disconnected = false;
    }
    connect(target) {
      this.connectedTo = target;
    }
    disconnect() {
      this.disconnected = true;
      this.connectedTo = null;
    }
  }

  class MockAudioWorkletNode extends MockAudioNode {
    constructor(ctx, name) {
      super();
      this.ctx = ctx;
      this.name = name;
      this.port = {
        onmessage: null,
        postedMessages: [],
        postMessage(msg) {
          this.postedMessages.push(msg);
        },
      };
    }
  }

  class MockAudioContext {
    constructor() {
      this.sampleRate = sampleRate;
      this.state = "suspended";
      this.audioWorklet = {
        addedModules: [],
        addModule: async (url) => {
          this.audioWorklet.addedModules.push(url);
        },
      };
    }
    async resume() {
      this.state = "running";
    }
    async close() {
      this.state = "closed";
    }
    createMediaStreamSource(stream) {
      const node = new MockAudioNode();
      node.stream = stream;
      return node;
    }
  }

  global.AudioWorkletNode = MockAudioWorkletNode;
  global.window = {
    AudioContext: MockAudioContext,
    AudioWorkletNode: MockAudioWorkletNode,
    btoa: (str) => Buffer.from(str, "binary").toString("base64"),
  };

  global.navigator = {
    mediaDevices: {
      getUserMedia: async (constraints) => {
        if (!permissionAllowed) {
          const err = new Error("Permission denied by student");
          err.name = "NotAllowedError";
          throw err;
        }
        if (!deviceFound) {
          const err = new Error("No audio input device found");
          err.name = "NotFoundError";
          throw err;
        }
        if (deviceBusy) {
          const err = new Error("Track could not be started");
          err.name = "NotReadableError";
          throw err;
        }
        return mediaStream;
      },
    },
  };

  return { tracks, mediaStream };
}

function teardownBrowserMock() {
  delete global.AudioWorkletNode;
  delete global.window;
  delete global.navigator;
}

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini Live Audio Input Verification (Step 3)");
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
  // 1. AudioWorklet Processor File Integrity & Algorithm Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Suite 1] AudioWorklet File & Resampling Algorithm");

  test("public/audio-processor.js exists and is registered as 'gemini-audio-processor'", () => {
    const filePath = path.resolve(__dirname, "public/audio-processor.js");
    assert.ok(fs.existsSync(filePath), "public/audio-processor.js must exist");
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(content.includes("registerProcessor('gemini-audio-processor'") || content.includes('registerProcessor("gemini-audio-processor"'), "Processor must be registered");
    assert.ok(content.includes("targetSampleRate = 16000"), "Target rate must be 16000");
    assert.ok(content.includes("chunkSize = 1600"), "Chunk size must be 1600 samples");
  });

  // Verify the exact continuous linear interpolation downsampling logic standalone
  function simulateResampleAndEncode(inputFloat32, inputSampleRate) {
    const targetSampleRate = 16000;
    const ratio = inputSampleRate / targetSampleRate;
    const outputSamples = [];
    let phase = 0;
    const inputLength = inputFloat32.length;

    // Epsilon threshold to guard against IEEE 754 precision boundary drift
    while (phase + 1e-6 < inputLength) {
      const index = Math.floor(phase);
      const frac = phase - index;

      const s0 = inputFloat32[index];
      const s1 = index + 1 < inputLength ? inputFloat32[index + 1] : s0;
      const interpolated = s0 + frac * (s1 - s0);

      const clamped = Math.max(-1.0, Math.min(1.0, interpolated));
      const pcm16 = clamped < 0
        ? Math.max(-32768, Math.round(clamped * 32768))
        : Math.min(32767, Math.round(clamped * 32767));

      outputSamples.push(pcm16);
      phase += ratio;
    }
    return new Int16Array(outputSamples);
  }

  test("Resampling 48,000 Hz input down to 16,000 Hz achieves exact 3:1 ratio", () => {
    // 4,800 samples at 48kHz = 100ms. After 3:1 downsampling, should yield exactly 1,600 samples at 16kHz
    const input = new Float32Array(4800);
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((2 * Math.PI * 440 * i) / 48000); // 440 Hz test tone
    }

    const resampled = simulateResampleAndEncode(input, 48000);
    assert.strictEqual(resampled.length, 1600, "4800 samples at 48kHz must resample to exactly 1600 samples at 16kHz");
  });

  test("Resampling 44,100 Hz input down to 16,000 Hz yields proportional sample count", () => {
    // 4,410 samples at 44.1kHz = 100ms.
    const input = new Float32Array(4410);
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.sin((2 * Math.PI * 440 * i) / 44100);
    }

    const resampled = simulateResampleAndEncode(input, 44100);
    assert.strictEqual(resampled.length, 1600, "4410 samples at 44.1kHz must resample to 1600 samples");
  });

  test("16,000 Hz pass-through input maintains identical sample count 1:1", () => {
    const input = new Float32Array(1600);
    for (let i = 0; i < input.length; i++) {
      input[i] = 0.25;
    }

    const resampled = simulateResampleAndEncode(input, 16000);
    assert.strictEqual(resampled.length, 1600, "1600 samples at 16kHz must yield 1600 samples");
    assert.strictEqual(resampled[0], 8192);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Signed 16-Bit Little-Endian PCM Encoding & Clamping
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] Signed 16-Bit PCM Encoding & Clamping Limits");

  test("PCM conversion clamps out-of-bound float values [-1.0, 1.0] without integer overflow", () => {
    const extremeFloats = new Float32Array([1.5, -1.8, 1.0, -1.0, 0.0, 0.5, -0.5]);
    const encoded = simulateResampleAndEncode(extremeFloats, 16000);

    assert.strictEqual(encoded[0], 32767, "+1.5 must clamp to 32767");
    assert.strictEqual(encoded[1], -32768, "-1.8 must clamp to -32768");
    assert.strictEqual(encoded[2], 32767, "+1.0 must map to 32767");
    assert.strictEqual(encoded[3], -32768, "-1.0 must map to -32768");
    assert.strictEqual(encoded[4], 0, "0.0 must map to 0");
    assert.strictEqual(encoded[5], 16384, "+0.5 must map to ~16384");
    assert.strictEqual(encoded[6], -16384, "-0.5 must map to ~-16384");
  });

  test("Chunk byte length is exactly 3,200 bytes for 1,600 samples (16-bit / 2 bytes per sample)", () => {
    const chunk = new Int16Array(1600);
    assert.strictEqual(chunk.byteLength, 3200, "1,600 samples of 16-bit PCM must be exactly 3,200 bytes");
    assert.strictEqual(chunk.buffer.byteLength, 3200);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Base64 Serialization Compliance
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 3] Base64 Serialization Compliance");

  setupBrowserMock();
  const { AudioInputManager, arrayBufferToBase64 } = await import("./vanilla/voice/audio-input.js");

  test("arrayBufferToBase64 produces valid base64 matching Node.js Buffer output", () => {
    const pcm = new Int16Array([0, 1000, -1000, 32767, -32768]);
    const customB64 = arrayBufferToBase64(pcm.buffer);
    const expectedB64 = Buffer.from(pcm.buffer).toString("base64");
    assert.strictEqual(customB64, expectedB64, "Worklet base64 serializer must match standard base64 encoding");
  });

  teardownBrowserMock();

  // ──────────────────────────────────────────────────────────────────────────
  // 4. AudioInputManager Lifecycle & Permission Handling
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 4] AudioInputManager Lifecycle & Permissions");

  await testAsync("Explicit start(): Does NOT request mic permission before start() is called", async () => {
    setupBrowserMock();
    const manager = new AudioInputManager();
    assert.strictEqual(manager.state, "idle", "Initial state must be idle");
    assert.strictEqual(manager.audioContext, null, "AudioContext must be null before start");
    assert.strictEqual(manager.mediaStream, null, "MediaStream must be null before start");
    teardownBrowserMock();
  });

  await testAsync("Permission denial: Gracefully emits PERMISSION_DENIED and cleans up", async () => {
    setupBrowserMock({ permissionAllowed: false });

    let capturedError = null;
    const manager = new AudioInputManager({
      onError: (err) => {
        capturedError = err;
      },
    });

    await manager.start();

    assert.ok(capturedError, "onError should have been triggered");
    assert.strictEqual(capturedError.code, "PERMISSION_DENIED");
    assert.ok(capturedError.message.includes("Microphone access was denied"));
    assert.strictEqual(manager.state, "stopped", "Manager must clean up to stopped state on permission denial");

    teardownBrowserMock();
  });

  await testAsync("Missing device: Gracefully emits DEVICE_NOT_FOUND and cleans up", async () => {
    setupBrowserMock({ deviceFound: false });

    let capturedError = null;
    const manager = new AudioInputManager({
      onError: (err) => {
        capturedError = err;
      },
    });

    await manager.start();

    assert.ok(capturedError, "onError should have been triggered");
    assert.strictEqual(capturedError.code, "DEVICE_NOT_FOUND");
    assert.strictEqual(manager.state, "stopped");

    teardownBrowserMock();
  });

  await testAsync("Device busy: Gracefully emits DEVICE_BUSY and cleans up", async () => {
    setupBrowserMock({ deviceBusy: true });

    let capturedError = null;
    const manager = new AudioInputManager({
      onError: (err) => {
        capturedError = err;
      },
    });

    await manager.start();

    assert.ok(capturedError, "onError should have been triggered");
    assert.strictEqual(capturedError.code, "DEVICE_BUSY");
    assert.strictEqual(manager.state, "stopped");

    teardownBrowserMock();
  });

  await testAsync("Successful start, chunk streaming, and hardware track release on stop()", async () => {
    const { tracks } = setupBrowserMock();

    let emittedChunk = null;
    const stateTransitions = [];

    const manager = new AudioInputManager({
      onChunk: (chunk) => {
        emittedChunk = chunk;
      },
      onStateChange: (newState, oldState) => {
        stateTransitions.push(`${oldState}->${newState}`);
      },
    });

    await manager.start();

    assert.strictEqual(manager.state, "recording");
    assert.ok(stateTransitions.includes("idle->requesting_permission"));
    assert.ok(stateTransitions.includes("requesting_permission->recording"));

    // Simulate chunk message from worklet
    const testPcm = new Int16Array(1600);
    testPcm[0] = 500;
    manager.workletNode.port.onmessage({
      data: {
        event: "chunk",
        buffer: testPcm.buffer,
        samples: 1600,
        sampleRate: 16000,
      },
    });

    assert.ok(emittedChunk, "Chunk must be emitted to onChunk listener");
    assert.strictEqual(emittedChunk.samples, 1600);
    assert.strictEqual(emittedChunk.sampleRate, 16000);
    assert.strictEqual(emittedChunk.pcm16.length, 1600);
    assert.strictEqual(emittedChunk.buffer.byteLength, 3200);

    // Test mute & unmute
    manager.mute();
    assert.strictEqual(manager.state, "muted");
    assert.strictEqual(manager.isMuted(), true);
    assert.strictEqual(tracks[0].enabled, false, "Microphone track must be disabled when muted");

    manager.unmute();
    assert.strictEqual(manager.state, "recording");
    assert.strictEqual(manager.isMuted(), false);
    assert.strictEqual(tracks[0].enabled, true, "Microphone track must be enabled when unmuted");

    // Test stop() and track release
    await manager.stop();
    assert.strictEqual(manager.state, "stopped");
    assert.strictEqual(tracks[0].stopped, true, "Microphone hardware tracks must be stopped on stop()");
    assert.strictEqual(manager.audioContext, null, "AudioContext must be released");
    assert.strictEqual(manager.mediaStream, null, "MediaStream must be cleared");

    teardownBrowserMock();
  });

  await testAsync("Hardware device disconnection during active session triggers DEVICE_DISCONNECTED", async () => {
    const { tracks } = setupBrowserMock();

    let capturedError = null;
    const manager = new AudioInputManager({
      onError: (err) => {
        capturedError = err;
      },
    });

    await manager.start();
    assert.strictEqual(manager.state, "recording");

    // Simulate unplugging microphone while in session
    await tracks[0].onended();
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(capturedError);
    assert.strictEqual(capturedError.code, "DEVICE_DISCONNECTED");
    assert.strictEqual(manager.state, "stopped");

    teardownBrowserMock();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Non-Interference Check
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 5] Regression Check: Existing Text Chat & Groq Fallback");

  const { convertMessagesToGemini, GEMINI_DEFAULT_MODEL } = require("./server/_ai");
  test("Existing server/_ai.js remains completely intact", () => {
    const { contents } = convertMessagesToGemini([{ role: "user", content: "Test prompt" }]);
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(GEMINI_DEFAULT_MODEL, "gemini-3.8-flash");
  });

  console.log("\n============================================================");
  console.log(`Audio Input Verification Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
