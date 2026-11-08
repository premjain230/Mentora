// api/groq-proxy.js
// Server-side AI proxy: manages Gemini primary and Groq automatic fallback.
//
// Security & Architecture:
//  1. Every request must present a valid Firebase ID token
//     (Authorization: Bearer <token>); unauthenticated traffic is rejected.
//  2. Requests are rate limited per IP (in-memory window).
//  3. Server-enforced daily chat limit is checked and incremented ONCE here.
//     Fallback between Gemini and Groq does NOT double-increment limits.
//  4. Model / max_tokens / temperature / messages are validated server-side.
//  5. Automatic Provider Priority:
//     - Priority 1: Google Gemini (when GEMINI_API_KEY is configured).
//     - Priority 2: Groq Fallback (when Gemini times out, hits 429 rate limit, 5xx, or fails).
//  6. Streaming requests are handled safely:
//     - If Gemini stream fails before sending headers, cleanly fall back to Groq stream.
//     - If Gemini stream fails mid-stream after headers were sent, cleanly terminate
//       without appending partial Groq output.
//  7. Never expose API keys or secrets to the client.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const admin = require("./_admin");
const {
  geminiComplete,
  geminiStream,
  isUsableKey,
  cleanEnvValue,
  sanitizeKey,
  logAiEvent,
  geminiToOpenAiResponse,
  geminiChunkToOpenAiSse,
  openAiSseDone,
  GEMINI_DEFAULT_MODEL,
} = require("./_ai");

const ALLOWED_MODELS = new Set([
  "auto",
  "gemini",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
]);

const FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

const MAX_TOKENS = 4096;
const MAX_MESSAGES = 200;
const MAX_MSG_CHARS = 20000;
const MAX_TOTAL_CHARS = 120000;
const MAX_TEMPERATURE = 2;

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return null;
  }
  let total = 0;
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") return null;
    const role = m.role;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!["system", "user", "assistant"].includes(role)) return null;
    if (!content || content.length > MAX_MSG_CHARS) return null;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return null;
    out.push({ role, content });
  }
  return out;
}

/**
 * Executes a request against Groq with fallback model chain.
 */
async function executeGroq(req, res, { messages, max_tokens, temperature, stream, requestedModel }) {
  const groqApiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  if (!isUsableKey(groqApiKey)) {
    logAiEvent("error", "GROQ_KEY_MISSING", { endpoint: "groq-proxy" });
    return res.status(503).json({
      error: {
        message: "AI service is temporarily unavailable. Please retry shortly.",
        code: "provider_unavailable",
      },
    });
  }

  const modelCandidates = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel),
  ];

  let groqRes = null;
  let errBody = null;

  for (const candidate of modelCandidates) {
    let fetchRes;
    const startTime = Date.now();
    try {
      fetchRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: candidate,
          messages,
          max_tokens,
          temperature,
          stream,
        }),
      });
    } catch (err) {
      logAiEvent("warn", "GROQ_FETCH_ERROR", {
        model: candidate,
        durationMs: Date.now() - startTime,
        error: sanitizeKey(err?.message, groqApiKey),
      });
      continue;
    }

    if (fetchRes.ok) {
      groqRes = fetchRes;
      logAiEvent("info", "GROQ_SUCCESS", {
        model: candidate,
        durationMs: Date.now() - startTime,
        stream,
      });
      break;
    }

    try {
      errBody = await fetchRes.json();
    } catch {
      errBody = { error: { message: `Groq API error ${fetchRes.status}` } };
    }

    const msg = String(((errBody && errBody.error) || {}).message || "");
    const isModelNotFound =
      fetchRes.status === 404 &&
      (/does not exist/i.test(msg) ||
        /do not have access/i.test(msg) ||
        /decommissioned/i.test(msg) ||
        /deprecat/i.test(msg));

    if (!isModelNotFound) {
      groqRes = fetchRes;
      break;
    }

    logAiEvent("warn", "GROQ_MODEL_FALLBACK", {
      candidate,
      status: fetchRes.status,
    });
  }

  if (!groqRes) {
    return res.status(503).json({
      error: {
        message: "All AI providers temporarily unavailable. Please try again shortly.",
        code: "all_providers_failed",
      },
    });
  }

  if (!groqRes.ok) {
    return res.status(groqRes.status === 429 ? 429 : 502).json({
      error: {
        message:
          errBody?.error?.message ||
          "AI service temporarily unavailable. Please retry in a moment.",
        code: "upstream_error",
      },
    });
  }

  // Handle Groq streaming
  if (stream && groqRes.body) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = groqRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (streamErr) {
      logAiEvent("warn", "GROQ_STREAM_PIPE_ERROR", {
        error: sanitizeKey(streamErr?.message, groqApiKey),
      });
    } finally {
      res.end();
    }
    return;
  }

  // Non-streaming: Forward standard OpenAI JSON
  const data = await groqRes.json();
  return res.status(200).json(data);
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimit(req, res, { name: "groq-proxy", limit: 30 })) return;

  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);

  if (!hasGemini && !hasGroq) {
    logAiEvent("error", "NO_API_KEYS", { endpoint: "groq-proxy" });
    return res.status(500).json({ error: "Server misconfiguration: missing AI provider key" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(req, res, err, "Invalid JSON body.");
  }

  // 1) Authentication — reject anonymous / forged requests up front.
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await admin.verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  // 2) Server-enforced daily limit (chat) — incremented exactly ONCE per user chat request.
  let gate;
  try {
    gate = await admin.checkAndIncrementChat(decoded.uid, decoded);
  } catch (err) {
    console.error("checkAndIncrementChat failed (fail-closed):", err && err.message ? err.message : err);
    return res.status(503).json({ error: "Usage service temporarily unavailable. Please retry in a moment." });
  }

  if (!gate.allowed) {
    return res.status(gate.status || 429).json({
      error: {
        message: gate.error,
        code: "limit_reached",
        used: gate.used,
        limit: gate.limit === Infinity ? null : gate.limit,
        plan: gate.plan,
      },
    });
  }

  // 3) Validate + cap request parameters.
  const messages = normalizeMessages(body.messages);
  if (!messages) {
    return res.status(400).json({
      error: "Invalid messages. Provide 1-200 messages with a valid role and content.",
    });
  }

  if (!body.model || !ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: "Unsupported model." });
  }

  const temperature = Math.min(MAX_TEMPERATURE, Math.max(0, Number(body.temperature) || 0.65));
  const max_tokens = Math.min(MAX_TOKENS, Math.max(1, Number(body.max_tokens) || 2048));
  const stream = body.stream === true;

  // 4) Manual vs Auto Routing
  const isManualGroq = (body.provider === "groq" || (body.manual === true && !String(body.model).toLowerCase().includes("gemini"))) && body.allowFallback !== true;
  if (isManualGroq) {
    return await executeGroq(req, res, {
      messages,
      max_tokens,
      temperature,
      stream,
      requestedModel: body.model || "llama-3.3-70b-versatile",
    });
  }

  // 4) Execute Request: Priority 1 Gemini -> Priority 2 Groq Fallback
  if (!stream) {
    // ── NON-STREAMING MODE ──
    if (hasGemini) {
      const usageOut = {};
      try {
        logAiEvent("info", "PRIMARY_ATTEMPT", {
          provider: "gemini",
          endpoint: "groq-proxy",
          stream: false,
        });

        const content = await geminiComplete({
          messages,
          temperature,
          maxTokens: max_tokens,
          usageOut,
        });

        const openAiFormat = geminiToOpenAiResponse(
          content,
          GEMINI_DEFAULT_MODEL,
          usageOut.usage
        );
        return res.status(200).json(openAiFormat);
      } catch (geminiErr) {
        logAiEvent("warn", "FALLBACK_TRIGGERED", {
          endpoint: "groq-proxy",
          primary: "gemini",
          fallback: "groq",
          status: geminiErr.statusCode || 502,
          reason: geminiErr.message?.slice(0, 150),
        });
        // Proceed to Groq fallback below
      }
    }

    return await executeGroq(req, res, {
      messages,
      max_tokens,
      temperature,
      stream: false,
      requestedModel: body.model,
    });
  }

  // ── STREAMING MODE ──
  let streamStarted = false;
  if (hasGemini) {
    try {
      logAiEvent("info", "PRIMARY_ATTEMPT", {
        provider: "gemini",
        endpoint: "groq-proxy",
        stream: true,
      });

      await geminiStream({
        messages,
        temperature,
        maxTokens: max_tokens,
        onChunk: (chunkText) => {
          if (!streamStarted) {
            streamStarted = true;
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
          }
          res.write(geminiChunkToOpenAiSse(chunkText));
        },
      });

      if (streamStarted) {
        res.write(openAiSseDone());
        res.end();
        return;
      }
    } catch (geminiStreamErr) {
      logAiEvent("warn", "STREAM_ERROR", {
        provider: "gemini",
        streamStarted,
        error: geminiStreamErr.message?.slice(0, 150),
      });

      // If bytes were already written to the client, terminate cleanly to avoid
      // appending duplicate or corrupted Groq stream chunks.
      if (streamStarted || res.headersSent) {
        res.end();
        return;
      }

      logAiEvent("warn", "FALLBACK_TRIGGERED", {
        endpoint: "groq-proxy",
        primary: "gemini",
        fallback: "groq",
        stream: true,
      });
      // Fall through to Groq streaming below!
    }
  }

  return await executeGroq(req, res, {
    messages,
    max_tokens,
    temperature,
    stream: true,
    requestedModel: body.model,
  });
};
