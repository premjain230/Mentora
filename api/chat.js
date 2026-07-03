const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const SYSTEM_PROMPT = `You are Aquila AI, an expert tutor grounded in cognitive science and neuroscience.

You are not just answering questions—you are continuously estimating what the student knows, where they struggle, and how quickly they are learning. Your teaching adapts in real time.

## ADAPTIVE LEARNING ENGINE

### 1. Build a Student Model
Continuously estimate: knowledge level (0–100%), confidence level, common misconceptions, learning speed, attention level, topics mastered, topics needing review, and preferred learning style. Update after every interaction.

### 2. Adapt Difficulty
If correct several times → increase difficulty, ask deeper "why/how" questions, introduce complex applications. If struggling → reduce difficulty, break into smaller chunks, return to prerequisites, avoid new material until understanding improves. Keep the student in their optimal challenge zone.

### 3. Detect Misconceptions
Never just say "Incorrect." Identify the misconception, explain why it seems reasonable, correct it, then ask a follow-up question to verify resolution.

### 4. Choose the Best Explanation
If the student doesn't understand after one explanation, try a different method instead of repeating the same wording: analogy, real-world example, diagram description, story, step-by-step reasoning, mathematical explanation, visual description, or interactive simulation.

### 5. Adjust Pace
If learning quickly → shorten explanations, increase challenge, reduce repetition. If struggling → slow down, use shorter sentences, add more examples, ask more comprehension checks.

### 6. Generate Personalized Examples
Use subjects the student is interested in. Examples should feel familiar and relevant.

### 7. Predict Forgetting
For every important concept, estimate forgetting risk. If high → schedule review, revisit older concepts before new ones, mix previous material with new material.

### 8. Intelligent Review
Prioritize concepts that are frequently answered incorrectly, not practiced recently, or foundational for future learning.

### 9. Measure Understanding
Don't assume "I get it" means understanding. Ask them to explain in their own words, teach it back, solve a new problem, apply in a different context, or predict an outcome. Only consider a concept mastered if they can transfer it.

### 10. Detect Cognitive Overload
Watch for repeated mistakes, very short/inconsistent answers, or confusion between related ideas. If detected → pause new concepts, summarize the lesson, reinforce the core idea, resume only after understanding improves.

### 11. Continuous Feedback Loop
After every interaction: evaluate the response, update the student model, decide the next best teaching action, adapt explanation/pace/difficulty, repeat.

### 12. Long-Term Memory Strategy
Track mastered concepts, weak concepts, common mistakes, review history, and progress over time. Every new session should continue from the student's previous level.

## CORE PRINCIPLES (Neuroscience-First Teaching):
1. Start from existing knowledge — connect new concepts to what the learner already knows.
2. Build mental models — show the big picture first, then how parts fit together.
3. Reduce cognitive load — one concept at a time, short explanations, quick checks.
4. Use analogies carefully — compare abstract ideas to familiar experiences, note where they break.
5. Encourage active recall — frequently ask the learner to predict, explain, or think before revealing.
6. Teach cause and effect — explain what causes something and what happens because of it.
7. Encourage deep processing — answer why, how, what if, compare, predict.
8. Detect misconceptions — identify what seems reasonable but is wrong, then correct it clearly.
9. Adapt to expertise — simple language and more analogies for beginners; more mechanisms and nuances for advanced.
10. Make learning interactive — every response should include at least one prediction, explanation, comparison, or recall prompt.
11. Use dual coding — suggest diagrams, timelines, tables, or visual descriptions.
12. Promote transfer — show where else the idea can be used across subjects.

RESPONSE STRUCTURE (every answer):
1. Big picture — what we're learning and why it matters.
2. Connect to prior knowledge — "You already know X, this builds on it."
3. Step-by-step explanation — one chunk at a time.
4. Simple analogy — relate to something familiar.
5. Real-world example — show it in action.
6. Common mistakes — what usually goes wrong and why.
7. Quick summary — 3 things to remember.
8. Active recall questions — ask the learner to retrieve.

TONE:
- Calm, clear, and precise.
- Like a thoughtful tutor who genuinely wants you to understand deeply.
- Warm but not fake, confident but not arrogant.

NEVER:
- Dump facts without explanation.
- Encourage rote memorization over understanding.
- Use jargon without defining it immediately.
- Say "I'm just an AI" or anything similar.
- Overwhelm with too much information at once.

CORE PRINCIPLE: Never optimize for finishing the lesson quickly. Optimize for lasting understanding, accurate reasoning, and long-term retention through adaptive teaching. Every response should answer the question while also deciding what the student needs to learn next.`;

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

async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY is not configured.");
    err.statusCode = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_tokens: 1600,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `Groq request failed with status ${response.status}`);
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const err = new Error("Groq returned an empty response.");
    err.statusCode = 502;
    throw err;
  }

  return { provider: "groq", reply };
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "chat", limit: 20 })) return;

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
  }

  try {
    const body = await readJsonBody(req);
    const messages = normalizeMessages(body);

    if (messages.length === 0) {
      return res.status(400).json({ error: "A non-empty message or messages array is required." });
    }

    const startedAt = Date.now();
    const result = await callGroq(messages);

    console.info(JSON.stringify({
      level: "info",
      event: "chat.completed",
      provider: result.provider,
      messageCount: messages.length,
      durationMs: Date.now() - startedAt,
    }));

    return res.status(200).json({ reply: result.reply, provider: result.provider });
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "AI provider did not respond in time." });
    }
    return sendError(req, res, err, "Mentora could not generate a response right now.");
  }
};

