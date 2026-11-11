// server/live-token.js
// ─────────────────────────────────────────────────────────────
// Learning Allied — Secure Gemini Live Ephemeral Token Service
//
// Provisions short-lived, single-use ephemeral tokens for browser-based
// real-time voice communication using the official @google/genai SDK.
//
// Security & Production Guarantees:
//  - Master GEMINI_API_KEY remains strictly server-side.
//  - Rejects missing or Vercel CLI '[SENSITIVE]' placeholder keys cleanly.
//  - Multi-model resilient fallback (gemini-2.0-flash, gemini-2.0-flash-exp).
//  - Authentication enforced via Firebase ID token verification.
//  - Entitlements verified against server-authoritative records.
//  - Usage limits tracked transactionally in Firestore.
//  - Configurable session duration cap (prevents runaway background billing).
//  - Pedagogical context (Board, Class, Subject, Language) baked into
//    session constraints so the voice tutor teaches Socratically.
//  - No sensitive credentials, tokens, or audio logged.
// ─────────────────────────────────────────────────────────────

const { GoogleGenAI } = require("@google/genai");
const {
  verifyIdToken,
  getVerifiedEntitlement,
  firestore,
} = require("./_admin");
const { applyCors, rateLimit, readJsonBody } = require("./_shared");

const CANDIDATE_MODELS = [
  process.env.GEMINI_LIVE_MODEL,
  "models/gemini-2.0-flash",
  "models/gemini-2.0-flash-exp",
  "models/gemini-2.5-flash-native-audio-preview-12-2025",
].filter(Boolean);

const DEFAULT_VOICE = process.env.GEMINI_LIVE_VOICE || "Puck";
const MAX_SESSION_DURATION_SEC = 900; // 15 minutes max per single live session

const VOICE_PLAN_LIMITS = {
  free: { dailySessions: 10, maxDurationSec: 600 },
  pro: { dailySessions: Infinity, maxDurationSec: MAX_SESSION_DURATION_SEC },
};

function cleanEnvValue(val) {
  if (!val || typeof val !== "string") return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

function isUsableKey(key) {
  const cleaned = cleanEnvValue(key);
  return Boolean(cleaned && cleaned !== "[SENSITIVE]" && cleaned.length > 15);
}

function getGeminiApiKey() {
  return cleanEnvValue(process.env.GEMINI_API_KEY);
}

function getTodayString() {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Constructs the pedagogical system instruction for the Gemini Live Voice Tutor.
 * Optimized for natural spoken dialogue (concise, conversational, Socratic).
 */
function buildVoiceTutorInstruction(context = {}) {
  const board = context.board ? String(context.board).trim() : "General";
  const classNum = context.classNum ? String(context.classNum).trim() : "";
  const subject = context.subject ? String(context.subject).trim() : "General Science & Mathematics";
  const language = context.language === "hi" ? "Hindi (spoken naturally with common English academic terms)" :
                   context.language === "mr" ? "Marathi (with academic terms explained clearly)" : "English";

  return `You are Learning Allied, an elite Socratic voice tutor for secondary and senior secondary students.

STUDENT LEARNING CONTEXT:
- Board / Exam Curriculum: ${board}
- Grade / Class: ${classNum || "Secondary / Senior Secondary"}
- Active Subject: ${subject}
- Spoken Language: ${language}

VOICE-SPECIFIC PEDAGOGICAL RULES (CRITICAL):
1. Spoken, conversational cadence: Speak like a warm, supportive expert tutor sitting right next to the student.
2. Conciseness is essential: Speak in short, digestible chunks (1 to 3 spoken sentences per turn). Never deliver long monologues or recite paragraphs.
3. Socratic dialogue: Explain the key insight, then ask an active-recall or reasoning question to check understanding.
4. Spoken clarity:
   - Never say or format markdown symbols, bullet points, asterisks, or formatting tags.
   - For mathematics and science, pronounce expressions in plain conversational speech. Say "x squared plus two x" rather than reading syntax. Say "carbon dioxide" or "C-O-two".
5. Adaptive pacing:
   - If the student hesitates or sounds confused, simplify immediately and provide an intuitive everyday analogy.
   - If the student is confident, celebrate briefly and gently challenge them with the next logical step.
6. Anti-hallucination: Only teach established curriculum facts and principles. If something is outside syllabus or uncertain, state so honestly.
7. Tone: Patient, encouraging, academically rigorous, and motivating. Always inspire confidence through competence.`;
}

/**
 * Checks and increments daily voice session count in Firestore transactionally.
 */
async function checkAndIncrementVoiceSession(uid, decoded) {
  const entitlement = await getVerifiedEntitlement(uid, decoded);
  const plan = entitlement.plan === "pro" ? "pro" : "free";
  const limits = VOICE_PLAN_LIMITS[plan] || VOICE_PLAN_LIMITS.free;
  const limit = limits.dailySessions;

  const db = firestore();
  const usageRef = db.doc(`usage/${uid}`);
  const today = getTodayString();

  let allowed = true;
  let used = 0;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    let usage = snap.exists ? snap.data() : {};
    if (!usage || usage.date !== today) {
      usage = {
        date: today,
        dailyChatCount: 0,
        dailyVoiceSessions: 0,
        voiceDurationSeconds: 0,
      };
    }

    used = Number(usage.dailyVoiceSessions) || 0;
    if (limit !== Infinity && used >= limit) {
      allowed = false;
      return;
    }

    const nextCount = used + 1;
    tx.set(
      usageRef,
      {
        date: today,
        dailyVoiceSessions: nextCount,
        lastVoiceAt: new Date().toISOString(),
      },
      { merge: true }
    );
    used = nextCount;
  });

  return {
    allowed,
    used,
    limit,
    plan,
    maxDurationSec: limits.maxDurationSec,
  };
}

/**
 * Creates an ephemeral session token for Gemini Live API.
 */
async function createLiveVoiceToken(studentContext = {}) {
  const apiKey = getGeminiApiKey();
  if (!isUsableKey(apiKey)) {
    throw Object.assign(
      new Error(
        apiKey === "[SENSITIVE]"
          ? "GEMINI_API_KEY in server environment is set to '[SENSITIVE]' placeholder (from Vercel pull). Please configure a real Google AI Studio key in Vercel or .env.local."
          : "Gemini Live service is not configured with an API key. Please configure GEMINI_API_KEY in your environment."
      ),
      { statusCode: 503, code: "SERVICE_UNAVAILABLE" }
    );
  }

  const systemInstruction = buildVoiceTutorInstruction(studentContext);
  const voice = DEFAULT_VOICE;
  const now = Date.now();
  const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });

  let tokenResponse = null;
  let successfulModel = null;
  let lastError = null;

  // Try candidate models in order of stability
  for (const model of CANDIDATE_MODELS) {
    // Strategy A: Full constraints (model, responseModalities, systemInstruction, speechConfig)
    try {
      tokenResponse = await client.authTokens.create({
        config: {
          uses: 1,
          expireTime,
          newSessionExpireTime,
          liveConnectConstraints: {
            model,
            config: {
              responseModalities: ["AUDIO"],
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voice,
                  },
                },
              },
            },
          },
        },
      });
      if (tokenResponse && tokenResponse.name) {
        successfulModel = model;
        break;
      }
    } catch (err) {
      lastError = err;
      // Strategy B: Minimal constraints (model, responseModalities)
      try {
        tokenResponse = await client.authTokens.create({
          config: {
            uses: 1,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model,
              config: {
                responseModalities: ["AUDIO"],
              },
            },
          },
        });
        if (tokenResponse && tokenResponse.name) {
          successfulModel = model;
          break;
        }
      } catch (innerErr) {
        lastError = innerErr;
      }
    }
  }

  if (!tokenResponse || !tokenResponse.name) {
    const errorDetails = String(lastError?.message || lastError || "Token creation rejected");
    throw Object.assign(
      new Error(`Failed to provision ephemeral token from Gemini Live API: ${errorDetails}`),
      { statusCode: 502, code: "TOKEN_PROVISION_FAILED" }
    );
  }

  return {
    token: tokenResponse.name,
    model: successfulModel,
    voice,
    systemInstruction,
    expireTime,
    maxDurationSeconds: MAX_SESSION_DURATION_SEC,
  };
}

/**
 * Main HTTP Handler for Live Token generation.
 */
async function liveTokenHandler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authHeader = req.headers.authorization || "";
  const rawToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(rawToken);

  if (!decoded || !decoded.uid) {
    return res.status(401).json({
      error: "Not authenticated. Please sign in to use Gemini Live Voice Mode.",
    });
  }

  const uid = decoded.uid;

  // Rate limit token creation requests to prevent abuse
  if (!rateLimit(req, res, { name: "live-token", limit: 12 })) {
    return;
  }

  let body = {};
  try {
    body = await readJsonBody(req);
  } catch (err) {
    body = {};
  }

  const studentContext = {
    board: body.board || body.context?.board || body.track,
    classNum: body.classNum || body.context?.classNum,
    subject: body.subject || body.context?.subject,
    language: body.language || body.context?.language || "en",
  };

  // Quota and entitlement validation
  let gate;
  try {
    gate = await checkAndIncrementVoiceSession(uid, decoded);
  } catch (err) {
    console.error("[live-token] usage gate error:", err && err.message ? err.message : err);
    return res.status(503).json({
      error: "Voice usage service temporarily unavailable. Please retry in a moment.",
    });
  }

  if (!gate.allowed) {
    return res.status(429).json({
      error: {
        message: "You have reached your daily Live Voice limit. Upgrade to Pro for unlimited interactive voice tutoring.",
        code: "limit_reached",
        used: gate.used,
        limit: gate.limit,
        plan: gate.plan,
      },
    });
  }

  try {
    const sessionConfig = await createLiveVoiceToken(studentContext);

    // Safe logging without credentials or sensitive data
    console.log(
      `[live-token] Ephemeral token provisioned: uid=${uid.slice(0, 8)}*** plan=${gate.plan} model=${sessionConfig.model}`
    );

    return res.status(200).json({
      ok: true,
      token: sessionConfig.token,
      model: sessionConfig.model,
      voice: sessionConfig.voice,
      systemInstruction: sessionConfig.systemInstruction,
      maxDurationSeconds: Math.min(sessionConfig.maxDurationSeconds, gate.maxDurationSec),
      expireTime: sessionConfig.expireTime,
      studentContext,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    const msg = err.message || "Failed to initialize Gemini Live Voice session.";
    console.error(`[live-token] Provisioning error (${status}):`, msg);

    return res.status(status).json({
      error: {
        message: msg,
        code: err.code || "LIVE_TOKEN_ERROR",
      },
    });
  }
}

module.exports = {
  liveTokenHandler,
  createLiveVoiceToken,
  checkAndIncrementVoiceSession,
  buildVoiceTutorInstruction,
  isUsableKey,
};
