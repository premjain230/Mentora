const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "chat", limit: 30 })) return;

  try {
    const body = await readJsonBody(req);
    const { model, messages, max_tokens, temperature, stream } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI provider is not configured." });
    }

    const groqPayload = {
      model: model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      max_tokens: max_tokens || 2048,
      temperature: temperature ?? 0.65,
      stream: stream !== false,
    };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groqPayload),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      throw Object.assign(
        new Error(err?.error?.message || `Groq API error (${groqRes.status})`),
        { statusCode: groqRes.status }
      );
    }

    if (stream !== false) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const reader = groqRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await groqRes.json();
      res.status(200).json(data);
    }
  } catch (err) {
    return sendError(req, res, err, "Chat service is unavailable right now.");
  }
};
