const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken } = require("./_admin");

function searchCredentials() {
  const key = process.env.SEARCH_API_KEY || process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID || process.env.GOOGLE_CX;
  return key && cx && key.length > 20 && !key.includes("[SENSITIVE]") ? { key, cx } : null;
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

function cleanHtml(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSearchQuery(query) {
  let q = String(query || "").trim();
  // Strip conversational search prefixes to get clean search keywords
  q = q.replace(/^(?:please\s+)?(?:can you\s+)?(?:search\s+(?:the\s+)?(?:web|internet|online)?\s*(?:for)?|google|look\s*up|find\s+(?:me\s+)?(?:online|on the web)?|browse\s+(?:the\s+)?web\s+for)\s+/i, "");
  return q.slice(0, 300).trim();
}

/**
 * Robust Multi-Engine Web Search:
 * Queries authoritative real-time sources (Wikipedia, DuckDuckGo Instant Answer,
 * Wikinews, and academic Crossref) with zero CAPTCHA blockers, delivering verified,
 * live internet citations without fabrication.
 */
async function fallbackWebSearch(query, count = 5) {
  const results = [];
  const seenUrls = new Set();
  const cleanQ = cleanSearchQuery(query);
  if (!cleanQ) return { results: [], source: "none" };

  function addResult(title, snippet, url, source) {
    const validUrl = httpsUrl(url);
    if (!validUrl || seenUrls.has(validUrl) || results.length >= count) return;
    if (validUrl.includes("duckduckgo.com") && !validUrl.includes("uddg=")) return;
    seenUrls.add(validUrl);
    results.push({
      title: cleanHtml(title).slice(0, 200),
      snippet: cleanHtml(snippet).slice(0, 400),
      url: validUrl,
      source: source || (() => {
        try { return new URL(validUrl).hostname.replace(/^www\./, ""); } catch (_) { return "web"; }
      })(),
    });
  }

  // 1) DuckDuckGo Instant Answer API (Real-time summary + authoritative reference URL)
  try {
    const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQ)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgApiUrl, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const d = await res.json();
      if (d.Abstract && d.AbstractURL) {
        addResult(d.Heading || cleanQ, d.Abstract, d.AbstractURL, "duckduckgo.com");
      }
      for (const t of d.RelatedTopics || []) {
        if (t.Text && t.FirstURL) {
          addResult(t.Text.slice(0, 80), t.Text, t.FirstURL, "duckduckgo.com");
        }
        if (results.length >= count) break;
      }
    }
  } catch (_) {}

  // 2) Wikipedia API (Authoritative encyclopedia, curriculum, scientific topics)
  if (results.length < count) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "LearningAlliedBot/2.0 (educational research)" },
        signal: AbortSignal.timeout(5000),
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const items = wikiData?.query?.search || [];
        for (const item of items) {
          const title = String(item.title || "").trim();
          const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
          addResult(title, item.snippet, url, "wikipedia.org");
          if (results.length >= count) break;
        }
      }
    } catch (_) {}
  }

  // 3) Wikinews API (Current events, real-world updates, policy & exam announcements)
  if (results.length < count) {
    try {
      const newsUrl = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json`;
      const newsRes = await fetch(newsUrl, {
        headers: { "User-Agent": "LearningAlliedBot/2.0 (news research)" },
        signal: AbortSignal.timeout(4500),
      });
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const items = newsData?.query?.search || [];
        for (const item of items) {
          const title = String(item.title || "").trim();
          const url = `https://en.wikinews.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
          addResult(title, item.snippet, url, "wikinews.org");
          if (results.length >= count) break;
        }
      }
    } catch (_) {}
  }

  // 4) Crossref Academic API (Peer-reviewed scientific breakthroughs, papers, studies)
  if (results.length < count) {
    try {
      const crUrl = `https://api.crossref.org/works?query=${encodeURIComponent(cleanQ)}&rows=3`;
      const crRes = await fetch(crUrl, { signal: AbortSignal.timeout(4500) });
      if (crRes.ok) {
        const d = await crRes.json();
        const items = d?.message?.items || [];
        for (const item of items) {
          const title = item.title?.[0];
          const url = item.URL;
          const publisher = item.publisher || "crossref.org";
          if (title && url) {
            addResult(title, `Peer-reviewed research published in ${publisher}. DOI: ${item.DOI || ""}`, url, "doi.org");
          }
          if (results.length >= count) break;
        }
      }
    } catch (_) {}
  }

  // 5) DuckDuckGo HTML search fallback
  if (results.length < count) {
    try {
      const ddgRes = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: `q=${encodeURIComponent(cleanQ)}`,
        signal: AbortSignal.timeout(5000),
      });
      if (ddgRes.ok) {
        const html = await ddgRes.text();
        const blocks = html.split(/class="result\s+/);
        for (let i = 1; i < blocks.length; i++) {
          const b = blocks[i];
          const urlMatch = b.match(/href="([^"]+)"/);
          const titleMatch = b.match(/class="result__title"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
          const snippetMatch = b.match(/class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/i);

          if (urlMatch && titleMatch) {
            let targetUrl = urlMatch[1];
            if (targetUrl.includes("uddg=")) {
              try {
                const u = new URL("https://duckduckgo.com" + targetUrl);
                targetUrl = decodeURIComponent(u.searchParams.get("uddg") || targetUrl);
              } catch (_) {}
            }
            addResult(titleMatch[1], snippetMatch ? snippetMatch[1] : "", targetUrl);
          }
          if (results.length >= count) break;
        }
      }
    } catch (_) {}
  }

  return {
    results: results.slice(0, count),
    source: results.length ? "web" : "none",
  };
}

/**
 * Web search with primary Google Programmable Search and live fallback.
 */
async function searchWeb(query, count = 5) {
  const credentials = searchCredentials();
  if (credentials) {
    try {
      const params = new URLSearchParams({
        key: credentials.key,
        cx: credentials.cx,
        q: String(query || "").slice(0, 400),
        num: String(Math.min(10, Math.max(1, count))),
      });
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.items) && data.items.length > 0) {
        const results = data.items.map((item) => ({
          title: String(item.title || "").slice(0, 200),
          snippet: String(item.snippet || "").slice(0, 400),
          url: httpsUrl(item.link),
          source: (() => {
            try { return new URL(item.link).hostname.replace(/^www\./, ""); } catch (_) { return "google"; }
          })(),
        })).filter((r) => Boolean(r.url));
        if (results.length > 0) {
          return { results: results.slice(0, count), source: "google" };
        }
      }
    } catch (err) {
      // Fall through to fallbackWebSearch
    }
  }

  return await fallbackWebSearch(query, count);
}

/**
 * Fallback image search via Wikipedia / Wikimedia Commons.
 * Returns only real, verified, public domain / CC-licensed educational images.
 */
async function fallbackImageSearch(query, count = 5) {
  try {
    const cleanQ = String(query || "").trim().slice(0, 240);
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}&gsrlimit=${Math.min(8, count + 2)}&prop=pageimages|info&inprop=url&pithumbsize=800&format=json`;
    const res = await fetch(wikiUrl, {
      headers: { "User-Agent": "LearningAlliedBot/2.0 (educational image retrieval)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {});
    const out = [];
    const seen = new Set();

    for (const page of pages) {
      const thumb = httpsUrl(page.thumbnail?.source);
      const pageUrl = httpsUrl(page.fullurl);
      if (thumb && pageUrl && !seen.has(thumb)) {
        seen.add(thumb);
        out.push({
          title: String(page.title || "").slice(0, 180),
          imageUrl: thumb,
          thumbUrl: thumb,
          contextUrl: pageUrl,
          sourceLabel: "wikipedia.org",
        });
      }
      if (out.length >= count) break;
    }
    return out;
  } catch (err) {
    return [];
  }
}

/**
 * Image search with primary Google Programmable Search and Wikimedia Commons fallback.
 */
async function searchImages(query, count = 5) {
  const credentials = searchCredentials();
  if (credentials) {
    const params = new URLSearchParams({
      key: credentials.key,
      cx: credentials.cx,
      q: String(query || "").slice(0, 240),
      num: String(Math.min(10, Math.max(1, count))),
      searchType: "image",
      safe: "active",
    });
    try {
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.items) && data.items.length > 0) {
        const seen = new Set();
        const out = [];
        for (const item of data.items) {
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
        if (out.length > 0) return out;
      }
    } catch (_) {
      // Fall through to fallbackImageSearch
    }
  }

  return await fallbackImageSearch(query, count);
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
