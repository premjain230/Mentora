const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const SEARCH_TIMEOUT_MS = 10000;
const MAX_RESULTS = 6;

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "search", limit: 40 })) return;

  try {
    const body = await readJsonBody(req);
    const query = String(body.query || "").trim().slice(0, 500);
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter." });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.SERPAPI_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (apiKey && cx) {
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("cx", cx);
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(MAX_RESULTS));
      url.searchParams.set("hl", "en");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

      try {
        const gRes = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeout);

        if (!gRes.ok) {
          const errBody = await gRes.json().catch(() => ({}));
          return res.status(502).json({
            error: errBody?.error?.message || "Google Search API error",
          });
        }

        const data = await gRes.json();
        const results = (data.items || []).slice(0, MAX_RESULTS).map((item) => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link,
        }));

        return res.status(200).json({ results, total: data.searchInformation?.totalResults || 0 });
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === "AbortError") {
          return res.status(504).json({ error: "Search provider did not respond in time." });
        }
        throw err;
      }
    }

    return res.status(501).json({ error: "No search API key configured. Set GOOGLE_SEARCH_API_KEY + GOOGLE_CX or SERPAPI_API_KEY." });
  } catch (err) {
    return sendError(req, res, err, "Could not perform search.");
  }
};
