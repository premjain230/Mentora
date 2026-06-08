const WINDOW_MS = 60 * 1000;
const buckets = new Map();

function normalizeOrigin(value) {
  if (!value) return null;
  const trimmed = String(value).trim().replace(/\/$/, "");
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getAllowedOrigins(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const sameHost = normalizeOrigin(host);
  const vercelProduction = normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const vercelDeployment = normalizeOrigin(process.env.VERCEL_URL);
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  const origins = [sameHost, vercelProduction, vercelDeployment, ...configured].filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173");
  }

  return [...new Set(origins)];
}

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");
}

function applyCors(req, res, methods = ["GET", "POST", "OPTIONS"]) {
  applySecurityHeaders(res);

  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins(req);

  if (origin && allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }

  if (origin && !allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    res.status(403).json({ error: "Origin is not allowed." });
    return false;
  }

  return true;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function rateLimit(req, res, options = {}) {
  const limit = Number(options.limit || process.env.RATE_LIMIT_REQUESTS || 20);
  const windowMs = Number(options.windowMs || process.env.RATE_LIMIT_WINDOW_MS || WINDOW_MS);
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.name || "default"}:${ip}`;
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(limit - bucket.count, 0);
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests. Please try again shortly." });
    return false;
  }

  return true;
}

async function readJsonBody(req, maxBytes = 64 * 1024) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const err = new Error("Request body is too large.");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function logError(req, err, context = {}) {
  console.error(JSON.stringify({
    level: "error",
    path: req.url,
    method: req.method,
    message: err.message,
    statusCode: err.statusCode || 500,
    ...context,
  }));
}

function sendError(req, res, err, fallback = "Internal server error.") {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) logError(req, err);
  res.status(status).json({ error: status >= 500 ? fallback : err.message });
}

module.exports = {
  applyCors,
  rateLimit,
  readJsonBody,
  sendError,
};
