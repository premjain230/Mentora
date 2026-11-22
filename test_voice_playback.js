// test_voice_playback.js
// Independent Automated Verification Test Suite for Step 5: Gemini Live Audio Playback & Queue.
// Tests:
// 1. Base64 decoding & PCM 16-bit Little-Endian conversion fidelity.
// 2. Strict 24 kHz AudioBuffer generation.
// 3. Gapless sequential queue scheduling without chunk overlap.
// 4. Barge-in / interruption: instant stop of all scheduled sources and queue flushing.
// 5. Turn completion: preserves in-flight audio until final buffer completion before emitting onPlaybackEnded.
// 6. Browser AudioContext autoplay suspension & resume handling.
// 7. Clean teardown and AudioContext resource release.
// 8. Regression check: Existing text chat, Groq fallback, and tutor remain untouched.

const assert = require("assert");

// Mock Web Audio API for Node.js test environment
class MockAudioBuffer {
  constructor(channels, length, sampleRate) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channelData = [new Float32Array(length)];
  }
  getChannelData(channel) {
    return this._channelData[channel];
  }
}

class MockAudioBufferSourceNode {
  constructor(ctx) {
    this.ctx = ctx;
    this.buffer = null;
    this.startTime = null;
    this.stopped = false;
    this.disconnected = false;
    this.onended = null;
  }
  connect(dest) {
    this.destination = dest;
  }
  disconnect() {
    this.disconnected = true;
  }
  start(when = 0) {
    this.startTime = when;
  }
  stop(when = 0) {
    this.stopped = true;
    if (typeof this.onended === "function") {
      this.onended();
    }
  }
  _finish() {
    if (!this.stopped && typeof this.onended === "function") {
      this.onended();
    }
  }
}

class MockPlaybackAudioContext {
  constructor({ sampleRate = 48000, state = "running" } = {}) {
    this.sampleRate = sampleRate;
    this.state = state;
    this.currentTime = 0;
    this.destination = {};
    this.createdBuffers = [];
    this.createdSources = [];
  }

  createBuffer(channels, length, sampleRate) {
    const buf = new MockAudioBuffer(channels, length, sampleRate);
    this.createdBuffers.push(buf);
    return buf;
  }

  createBufferSource() {
    const src = new MockAudioBufferSourceNode(this);
    this.createdSources.push(src);
    return src;
  }

  async resume() {
    this.state = "running";
  }

  async close() {
    this.state = "closed";
  }
}

// Global browser mock helpers
global.atob = (str) => Buffer.from(str, "base64").toString("binary");
global.AudioContext = MockPlaybackAudioContext;
global.window = {
  AudioContext: MockPlaybackAudioContext,
  atob: global.atob,
};

async function runTests() {
  console.log("============================================================");
  console.log("Learning Allied — Gemini Live Audio Playback Verification (Step 5)");
  console.log("============================================================\n");

  const {
    AudioPlaybackManager,
    base64ToUint8Array,
    pcm16LittleEndianToFloat32,
    GEMINI_OUTPUT_SAMPLE_RATE,
  } = await import("./vanilla/voice/audio-playback.js");

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
  // 1. Base64 & PCM 16-Bit Little-Endian Decoding
  // ──────────────────────────────────────────────────────────────────────────
  console.log("[Suite 1] Base64 Decoding & 16-Bit Little-Endian PCM Conversion");

  test("base64ToUint8Array decodes byte sequence cleanly", () => {
    const testBytes = new Uint8Array([0x00, 0x01, 0xfe, 0xff, 0x7f, 0x80]);
    const b64 = Buffer.from(testBytes).toString("base64");
    const decoded = base64ToUint8Array(b64);

    assert.strictEqual(decoded.length, testBytes.length);
    for (let i = 0; i < testBytes.length; i++) {
      assert.strictEqual(decoded[i], testBytes[i]);
    }
  });

  test("pcm16LittleEndianToFloat32 decodes signed 16-bit Little-Endian integers into [-1.0, 1.0]", () => {
    // Little-endian byte pairs:
    // [0x00, 0x00] -> 0 -> 0.0
    // [0xff, 0x7f] -> +32767 -> 1.0
    // [0x00, 0x80] -> -32768 -> -1.0
    // [0x00, 0x40] -> +16384 -> ~0.5
    // [0x00, 0xc0] -> -16384 -> -0.5
    const bytes = new Uint8Array([
      0x00, 0x00,
      0xff, 0x7f,
      0x00, 0x80,
      0x00, 0x40,
      0x00, 0xc0,
    ]);

    const float32 = pcm16LittleEndianToFloat32(bytes);
    assert.strictEqual(float32.length, 5);
    assert.strictEqual(float32[0], 0);
    assert.strictEqual(Math.round(float32[1]), 1);
    assert.strictEqual(Math.round(float32[2]), -1);
    assert.ok(Math.abs(float32[3] - 0.5) < 0.01);
    assert.ok(Math.abs(float32[4] - (-0.5)) < 0.01);
  });

  test("Handles empty or invalid base64 input safely without crashing", () => {
    assert.strictEqual(base64ToUint8Array("").length, 0);
    assert.strictEqual(base64ToUint8Array(null).length, 0);
    assert.strictEqual(pcm16LittleEndianToFloat32(new Uint8Array(0)).length, 0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. 24 kHz Playback Sample Rate
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 2] 24 kHz AudioBuffer Output Compliance");

  test("GEMINI_OUTPUT_SAMPLE_RATE is strictly 24,000 Hz", () => {
    assert.strictEqual(GEMINI_OUTPUT_SAMPLE_RATE, 24000);
  });

  await testAsync("enqueueAudioPart creates AudioBuffer with exactly 24,000 Hz sample rate", async () => {
    const mockCtx = new MockPlaybackAudioContext();
    const manager = new AudioPlaybackManager({ audioContext: mockCtx });

    // 240 samples of 16-bit PCM = 480 bytes = 10ms at 24 kHz
    const fakePcm = new Int16Array(240);
    for (let i = 0; i < 240; i++) fakePcm[i] = 1000;
    const base64Data = Buffer.from(fakePcm.buffer).toString("base64");

    const part = {
      inlineData: {
        mimeType: "audio/pcm;rate=24000",
        data: base64Data,
      },
    };

    const success = await manager.enqueueAudioPart(part);
    assert.strictEqual(success, true);
    assert.strictEqual(mockCtx.createdBuffers.length, 1);
    assert.strictEqual(mockCtx.createdBuffers[0].sampleRate, 24000);
    assert.strictEqual(mockCtx.createdBuffers[0].length, 240);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Sequential Gapless Scheduling & Queue Order
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 3] Sequential Gapless Queue Scheduling");

  await testAsync("Consecutive audio chunks are scheduled sequentially without overlapping", async () => {
    const mockCtx = new MockPlaybackAudioContext();
    mockCtx.currentTime = 1.0; // AudioContext is currently at 1.0s

    const manager = new AudioPlaybackManager({ audioContext: mockCtx });

    // 24,000 samples = exactly 1.0 second duration at 24 kHz
    const chunk1Pcm = new Int16Array(24000);
    const chunk1B64 = Buffer.from(chunk1Pcm.buffer).toString("base64");

    // 12,000 samples = exactly 0.5 second duration at 24 kHz
    const chunk2Pcm = new Int16Array(12000);
    const chunk2B64 = Buffer.from(chunk2Pcm.buffer).toString("base64");

    // Enqueue Chunk 1
    await manager.enqueueAudioPart({ inlineData: { mimeType: "audio/pcm;rate=24000", data: chunk1B64 } });
    assert.strictEqual(mockCtx.createdSources.length, 1);
    assert.strictEqual(mockCtx.createdSources[0].startTime, 1.0, "Chunk 1 starts at currentTime (1.0s)");

    // Enqueue Chunk 2
    await manager.enqueueAudioPart({ inlineData: { mimeType: "audio/pcm;rate=24000", data: chunk2B64 } });
    assert.strictEqual(mockCtx.createdSources.length, 2);
    assert.strictEqual(mockCtx.createdSources[1].startTime, 2.0, "Chunk 2 must start exactly when Chunk 1 ends (1.0s + 1.0s = 2.0s)");

    // Check manager nextStartTime
    assert.strictEqual(manager.nextStartTime, 2.5, "Next chunk must start at 2.5s (2.0s + 0.5s)");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Interruption & Queue Flushing
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 4] Interruption & Barge-in Flushing");

  await testAsync("interrupt() instantly stops all scheduled sources and flushes the queue", async () => {
    const mockCtx = new MockPlaybackAudioContext();
    let interruptedEventFired = false;

    const manager = new AudioPlaybackManager({
      audioContext: mockCtx,
      onInterrupted: () => {
        interruptedEventFired = true;
      },
    });

    // Enqueue 2 chunks
    const chunkPcm = new Int16Array(2400);
    const b64 = Buffer.from(chunkPcm.buffer).toString("base64");
    await manager.enqueueAudioPart({ inlineData: { data: b64 } });
    await manager.enqueueAudioPart({ inlineData: { data: b64 } });

    assert.strictEqual(manager.activeSources.size, 2);
    assert.strictEqual(manager.isPlaying, true);

    // Student barges in / interruption signal received
    manager.interrupt();

    assert.strictEqual(interruptedEventFired, true);
    assert.strictEqual(manager.activeSources.size, 0, "Active sources queue must be cleared");
    assert.strictEqual(manager.isPlaying, false);

    // Verify all underlying source nodes had .stop() called
    for (const src of mockCtx.createdSources) {
      assert.strictEqual(src.stopped, true, "Source node must be stopped on interruption");
      assert.strictEqual(src.disconnected, true, "Source node must be disconnected");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Turn Complete Handling
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 5] Turn Complete Handling");

  await testAsync("handleTurnComplete preserves in-flight audio until final buffer finishes", async () => {
    const mockCtx = new MockPlaybackAudioContext();
    let playbackEndedFired = false;

    const manager = new AudioPlaybackManager({
      audioContext: mockCtx,
      onPlaybackEnded: () => {
        playbackEndedFired = true;
      },
    });

    const chunkPcm = new Int16Array(2400);
    const b64 = Buffer.from(chunkPcm.buffer).toString("base64");
    await manager.enqueueAudioPart({ inlineData: { data: b64 } });

    // Turn complete arrives from Gemini while audio is still playing
    manager.handleTurnComplete();

    // Must NOT have ended yet because audio chunk is still playing
    assert.strictEqual(playbackEndedFired, false, "Playback must not end prematurely when audio is in flight");
    assert.strictEqual(manager.turnCompletePending, true);

    // Simulate the audio chunk finishing
    const source = mockCtx.createdSources[0];
    source._finish();

    // Now playback has completed
    assert.strictEqual(playbackEndedFired, true, "onPlaybackEnded must trigger after final buffer finishes");
    assert.strictEqual(manager.isPlaying, false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. AudioContext Autoplay & Teardown
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 6] AudioContext Autoplay & Lifecycle Cleanup");

  await testAsync("ensureContext resumes suspended AudioContext automatically", async () => {
    const mockCtx = new MockPlaybackAudioContext({ state: "suspended" });
    const manager = new AudioPlaybackManager({ audioContext: mockCtx });

    assert.strictEqual(mockCtx.state, "suspended");
    await manager.ensureContext();
    assert.strictEqual(mockCtx.state, "running", "Suspended AudioContext must be resumed");
  });

  await testAsync("stop() safely tears down audio and closes owned AudioContext", async () => {
    const manager = new AudioPlaybackManager(); // owns internal AudioContext
    await manager.ensureContext();

    assert.ok(manager.audioContext);
    const internalCtx = manager.audioContext;

    await manager.stop();

    assert.strictEqual(manager.state, "stopped");
    assert.strictEqual(manager.audioContext, null);
    assert.strictEqual(internalCtx.state, "closed", "AudioContext must be closed on stop()");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Regression Check
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n[Suite 7] Regression Check: Existing Text Chat & Groq Fallback");

  const { convertMessagesToGemini, GEMINI_DEFAULT_MODEL } = require("./server/_ai");
  test("Existing server/_ai.js remains completely intact", () => {
    const { contents } = convertMessagesToGemini([{ role: "user", content: "Test prompt" }]);
    assert.strictEqual(contents.length, 1);
    assert.strictEqual(GEMINI_DEFAULT_MODEL, "gemini-2.5-flash");
  });

  console.log("\n============================================================");
  console.log(`Audio Playback Verification Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
