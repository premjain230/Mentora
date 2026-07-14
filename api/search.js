const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "search", limit: 30 })) return;

  try {
    const body = await readJsonBody(req);
    const query = String(body.query || "").trim().slice(0, 400);
    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }

    const searchApiKey = process.env.SEARCH_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;

    if (searchApiKey && searchEngineId) {
      const params = new URLSearchParams({
        key: searchApiKey,
        cx: searchEngineId,
        q: query,
        num: "5",
      });
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      const data = await response.json();
      if (!response.ok) {
        console.error("Google Search API error:", data);
      }
      const results = (data.items || []).map((item) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
      }));
      return res.status(200).json({ results, source: "google" });
    }

    return res.status(200).json({ results: [], source: "none" });
  } catch (err) {
    return sendError(req, res, err, "Search is not available right now.");
  }
};
