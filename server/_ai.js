// ─────────────────────────────────────────────────────────────
// Learning Allied Shared AI Core — Production Multi-Provider Engine
//
// Providers:
//   1. Google Gemini (Primary AI when GEMINI_API_KEY is configured)
//   2. Groq (Automatic Fallback when Gemini is unavailable, rate-limited, or unconfigured)
//
// Features & Guarantees:
//   - Deterministic priority: Gemini -> Groq.
//   - Automatic fallback on ANY recoverable Gemini error (429 rate limit, 400/401/403 auth,
//     404 model unavailable, 5xx server error, timeout, network error, empty response,
//     malformed response, or unparseable JSON).
//   - Clean signal isolation: Groq fallback never inherits an aborted signal from Gemini.
//   - Full streaming failover:
//     * If Gemini fails before first token -> seamless instant switch to Groq stream.
//     * If Gemini fails mid-stream -> explicit provider-switch event, reset client, clean Groq stream.
//   - Configurable timeouts: GEMINI_TIMEOUT_MS, GROQ_TIMEOUT_MS, AI_TIMEOUT_MS.
//   - Structured server-side diagnostics without logging sensitive user messages or prompts.
//   - Safe redaction of API keys from all error logs.
//   - OpenAI-compatible SSE and JSON output formatting.
//   - No duplicate quota or database writes on fallback.
// ─────────────────────────────────────────────────────────────

const crypto = require("crypto");

const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const GROQ_FAST_MODEL = "llama-3.1-8b-instant";
const GROQ_MODEL = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-3.8-flash"];

const KNOWN_GROQ_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
]);

/**
 * Helper to combine a caller-provided AbortSignal with a local timeout signal.
 */
function combineSignals(callerSignal, localSignal) {
  if (!callerSignal) return localSignal;
  if (callerSignal.aborted) return callerSignal;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, localSignal]);
  }
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(callerSignal.reason);
  const onLocalAbort = () => controller.abort(localSignal.reason);
  callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  localSignal.addEventListener("abort", onLocalAbort, { once: true });
  return controller.signal;
}

/**
 * Resolves any model identifier to a verified, valid Groq model.
 * Maps Gemini, OpenAI/gpt-oss, and unknown model identifiers to valid Groq models.
 */
function resolveGroqModel(model) {
  if (typeof model === "string") {
    const clean = model.trim();
    if (clean === "llama-3.1-70b-versatile" || clean === "llama3-70b-8192") {
      return GROQ_DEFAULT_MODEL;
    }
    if (KNOWN_GROQ_MODELS.has(clean)) {
      return clean;
    }
    const lower = clean.toLowerCase();
    // Fast model mappings (8b, instant, fast, 20b)
    if (lower.includes("8b") || lower.includes("fast") || lower.includes("instant") || /(?:^|[^0-9])20b(?![0-9])/i.test(lower)) {
      return GROQ_FAST_MODEL;
    }
    // High intelligence / fallback mappings
    if (lower.includes("70b") || lower.includes("strong") || lower.includes("120b") || lower.includes("gemini") || lower === "auto" || lower === "default") {
      const envModel = cleanEnvValue(process.env.GROQ_MODEL);
      return isUsableKey(envModel) && KNOWN_GROQ_MODELS.has(envModel) ? envModel : GROQ_DEFAULT_MODEL;
    }
  }
  const envModel = cleanEnvValue(process.env.GROQ_MODEL);
  return isUsableKey(envModel) && KNOWN_GROQ_MODELS.has(envModel) ? envModel : GROQ_DEFAULT_MODEL;
}

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
 * Classifies an error or HTTP status into a standard diagnostic failure category.
 */
function classifyFailure(status, err) {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403 || (status === 400 && /key|auth|credential|permission/i.test(err?.message || ""))) {
    return "auth_error";
  }
  if (status === 404) return "model_unavailable";
  if (status === 504 || err?.name === "AbortError" || err?.name === "TimeoutError" || /timed?\s*out/i.test(err?.message || "")) {
    return "timeout";
  }
  if (err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED" || err?.code === "ECONNRESET" || /fetch failed|network|connection/i.test(err?.message || "")) {
    return "network_error";
  }
  if (err?.failureCategory === "empty_response" || /empty response|zero tokens/i.test(err?.message || "")) {
    return "empty_response";
  }
  if (err?.failureCategory === "parse_error" || /valid json/i.test(err?.message || "")) {
    return "parse_error";
  }
  if (err?.failureCategory === "malformed_response" || /malformed|unexpected token/i.test(err?.message || "")) {
    return "malformed_response";
  }
  if (status >= 500) return "generation_failure";
  return "api_error";
}

/**
 * Robustly parses and extracts JSON from AI model text, stripping code fences and surrounding prose.
 */
function extractJson(content) {
  if (typeof content !== "string") return null;
  const trimmed = content.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed);
  } catch (_) {}

  // 2. Strip code fences if whole string is wrapped
  if (trimmed.startsWith("```")) {
    const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(unfenced);
    } catch (_) {}
  }

  // 3. Fenced code block embedded inside text
  const matchFenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (matchFenced && matchFenced[1]) {
    try {
      return JSON.parse(matchFenced[1].trim());
    } catch (_) {}
  }

  // 4. Outermost JSON object { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch (_) {}
  }

  // 5. Outermost JSON array [ ... ]
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch (_) {}
  }

  return null;
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

function generateRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
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

function isValidGeminiModelName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length > 64) return false;
  if (/^(AQ\.|AIza|sk-|gsk_)/i.test(trimmed)) return false;
  return /^gemini-[a-z0-9._-]+$/i.test(trimmed);
}

let _warnedInvalidGeminiModel = false;

/**
 * Resolves the correct Gemini model identifier.
 * Validates that GEMINI_MODEL is an actual Gemini model name (not an API key or placeholder).
 */
function resolveGeminiModel(model) {
  let targetModel = GEMINI_DEFAULT_MODEL;
  if (typeof model === "string" && isValidGeminiModelName(model)) {
    targetModel = model.trim();
  } else {
    const envModel = cleanEnvValue(process.env.GEMINI_MODEL);
    if (envModel && envModel !== "[SENSITIVE]") {
      if (isValidGeminiModelName(envModel)) {
        targetModel = envModel;
      } else if (!_warnedInvalidGeminiModel) {
        _warnedInvalidGeminiModel = true;
        logAiEvent("warn", "INVALID_GEMINI_MODEL_CONFIG", {
          reason: "GEMINI_MODEL env var is not a valid Gemini model name; falling back to default",
          fallbackModel: GEMINI_DEFAULT_MODEL,
        });
      }
    }
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
  metaOut,
  requestId,
  apiRoute,
  _isRetry = false,
  _triedModels = null,
}) {
  const diag = { requestId: requestId || undefined, apiRoute: apiRoute || undefined };
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      httpStatus: 500,
      provider: "gemini",
      failureCategory: "auth_error",
      retryable: true,
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
  const combinedSignal = combineSignals(signal, localController.signal);

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
    const failureCategory = isTimeout ? "timeout" : "network_error";
    const msg = isTimeout
      ? `Gemini API request timed out after ${effectiveTimeout}ms`
      : sanitizeKey(err?.message || String(err), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      durationMs,
      timeoutMs: effectiveTimeout,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      error: msg.slice(0, 150),
    });

    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = isTimeout ? 504 : 502;
      metaOut.failureCategory = failureCategory;
    }

    throw Object.assign(new Error(`Gemini connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory,
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
    if (resp.status === 404) {
      const currentIndex = GEMINI_FALLBACK_MODELS.indexOf(targetModel);
      const nextModel = currentIndex >= 0 && currentIndex < GEMINI_FALLBACK_MODELS.length - 1
        ? GEMINI_FALLBACK_MODELS[currentIndex + 1]
        : (currentIndex === -1 && targetModel !== GEMINI_DEFAULT_MODEL ? GEMINI_DEFAULT_MODEL : null);

      if (nextModel && nextModel !== targetModel) {
        logAiEvent("warn", "MODEL_RETRY", {
          ...diag,
          selectedProvider: "auto",
          providerAttempted: "gemini",
          fromModel: targetModel,
          toModel: nextModel,
          status: 404,
        });
        return geminiComplete({
          messages,
          json,
          temperature,
          maxTokens,
          model: nextModel,
          signal,
          timeoutMs,
          usageOut,
          metaOut,
          requestId,
          apiRoute,
          _isRetry: true,
        });
      }
    }

    const rawError = parsedResponse?.error?.message || responseText || `HTTP ${resp.status}`;
    const safeError = sanitizeKey(rawError, apiKey);
    const status = resp.status;
    const failureCategory = classifyFailure(status, { message: safeError });

    logAiEvent("warn", "HTTP_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      status,
      httpStatus: status,
      failureCategory,
      durationMs,
      error: safeError.slice(0, 150),
    });

    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = status;
      metaOut.failureCategory = failureCategory;
    }

    throw Object.assign(new Error(`Gemini error (${status}): ${safeError.slice(0, 300)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : status === 401 ? 401 : status === 403 ? 403 : status >= 500 ? status : 502,
      httpStatus: status,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory,
      retryable: true,
    });
  }

  if (usageOut && typeof usageOut === "object") {
    usageOut.model = targetModel;
    if (parsedResponse?.usageMetadata) {
      const meta = parsedResponse.usageMetadata;
      usageOut.usage = {
        prompt_tokens: meta.promptTokenCount || 0,
        completion_tokens: meta.candidatesTokenCount || 0,
        total_tokens: meta.totalTokenCount || 0,
      };
    }
  }

  const candidate = parsedResponse?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const finishReason = candidate?.finishReason;
  const content = Array.isArray(parts)
    ? parts.map((p) => p.text).filter(Boolean).join("")
    : "";

  // Validate response: Reject empty or generation failure responses so Groq fallback triggers
  if (!content || !content.trim()) {
    const reasonMsg = finishReason ? ` (finishReason: ${finishReason})` : "";
    logAiEvent("warn", "EMPTY_RESPONSE", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      status: resp.status,
      httpStatus: resp.status,
      failureCategory: "empty_response",
      durationMs,
      error: `Gemini returned an empty response${reasonMsg}`,
    });
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = resp.status;
      metaOut.failureCategory = "empty_response";
    }
    throw Object.assign(new Error(`Gemini returned an empty response${reasonMsg}`), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory: "empty_response",
      retryable: true,
    });
  }

  if (json) {
    const parsed = extractJson(content);
    if (parsed !== null) {
      logAiEvent("info", "SUCCESS", {
        ...diag,
        selectedProvider: "auto",
        providerAttempted: "gemini",
        model: targetModel,
        status: 200,
        httpStatus: resp.status,
        durationMs,
        finalProvider: "gemini",
      });
      if (metaOut && typeof metaOut === "object") {
        metaOut.model = targetModel;
        metaOut.durationMs = durationMs;
        metaOut.httpStatus = resp.status;
      }
      return parsed;
    }
    logAiEvent("warn", "PARSE_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      status: resp.status,
      httpStatus: resp.status,
      failureCategory: "parse_error",
      durationMs,
      error: "Gemini did not return valid JSON",
    });
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = resp.status;
      metaOut.failureCategory = "parse_error";
    }
    throw Object.assign(new Error("Gemini did not return valid JSON."), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory: "parse_error",
      retryable: true,
    });
  }

  logAiEvent("info", "SUCCESS", {
    ...diag,
    selectedProvider: "auto",
    providerAttempted: "gemini",
    model: targetModel,
    status: 200,
    httpStatus: resp.status,
    durationMs,
    finalProvider: "gemini",
  });
  if (metaOut && typeof metaOut === "object") {
    metaOut.model = targetModel;
    metaOut.durationMs = durationMs;
    metaOut.httpStatus = resp.status;
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
  metaOut,
  requestId,
  apiRoute,
}) {
  const diag = { requestId: requestId || undefined, apiRoute: apiRoute || undefined };
  const apiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      httpStatus: 500,
      provider: "gemini",
      failureCategory: "auth_error",
      retryable: true,
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
  const combinedSignal = combineSignals(signal, localController.signal);

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
    const failureCategory = isTimeout ? "timeout" : "network_error";
    const msg = isTimeout
      ? `Gemini stream timed out after ${effectiveTimeout}ms`
      : sanitizeKey(err?.message || String(err), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      durationMs,
      timeoutMs: effectiveTimeout,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      stream: true,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini stream connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory,
      retryable: true,
    });
  }

  if (!resp.ok) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const errText = await resp.text().catch(() => "");
    const safeError = sanitizeKey(errText, apiKey);
    const status = resp.status;
    const failureCategory = classifyFailure(status, { message: safeError });

    if (status === 404) {
      const currentIndex = GEMINI_FALLBACK_MODELS.indexOf(targetModel);
      const nextModel = currentIndex >= 0 && currentIndex < GEMINI_FALLBACK_MODELS.length - 1
        ? GEMINI_FALLBACK_MODELS[currentIndex + 1]
        : (currentIndex === -1 && targetModel !== GEMINI_DEFAULT_MODEL ? GEMINI_DEFAULT_MODEL : null);

      if (nextModel && nextModel !== targetModel) {
        logAiEvent("warn", "STREAM_MODEL_RETRY", {
          ...diag,
          selectedProvider: "auto",
          providerAttempted: "gemini",
          fromModel: targetModel,
          toModel: nextModel,
          status: 404,
          stream: true,
        });
        return geminiStream({
          messages,
          temperature,
          maxTokens,
          model: nextModel,
          signal,
          timeoutMs,
          onChunk,
          metaOut,
          requestId,
          apiRoute,
          _isRetry: true,
        });
      }
    }

    logAiEvent("warn", "HTTP_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      status,
      httpStatus: status,
      failureCategory,
      durationMs,
      stream: true,
      error: safeError.slice(0, 150),
    });

    throw Object.assign(new Error(`Gemini stream error (${status}): ${safeError.slice(0, 200)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : status === 401 ? 401 : status === 403 ? 403 : status >= 500 ? status : 502,
      httpStatus: status,
      model: targetModel,
      durationMs,
      provider: "gemini",
      failureCategory,
      retryable: true,
    });
  }

  if (!resp.body || typeof resp.body.getReader !== "function") {
    clearTimeout(timeoutId);
    throw Object.assign(new Error("Gemini stream did not return a readable body."), {
      statusCode: 502,
      provider: "gemini",
      failureCategory: "generation_failure",
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

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // ignore unparseable partial SSE chunk
          continue;
        }
        if (parsed?.error) {
          const errStatus = Number(parsed.error.code) || 502;
          const safeMsg = sanitizeKey(parsed.error.message || "Gemini stream error payload", apiKey);
          const failureCategory = classifyFailure(errStatus, { message: safeMsg });
          throw Object.assign(new Error(`Gemini stream error (${errStatus}): ${safeMsg.slice(0, 200)}`), {
            statusCode: errStatus,
            httpStatus: errStatus,
            model: targetModel,
            durationMs: Date.now() - startTime,
            provider: "gemini",
            failureCategory,
            retryable: true,
          });
        }
        const candidate = parsed?.candidates?.[0];
        const parts = candidate?.content?.parts;
        if (Array.isArray(parts) && typeof onChunk === "function") {
          for (const part of parts) {
            if (part?.text) {
              onChunk(part.text);
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr && jsonStr !== "[DONE]") {
          let parsed = null;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            // ignore unparseable
          }
          if (parsed?.error) {
            const errStatus = Number(parsed.error.code) || 502;
            const safeMsg = sanitizeKey(parsed.error.message || "Gemini stream error payload", apiKey);
            const failureCategory = classifyFailure(errStatus, { message: safeMsg });
            throw Object.assign(new Error(`Gemini stream error (${errStatus}): ${safeMsg.slice(0, 200)}`), {
              statusCode: errStatus,
              httpStatus: errStatus,
              model: targetModel,
              durationMs: Date.now() - startTime,
              provider: "gemini",
              failureCategory,
              retryable: true,
            });
          }
          const candidate = parsed?.candidates?.[0];
          const parts = candidate?.content?.parts;
          if (Array.isArray(parts) && typeof onChunk === "function") {
            for (const part of parts) {
              if (part?.text) {
                onChunk(part.text);
              }
            }
          }
        }
      }
    }
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = Date.now() - startTime;
      metaOut.httpStatus = resp.status;
    }
  } catch (streamErr) {
    const streamDurationMs = Date.now() - startTime;
    if (streamErr?.provider === "gemini") {
      throw streamErr;
    }
    const isTimeout = streamErr?.name === "AbortError" || streamErr?.name === "TimeoutError" || localController.signal.aborted;
    const failureCategory = isTimeout ? "timeout" : classifyFailure(502, streamErr);
    const msg = isTimeout
      ? `Gemini stream timed out after ${effectiveTimeout}ms`
      : sanitizeKey(streamErr?.message || String(streamErr), apiKey);

    logAiEvent("warn", isTimeout ? "STREAM_TIMEOUT" : "STREAM_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "gemini",
      model: targetModel,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      durationMs: streamDurationMs,
      stream: true,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(msg), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs: streamDurationMs,
      provider: "gemini",
      failureCategory,
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

let _groqModelsCache = null;
let _groqModelsCacheAt = 0;
const GROQ_MODELS_CACHE_TTL_MS = 5 * 60 * 1000;

async function discoverGroqFallbackModel(apiKey, excludeModels = new Set(), signal) {
  const preferredOrder = [
    GROQ_DEFAULT_MODEL,
    GROQ_FAST_MODEL,
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
  ];

  const now = Date.now();
  let availableIds = _groqModelsCache && now - _groqModelsCacheAt < GROQ_MODELS_CACHE_TTL_MS
    ? _groqModelsCache
    : null;

  if (!availableIds) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => null);
        if (Array.isArray(data?.data)) {
          availableIds = data.data
            .map((m) => m && m.id)
            .filter((id) => typeof id === "string" && !/whisper|guard|tts|safeguard|distil-whisper|orpheus/i.test(id));
          _groqModelsCache = availableIds;
          _groqModelsCacheAt = now;
        }
      }
    } catch {
      availableIds = null;
    }
  }

  if (Array.isArray(availableIds) && availableIds.length > 0) {
    for (const pref of preferredOrder) {
      if (!excludeModels.has(pref) && availableIds.includes(pref)) {
        return pref;
      }
    }
    const firstAvailable = availableIds.find((id) => !excludeModels.has(id));
    if (firstAvailable) return firstAvailable;
  }

  for (const pref of preferredOrder) {
    if (!excludeModels.has(pref)) return pref;
  }
  return null;
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
  metaOut,
  requestId,
  apiRoute,
  _isRetry = false,
  _triedModels = null,
}) {
  const diag = { requestId: requestId || undefined, apiRoute: apiRoute || undefined };
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GROQ_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      httpStatus: 500,
      provider: "groq",
      failureCategory: "auth_error",
      retryable: false,
    });
  }

  // Groq requires the word "json" in messages when response_format=json_object is used.
  const hasJsonWord = Array.isArray(messages) && messages.some((m) => typeof m?.content === "string" && /json/i.test(m.content));

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
  const combinedSignal = combineSignals(signal, localController.signal);

  const targetModel = resolveGroqModel(model);
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
        temperature: Math.max(0, Math.min(2, Number(temperature) || 0.6)),
        max_tokens: Math.max(1, Math.min(4096, Number(maxTokens) || 3000)),
        response_format: json && hasJsonWord ? { type: "json_object" } : undefined,
        ...(extraBody || {}),
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = networkErr?.name === "AbortError" || networkErr?.name === "TimeoutError";
    const failureCategory = isTimeout ? "timeout" : "network_error";
    const msg = isTimeout
      ? `Groq request timed out after ${effectiveTimeout}ms`
      : sanitizeKey(networkErr?.message || String(networkErr), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      durationMs,
      timeoutMs: effectiveTimeout,
      error: msg.slice(0, 150),
    });

    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = isTimeout ? 504 : 502;
      metaOut.failureCategory = failureCategory;
    }

    throw Object.assign(new Error(`Groq connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory,
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
    const failureCategory = classifyFailure(status, { message: safeError });

    // Automatic resilience: If Groq returns 404 (model decommissioned or not allowed), discover & retry with an allowed model
    const triedSet = _triedModels instanceof Set ? _triedModels : new Set([targetModel]);
    triedSet.add(targetModel);
    if (status === 404 && triedSet.size < 3) {
      const staticFallback = targetModel !== GROQ_DEFAULT_MODEL ? GROQ_DEFAULT_MODEL : GROQ_FAST_MODEL;
      const fallbackTarget = !triedSet.has(staticFallback) && triedSet.size === 1
        ? staticFallback
        : await discoverGroqFallbackModel(apiKey, triedSet, signal);
      if (fallbackTarget && !triedSet.has(fallbackTarget)) {
        logAiEvent("warn", "GROQ_MODEL_RETRY", {
          ...diag,
          selectedProvider: "auto",
          providerAttempted: "groq",
          fromModel: targetModel,
          toModel: fallbackTarget,
          status: 404,
        });
        return groqComplete({
          messages,
          json,
          temperature,
          maxTokens,
          model: fallbackTarget,
          extra,
          signal,
          timeoutMs,
          usageOut,
          metaOut,
          requestId,
          apiRoute,
          _isRetry: true,
          _triedModels: triedSet,
        });
      }
    }

    logAiEvent("warn", "HTTP_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status,
      httpStatus: status,
      failureCategory,
      durationMs,
      error: safeError.slice(0, 150),
    });

    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = status;
      metaOut.failureCategory = failureCategory;
    }

    throw Object.assign(new Error(`Groq error (${status}): ${safeError.slice(0, 300)}`), {
      statusCode:
        status === 429
          ? 429
          : status === 503
          ? 503
          : status === 401
          ? 401
          : status === 403
          ? 403
          : status === 404
          ? 404
          : status >= 500
          ? status
          : 502,
      httpStatus: status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory,
      retryable: status === 429 || status >= 500,
    });
  }

  let data = null;
  try {
    data = await resp.json();
  } catch (parseErr) {
    logAiEvent("warn", "MALFORMED_RESPONSE", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: resp.status,
      httpStatus: resp.status,
      failureCategory: "malformed_response",
      durationMs,
      error: "Groq response was not valid JSON",
    });
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = resp.status;
      metaOut.failureCategory = "malformed_response";
    }
    throw Object.assign(new Error("Groq API response was malformed."), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory: "malformed_response",
      retryable: true,
    });
  }

  if (usageOut && typeof usageOut === "object") {
    usageOut.usage = data && data.usage ? data.usage : null;
  }

  const content = data?.choices?.[0]?.message?.content || "";
  if (!content || !content.trim()) {
    logAiEvent("warn", "EMPTY_RESPONSE", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: resp.status,
      httpStatus: resp.status,
      failureCategory: "empty_response",
      durationMs,
      error: "Groq returned an empty response",
    });
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = resp.status;
      metaOut.failureCategory = "empty_response";
    }
    throw Object.assign(new Error("Groq returned an empty response."), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory: "empty_response",
      retryable: true,
    });
  }

  if (json) {
    const parsed = extractJson(content);
    if (parsed !== null) {
      logAiEvent("info", "SUCCESS", {
        ...diag,
        selectedProvider: "auto",
        providerAttempted: "groq",
        model: targetModel,
        status: 200,
        httpStatus: resp.status,
        durationMs,
        finalProvider: "groq",
      });
      if (metaOut && typeof metaOut === "object") {
        metaOut.model = targetModel;
        metaOut.durationMs = durationMs;
        metaOut.httpStatus = resp.status;
      }
      return parsed;
    }
    logAiEvent("warn", "PARSE_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: resp.status,
      httpStatus: resp.status,
      failureCategory: "parse_error",
      durationMs,
      error: "Groq response did not contain valid JSON",
    });
    if (metaOut && typeof metaOut === "object") {
      metaOut.model = targetModel;
      metaOut.durationMs = durationMs;
      metaOut.httpStatus = resp.status;
      metaOut.failureCategory = "parse_error";
    }
    throw Object.assign(new Error("Groq did not return valid JSON."), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory: "parse_error",
      retryable: true,
    });
  }

  logAiEvent("info", "SUCCESS", {
    ...diag,
    selectedProvider: "auto",
    providerAttempted: "groq",
    model: targetModel,
    status: 200,
    httpStatus: resp.status,
    durationMs,
    finalProvider: "groq",
  });
  if (metaOut && typeof metaOut === "object") {
    metaOut.model = targetModel;
    metaOut.durationMs = durationMs;
    metaOut.httpStatus = resp.status;
  }
  return content;
}

/**
 * Streams tokens from Groq API via SSE.
 * Calls onChunk(deltaText) for each incremental token.
 */
async function groqStream({
  messages,
  temperature = 0.65,
  maxTokens = 2048,
  model,
  signal,
  timeoutMs,
  onChunk,
  extra,
  metaOut,
  requestId,
  apiRoute,
  _isRetry = false,
  _triedModels = null,
}) {
  const diag = { requestId: requestId || undefined, apiRoute: apiRoute || undefined };
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  if (!isUsableKey(apiKey)) {
    throw Object.assign(new Error("GROQ_API_KEY is not configured or is a placeholder."), {
      statusCode: 500,
      httpStatus: 500,
      provider: "groq",
      failureCategory: "auth_error",
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
  const combinedSignal = combineSignals(signal, localController.signal);

  const targetModel = resolveGroqModel(model);
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
        temperature: Math.max(0, Math.min(2, Number(temperature) || 0.65)),
        max_tokens: Math.max(1, Math.min(4096, Number(maxTokens) || 2048)),
        stream: true,
        ...(extraBody || {}),
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    const failureCategory = isTimeout ? "timeout" : "network_error";
    const msg = isTimeout
      ? `Groq stream request timed out after ${effectiveTimeout}ms`
      : sanitizeKey(err?.message || String(err), apiKey);

    logAiEvent("warn", isTimeout ? "TIMEOUT" : "CONNECT_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      durationMs,
      timeoutMs: effectiveTimeout,
      stream: true,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(`Groq stream connection error: ${msg}`), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory,
      retryable: true,
    });
  }

  const durationMs = Date.now() - startTime;

  if (!resp.ok) {
    clearTimeout(timeoutId);
    const errText = await resp.text().catch(() => "");
    const safeError = sanitizeKey(errText, apiKey);
    const status = resp.status;
    const failureCategory = classifyFailure(status, { message: safeError });

    const triedSet = _triedModels instanceof Set ? _triedModels : new Set([targetModel]);
    triedSet.add(targetModel);
    if (status === 404 && triedSet.size < 3) {
      const staticFallback = targetModel !== GROQ_DEFAULT_MODEL ? GROQ_DEFAULT_MODEL : GROQ_FAST_MODEL;
      const fallbackTarget = !triedSet.has(staticFallback) && triedSet.size === 1
        ? staticFallback
        : await discoverGroqFallbackModel(apiKey, triedSet, signal);
      if (fallbackTarget && !triedSet.has(fallbackTarget)) {
        logAiEvent("warn", "GROQ_MODEL_RETRY", {
          ...diag,
          selectedProvider: "auto",
          providerAttempted: "groq",
          fromModel: targetModel,
          toModel: fallbackTarget,
          status: 404,
          stream: true,
        });
        return groqStream({
          messages,
          temperature,
          maxTokens,
          model: fallbackTarget,
          signal,
          timeoutMs,
          onChunk,
          extra,
          metaOut,
          requestId,
          apiRoute,
          _isRetry: true,
          _triedModels: triedSet,
        });
      }
    }

    logAiEvent("warn", "HTTP_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status,
      httpStatus: status,
      failureCategory,
      durationMs,
      stream: true,
      error: safeError.slice(0, 150),
    });

    throw Object.assign(new Error(`Groq stream error (${status}): ${safeError.slice(0, 200)}`), {
      statusCode: status === 429 ? 429 : status === 404 ? 404 : status === 401 ? 401 : status === 403 ? 403 : status >= 500 ? status : 502,
      httpStatus: status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory,
      retryable: true,
    });
  }

  if (!resp.body || typeof resp.body.getReader !== "function") {
    clearTimeout(timeoutId);
    throw Object.assign(new Error("Groq stream did not return a readable body."), {
      statusCode: 502,
      httpStatus: resp.status,
      model: targetModel,
      durationMs,
      provider: "groq",
      failureCategory: "generation_failure",
      retryable: true,
    });
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let tokenCount = 0;

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

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // ignore unparseable partial chunk
          continue;
        }
        if (parsed?.error) {
          const errStatus = Number(parsed.error.code) || 502;
          const safeMsg = sanitizeKey(parsed.error.message || "Groq stream error payload", apiKey);
          const failureCategory = classifyFailure(errStatus, { message: safeMsg });
          throw Object.assign(new Error(`Groq stream error (${errStatus}): ${safeMsg.slice(0, 200)}`), {
            statusCode: errStatus,
            httpStatus: errStatus,
            model: targetModel,
            durationMs: Date.now() - startTime,
            provider: "groq",
            failureCategory,
            retryable: true,
          });
        }
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          tokenCount++;
          if (typeof onChunk === "function") {
            onChunk(delta);
          }
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr && jsonStr !== "[DONE]") {
          let parsed = null;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {}
          if (parsed?.error) {
            const errStatus = Number(parsed.error.code) || 502;
            const safeMsg = sanitizeKey(parsed.error.message || "Groq stream error payload", apiKey);
            const failureCategory = classifyFailure(errStatus, { message: safeMsg });
            throw Object.assign(new Error(`Groq stream error (${errStatus}): ${safeMsg.slice(0, 200)}`), {
              statusCode: errStatus,
              httpStatus: errStatus,
              model: targetModel,
              durationMs: Date.now() - startTime,
              provider: "groq",
              failureCategory,
              retryable: true,
            });
          }
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            tokenCount++;
            if (typeof onChunk === "function") {
              onChunk(delta);
            }
          }
        }
      }
    }

    if (tokenCount === 0) {
      throw Object.assign(new Error("Groq stream completed with zero tokens."), {
        statusCode: 502,
        httpStatus: resp.status,
        model: targetModel,
        durationMs: Date.now() - startTime,
        provider: "groq",
        failureCategory: "empty_response",
        retryable: true,
      });
    }
  } catch (streamErr) {
    const streamDurationMs = Date.now() - startTime;
    if (streamErr?.provider === "groq") {
      logAiEvent("warn", "STREAM_ERROR", {
        ...diag,
        selectedProvider: "auto",
        providerAttempted: "groq",
        model: targetModel,
        status: streamErr.statusCode || 502,
        httpStatus: streamErr.httpStatus || 502,
        failureCategory: streamErr.failureCategory || "generation_failure",
        durationMs: streamDurationMs,
        stream: true,
        error: String(streamErr.message || "").slice(0, 150),
      });
      throw streamErr;
    }
    const isTimeout = streamErr?.name === "AbortError" || streamErr?.name === "TimeoutError" || localController.signal.aborted;
    const failureCategory = isTimeout ? "timeout" : classifyFailure(502, streamErr);
    const msg = isTimeout
      ? `Groq stream timed out after ${effectiveTimeout}ms`
      : sanitizeKey(streamErr?.message || String(streamErr), apiKey);

    logAiEvent("warn", isTimeout ? "STREAM_TIMEOUT" : "STREAM_ERROR", {
      ...diag,
      selectedProvider: "auto",
      providerAttempted: "groq",
      model: targetModel,
      status: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      failureCategory,
      durationMs: streamDurationMs,
      stream: true,
      error: msg.slice(0, 150),
    });

    throw Object.assign(new Error(msg), {
      statusCode: isTimeout ? 504 : 502,
      httpStatus: isTimeout ? 504 : 502,
      model: targetModel,
      durationMs: streamDurationMs,
      provider: "groq",
      failureCategory,
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const totalDurationMs = Date.now() - startTime;
  if (metaOut && typeof metaOut === "object") {
    metaOut.model = targetModel;
    metaOut.durationMs = totalDurationMs;
    metaOut.httpStatus = resp.status;
  }

  logAiEvent("info", "SUCCESS", {
    ...diag,
    selectedProvider: "auto",
    providerAttempted: "groq",
    model: targetModel,
    status: 200,
    httpStatus: resp.status,
    durationMs: totalDurationMs,
    stream: true,
    finalProvider: "groq",
  });
}

/**
 * Centralized unified completion helper.
 *
 * Provider Priority:
 *   1. Google Gemini (Primary)
 *   2. Groq (Automatic Fallback)
 *
 * Automatically fails over to Groq on ANY recoverable Gemini error:
 * timeouts, rate limits (429), 5xx server errors, 400 invalid request/key,
 * network issues, empty responses, and parse errors.
 */
async function aiComplete(options = {}) {
  const requestId = options.requestId || generateRequestId();
  const apiRoute = options.apiRoute || "unknown";
  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);
  const diagnostics = {
    requestId,
    apiRoute,
    stream: false,
    gemini: { attempted: false, status: null, httpStatus: null, model: null, durationMs: null, failureCategory: null },
    fallbackTriggered: false,
    groq: { attempted: false, status: null, httpStatus: null, model: null, durationMs: null, failureCategory: null },
    finalProvider: "none",
  };

  const attachDiagnostics = (target) => {
    if (target && typeof target === "object") {
      target.diagnostics = diagnostics;
    }
  };

  // Manual provider selection: respect user choice without silent rerouting
  const isExplicitGroq = (options.provider === "groq" || (options.manual === true && options.model && !String(options.model).toLowerCase().includes("gemini"))) && options.allowFallback !== true;
  if (isExplicitGroq) {
    if (!hasGroq) {
      throw Object.assign(new Error("Groq provider is requested but GROQ_API_KEY is not configured."), { statusCode: 500, retryable: false, diagnostics });
    }
    logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "groq", providerAttempted: "groq", isManual: true });
    const model = resolveGroqModel(options.model);
    const groqMeta = {};
    const groqStart = Date.now();
    try {
      const result = await groqComplete({
        ...options,
        model,
        timeoutMs: options.groqTimeoutMs ?? options.timeoutMs,
        metaOut: groqMeta,
        requestId,
        apiRoute,
      });
      diagnostics.groq = { attempted: true, status: "ok", httpStatus: groqMeta.httpStatus || 200, model: groqMeta.model || model, durationMs: groqMeta.durationMs ?? (Date.now() - groqStart), failureCategory: null };
      diagnostics.finalProvider = "groq";
      if (options.metaOut && typeof options.metaOut === "object") {
        options.metaOut.provider = "groq";
        options.metaOut.model = model;
        attachDiagnostics(options.metaOut);
      }
      return result;
    } catch (err) {
      diagnostics.groq = { attempted: true, status: "error", httpStatus: err.httpStatus || err.statusCode || 502, model: err.model || model, durationMs: err.durationMs ?? (Date.now() - groqStart), failureCategory: err.failureCategory || "api_error" };
      attachDiagnostics(err);
      throw err;
    }
  }

  const isExplicitGemini = (options.provider === "gemini" || (options.manual === true && options.model && String(options.model).toLowerCase().includes("gemini"))) && options.allowFallback !== true;
  if (isExplicitGemini) {
    if (!hasGemini) {
      throw Object.assign(new Error("Gemini provider is requested but GEMINI_API_KEY is not configured."), { statusCode: 500, retryable: false, diagnostics });
    }
    logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "gemini", providerAttempted: "gemini", isManual: true });
    const model = resolveGeminiModel(options.model);
    const geminiMeta = {};
    const geminiStart = Date.now();
    try {
      const result = await geminiComplete({
        ...options,
        model,
        timeoutMs: options.geminiTimeoutMs ?? options.timeoutMs,
        metaOut: geminiMeta,
        requestId,
        apiRoute,
      });
      diagnostics.gemini = { attempted: true, status: "ok", httpStatus: geminiMeta.httpStatus || 200, model: geminiMeta.model || model, durationMs: geminiMeta.durationMs ?? (Date.now() - geminiStart), failureCategory: null };
      diagnostics.finalProvider = "gemini";
      if (options.metaOut && typeof options.metaOut === "object") {
        options.metaOut.provider = "gemini";
        options.metaOut.model = model;
        attachDiagnostics(options.metaOut);
      }
      return result;
    } catch (err) {
      diagnostics.gemini = { attempted: true, status: "error", httpStatus: err.httpStatus || err.statusCode || 502, model: err.model || model, durationMs: err.durationMs ?? (Date.now() - geminiStart), failureCategory: err.failureCategory || "api_error" };
      attachDiagnostics(err);
      throw err;
    }
  }

  if (!hasGemini && !hasGroq) {
    logAiEvent("error", "NO_CONFIG", {
      requestId,
      apiRoute,
      error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.",
    });
    throw Object.assign(
      new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in the environment."),
      { statusCode: 500, retryable: false, diagnostics }
    );
  }

  // 1) Try Google Gemini first if configured
  if (hasGemini) {
    const geminiStart = Date.now();
    const geminiMeta = {};
    try {
      logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "auto", providerAttempted: "gemini", isPrimary: true });
      const geminiUsage = options.usageOut || {};
      const result = await geminiComplete({
        ...options,
        timeoutMs: options.geminiTimeoutMs ?? options.timeoutMs,
        usageOut: geminiUsage,
        metaOut: geminiMeta,
        requestId,
        apiRoute,
      });
      const geminiDurationMs = geminiMeta.durationMs ?? (Date.now() - geminiStart);
      const usedModel = geminiMeta.model || geminiUsage.model || resolveGeminiModel(options.model);
      diagnostics.gemini = { attempted: true, status: "ok", httpStatus: geminiMeta.httpStatus || 200, model: usedModel, durationMs: geminiDurationMs, failureCategory: null };
      diagnostics.finalProvider = "gemini";
      if (options.metaOut && typeof options.metaOut === "object") {
        options.metaOut.provider = "gemini";
        options.metaOut.model = usedModel;
        if (geminiUsage.usage) options.metaOut.usage = geminiUsage.usage;
        attachDiagnostics(options.metaOut);
      }
      logAiEvent("info", "REQUEST_SUMMARY", {
        requestId,
        apiRoute,
        stream: false,
        geminiStatus: "ok",
        geminiHttpStatus: diagnostics.gemini.httpStatus,
        geminiModel: usedModel,
        geminiDurationMs,
        fallbackTriggered: false,
        finalProvider: "gemini",
      });
      return result;
    } catch (geminiErr) {
      const geminiDurationMs = geminiErr?.durationMs ?? (Date.now() - geminiStart);
      const safeGeminiError = sanitizeKey(
        geminiErr?.message || "Unknown Gemini error",
        cleanEnvValue(process.env.GEMINI_API_KEY)
      );
      const failureCategory = geminiErr?.failureCategory || classifyFailure(geminiErr?.statusCode || 502, geminiErr);
      const geminiHttpStatus = geminiErr?.httpStatus || geminiErr?.statusCode || 502;
      const geminiModel = geminiErr?.model || geminiMeta.model || resolveGeminiModel(options.model);

      diagnostics.gemini = {
        attempted: true,
        status: "error",
        httpStatus: geminiHttpStatus,
        model: geminiModel,
        durationMs: geminiDurationMs,
        failureCategory,
      };

      // If Groq is configured, trigger automatic fallback
      if (hasGroq) {
        diagnostics.fallbackTriggered = true;
        logAiEvent("warn", "FALLBACK_TRIGGERED", {
          requestId,
          apiRoute,
          selectedProvider: "auto",
          primary: "gemini",
          fallback: "groq",
          statusCode: geminiErr.statusCode || 502,
          httpStatus: geminiHttpStatus,
          model: geminiModel,
          failureCategory,
          durationMs: geminiDurationMs,
          reason: safeGeminiError.slice(0, 150),
        });

        const groqStart = Date.now();
        const fallbackModel = resolveGroqModel(options.model);
        const groqMeta = {};
        try {
          const fallbackOptions = {
            ...options,
            model: fallbackModel,
            timeoutMs: options.groqTimeoutMs ?? options.timeoutMs,
            metaOut: groqMeta,
            requestId,
            apiRoute,
            // Never inherit an aborted signal from the failed Gemini call; give Groq a clean execution budget
            signal: options.signal && !options.signal.aborted ? options.signal : undefined,
          };
          const result = await groqComplete(fallbackOptions);
          const groqDurationMs = groqMeta.durationMs ?? (Date.now() - groqStart);
          const usedGroqModel = groqMeta.model || fallbackModel;
          diagnostics.groq = {
            attempted: true,
            status: "ok",
            httpStatus: groqMeta.httpStatus || 200,
            model: usedGroqModel,
            durationMs: groqDurationMs,
            failureCategory: null,
          };
          diagnostics.finalProvider = "groq";

          logAiEvent("info", "FALLBACK_SUCCESS", {
            requestId,
            apiRoute,
            selectedProvider: "auto",
            providerAttempted: "groq",
            model: usedGroqModel,
            fallbackSucceeded: true,
            status: 200,
            httpStatus: diagnostics.groq.httpStatus,
            durationMs: groqDurationMs,
            finalProvider: "groq",
          });
          logAiEvent("info", "REQUEST_SUMMARY", {
            requestId,
            apiRoute,
            stream: false,
            geminiStatus: "error",
            geminiHttpStatus,
            geminiModel,
            geminiDurationMs,
            geminiFailureCategory: failureCategory,
            fallbackTriggered: true,
            groqStatus: "ok",
            groqHttpStatus: diagnostics.groq.httpStatus,
            groqModel: usedGroqModel,
            groqDurationMs,
            finalProvider: "groq",
          });
          if (options.metaOut && typeof options.metaOut === "object") {
            options.metaOut.provider = "groq";
            options.metaOut.model = usedGroqModel;
            attachDiagnostics(options.metaOut);
          }
          return result;
        } catch (groqErr) {
          const groqDurationMs = groqErr?.durationMs ?? (Date.now() - groqStart);
          const safeGroqError = sanitizeKey(
            groqErr?.message || "Unknown Groq error",
            cleanEnvValue(process.env.GROQ_API_KEY)
          );
          const groqFailureCategory = groqErr?.failureCategory || classifyFailure(groqErr?.statusCode || 502, groqErr);
          const groqHttpStatus = groqErr?.httpStatus || groqErr?.statusCode || 502;
          const groqModel = groqErr?.model || groqMeta.model || fallbackModel;

          diagnostics.groq = {
            attempted: true,
            status: "error",
            httpStatus: groqHttpStatus,
            model: groqModel,
            durationMs: groqDurationMs,
            failureCategory: groqFailureCategory,
          };

          logAiEvent("error", "ALL_FAILED", {
            requestId,
            apiRoute,
            selectedProvider: "auto",
            primary: "gemini",
            fallback: "groq",
            finalProvider: "none",
            geminiHttpStatus,
            geminiModel,
            geminiFailureCategory: failureCategory,
            geminiDurationMs,
            groqHttpStatus,
            groqModel,
            groqFailureCategory,
            groqDurationMs,
            geminiError: safeGeminiError.slice(0, 120),
            groqError: safeGroqError.slice(0, 120),
            statusCode: 503,
          });

          throw Object.assign(
            new Error(
              `AI providers unavailable: ${safeGeminiError.slice(0, 120)}; Groq fallback: ${safeGroqError.slice(0, 120)}`
            ),
            { statusCode: 503, retryable: true, diagnostics }
          );
        }
      }

      // Gemini failed and no Groq fallback configured
      logAiEvent("error", "PROVIDER_FAILED_NO_FALLBACK", {
        requestId,
        apiRoute,
        selectedProvider: "auto",
        providerAttempted: "gemini",
        statusCode: geminiErr.statusCode || 502,
        httpStatus: geminiHttpStatus,
        model: geminiModel,
        durationMs: geminiDurationMs,
        failureCategory,
        reason: safeGeminiError.slice(0, 150),
      });
      attachDiagnostics(geminiErr);
      throw geminiErr;
    }
  }

  // 2) Default to Groq if Gemini is not configured
  logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "auto", providerAttempted: "groq", reason: "Gemini unconfigured" });
  const targetGroqModel = resolveGroqModel(options.model);
  const groqMeta = {};
  const groqStart = Date.now();
  try {
    const result = await groqComplete({
      ...options,
      model: targetGroqModel,
      timeoutMs: options.groqTimeoutMs ?? options.timeoutMs,
      metaOut: groqMeta,
      requestId,
      apiRoute,
    });
    diagnostics.groq = { attempted: true, status: "ok", httpStatus: groqMeta.httpStatus || 200, model: groqMeta.model || targetGroqModel, durationMs: groqMeta.durationMs ?? (Date.now() - groqStart), failureCategory: null };
    diagnostics.finalProvider = "groq";
    if (options.metaOut && typeof options.metaOut === "object") {
      options.metaOut.provider = "groq";
      options.metaOut.model = targetGroqModel;
      attachDiagnostics(options.metaOut);
    }
    return result;
  } catch (groqErr) {
    diagnostics.groq = { attempted: true, status: "error", httpStatus: groqErr.httpStatus || groqErr.statusCode || 502, model: groqErr.model || targetGroqModel, durationMs: groqErr.durationMs ?? (Date.now() - groqStart), failureCategory: groqErr.failureCategory || "api_error" };
    attachDiagnostics(groqErr);
    throw groqErr;
  }
}

/**
 * Centralized unified streaming helper.
 *
 * Provider Priority:
 *   1. Google Gemini (Primary)
 *   2. Groq (Automatic Fallback)
 *
 * Handles both:
 *   - Pre-token failover: Gemini fails before sending any chunk -> seamless Groq stream.
 *   - Mid-stream failover: Gemini fails after sending some chunks -> explicit provider switch event
 *     (notifies caller via onProviderSwitch to reset client buffer), then cleanly streams Groq.
 */
async function aiStream(options = {}) {
  const {
    messages,
    temperature = 0.65,
    maxTokens = 2048,
    model,
    provider = "auto",
    allowFallback = true,
    signal,
    timeoutMs,
    geminiTimeoutMs,
    groqTimeoutMs,
    onChunk,
    onProviderSwitch,
    metaOut,
  } = options;

  const requestId = options.requestId || generateRequestId();
  const apiRoute = options.apiRoute || "unknown";
  const hasGemini = isUsableKey(process.env.GEMINI_API_KEY);
  const hasGroq = isUsableKey(process.env.GROQ_API_KEY);
  const diagnostics = {
    requestId,
    apiRoute,
    stream: true,
    gemini: { attempted: false, status: null, httpStatus: null, model: null, durationMs: null, failureCategory: null },
    fallbackTriggered: false,
    groq: { attempted: false, status: null, httpStatus: null, model: null, durationMs: null, failureCategory: null },
    finalProvider: "none",
  };

  const attachDiagnostics = (target) => {
    if (target && typeof target === "object") {
      target.diagnostics = diagnostics;
    }
  };

  const isExplicitGroq = (provider === "groq" || (options.manual === true && model && !String(model).toLowerCase().includes("gemini"))) && allowFallback !== true;
  if (isExplicitGroq) {
    if (!hasGroq) {
      throw Object.assign(new Error("Groq provider requested but GROQ_API_KEY is not configured."), { statusCode: 500, retryable: false, diagnostics });
    }
    logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "groq", providerAttempted: "groq", isManual: true, stream: true });
    return await groqStream({
      ...options,
      model: resolveGroqModel(model),
      timeoutMs: groqTimeoutMs ?? timeoutMs,
      requestId,
      apiRoute,
      metaOut,
    });
  }

  const isExplicitGemini = (provider === "gemini" || (options.manual === true && model && String(model).toLowerCase().includes("gemini"))) && allowFallback !== true;
  if (isExplicitGemini) {
    if (!hasGemini) {
      throw Object.assign(new Error("Gemini provider requested but GEMINI_API_KEY is not configured."), { statusCode: 500, retryable: false, diagnostics });
    }
    logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "gemini", providerAttempted: "gemini", isManual: true, stream: true });
    return await geminiStream({
      ...options,
      timeoutMs: geminiTimeoutMs ?? timeoutMs,
      requestId,
      apiRoute,
      metaOut,
    });
  }

  if (!hasGemini && !hasGroq) {
    logAiEvent("error", "NO_CONFIG", {
      requestId,
      apiRoute,
      stream: true,
      error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured.",
    });
    throw Object.assign(new Error("Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in the environment."), { statusCode: 500, retryable: false, diagnostics });
  }

  // Auto mode: Priority 1 Gemini -> Priority 2 Groq
  if (hasGemini) {
    let tokenCount = 0;
    const geminiStart = Date.now();
    const geminiMeta = {};
    try {
      logAiEvent("info", "ATTEMPT", {
        requestId,
        apiRoute,
        selectedProvider: "auto",
        providerAttempted: "gemini",
        isPrimary: true,
        stream: true,
      });

      await geminiStream({
        ...options,
        timeoutMs: geminiTimeoutMs ?? timeoutMs,
        metaOut: geminiMeta,
        requestId,
        apiRoute,
        onChunk: (chunkText) => {
          tokenCount++;
          if (typeof onChunk === "function") {
            onChunk(chunkText);
          }
        },
      });

      // Validate stream output: if Gemini returned 0 tokens, treat as empty response failure
      if (tokenCount === 0) {
        throw Object.assign(new Error("Gemini stream completed with zero tokens."), {
          statusCode: 502,
          httpStatus: geminiMeta.httpStatus || 200,
          model: geminiMeta.model || resolveGeminiModel(model),
          durationMs: Date.now() - geminiStart,
          provider: "gemini",
          failureCategory: "empty_response",
          retryable: true,
        });
      }

      const geminiDurationMs = geminiMeta.durationMs ?? (Date.now() - geminiStart);
      const usedGeminiModel = geminiMeta.model || resolveGeminiModel(model);
      diagnostics.gemini = {
        attempted: true,
        status: "ok",
        httpStatus: geminiMeta.httpStatus || 200,
        model: usedGeminiModel,
        durationMs: geminiDurationMs,
        failureCategory: null,
      };
      diagnostics.finalProvider = "gemini";
      attachDiagnostics(metaOut);

      logAiEvent("info", "SUCCESS", {
        requestId,
        apiRoute,
        selectedProvider: "auto",
        providerAttempted: "gemini",
        model: usedGeminiModel,
        status: 200,
        httpStatus: diagnostics.gemini.httpStatus,
        durationMs: geminiDurationMs,
        stream: true,
        finalProvider: "gemini",
      });
      return;
    } catch (geminiErr) {
      const geminiDurationMs = geminiErr?.durationMs ?? (Date.now() - geminiStart);
      const safeGeminiError = sanitizeKey(
        geminiErr?.message || "Unknown Gemini stream error",
        cleanEnvValue(process.env.GEMINI_API_KEY)
      );
      const failureCategory = geminiErr?.failureCategory || classifyFailure(geminiErr?.statusCode || 502, geminiErr);
      const geminiHttpStatus = geminiErr?.httpStatus || geminiErr?.statusCode || 502;
      const usedGeminiModel = geminiErr?.model || geminiMeta.model || resolveGeminiModel(model);

      diagnostics.gemini = {
        attempted: true,
        status: "error",
        httpStatus: geminiHttpStatus,
        model: usedGeminiModel,
        durationMs: geminiDurationMs,
        failureCategory,
      };

      if (hasGroq) {
        diagnostics.fallbackTriggered = true;
        logAiEvent("warn", "FALLBACK_TRIGGERED", {
          requestId,
          apiRoute,
          selectedProvider: "auto",
          primary: "gemini",
          fallback: "groq",
          statusCode: geminiErr.statusCode || 502,
          httpStatus: geminiHttpStatus,
          model: usedGeminiModel,
          failureCategory,
          durationMs: geminiDurationMs,
          stream: true,
          tokensStreamedBeforeFailure: tokenCount,
          reason: safeGeminiError.slice(0, 150),
        });

        // If tokens were already sent, explicitly notify caller/client of provider switch
        if (tokenCount > 0 && typeof onProviderSwitch === "function") {
          onProviderSwitch({
            from: "gemini",
            to: "groq",
            tokensStreamed: tokenCount,
            reason: safeGeminiError.slice(0, 100),
          });
        }

        const groqStart = Date.now();
        const fallbackModel = resolveGroqModel(model);
        const groqMeta = {};
        try {
          const fallbackOptions = {
            ...options,
            model: fallbackModel,
            timeoutMs: groqTimeoutMs ?? timeoutMs,
            metaOut: groqMeta,
            requestId,
            apiRoute,
            signal: options.signal && !options.signal.aborted ? options.signal : undefined,
          };
          await groqStream(fallbackOptions);

          const groqDurationMs = groqMeta.durationMs ?? (Date.now() - groqStart);
          const usedGroqModel = groqMeta.model || fallbackModel;
          diagnostics.groq = {
            attempted: true,
            status: "ok",
            httpStatus: groqMeta.httpStatus || 200,
            model: usedGroqModel,
            durationMs: groqDurationMs,
            failureCategory: null,
          };
          diagnostics.finalProvider = "groq";
          attachDiagnostics(metaOut);

          logAiEvent("info", "FALLBACK_SUCCESS", {
            requestId,
            apiRoute,
            selectedProvider: "auto",
            providerAttempted: "groq",
            model: usedGroqModel,
            fallbackSucceeded: true,
            status: 200,
            httpStatus: diagnostics.groq.httpStatus,
            durationMs: groqDurationMs,
            stream: true,
            finalProvider: "groq",
          });
          return;
        } catch (groqErr) {
          const groqDurationMs = groqErr?.durationMs ?? (Date.now() - groqStart);
          const safeGroqError = sanitizeKey(
            groqErr?.message || "Unknown Groq stream error",
            cleanEnvValue(process.env.GROQ_API_KEY)
          );
          const groqFailureCategory = groqErr?.failureCategory || classifyFailure(groqErr?.statusCode || 502, groqErr);
          const groqHttpStatus = groqErr?.httpStatus || groqErr?.statusCode || 502;
          const usedGroqModel = groqErr?.model || groqMeta.model || fallbackModel;

          diagnostics.groq = {
            attempted: true,
            status: "error",
            httpStatus: groqHttpStatus,
            model: usedGroqModel,
            durationMs: groqDurationMs,
            failureCategory: groqFailureCategory,
          };

          logAiEvent("error", "ALL_FAILED", {
            requestId,
            apiRoute,
            selectedProvider: "auto",
            primary: "gemini",
            fallback: "groq",
            finalProvider: "none",
            geminiHttpStatus,
            geminiModel: usedGeminiModel,
            geminiFailureCategory: failureCategory,
            geminiDurationMs,
            groqHttpStatus,
            groqModel: usedGroqModel,
            groqFailureCategory,
            groqDurationMs,
            geminiError: safeGeminiError.slice(0, 120),
            groqError: safeGroqError.slice(0, 120),
            statusCode: 503,
            stream: true,
          });
          throw Object.assign(
            new Error(`AI providers unavailable: ${safeGeminiError.slice(0, 120)}; Groq fallback: ${safeGroqError.slice(0, 120)}`),
            { statusCode: 503, retryable: true, diagnostics }
          );
        }
      }

      // No Groq fallback
      attachDiagnostics(geminiErr);
      throw geminiErr;
    }
  }

  // Gemini unconfigured -> use Groq directly
  logAiEvent("info", "ATTEMPT", { requestId, apiRoute, selectedProvider: "auto", providerAttempted: "groq", reason: "Gemini unconfigured", stream: true });
  return await groqStream({
    ...options,
    model: resolveGroqModel(model),
    timeoutMs: groqTimeoutMs ?? timeoutMs,
    requestId,
    apiRoute,
    metaOut,
  });
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
  aiStream,
  geminiComplete,
  groqComplete,
  geminiStream,
  groqStream,
  classifyFailure,
  logAiEvent,
  generateRequestId,
  geminiToOpenAiResponse,
  geminiChunkToOpenAiSse,
  openAiSseDone,
  isUsableKey,
  cleanEnvValue,
  sanitizeKey,
  getTimeoutMs,
  extractJson,
  MODEL: GROQ_MODEL,
  GROQ_MODEL,
  GROQ_DEFAULT_MODEL,
  GROQ_FAST_MODEL,
  resolveGroqModel,
  GEMINI_DEFAULT_MODEL,
  convertMessagesToGemini,
};
