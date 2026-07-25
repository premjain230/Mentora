// api/groq-proxy.js
// Server-side proxy: keeps your Groq API key secret and forwards chat requests.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server misconfiguration: missing API key" });
  }

  let body;
  try {
    // On Vercel Node functions, req.body is usually already parsed JSON,
    // but guard against it being a raw string just in case.
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { model, messages, max_tokens, temperature, stream } = body || {};

  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing required fields: model, messages" });
  }

  let groqRes;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: max_tokens ?? 2048,
        temperature: temperature ?? 0.65,
        stream: stream ?? false,
      }),
    });
  } catch (err) {
    console.error("Network error calling Groq:", err);
    return res.status(502).json({ error: "Failed to reach Groq API" });
  }

  if (!groqRes.ok) {
    let errBody;
    try {
      errBody = await groqRes.json();
    } catch {
      errBody = { error: { message: `Groq API error ${groqRes.status}` } };
    }
    return res.status(groqRes.status).json(errBody);
  }

  // If the client requested streaming, pipe the SSE stream straight through.
  if (stream && groqRes.body) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = groqRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      res.end();
    }
    return;
  }

  // Non-streaming: just forward the JSON.
  const data = await groqRes.json();
  return res.status(200).json(data);
}
