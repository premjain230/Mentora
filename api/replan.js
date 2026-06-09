// functions/replan.js
// Smart replanning endpoint — called when tasks are missed.
// Analyses missed tasks and generates a catch-up schedule.
// Uses same Groq/pattern as chat.js and generate-plan.js.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const MAX_MISSED_TASKS = 50;
const MAX_STRING = 200;

function sanitize(str, max = MAX_STRING) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

function validateInput(body) {
  const errors = [];

  if (!body || typeof body !== "object") return ["Request body is required."];

  if (!Array.isArray(body.missedTasks) || body.missedTasks.length === 0)
    errors.push("missedTasks must be a non-empty array.");

  if (Array.isArray(body.missedTasks) && body.missedTasks.length > MAX_MISSED_TASKS)
    errors.push(`missedTasks must have at most ${MAX_MISSED_TASKS} entries.`);

  if (typeof body.dailyHours !== "number" || body.dailyHours < 1 || body.dailyHours > 18)
    errors.push("dailyHours must be a number between 1 and 18.");

  if (!body.examDate || isNaN(Date.parse(body.examDate)))
    errors.push("examDate must be a valid ISO date string.");

  if (!body.examType || typeof body.examType !== "string")
    errors.push("examType is required.");

  return errors;
}

function buildReplanPrompt(data) {
  const daysLeft = Math.max(
    1,
    Math.floor((new Date(data.examDate) - new Date()) / (1000 * 60 * 60 * 24))
  );

  const missedSummary = data.missedTasks
    .slice(0, MAX_MISSED_TASKS)
    .map((t) => `- ${sanitize(t.subject)}: ${sanitize(t.topic)} (${t.durationMinutes || 60} min)`)
    .join("\n");

  return `A student missed study sessions and needs a catch-up plan. Output ONLY valid JSON, no markdown.

{
  "catchUpPlan": {
    "summary": "string",
    "urgencyLevel": "low|medium|high",
    "extraDailyMinutes": 30,
    "days": [
      {
        "date": "YYYY-MM-DD",
        "sessions": [
          {
            "subject": "string",
            "topic": "string",
            "durationMinutes": 60,
            "type": "revise|practice|learn",
            "isRecovery": true,
            "priority": "high|medium|low"
          }
        ]
      }
    ],
    "advice": "string (2-3 sentences of motivational, actionable advice)"
  }
}

Student context:
- Exam: ${sanitize(data.examType)}
- Days remaining: ${daysLeft}
- Daily hours available: ${data.dailyHours}
- Missed tasks (${data.missedTasks.length} total):
${missedSummary}

Generate a 3-day catch-up plan starting from tomorrow. Prioritize high-weightage missed topics.`;
}

async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY is not configured.");
    err.statusCode = 500;
    throw err;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic planner. Output only valid JSON with no markdown or explanation.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.error?.message || `Groq request failed: ${response.status}`);
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }

  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    const err = new Error("Groq returned an empty response.");
    err.statusCode = 502;
    throw err;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("Groq returned invalid JSON.");
    err.statusCode = 502;
    throw err;
  }
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "replan", limit: 15 })) return;

  try {
    const body = await readJsonBody(req);
    const errors = validateInput(body);

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed.", details: errors });
    }

    const startedAt = Date.now();
    const result = await callGroq(buildReplanPrompt(body));

    console.info(
      JSON.stringify({
        level: "info",
        event: "replan.completed",
        missedCount: body.missedTasks.length,
        durationMs: Date.now() - startedAt,
      })
    );

    return res.status(200).json(result);
  } catch (err) {
    return sendError(req, res, err, "Could not generate catch-up plan right now.");
  }
};
