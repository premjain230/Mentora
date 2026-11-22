"use strict";

/**
 * test_live_ai_providers.js
 * Safe live provider verification script for Gemini & Groq.
 * Uses .env.local credentials to verify live HTTP/SSE connections.
 * Completely redacts all secrets and keys.
 */

const fs = require("fs");
const path = require("path");

// Load .env.local if not already in process.env
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1];
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const ai = require("./server/_ai");

console.log("============================================================");
console.log("Learning Allied — Live AI Provider Verification Suite");
console.log("============================================================\n");

async function runLiveProviderTests() {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  console.log(`[Config] GEMINI_API_KEY configured: ${hasGemini}`);
  console.log(`[Config] GROQ_API_KEY configured:   ${hasGroq}\n`);

  if (!hasGemini && !hasGroq) {
    console.warn("No AI API keys configured. Skipping live network tests.");
    return;
  }

  // ── Test 1: Live Gemini completion ──
  if (hasGemini) {
    console.log("[Test 1] Testing live Gemini completion...");
    try {
      const metaOut = {};
      const response = await ai.geminiComplete({
        messages: [{ role: "user", content: "In exactly 5 words, state Newton's first law." }],
        temperature: 0.2,
        maxTokens: 50,
        metaOut,
      });
      console.log(`  ✓ Gemini response received (${response.trim()})`);
      console.log(`  ✓ Provider model: ${metaOut.model || "gemini"}`);
    } catch (err) {
      console.error(`  ✗ Gemini completion error: ${err.message}`);
    }
  }

  // ── Test 2: Live Groq completion ──
  if (hasGroq) {
    console.log("\n[Test 2] Testing live Groq completion...");
    try {
      const metaOut = {};
      const response = await ai.groqComplete({
        messages: [{ role: "user", content: "In exactly 5 words, what is velocity?" }],
        temperature: 0.2,
        maxTokens: 50,
        metaOut,
      });
      console.log(`  ✓ Groq response received (${response.trim()})`);
      console.log(`  ✓ Provider model: ${metaOut.model || "groq"}`);
    } catch (err) {
      console.error(`  ✗ Groq completion error: ${err.message}`);
    }
  }

  // ── Test 3: Live aiComplete (primary Gemini -> fallback Groq) ──
  console.log("\n[Test 3] Testing live aiComplete orchestrator...");
  try {
    const metaOut = {};
    const response = await ai.aiComplete({
      messages: [{ role: "user", content: "Solve: What is the SI unit of electric current? (1 word)" }],
      temperature: 0.1,
      maxTokens: 20,
      metaOut,
    });
    console.log(`  ✓ Orchestrator response received: "${response.trim()}"`);
    console.log(`  ✓ Routed to provider: ${metaOut.provider}, model: ${metaOut.model}`);
  } catch (err) {
    console.error(`  ✗ Orchestrator error: ${err.message}`);
  }

  // ── Test 4: Live aiStream (SSE chunk streaming) ──
  console.log("\n[Test 4] Testing live aiStream streaming...");
  try {
    let chunksCount = 0;
    let fullText = "";
    await ai.aiStream({
      messages: [{ role: "user", content: "Count from 1 to 3." }],
      temperature: 0.2,
      maxTokens: 30,
      onChunk: (chunk) => {
        chunksCount++;
        fullText += chunk;
      },
    });
    console.log(`  ✓ Stream completed with ${chunksCount} chunks`);
    console.log(`  ✓ Streamed output: "${fullText.trim()}"`);
  } catch (err) {
    console.error(`  ✗ aiStream error: ${err.message}`);
  }

  console.log("\n============================================================");
  console.log("LIVE AI PROVIDER VERIFICATION FINISHED!");
  console.log("============================================================\n");
}

runLiveProviderTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
