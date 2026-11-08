// ─────────────────────────────────────────────────────────────
// Learning Allied Shared AI Core — Production Multi-Provider Engine
//
// Providers:
//   1. Google Gemini (Primary AI when GEMINI_API_KEY is configured)
//   2. Groq (Automatic Fallback when Gemini is unavailable, rate-limited, or unconfigured)
//
// Features & Guarantees:
//   - Deterministic priority: Gemini -> Groq.
//   - Automatic fallback on 429 (rate-limit), 5xx (server error), network error, and timeout.
//   - Configurable timeouts: GEMINI_TIMEOUT_MS, GROQ_TIMEOUT_MS, AI_TIMEOUT_MS.
//   - Structured server-side logging without logging sensitive user messages or prompts.
//   - Safe redaction of API keys from all error logs.
//   - Streaming support with OpenAI-compatible SSE output.
//   - OpenAI-compatible JSON formatting helpers for chat proxies.
//   - No duplicate quota or database writes on fallback.
// ─────────────────────────────────────────────────────────────

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

const DEFAULT_GEMINI_TIMEOUT_MS = 15000;
const DEFAULT_GROQ_TIMEOUT_MS = 20000;
const DEFAULT_GLOBAL_TIMEOUT_MS = 24000;

const RESERVED_BODY_KEYS = ["model", "messages", "max_tokens", "temperature", "response_format", "stream"];

/**
 * Strips secrets and API keys from error messages or logs.
 */
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
 * Resolves the effective timeout for a provider in milliseconds.
 */
function getTimeoutMs(provider, callerTimeout) {
  if (typeof callerTimeout === "number" && callerTimeout > 0) return callerTimeout;

  const envVal = provider === "gemini"
    ? process.env.GEMINI_TIMEOUT_MS
    : process.env.GROQ_TIMEOUT_MS;
  const parsedEnv = Number(envVal);
  if (!isNaN(parsedEnv) && parsedEnv > 0) return parsedEnv;

  const globalFallback = Number(process.env.AI_TIMEOUT_MS);
  if (!isNaN(globalFallback) && globalFallback > 0) return globalFallback;

  return provider === "gemini" ? DEFAULT_GEMINI_TIMEOUT_MS : DEFAULT_GROQ_TIMEOUT_MS;
}

/**
 * Structured server-side logging helper.
 * Logs provider lifecycle events WITHOUT exposing user prompts, messages, or secrets.
 */
function logAiEvent(level, event, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    tag: "AI_ORCHESTRATOR",
    event,
    timestamp,
    ...meta,
  };

  const logStr = `[AI_ORCHESTRATOR] [${event}] ` +
    Object.entries(entry)
      .filter(([k]) => k !== "tag" && k !== "event")
      .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(" ");

  if (level === "error") {
    console.error(logStr);
  } else if (level === "warn") {
    console.warn(logStr);
  } else {
    console.log(logStr);
  }
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
 * Resolves the correct Gemini model identifier.
 */
function resolveGeminiModel(model) {
  let targetModel = GEMINI_DEFAULT_MODEL;
  if (typeof model === "string" && model.toLowerCase().includes("gemini")) {
    targetModel = model.trim();
  } else {
    const envModel = cleanEnvValue(process.env.GEMINI_MODEL);
    if (envModel && envModel !== "[SENSITIVE]") {
      targetModel = envModel;
    }
  }

  // gemini-3.8-flash is an internal assistant preset; map to active 2.5-flash
  if (targetModel === "gemini-3.8-flash") {
    targetModel = GEMINI_DEFAULT_MODEL;
  }
  return targetModel;
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
  timeoutMs,
  usageOut,
}) {
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      provider: "gemini",
      retryable: false,
    });
  }

  const targetModel = resolveGeminiModel(model);
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

  const effectiveTimeout = getTimeoutMs("gemini", timeoutMs);
  const localController = new AbortController();
  const timeoutId = setTimeout(() => localController.abort(), effectiveTimeout);
  const combinedSignal = signal || localController.signal;

  let resp;
  let responseText = "";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`;
  const startTime = Date.now();

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
    const durationMs = Date.now() - startTime;
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    const msg = isTimeout
      ? `Gemini API request timed out after ${effectiveTimeout}ms`
      : sanitizeKey(err?.message || String(err), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      provider: "gemini",
      model: targetModel,
      durationMs,
      timeoutMs: effectiveTimeout,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      provider: "gemini",
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;
  let parsedResponse = null;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (_) {
    parsedResponse = null;
  }

  if (!resp.ok) {
    if (resp.status === 404 && targetModel !== GEMINI_DEFAULT_MODEL) {
      logAiEvent("warn", "MODEL_RETRY", {
        provider: "gemini",
        fromModel: targetModel,
        toModel: GEMINI_DEFAULT_MODEL,
        status: 404,
      });
      return geminiComplete({
        messages,
        json,
        temperature,
        maxTokens,
        model: GEMINI_DEFAULT_MODEL,
        signal,
        timeoutMs,
        usageOut,
      });
    }

    const rawError = parsedResponse?.error?.message || responseText || `HTTP ${resp.status}`;
    const safeError = sanitizeKey(rawError, apiKey);
    const status = resp.status;

    logAiEvent("warn", "HTTP_ERROR", {
      provider: "gemini",
      model: targetModel,
      status,
      durationMs,
      error: safeError.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini error (${status}): ${safeError.slice(0, 300)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : 502,
      provider: "gemini",
      retryable: status === 429 || status >= 500 || status === 404,
    });
  }

  logAiEvent("info", "SUCCESS", {
    provider: "gemini",
    model: targetModel,
    durationMs,
  });

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
 * Streams tokens from Google Gemini API via streamGenerateContent?alt=sse.
 * Calls onChunk(text) for each incremental text part.
 */
async function geminiStream({
  messages,
  temperature = 0.4,
  maxTokens = 3000,
  model,
  signal,
  timeoutMs,
  onChunk,
}) {
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      provider: "gemini",
      retryable: false,
    });
  }

  const targetModel = resolveGeminiModel(model);
  const { systemParts, contents } = convertMessagesToGemini(messages);

  const requestBody = {
    contents,
    generationConfig: {
      temperature: Math.max(0, Math.min(2, Number(temperature) || 0.4)),
      maxOutputTokens: Math.max(1, Math.min(8192, Number(maxTokens) || 3000)),
    },
  };

  if (systemParts.length > 0) {
    requestBody.systemInstruction = { parts: systemParts };
  }

  const effectiveTimeout = getTimeoutMs("gemini", timeoutMs);
  const localController = new AbortController();
  const timeoutId = setTimeout(() => localController.abort(), effectiveTimeout);
  const combinedSignal = signal || localController.signal;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:streamGenerateContent?alt=sse`;
  const startTime = Date.now();

  let resp;
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
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    const msg = isTimeout
      ? `Gemini stream timed out after ${effectiveTimeout}ms`
      : sanitizeKey(err?.message || String(err), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      provider: "gemini",
      model: targetModel,
      durationMs,
      timeoutMs: effectiveTimeout,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini stream connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      provider: "gemini",
      retryable: true,
    });
  }

  if (!resp.ok) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const errText = await resp.text().catch(() => "");
    const safeError = sanitizeKey(errText, apiKey);
    const status = resp.status;

    logAiEvent("warn", "HTTP_ERROR", {
      provider: "gemini",
      model: targetModel,
      status,
      durationMs,
      error: safeError.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini stream error (${status}): ${safeError.slice(0, 200)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : 502,
      provider: "gemini",
      retryable: status === 429 || status >= 500 || status === 404,
    });
  }

  if (!resp.body || typeof resp.body.getReader !== "function") {
    clearTimeout(timeoutId);
    throw Object.assign(new Error("Gemini stream did not return a readable body."), {
      statusCode: 502,
      provider: "gemini",
      retryable: true,
    });
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const candidate = parsed?.candidates?.[0];
          const parts = candidate?.content?.parts;
          if (Array.isArray(parts) && typeof onChunk === "function") {
            for (const part of parts) {
              if (part?.text) {
                onChunk(part.text);
              }
            }
          }
        } catch {
          // ignore unparseable partial SSE chunk
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  logAiEvent("info", "SUCCESS", {
    provider: "gemini",
    model: targetModel,
    durationMs: Date.now() - startTime,
    stream: true,
  });
}

/**
 * Direct Groq API completion (Fallback Provider).
 */
async function groqComplete({
  messages,
  json = false,
  temperature = 0.6,
  maxTokens = 3000,
  model,
  extra,
  signal,
  timeoutMs,
  usageOut,
}) {
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GROQ_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      provider: "groq",
      retryable: false,
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

  const effectiveTimeout = getTimeoutMs("groq", timeoutMs);
  const localController = new AbortController();
  const timeoutId = setTimeout(() => localController.abort(), effectiveTimeout);
  const combinedSignal = signal || localController.signal;

  const targetModel = model || GROQ_MODEL;
  const startTime = Date.now();
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
        model: targetModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: json ? { type: "json_object" } : undefined,
        ...(extraBody || {}),
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = networkErr?.name === "AbortError" || networkErr?.name === "TimeoutError";
    const msg = isTimeout
      ? `Groq request timed out after ${effectiveTimeout}ms`
      : sanitizeKey(networkErr?.message || String(networkErr), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      provider: "groq",
      model: targetModel,
      durationMs,
      timeoutMs: effectiveTimeout,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(`Groq connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      provider: "groq",
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const safeError = sanitizeKey(text, apiKey);
    const status = resp.status;

    logAiEvent("warn", "HTTP_ERROR", {
      provider: "groq",
      model: targetModel,
      status,
      durationMs,
      error: safeError.slice(0, 150),
    });

    throw Object.assign(new Error(`Groq error (${status}): ${safeError.slice(0, 300)}`), {
      statusCode: status === 429 ? 429 : 502,
      provider: "groq",
      retryable: status === 429 || status >= 500,
    });
  }

  logAiEvent("info", "SUCCESS", {
    provider: "groq",
    model: targetModel,
    durationMs,
  });

  const data = await resp.json();
  if (usageOut && typeof usageOut === "object") {
    usageOut.usage = data && data.usage ? data.usage : null;
  }

  const content = data?.choices?.[0]?.message?.content || "";
  if (json) {
    try {
      return JSON.parse(content);
    } catch (_) {
      const m = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (m) return JSON.parse(m[0]);
      throw Object.assign(new Error("Groq did not return valid JSON."), {
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
 * Provider Priority:
 *   1. Google Gemini (Primary)
 *   2. Groq (Automatic Fallback)
 *
 * Automatically fails over to Groq on Gemini timeouts, rate limits (429),
 * 5xx server errors, 400 invalid request/key errors, and network issues.
 */
async function aiComplete(options = {}) {
  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);

  // Manual provider selection: respect user choice without silent rerouting
  const isExplicitGroq = (options.provider === "groq" || (options.manual === true && options.model && !String(options.model).toLowerCase().includes("gemini"))) && options.allowFallback !== true;
  if (isExplicitGroq) {
    if (!hasGroq) {
      throw Object.assign(new Error("Groq provider is requested but GROQ_API_KEY is not configured."), { statusCode: 500, retryable: false });
    }
    logAiEvent("info", "ATTEMPT", { provider: "groq", isManual: true });
    return await groqComplete(options);
  }

  const isExplicitGemini = (options.provider === "gemini" || (options.manual === true && options.model && String(options.model).toLowerCase().includes("gemini"))) && options.allowFallback !== true;
  if (isExplicitGemini) {
    if (!hasGemini) {
      throw Object.assign(new Error("Gemini provider is requested but GEMINI_API_KEY is not configured."), { statusCode: 500, retryable: false });
    }
    logAiEvent("info", "ATTEMPT", { provider: "gemini", isManual: true });
    return await geminiComplete(options);
  }

  if (!hasGemini && !hasGroq) {
    logAiEvent("error", "NO_CONFIG", {
      error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.",
    });
    throw Object.assign(
      new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in the environment."),
      { statusCode: 500, retryable: false }
    );
  }

  // 1) Try Google Gemini first if configured
  if (hasGemini) {
    const geminiStart = Date.now();
    try {
      logAiEvent("info", "ATTEMPT", { provider: "gemini", isPrimary: true });
      return await geminiComplete(options);
    } catch (geminiErr) {
      const geminiDurationMs = Date.now() - geminiStart;
      const safeGeminiError = sanitizeKey(
        geminiErr?.message || "Unknown Gemini error",
        cleanEnvValue(process.env.GEMINI_API_KEY)
      );

      // If Groq is configured, trigger automatic fallback
      if (hasGroq) {
        logAiEvent("warn", "FALLBACK_TRIGGERED", {
          primary: "gemini",
          fallback: "groq",
          statusCode: geminiErr.statusCode || 502,
          durationMs: geminiDurationMs,
          reason: safeGeminiError.slice(0, 150),
        });

        const groqStart = Date.now();
        try {
          const result = await groqComplete(options);
          logAiEvent("info", "FALLBACK_SUCCESS", {
            provider: "groq",
            durationMs: Date.now() - groqStart,
          });
          return result;
        } catch (groqErr) {
          const safeGroqError = sanitizeKey(
            groqErr?.message || "Unknown Groq error",
            cleanEnvValue(process.env.GROQ_API_KEY)
          );

          logAiEvent("error", "ALL_FAILED", {
            primary: "gemini",
            fallback: "groq",
            geminiError: safeGeminiError.slice(0, 120),
            groqError: safeGroqError.slice(0, 120),
            statusCode: 503,
          });

          throw Object.assign(
            new Error(
              `AI providers unavailable: ${safeGeminiError.slice(0, 120)}; Groq fallback: ${safeGroqError.slice(0, 120)}`
            ),
            { statusCode: 503, retryable: true }
          );
        }
      }

      // Gemini failed and no Groq fallback configured
      logAiEvent("error", "PROVIDER_FAILED_NO_FALLBACK", {
        provider: "gemini",
        statusCode: geminiErr.statusCode || 502,
        reason: safeGeminiError.slice(0, 150),
      });
      throw geminiErr;
    }
  }

  // 2) Default to Groq if Gemini is not configured
  logAiEvent("info", "ATTEMPT", { provider: "groq", reason: "Gemini unconfigured" });
  return await groqComplete(options);
}

/**
 * Formats a Gemini response string or object into standard OpenAI Chat Completion schema.
 */
function geminiToOpenAiResponse(content, model = GEMINI_DEFAULT_MODEL, usage = null) {
  return {
    id: `chatcmpl-gemini-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: typeof content === "string" ? content : JSON.stringify(content),
        },
        finish_reason: "stop",
      },
    ],
    usage: usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

/**
 * Formats a text chunk into an OpenAI-compatible SSE data payload line.
 */
function geminiChunkToOpenAiSse(chunkText, model = GEMINI_DEFAULT_MODEL) {
  const payload = {
    id: `chatcmpl-gemini-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: { content: chunkText },
        finish_reason: null,
      },
    ],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Returns terminal OpenAI SSE payload.
 */
function openAiSseDone(model = GEMINI_DEFAULT_MODEL) {
  const finalPayload = {
    id: `chatcmpl-gemini-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
  };
  return `data: ${JSON.stringify(finalPayload)}\n\ndata: [DONE]\n\n`;
}

module.exports = {
  aiComplete,
  geminiComplete,
  groqComplete,
  geminiStream,
  logAiEvent,
  geminiToOpenAiResponse,
  geminiChunkToOpenAiSse,
  openAiSseDone,
  isUsableKey,
  cleanEnvValue,
  sanitizeKey,
  getTimeoutMs,
  MODEL: GROQ_MODEL,
  GROQ_MODEL,
  GEMINI_DEFAULT_MODEL,
  convertMessagesToGemini,
};
