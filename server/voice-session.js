// server/voice-session.js
// Dedicated backend handler for Learning Allied Gemini Live Voice session initialization.
//
// Responsibilities:
// 1. Verify user authentication via Firebase ID Token (Bearer token).
// 2. Enforce strict rate limiting to prevent token generation abuse.
// 3. Provision a short-lived ephemeral token using the official Google Gen AI SDK (@google/genai).
// 4. Lock down session constraints (model, audio modality, voice, system prompt, session resumption, context compression).
// 5. Fail closed if ephemeral credentials cannot be provisioned.
// 6. NEVER expose the permanent GEMINI_API_KEY to the client.
// 7. Zero interaction with or modification of existing text chat or Groq fallback.

const { GoogleGenAI } = require("@google/genai");
const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken } = require("./_admin");

const DEFAULT_LIVE_MODEL = "models/gemini-3.8-live";
const VOICE_INIT_RATE_LIMIT = { name: "voice-session-init", limit: 5 }; // max 5 per minute per IP

/**
 * Validates and retrieves the server-side GEMINI_API_KEY.
 */
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || typeof key !== "string") return null;
  const cleaned = key.trim().replace(/^["']|["']$/g, "");
  if (!cleaned || cleaned === "[SENSITIVE]" || cleaned.length < 5) {
    return null;
  }
  return cleaned;
}

/**
 * Strips secret API keys from error messages or logs.
 */
function sanitizeKey(text, key) {
  if (!text || typeof text !== "string") return text;
  if (!key || typeof key !== "string" || key.length < 6) return text;
  return text.split(key).join("[REDACTED_API_KEY]");
}

/**
 * Creates an ephemeral token using Google Gen AI SDK.
 * Exported for independent unit testing and dependency injection.
 */
async function createEphemeralToken({ apiKey, model, customGenAiClient } = {}) {
  const activeKey = apiKey || getGeminiApiKey();
  if (!activeKey) {
    const err = new Error("GEMINI_API_KEY is not configured or invalid on the server.");
    err.statusCode = 503;
    err.code = "API_KEY_UNAVAILABLE";
    throw err;
  }

  const activeModel = model || process.env.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL;
  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();          // 30-minute session duration ceiling
  const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString(); // 2-minute connection window

  const ai = customGenAiClient || new GoogleGenAI({ apiKey: activeKey });

  const tokenConfig = {
    uses: 1, // Single initial use; resuming a Live API session does not count as a use per official API specs
    expireTime: expireTime,
    newSessionExpireTime: newSessionExpireTime,
    liveConnectConstraints: {
      model: activeModel,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Puck",
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: "You are Learning Allied voice tutor, a helpful, encouraging, and clear conversational tutor for students. Explain concepts step-by-step, answer student questions concisely, and encourage active learning.",
            },
          ],
        },
        sessionResumption: {},
        contextWindowCompression: {
          slidingWindow: {},
        },
      },
    },
  };

  try {
    const tokenResponse = await ai.authTokens.create({ config: tokenConfig });
    const tokenName = tokenResponse && (tokenResponse.name || tokenResponse.token);
    if (!tokenName) {
      throw new Error("Gemini API responded without a valid token identifier.");
    }

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenName)}`;

    return {
      token: tokenName,
      model: activeModel,
      expiresAt: expireTime,
      newSessionExpiresAt: newSessionExpireTime,
      wsUrl: wsUrl,
    };
  } catch (rawErr) {
    const sanitizedMsg = sanitizeKey(rawErr && rawErr.message ? rawErr.message : String(rawErr), activeKey);
    const err = new Error(sanitizedMsg);
    err.statusCode = (rawErr && (rawErr.status || rawErr.statusCode)) || 503;
    err.code = (rawErr && rawErr.code) || "TOKEN_GENERATION_FAILED";
    throw err;
  }
}

/**
 * Main HTTP Handler for /api/voice-session.
 */
async function handler(req, res, { customVerifier, customTokenCreator } = {}) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // 1. Verify Authentication (Firebase ID Token)
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please sign in to use voice mode." });
  }

  const verifier = customVerifier || verifyIdToken;
  let decoded;
  try {
    decoded = await verifier(token);
  } catch (authErr) {
    console.error("[voice-session] Auth verification failed:", authErr && authErr.message ? authErr.message : authErr);
    return res.status(401).json({ error: "Invalid or expired authentication token. Please sign in again." });
  }

  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Unauthorized. Valid student account required." });
  }

  // 2. Enforce Rate Limiting
  if (!rateLimit(req, res, VOICE_INIT_RATE_LIMIT)) return;

  // 3. Parse and validate JSON body (optional parameters such as model override if permitted)
  try {
    await readJsonBody(req);
  } catch (_) {
    // Non-fatal if body is empty or malformed; voice session uses defaults
  }

  // 4. Provision Ephemeral Token
  const tokenCreator = customTokenCreator || createEphemeralToken;
  try {
    const sessionData = await tokenCreator();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    return res.status(200).json(sessionData);
  } catch (err) {
    const activeKey = getGeminiApiKey();
    const statusCode = err.statusCode || 503;
    const rawMsg = err && err.message ? err.message : String(err);
    const sanitizedMsg = sanitizeKey(rawMsg, activeKey);
    console.error(`[voice-session] Ephemeral token provision failed (HTTP ${statusCode}):`, sanitizedMsg);

    return res.status(statusCode).json({
      error: "Voice session initialization unavailable. Ephemeral credentials could not be provisioned.",
    });
  }
}

module.exports = handler;
module.exports.createEphemeralToken = createEphemeralToken;
module.exports.getGeminiApiKey = getGeminiApiKey;
module.exports.sanitizeKey = sanitizeKey;
module.exports.DEFAULT_LIVE_MODEL = DEFAULT_LIVE_MODEL;
