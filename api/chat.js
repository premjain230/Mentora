const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const SYSTEM_PROMPT = `You are Mentora, an advanced AI teacher, tutor, and learning companion.

Your goal is to help students understand concepts deeply, solve problems correctly, improve academic performance, and become independent learners.

Teaching principles:
- Teach concepts from first principles.
- Adapt explanations to the student's level.
- Break difficult topics into simple steps.
- Use examples and analogies.
- Encourage understanding instead of memorization.
- Identify misconceptions and correct them.
- Build strong foundations before advanced topics.
- Make learning engaging and interactive.

Response style:
- Use clear markdown formatting.
- Use headings only when they help.
- Use bold for important concepts.
- Use bullet points for clarity.
- Use tables when useful.
- Use code blocks only for programming topics.

When solving problems, show important steps, explain why each step is performed, highlight formulas used, and verify the final answer.

Never assume prior knowledge. Start with intuition before formal definitions. Ask questions frequently. Adapt based on student responses. Give hints before revealing answers. Focus on understanding, not memorization.`;

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 6000;

function sanitizeMessage(message) {
  if (!message || typeof message !== "object") return null;
  const role = message.role === "assistant" ? "assistant" : "user";
  const content = String(message.content || "").trim();
  if (!content) return null;
  return { role, content: content.slice(0, MAX_MESSAGE_CHARS) };
}

function normalizeMessages(body) {
  if (typeof body.message === "string") {
    const content = body.message.trim();
    return content ? [{ role: "user", content: content.slice(0, MAX_MESSAGE_CHARS) }] : [];
  }

  if (Array.isArray(body.messages)) {
    return body.messages.map(sanitizeMessage).filter(Boolean).slice(-MAX_MESSAGES);
  }

  return [];
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.6,
      max_tokens: 1600,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `OpenAI request failed with status ${response.status}`);
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const err = new Error("OpenAI returned an empty response.");
    err.statusCode = 502;
    throw err;
  }

  return { provider: "openai", reply };
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1600,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `Gemini request failed with status ${response.status}`);
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }

  const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!reply) {
    const err = new Error("Gemini returned an empty response.");
    err.statusCode = 502;
    throw err;
  }

  return { provider: "gemini", reply };
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "chat", limit: 20 })) return;

  try {
    const body = await readJsonBody(req);
    const messages = normalizeMessages(body);

    if (messages.length === 0) {
      return res.status(400).json({ error: "A non-empty message or messages array is required." });
    }

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "No AI provider is configured on the server." });
    }

    const startedAt = Date.now();
    const result = (await callOpenAI(messages)) || (await callGemini(messages));

    console.info(JSON.stringify({
      level: "info",
      event: "chat.completed",
      provider: result.provider,
      messageCount: messages.length,
      durationMs: Date.now() - startedAt,
    }));

    return res.status(200).json({ reply: result.reply, provider: result.provider });
  } catch (err) {
    return sendError(req, res, err, "Mentora could not generate a response right now.");
  }
};
