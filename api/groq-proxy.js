const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "groq-proxy", limit: 30 })) return;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
  }

  try {
    const body = await readJsonBody(req);
    const isStream = body.stream === true;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (isStream) {
      res.writeHead(groqRes.status, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      if (!groqRes.ok) {
        const errBody = await groqRes.json().catch(() => ({}));
        res.write(`data: ${JSON.stringify({ error: errBody?.error?.message || "Groq request failed" })}\n\n`);
        res.end();
        return;
      }

      const reader = groqRes.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(decoder.decode(value, { stream: true }));
          }
        } catch {
          res.end();
        }
      };

      pump();
    } else {
      const data = await groqRes.json();
      if (!groqRes.ok) {
        const msg = data?.error?.message || `Groq API error ${groqRes.status}`;
        return res.status(groqRes.status >= 500 ? 502 : 400).json({ error: msg });
      }
      return res.status(200).json(data);
    }
  } catch (err) {
    return sendError(req, res, err, "Could not communicate with the AI provider.");
  }
};
