// ─────────────────────────────────────────────────────────────
// Learning Allied Shared AI Core — Production Multi-Provider Engine
//
// Providers:
//   1. Google Gemini (Primary when GEMINI_API_KEY is configured)
//   2. Groq (Fallback when Gemini is unavailable, rate-limited, or unconfigured)
//
// Security & Architecture:
//   - Keys are kept server-side only; never exposed to browsers or client bundles.
//   - Safe redaction of API keys from all error logs.
//   - Strict timeout enforcement via AbortSignal.
//   - Structured JSON output mode supported on both providers.
//   - Deterministic fallback chain: Gemini -> Groq -> Authored/Reported Error.
// ─────────────────────────────────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_REQUEST_TIMEOUT_MS = 24000;

const RESERVED_BODY_KEYS = ["model", "messages", "max_tokens", "temperature", "response_format", "stream"];

function sanitizeKey(text, key) {
  if (!text || typeof text !== "string") return text;
  if (!key || typeof key !== "string" || key.length < 6) return text;
  return text.split(key).join("[REDACTED_API_KEY]");
}

function cleanEnvValue(val) {
  if (!val || typeof val !== "string") return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

function isUsableKey(key) {
  const cleaned = cleanEnvValue(key);
  return Boolean(cleaned && cleaned !== "[SENSITIVE]" && cleaned.length > 5);
}

/**
 * Normalizes OpenAI-style messages into Gemini API contents + systemInstruction.
 */
function convertMessagesToGemini(messages) {
  const systemParts = [];
  const contents = [];

  for (const m of messages || []) {
    if (!m || typeof m !== "object") continue;
    const role = m.role;
    const text = typeof m.content === "string" ? m.content.trim() : "";
    if (!text) continue;

    if (role === "system") {
      systemParts.push({ text });
      continue;
    }

    const geminiRole = role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === geminiRole) {
      last.parts.push({ text });
    } else {
      contents.push({ role: geminiRole, parts: [{ text }] });
    }
  }

  // Gemini API requires at least one content item
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Hello" }] });
  }

  return { systemParts, contents };
}

/**
 * Direct Google Gemini API completion.
 */
async function geminiComplete({
  messages,
  json = false,
  temperature = 0.4,
  maxTokens = 3000,
  model,
  signal,
  usageOut,
}) {
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      provider: "gemini",
    });
  }

  // Model selection: prioritize explicit model if it looks like a Gemini model,
  // otherwise GEMINI_MODEL env var, otherwise default to gemini-2.5-flash.
  let targetModel = GEMINI_DEFAULT_MODEL;
  if (typeof model === "string" && model.toLowerCase().includes("gemini")) {
    targetModel = model.trim();
  } else {
    const envModel = cleanEnvValue(process.env.GEMINI_MODEL);
    if (envModel && envModel !== "[SENSITIVE]") {
      targetModel = envModel;
    }
  }

  const { systemParts, contents } = convertMessagesToGemini(messages);

  const requestBody = {
    contents,
    generationConfig: {
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.4)),
      maxOutputTokens: Math.max(1, Math.min(8192, Number(maxTokens) || 3000)),
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (systemParts.length > 0) {
    requestBody.systemInstruction = {
      parts: systemParts,
    };
  }

  // Allow caller's AbortSignal or enforce default safety timeout
  const localController = new AbortController();
  const timeoutId = setTimeout(() => localController.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  const combinedSignal = signal || localController.signal;

  let resp;
  let responseText = "";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`;

  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: combinedSignal,
      body: JSON.stringify(requestBody),
    });

    responseText = await resp.text();
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    const msg = isTimeout
      ? `Gemini API request timed out after ${DEFAULT_REQUEST_TIMEOUT_MS}ms`
      : sanitizeKey(err?.message || String(err), apiKey);
    throw Object.assign(new Error(`Gemini connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      provider: "gemini",
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  let parsedResponse = null;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (_) {
    parsedResponse = null;
  }

  if (!resp.ok) {
    const rawError = parsedResponse?.error?.message || responseText || `HTTP ${resp.status}`;
    const safeError = sanitizeKey(rawError, apiKey);
    const status = resp.status;
    throw Object.assign(new Error(`Gemini error (${status}): ${safeError.slice(0, 300)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : 502,
      provider: "gemini",
      retryable: status === 429 || status >= 500 || status === 404,
    });
  }

  if (usageOut && typeof usageOut === "object" && parsedResponse?.usageMetadata) {
    const meta = parsedResponse.usageMetadata;
    usageOut.usage = {
      prompt_tokens: meta.promptTokenCount || 0,
      completion_tokens: meta.candidatesTokenCount || 0,
      total_tokens: meta.totalTokenCount || 0,
    };
  }

  const candidate = parsedResponse?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const content = Array.isArray(parts)
    ? parts.map((p) => p.text).filter(Boolean).join("")
    : "";

  if (json) {
    try {
      return JSON.parse(content);
    } catch (_) {
      const match = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {}
      }
      throw Object.assign(new Error("Gemini did not return valid JSON."), {
        statusCode: 502,
        provider: "gemini",
        retryable: true,
      });
    }
  }

  return content;
}

/**
 * Direct Groq API completion (preserves existing implementation).
 */
async function groqComplete({
  messages,
  json = false,
  temperature = 0.6,
  maxTokens = 3000,
  model,
  extra,
  signal,
  usageOut,
}) {
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GROQ_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      provider: "groq",
    });
  }

  let extraBody = null;
  if (extra && typeof extra === "object") {
    extraBody = {};
    for (const [k, v] of Object.entries(extra)) {
      if (RESERVED_BODY_KEYS.includes(k)) continue;
      extraBody[k] = v;
    }
  }

  const localController = new AbortController();
  const timeoutId = setTimeout(() => localController.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
  const combinedSignal = signal || localController.signal;

  let resp;
  try {
    resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: combinedSignal,
      body: JSON.stringify({
        model: model || GROQ_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: json ? { type: "json_object" } : undefined,
        ...(extraBody || {}),
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const isTimeout = networkErr?.name === "AbortError" || networkErr?.name === "TimeoutError";
    throw Object.assign(
      new Error(`Groq connection error: ${isTimeout ? "Request timed out" : networkErr.message}`),
      { statusCode: isTimeout ? 504 : 502, provider: "groq", retryable: true }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw Object.assign(new Error(`Groq error (${resp.status}) ${text.slice(0, 300)}`), {
      statusCode: resp.status === 429 ? 429 : 502,
      provider: "groq",
      retryable: resp.status === 429 || resp.status >= 500,
    });
  }

  const data = await resp.json();
  if (usageOut && typeof usageOut === "object") {
    usageOut.usage = data && data.usage ? data.usage : null;
  }

  const content = data?.choices?.[0]?.message?.content || "";
  if (json) {
    try {
      return JSON.parse(content);
    } catch (_) {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw Object.assign(new Error("AI did not return valid JSON."), {
        statusCode: 502,
        provider: "groq",
        retryable: true,
      });
    }
  }

  return content;
}

/**
 * Unified completion helper.
 * Selects Gemini as primary provider if configured, with automatic fallback
 * to Groq when Gemini is rate-limited, unavailable, or times out.
 */
async function aiComplete(options) {
  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);

  if (!hasGemini && !hasGroq) {
    throw Object.assign(
      new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in the environment."),
      { statusCode: 500 }
    );
  }

  // 1) Try Gemini first if configured
  if (hasGemini) {
    try {
      return await geminiComplete(options);
    } catch (geminiErr) {
      if (hasGroq) {
        console.warn(`[AI Provider] Gemini failed (${geminiErr.message}); falling back to Groq.`);
        try {
          return await groqComplete(options);
        } catch (groqErr) {
          console.error(`[AI Provider] Both Gemini and Groq failed. Gemini: ${geminiErr.message} | Groq: ${groqErr.message}`);
          throw Object.assign(new Error(`AI providers unavailable: ${geminiErr.message}; Groq fallback: ${groqErr.message}`), {
            statusCode: 503,
            retryable: true,
          });
        }
      }
      throw geminiErr;
    }
  }

  // 2) Default to Groq if Gemini is not configured
  return await groqComplete(options);
}

module.exports = {
  aiComplete,
  geminiComplete,
  groqComplete,
  MODEL: GROQ_MODEL,
  GEMINI_DEFAULT_MODEL,
  convertMessagesToGemini,
};
