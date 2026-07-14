const RATE_LIMITS = new Map();
const RATE_WINDOW_MS = 60_000;

function applyCors(req, res, allowedMethods = ["OPTIONS"]) {
  const origin = req.headers.origin || req.headers.host || "*";
  const allowed = [
    "https://aquila-sand.vercel.app",
    "https://aquila-ai.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  if (allowed.includes(origin) || origin === "*") {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    res.setHeader("Access-Control-Allow-Origin", "https://aquila-sand.vercel.app");
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
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const key = `${name}:${ip}`;
  const now = Date.now();

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
