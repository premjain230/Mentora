// test_gemini_live_voice.js
// ─────────────────────────────────────────────────────────────
// Learning Allied — Automated Gemini Live Voice Mode Verification Suite
// ─────────────────────────────────────────────────────────────

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("============================================================");
console.log("Learning Allied — Gemini Live Voice Mode Verification");
console.log("============================================================");

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

async function asyncTest(name, fn) {
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

(async () => {
  // SUITE 1: Backend Ephemeral Token Service & Prompt Engineering
  console.log("\n[Suite 1] Ephemeral Token Provisioning & Context Socratic Prompt");

  const liveTokenModule = require("./server/live-token");

  test("live-token exports required functions", () => {
    assert(typeof liveTokenModule.liveTokenHandler === "function", "liveTokenHandler must be a function");
    assert(typeof liveTokenModule.createLiveVoiceToken === "function", "createLiveVoiceToken must be a function");
    assert(typeof liveTokenModule.checkAndIncrementVoiceSession === "function", "checkAndIncrementVoiceSession must be a function");
    assert(typeof liveTokenModule.buildVoiceTutorInstruction === "function", "buildVoiceTutorInstruction must be a function");
  });

  test("buildVoiceTutorInstruction integrates board, class, subject, and language", () => {
    const prompt = liveTokenModule.buildVoiceTutorInstruction({
      board: "CBSE",
      classNum: 10,
      subject: "Science - Electricity",
      language: "hi",
    });

    assert(prompt.includes("CBSE"), "must include board");
    assert(prompt.includes("10"), "must include classNum");
    assert(prompt.includes("Electricity"), "must include subject");
    assert(prompt.includes("Hindi"), "must configure spoken language");
    assert(prompt.includes("VOICE-SPECIFIC PEDAGOGICAL RULES"), "must enforce voice pedagogy");
    assert(prompt.includes("Conciseness is essential"), "must constrain spoken chunk length");
    assert(prompt.includes("Socratic"), "must require Socratic check questions");
  });

  await asyncTest("liveTokenHandler enforces authentication", async () => {
    let statusCode = 0;
    let jsonBody = null;

    const mockReq = {
      method: "POST",
      headers: {},
      url: "/api/live-token",
    };
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (data) => {
        jsonBody = data;
        return mockRes;
      },
    };

    await liveTokenModule.liveTokenHandler(mockReq, mockRes);
    assert.strictEqual(statusCode, 401, "unauthenticated request must return 401");
    assert(jsonBody && jsonBody.error, "must return error message");
  });

  // SUITE 2: Tutor Route Integration
  console.log("\n[Suite 2] Shared Tutor Endpoint Live Token Action");

  const tutorHandler = require("./server/tutor");

  await asyncTest("server/tutor rejects unauthenticated live-token action with 401", async () => {
    let statusCode = 0;
    let jsonBody = null;

    const mockReq = {
      method: "POST",
      headers: {},
      url: "/api/tutor",
      body: { action: "live-token" },
    };
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (data) => {
        jsonBody = data;
        return mockRes;
      },
    };

    await tutorHandler(mockReq, mockRes);
    assert.strictEqual(statusCode, 401, "unauthenticated request must return 401");
  });

  // SUITE 3: UI Architecture & Markup Verification
  console.log("\n[Suite 3] UI Architecture, Controls & Accessibility");

  const chatMarkup = fs.readFileSync(path.join(__dirname, "components/pages/chat/ChatMarkup.tsx"), "utf8");
  const chatCss = fs.readFileSync(path.join(__dirname, "css/pages/chat.css"), "utf8");
  const iconsSource = fs.readFileSync(path.join(__dirname, "vanilla/chat/icons.js"), "utf8");
  const chatController = fs.readFileSync(path.join(__dirname, "vanilla/chat.js"), "utf8");
  const voiceEngineSource = fs.readFileSync(path.join(__dirname, "vanilla/chat/voice-engine.js"), "utf8");

  test("ChatMarkup includes start voice button with accessible label", () => {
    assert(chatMarkup.includes('id="chatVoiceBtn"'), "missing #chatVoiceBtn");
    assert(chatMarkup.includes('aria-label="Start Voice Tutor"'), "missing aria-label on voice btn");
  });

  test("ChatMarkup includes complete live voice control bar and indicators", () => {
    assert(chatMarkup.includes('id="chatVoiceBar"'), "missing #chatVoiceBar");
    assert(chatMarkup.includes('id="chatVoiceStatus"'), "missing #chatVoiceStatus");
    assert(chatMarkup.includes('id="chatVoiceTranscript"'), "missing #chatVoiceTranscript");
    assert(chatMarkup.includes('id="chatVoiceInterrupt"'), "missing #chatVoiceInterrupt");
    assert(chatMarkup.includes('id="chatVoiceMute"'), "missing #chatVoiceMute");
    assert(chatMarkup.includes('id="chatVoiceEnd"'), "missing #chatVoiceEnd");
  });

  test("icons.js includes voice SVG geometry (mic, micOff, volume, phoneOff)", () => {
    assert(iconsSource.includes("mic:"), "missing mic icon");
    assert(iconsSource.includes("micOff:"), "missing micOff icon");
    assert(iconsSource.includes("volume:"), "missing volume icon");
    assert(iconsSource.includes("phoneOff:"), "missing phoneOff icon");
    assert(!/[\u{1F300}-\u{1FAFF}]/u.test(iconsSource), "icons must be SVG, no emojis");
  });

  test("chat.css includes full responsive styling and animations for voice mode", () => {
    assert(chatCss.includes(".page-chat .chat-voice-btn"), "missing .chat-voice-btn styles");
    assert(chatCss.includes(".page-chat .chat-voice-bar"), "missing .chat-voice-bar styles");
    assert(chatCss.includes("chatVoicePulse"), "missing voice pulse animation");
    assert(chatCss.includes("chatVoiceWave"), "missing voice wave animation");
  });

  test("vanilla/chat.js integrates voice engine with lifecycle and message persistence", () => {
    assert(chatController.includes("createVoiceEngine"), "chat must import createVoiceEngine");
    assert(chatController.includes("bindVoice"), "chat must call bindVoice");
    assert(chatController.includes("onTurnComplete"), "chat must handle onTurnComplete");
    assert(chatController.includes("saveChatMessage"), "voice turns must persist to chat store");
    assert(chatController.includes("app.endVoice"), "voice must be cleaned up on chat switch");
  });

  test("voice-engine.js implements GoogleGenAI Live connection, barge-in and audio cleanup", () => {
    assert(voiceEngineSource.includes('from "@google/genai"'), "voice engine must import @google/genai");
    assert(voiceEngineSource.includes("downsampleTo16k"), "voice engine must handle audio downsampling to 16kHz");
    assert(voiceEngineSource.includes("floatTo16BitPCM"), "voice engine must convert to 16-bit PCM");
    assert(voiceEngineSource.includes("stopPlayback"), "voice engine must implement barge-in/playback flush");
    assert(voiceEngineSource.includes("interrupted"), "voice engine must handle server interrupted signal");
    assert(voiceEngineSource.includes("getAudioTracks"), "voice engine must clean up microphone tracks on stop");
  });

  console.log("============================================================");
  console.log(`Live Voice Test Results: ${passed} passed, ${failed} failed`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  }
})();
