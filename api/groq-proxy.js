const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const ALLOWED_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];
const MAX_TOKENS = 4096;
const FETCH_TIMEOUT_MS = 55000;

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-30).map(m => {
    if (!m || typeof m !== "object") return null;
    const role = m.role === "assistant" ? "assistant" : "user";
    const content = String(m.content || "").trim().slice(0, 8000);
    return content ? { role, content } : null;
  }).filter(Boolean);
}

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

  const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (!ALLOWED_MODELS.includes(GROQ_MODEL)) {
    return res.status(500).json({ error: `Model "${GROQ_MODEL}" is not in the allowed list.` });
  }

  try {
    const body = await readJsonBody(req);
    const isStream = body.stream === true;
    const messages = sanitizeMessages(body.messages);

    if (messages.length === 0) {
      return res.status(400).json({ error: "A non-empty messages array is required." });
    }

    const groqPayload = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are Aquila AI, an expert tutor with an adaptive learning engine. Continuously model the student's knowledge, confidence, misconceptions, and learning speed. Adapt difficulty to keep them in the optimal challenge zone. Detect misconceptions by identifying why they seem reasonable, then correct them. If the student doesn't understand, switch teaching methods. Adjust pace based on learning speed. Personalize examples to their interests. Predict forgetting and schedule review. Prioritize weak or foundational concepts for review. Verify understanding through transfer tasks. Detect cognitive overload and pause if needed. After every interaction, update the student model and adapt. Track everything for long-term memory. Core teaching: build mental models, reduce cognitive load, use analogies, encourage active recall, promote transfer. Every answer: big picture, connect to prior knowledge, step-by-step, analogy, real-world example, common mistakes, summary, active recall. Never optimize for speed—optimize for lasting understanding." },
        ...messages,
      ],
      max_tokens: Math.min(Number(body.max_tokens) || 2048, MAX_TOKENS),
      temperature: Math.max(0, Math.min(Number(body.temperature) || 0.65, 1)),
      stream: isStream,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let groqRes;
    try {
      groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groqPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

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

      await pump();
    } else {
      const data = await groqRes.json();
      if (!groqRes.ok) {
        const msg = data?.error?.message || `Groq API error ${groqRes.status}`;
        return res.status(groqRes.status >= 500 ? 502 : 400).json({ error: msg });
      }
      return res.status(200).json(data);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "AI provider did not respond in time." });
    }
    return sendError(req, res, err, "Could not communicate with the AI provider.");
  }
};
