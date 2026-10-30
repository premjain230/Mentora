const RATE_LIMITS = new Map();
const RATE_WINDOW_MS = 60_000;

function applyCors(req, res, allowedMethods = ["OPTIONS"]) {
  const origin = req.headers.origin || req.headers.host || "*";
  const allowed = [
    // The apex domain redirects to www, so www is the origin that serves requests.
    "https://www.learningallied.world",
    "https://learningallied.world",
    "http://localhost:3000",
    "http://localhost:5173",
    // VS Code Live Server, used for frontend-only local development.
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ];
  if (allowed.includes(origin) || origin === "*") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    res.setHeader("Access-Control-Allow-Origin", "https://www.learningallied.world");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", [...new Set([...allowedMethods, "OPTIONS"])].join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  return true;
}

function rateLimit(req, res, { name = "default", limit = 10 } = {}) {
  // Fix: x-forwarded-for may be "1.2.3.4, 1.2.3.5" — take first IP only (P0-6)
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown";
  const key = `${name}:${ip}`;
  const now = Date.now();

  // Prune stale entries to prevent memory leak (in-memory Map per lambda)
  if (RATE_LIMITS.size > 500) {
    for (const [k, v] of RATE_LIMITS) {
      if (now - v.windowStart > RATE_WINDOW_MS * 2) RATE_LIMITS.delete(k);
      if (RATE_LIMITS.size < 400) break;
    }
  }

  let entry = RATE_LIMITS.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    RATE_LIMITS.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil((entry.windowStart + RATE_WINDOW_MS) / 1000));

  if (entry.count > limit) {
    res.status(429).json({ error: "Too many requests. Please slow down." });
    return false;
  }
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(Object.assign(new Error("Invalid JSON body."), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendError(req, res, err, userMessage) {
  const statusCode = err.statusCode || 500;
  const message = userMessage || "An unexpected error occurred.";
  const isDev = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";

  if (statusCode >= 500) {
    console.error("[sendError]", err);
  }

  res.status(statusCode).json({
    error: message,
    ...(isDev && { detail: err.message }),
  });
}

module.exports = { applyCors, rateLimit, readJsonBody, sendError };
