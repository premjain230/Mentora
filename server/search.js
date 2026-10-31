const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken } = require("./_admin");

function searchCredentials() {
  const key = process.env.SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID || process.env.GOOGLE_CX;
  return key && cx ? { key, cx } : null;
}

function httpsUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch (_) {
    return "";
  }
}

async function searchWeb(query, count = 5) {
  const credentials = searchCredentials();
  if (!credentials) return { results: [], source: "none" };
  const params = new URLSearchParams({
    key: credentials.key,
    cx: credentials.cx,
    q: String(query || "").slice(0, 400),
    num: String(Math.min(10, Math.max(1, count))),
  });
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Google Search API error:", data && data.error ? data.error.message : response.status);
    return { results: [], source: "google", error: "search_unavailable" };
  }
  const results = (data.items || []).map((item) => ({
    title: String(item.title || "").slice(0, 200),
    snippet: String(item.snippet || "").slice(0, 400),
    url: httpsUrl(item.link),
  }));
  return { results, source: "google" };
}

/**
 * Image search through the existing Google Programmable Search integration.
 *
 * This returns candidates only; the caller is responsible for restricting them to
 * trusted licensing domains and for showing attribution. No image URL is ever
 * invented here: if the integration is not configured, or returns nothing usable,
 * the array is empty and the UI degrades to a text/illustration explanation.
 */
async function searchImages(query, count = 5) {
  const credentials = searchCredentials();
  if (!credentials) return [];
  const params = new URLSearchParams({
    key: credentials.key,
    cx: credentials.cx,
    q: String(query || "").slice(0, 240),
    num: String(Math.min(10, Math.max(1, count))),
    searchType: "image",
    safe: "active",
  });
  try {
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Google image search error:", data && data.error ? data.error.message : response.status);
      return [];
    }
    const seen = new Set();
    const out = [];
    for (const item of data.items || []) {
      const imageUrl = httpsUrl(item.link);
      if (!imageUrl || seen.has(imageUrl)) continue;
      const thumbUrl = httpsUrl(item.image && item.image.thumbnailLink);
      const contextUrl = httpsUrl(item.image && item.image.contextLink);
      if (!contextUrl) continue;
      let sourceLabel = "";
      try {
        sourceLabel = new URL(contextUrl).hostname.replace(/^www\./, "");
      } catch (_) {
        sourceLabel = "source";
      }
      seen.add(imageUrl);
      out.push({
        title: String(item.title || "").slice(0, 180),
        imageUrl,
        thumbUrl: thumbUrl || imageUrl,
        contextUrl,
        sourceLabel: sourceLabel.slice(0, 80),
      });
      if (out.length >= count) break;
    }
    return out;
  } catch (err) {
    console.error("Google image search failed:", err && err.message ? err.message : err);
    return [];
  }
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "search", limit: 30 })) return;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  try {
    const body = await readJsonBody(req);
    const query = String(body.query || "").trim().slice(0, 400);
    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }

    if (body.type === "image") {
      const images = await searchImages(query, 5);
      return res.status(200).json({ images, source: images.length ? "google" : "none" });
    }

    const payload = await searchWeb(query, 5);
    return res.status(200).json(payload);
  } catch (err) {
    return sendError(req, res, err, "Search is not available right now.");
  }
};

module.exports.searchWeb = searchWeb;
module.exports.searchImages = searchImages;
module.exports.searchCredentials = searchCredentials;
