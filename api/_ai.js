// ─────────────────────────────────────────────────────────────
// Learning Allied Growth Agent — server-side Groq helper.
// Reuses the existing GROQ_API_KEY / GROQ_MODEL env vars. Kept
// server-only so the key is never exposed to browsers.
// ─────────────────────────────────────────────────────────────

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// `model` is an optional per-call override used for the model-availability
// fallback chain (see api/groq-proxy.js). Omitting it keeps the existing
// GROQ_MODEL behaviour, so existing callers are unaffected.
// `extra` merges extra provider parameters into the request body (for example
// `reasoning_effort`). Reserved body keys (model, messages, max_tokens,
// response_format) are stripped from it, so a caller cannot accidentally
// overwrite the request it just built.
// `signal` is an AbortSignal forwarded to fetch, so a caller with a deadline can
// actually cancel an in-flight request instead of waiting for it to finish.
const RESERVED_BODY_KEYS = ["model", "messages", "max_tokens", "temperature", "response_format", "stream"];

async function groqComplete({ messages, json = false, temperature = 0.6, maxTokens = 3000, model, extra, signal }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("GROQ_API_KEY is not configured."), { statusCode: 500 });
  }
  let extraBody = null;
  if (extra && typeof extra === "object") {
    extraBody = {};
    for (const [k, v] of Object.entries(extra)) {
      if (RESERVED_BODY_KEYS.includes(k)) continue;
      extraBody[k] = v;
    }
  }
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: model || MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: json ? { type: "json_object" } : undefined,
      ...(extraBody || {}),
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw Object.assign(new Error(`Groq error (${resp.status}) ${text.slice(0, 300)}`), {
      statusCode: 502,
    });
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "";
  if (json) {
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (_) {
      // Extract the first JSON block even if prose surrounds it.
      const m = content.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw Object.assign(new Error("AI did not return valid JSON."), { statusCode: 502 });
    }
  }
  return content;
}

module.exports = { groqComplete, MODEL };