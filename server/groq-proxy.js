// api/groq-proxy.js
// Server-side proxy: keeps your Groq API key secret and forwards chat requests.
//
// Security model:
//  1. Every request must present a valid Firebase ID token
//     (Authorization: Bearer <token>); unauthenticated traffic is rejected.
//  2. Requests are rate limited per IP (in-memory window).
//  3. The free-plan daily chat limit is enforced AND incremented here, on the
//     server, using the Admin SDK. The client Firestore counter is no longer
//     writable by browsers (see firestore.rules), so limits cannot be reset by
//     manipulating local state or DevTools.
//  4. model / max_tokens / temperature / messages are validated server-side so
//     callers cannot switch to arbitrary models or blow through token budgets.
//  5. If Groq 404s the requested model (unavailable to this key/region), the
//     proxy retries with a fallback model chain so chats never hard-fail.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken, checkAndIncrementChat } = require("./_admin");

const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
]);

// When Groq rejects the requested model (404: "does not exist or you do not
// have access"), retry with these in order so a restricted/renamed account
// catalog degrades gracefully instead of hard-failing the chat.
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
const MAX_TEMPERATURE = 2; // Groq supports 0..2

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server misconfiguration: missing API key" });
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
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  // 2) Server-enforced daily limit (chat) — checked and incremented here.
  // IMPORTANT: Never fall back to unlimited on error — that would let free users bypass limits via new chats/reloads.
  let gate;
  try {
    gate = await checkAndIncrementChat(decoded.uid, decoded);
  } catch (err) {
    console.error("checkAndIncrementChat failed (fail-closed):", err && err.message ? err.message : err);
    // Fail closed: do NOT grant unlimited. Return 503 so client shows retry, not a bypass.
    // Pro users would also be blocked briefly if Firestore is down, but that's safer than free bypass.
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

  // Try the requested model first, then fall back through FALLBACK_MODELS when
  // Groq 404s because a model is unavailable to this key/region.
  const modelCandidates = [body.model, ...FALLBACK_MODELS.filter((m) => m !== body.model)];

  let groqRes = null;
  let errBody = null;

  for (const candidate of modelCandidates) {
    let fetchRes;
    try {
      fetchRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: candidate, messages, max_tokens, temperature, stream }),
      });
    } catch (err) {
      console.error("Network error calling Groq:", err);
      return res.status(502).json({ error: "Failed to reach Groq API" });
    }

    if (fetchRes.ok) {
      groqRes = fetchRes;
      break;
    }

    try {
      errBody = await fetchRes.json();
    } catch {
      errBody = { error: { message: `Groq API error ${fetchRes.status}` } };
    }

    const msg = String(((errBody && errBody.error) || {}).message || "");
    const modelProblem =
      fetchRes.status === 404 &&
      (/does not exist/i.test(msg) || /do not have access/i.test(msg) || /decommissioned/i.test(msg) || /deprecat/i.test(msg));

    if (!modelProblem) {
      // Real failure (rate limit, auth, context too long, etc.) — surface it.
      groqRes = fetchRes;
      break;
    }

    console.warn(`Groq model ${candidate} unavailable (${fetchRes.status}); trying fallback.`);
  }

  if (!groqRes) {
    return res.status(500).json({ error: "All Groq models failed" });
  }

  if (!groqRes.ok) {
    return res.status(groqRes.status).json(errBody);
  }

  // If the client requested streaming, pipe the SSE stream straight through.
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
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      res.end();
    }
    return;
  }

  // Non-streaming: just forward the JSON.
  const data = await groqRes.json();
  return res.status(200).json(data);
};