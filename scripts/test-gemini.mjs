#!/usr/bin/env node

/**
 * Standalone Gemini API Connection Verification Script
 * 
 * Verifies connection to Google's official Gemini API.
 * Reads:
 *   - process.env.GEMINI_API_KEY
 *   - process.env.GEMINI_MODEL (defaults to "gemini-2.5-flash")
 * 
 * Features:
 *   - 25-second request timeout with AbortSignal
 *   - Comprehensive network & HTTP error reporting
 *   - Model ID validation with official model hints
 *   - Safe redaction of API keys from all output
 *   - Response latency display
 *   - Detection of Vercel CLI "[SENSITIVE]" placeholders
 */

import fs from "node:fs";

// Load .env.local or .env if present for local convenience (Node 20.6+)
for (const envPath of [".env.local", ".env"]) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore parse/read errors and continue with existing process.env
    }
  }
}

const rawApiKey = (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "").replace(/^["']|["']$/g, "");
const rawModel = (process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : "").replace(/^["']|["']$/g, "");
const model = (!rawModel || rawModel === "[SENSITIVE]") ? "gemini-2.5-flash" : rawModel;
const prompt = "Explain photosynthesis in two simple sentences for a Class 9 student.";
const REQUEST_TIMEOUT_MS = 25000;

function sanitize(text) {
  if (!text || typeof text !== "string") return text;
  if (!rawApiKey) return text;
  return text.split(rawApiKey).join("[REDACTED_API_KEY]");
}

async function runConnectionTest() {
  console.log("==================================================");
  console.log("         GEMINI API CONNECTION VERIFICATION       ");
  console.log("==================================================");
  console.log(`Node.js Version : ${process.version}`);
  console.log(`Target Model    : ${model}`);
  
  const isPlaceholder = rawApiKey === "[SENSITIVE]";
  const keyDisplay = !rawApiKey
    ? "MISSING"
    : isPlaceholder
    ? "PLACEHOLDER [SENSITIVE] (from Vercel pull)"
    : `Configured (${rawApiKey.length} characters)`;
  console.log(`API Key Status  : ${keyDisplay}`);
  console.log(`Request Timeout : ${REQUEST_TIMEOUT_MS / 1000}s`);
  console.log(`Prompt          : "${prompt}"`);
  console.log("--------------------------------------------------");

  if (!rawApiKey) {
    console.error("\nRESULT: FAIL");
    console.error("Error: GEMINI_API_KEY environment variable is not set.");
    console.error("Please export GEMINI_API_KEY in your environment or define it in .env.local.");
    console.error("Example (PowerShell): $env:GEMINI_API_KEY=\"your_api_key_here\"");
    console.error("Example (Bash):       export GEMINI_API_KEY=\"your_api_key_here\"");
    console.log("==================================================");
    process.exit(1);
  }

  if (isPlaceholder) {
    console.error("\nRESULT: FAIL");
    console.error("Error: GEMINI_API_KEY is currently set to '[SENSITIVE]'.");
    console.error("Explanation: When pulling environment variables from Vercel CLI, secret values");
    console.error("are replaced with '[SENSITIVE]' placeholders. Vercel never writes actual secrets locally.");
    console.error("To test Gemini API locally, set your real API key in the shell or .env.local:");
    console.error("  $env:GEMINI_API_KEY=\"AIzaSy...\"");
    console.log("==================================================");
    process.exit(1);
  }

  if (model === "gemini-3.8-flash") {
    console.warn("Notice: 'gemini-3.8-flash' was specified. While this appears in some Google product UI presets,");
    console.warn("the official Google Gemini API model IDs are typically 'gemini-2.5-flash', 'gemini-2.0-flash',");
    console.warn("or 'gemini-1.5-flash'. Proceeding to test with configured model ID...");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  console.log(`Sending request to Google Gemini API (timeout ${REQUEST_TIMEOUT_MS / 1000}s)...`);
  const startTime = Date.now();

  let response;
  let latencyMs = 0;
  let responseBodyText = "";

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": rawApiKey,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    latencyMs = Date.now() - startTime;
    responseBodyText = await response.text();
  } catch (networkError) {
    latencyMs = Date.now() - startTime;
    const isTimeout = networkError?.name === "TimeoutError" || networkError?.name === "AbortError";
    console.error("\nRESULT: FAIL");
    console.error(`Response Status : ${isTimeout ? "Request Timeout" : "Network / Connection Error"}`);
    console.error(`Latency         : ${latencyMs}ms`);
    console.error(
      `Error Details   : ${
        isTimeout
          ? `Request timed out after ${REQUEST_TIMEOUT_MS}ms. The Google Gemini API endpoint did not respond in time.`
          : sanitize(networkError?.message || String(networkError))
      }`
    );
    console.log("==================================================");
    process.exit(1);
  }

  let parsedData = null;
  try {
    parsedData = JSON.parse(responseBodyText);
  } catch {
    parsedData = null;
  }

  const statusDisplay = `${response.status} ${response.statusText || ""}`.trim();
  console.log(`Response Status : ${statusDisplay}`);
  console.log(`Latency         : ${latencyMs}ms`);

  if (!response.ok) {
    const errorMsg = parsedData?.error?.message || sanitize(responseBodyText) || statusDisplay;
    const errorCode = parsedData?.error?.status || response.status;

    console.error("\nRESULT: FAIL");
    console.error(`Model ID        : ${model}`);
    console.error(`Error Code      : ${errorCode}`);
    console.error(`Error Message   : ${sanitize(errorMsg)}`);

    if (response.status === 404) {
      console.error("\nModel Availability Note:");
      console.error(`The model '${model}' was not found on generativelanguage.googleapis.com.`);
      console.error("Official available Gemini API models for text generation include:");
      console.error("  - gemini-2.5-flash (recommended high-efficiency model)");
      console.error("  - gemini-2.0-flash");
      console.error("  - gemini-1.5-flash");
      console.error("To test with gemini-2.5-flash, run with $env:GEMINI_MODEL=\"gemini-2.5-flash\"");
    }

    console.log("==================================================");
    process.exit(1);
  }

  // Extract generated text
  const candidate = parsedData?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const returnedText = Array.isArray(parts)
    ? parts.map((p) => p.text).filter(Boolean).join("\n").trim()
    : "";

  const returnedModelId = parsedData?.modelVersion || model;

  console.log(`Model ID        : ${returnedModelId}`);
  console.log("--------------------------------------------------");
  console.log("Returned Text   :");
  console.log(returnedText || "(No text content in response)");
  console.log("--------------------------------------------------");
  console.log("\nRESULT: PASS");
  console.log("Gemini API connection and response generation successful.");
  console.log("==================================================");
  process.exit(0);
}

runConnectionTest();
