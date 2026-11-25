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
//     - If Gemini stream fails before sending headers/tokens, cleanly fall back to Groq stream.
//     - If Gemini stream fails mid-stream after tokens were sent, emit explicit provider-switch event
//       so frontend resets client buffer, and deliver clean complete Groq response.
//  7. Never expose API keys or secrets to the client.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const admin = require("./_admin");
const {
  aiComplete,
  aiStream,
  isUsableKey,
  cleanEnvValue,
  sanitizeKey,
  logAiEvent,
  generateRequestId,
  geminiToOpenAiResponse,
  geminiChunkToOpenAiSse,
  openAiSseDone,
  GEMINI_DEFAULT_MODEL,
  resolveGroqModel,
} = require("./_ai");

const ALLOWED_MODELS = new Set([
  "auto",
  "default",
  "gemini",
  "gemini-3.8-flash",
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

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimit(req, res, { name: "groq-proxy", limit: 30 })) return;

  const requestId = (req.headers && req.headers["x-request-id"]) || generateRequestId();
  const apiRoute = "/api/groq-proxy";
  res.setHeader("X-Request-Id", requestId);

  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);

  if (!hasGemini && !hasGroq) {
    logAiEvent("error", "NO_API_KEYS", { requestId, apiRoute, endpoint: "groq-proxy" });
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

  const requestedModel = body.model || "auto";
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return res.status(400).json({ error: "Unsupported model." });
  }

  const temperature = Math.min(MAX_TEMPERATURE, Math.max(0, Number(body.temperature) || 0.65));
  const max_tokens = Math.min(MAX_TOKENS, Math.max(1, Number(body.max_tokens) || 2048));
  const stream = body.stream === true;

  // 4) Determine Routing Mode (Auto vs Manual Gemini vs Manual Groq)
  const isManualGroq = (body.provider === "groq" || (body.manual === true && !String(requestedModel).toLowerCase().includes("gemini"))) && body.allowFallback !== true;
  const isManualGemini = (body.provider === "gemini" || (body.manual === true && String(requestedModel).toLowerCase().includes("gemini"))) && body.allowFallback !== true;
  const provider = isManualGroq ? "groq" : isManualGemini ? "gemini" : "auto";
  const allowFallback = body.allowFallback !== false && !isManualGroq && !isManualGemini;

  // 5) Non-streaming completion
  if (!stream) {
    const usageOut = {};
    const metaOut = {};
    try {
      logAiEvent("info", "PRIMARY_ATTEMPT", {
        requestId,
        apiRoute,
        provider,
        endpoint: "groq-proxy",
        stream: false,
      });

      const content = await aiComplete({
        messages,
        temperature,
        maxTokens: max_tokens,
        model: requestedModel,
        provider,
        allowFallback,
        usageOut,
        metaOut,
        requestId,
        apiRoute,
      });

      const openAiFormat = geminiToOpenAiResponse(
        content,
        metaOut.model || requestedModel || GEMINI_DEFAULT_MODEL,
        usageOut.usage
      );
      return res.status(200).json(openAiFormat);
    } catch (err) {
      logAiEvent("warn", "REQUEST_FAILED", {
        requestId,
        apiRoute,
        endpoint: "groq-proxy",
        provider,
        stream: false,
        status: err.statusCode || 502,
        failureCategory: err.failureCategory || "upstream_error",
        error: err.message?.slice(0, 150),
      });

      return res.status(err.statusCode || 502).json({
        error: {
          message: err.message || "AI service temporarily unavailable. Please retry in a moment.",
          code: err.failureCategory || "upstream_error",
        },
      });
    }
  }

  // 6) Streaming mode with automatic failover and mid-stream provider switch recovery
  let streamStarted = false;
  try {
    logAiEvent("info", "PRIMARY_ATTEMPT", {
      requestId,
      apiRoute,
      provider,
      endpoint: "groq-proxy",
      stream: true,
    });

    await aiStream({
      messages,
      temperature,
      maxTokens: max_tokens,
      model: requestedModel,
      provider,
      allowFallback,
      requestId,
      apiRoute,
      onChunk: (chunkText) => {
        if (!streamStarted) {
          streamStarted = true;
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        res.write(geminiChunkToOpenAiSse(chunkText));
      },
      onProviderSwitch: ({ from, to, tokensStreamed, reason }) => {
        if (!streamStarted) {
          streamStarted = true;
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
        }
        // Emit explicit provider-switch event so client resets partial buffer
        try {
          res.write(
            `data: ${JSON.stringify({
              event: "provider_switch",
              provider: to,
              from,
              reset: true,
              tokensStreamed,
              reason,
            })}\n\n`
          );
        } catch (_) {}
      },
    });

    if (streamStarted) {
      res.write(openAiSseDone());
      res.end();
      return;
    }

    logAiEvent("warn", "STREAM_EMPTY", {
      requestId,
      apiRoute,
      endpoint: "groq-proxy",
      provider,
      streamStarted: false,
    });
    return res.status(502).json({
      error: {
        message: "AI stream completed with no output.",
        code: "empty_response",
      },
    });
  } catch (err) {
    logAiEvent("warn", "STREAM_ERROR", {
      requestId,
      apiRoute,
      endpoint: "groq-proxy",
      provider,
      streamStarted,
      status: err.statusCode || 502,
      failureCategory: err.failureCategory || "stream_interrupted",
      error: err.message?.slice(0, 150),
    });

    if (streamStarted || res.headersSent) {
      try {
        res.write(
          `data: ${JSON.stringify({
            error: {
              message: "Stream interrupted by upstream provider.",
              code: "stream_interrupted",
            },
          })}\n\n`
        );
      } catch (_) {}
      res.end();
      return;
    }

    return res.status(err.statusCode || 502).json({
      error: {
        message: err.message || "AI service temporarily unavailable. Please retry in a moment.",
        code: "upstream_error",
      },
    });
  }
};
