// functions/generate-plan.js
// Generates an AI study plan for the student.
// Calls Groq API server-side — GROQ_API_KEY is never exposed to the browser.
// Rate-limited to 10 plan generations per user per hour to prevent abuse.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

const VALID_EXAM_TYPES = ["JEE", "NEET", "BOARDS", "COLLEGE", "CUSTOM"];
const MAX_SUBJECTS = 10;
const MAX_STRING = 200;

// ── Input validation ────────────────────────────────────────
function validateInput(body) {
  const errors = [];

  if (!body || typeof body !== "object") return ["Request body is required."];

  if (!body.examType || !VALID_EXAM_TYPES.includes(body.examType))
    errors.push("examType must be one of: " + VALID_EXAM_TYPES.join(", "));

  if (!body.studentName || typeof body.studentName !== "string" || body.studentName.trim().length < 1)
    errors.push("studentName is required.");

  if (!Array.isArray(body.subjects) || body.subjects.length === 0)
    errors.push("subjects must be a non-empty array.");

  if (Array.isArray(body.subjects) && body.subjects.length > MAX_SUBJECTS)
    errors.push(`subjects must have at most ${MAX_SUBJECTS} entries.`);

  if (typeof body.dailyHours !== "number" || body.dailyHours < 1 || body.dailyHours > 18)
    errors.push("dailyHours must be a number between 1 and 18.");

  if (!body.examDate || isNaN(Date.parse(body.examDate)))
    errors.push("examDate must be a valid ISO date string.");

  if (!body.startDate || isNaN(Date.parse(body.startDate)))
    errors.push("startDate must be a valid ISO date string.");

  if (body.targetScore !== undefined && typeof body.targetScore !== "string")
    errors.push("targetScore must be a string.");

  if (body.weakTopics !== undefined && !Array.isArray(body.weakTopics))
    errors.push("weakTopics must be an array.");

  return errors;
}

// ── Sanitize a string — strip tags, limit length ────────────
function sanitize(str, max = MAX_STRING) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

// ── Build the system prompt ──────────────────────────────────
function buildSystemPrompt() {
  return `You are an expert academic study planner for Indian competitive exam students.
Your job is to generate structured, realistic, and intelligent study plans.

Rules:
- Balance subjects based on difficulty, student weakness, and time remaining.
- Prioritize weak topics early in the plan.
- Ensure revision slots are included in the weekly plan.
- Keep daily sessions realistic — include breaks.
- For JEE: Physics, Chemistry, Maths. For NEET: Physics, Chemistry, Biology.
- Output ONLY valid JSON. No markdown, no explanation, no preamble.`;
}

// ── Build the user prompt ────────────────────────────────────
function buildUserPrompt(data) {
  const daysLeft = Math.max(
    1,
    Math.floor((new Date(data.examDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24))
  );

  return `Generate a study plan with this exact JSON structure:
{
  "planTitle": "string",
  "summary": "string (2-3 sentences)",
  "daysUntilExam": ${daysLeft},
  "dailyHours": ${data.dailyHours},
  "weeklyPlan": [
    {
      "week": 1,
      "theme": "string",
      "days": [
        {
          "day": "Monday",
          "sessions": [
            {
              "subject": "string",
              "topic": "string",
              "durationMinutes": 60,
              "type": "learn|revise|practice|test",
              "priority": "high|medium|low"
            }
          ]
        }
      ]
    }
  ],
  "subjectAllocation": {
    "SubjectName": { "percentageOfTime": 35, "weeklyHours": 8, "focusAreas": ["topic1","topic2"] }
  },
  "revisionSchedule": {
    "weekly": "string",
    "monthly": "string",
    "preExam": "string"
  },
  "milestones": [
    { "week": 2, "goal": "string", "checkpoints": ["string"] }
  ]
}

Student Profile:
- Name: ${sanitize(data.studentName)}
- Exam: ${data.examType}
- Target: ${sanitize(data.targetScore || "Best possible score")}
- Subjects: ${data.subjects.map((s) => sanitize(s)).join(", ")}
- Daily study hours: ${data.dailyHours}
- Start date: ${data.startDate}
- Exam date: ${data.examDate}
- Days remaining: ${daysLeft}
- Weak topics: ${(data.weakTopics || []).map((t) => sanitize(t)).join(", ") || "None specified"}

Generate exactly 2 weeks of detailed daily plans. Keep sessions realistic.`;
}

// ── Call Groq ────────────────────────────────────────────────
async function callGroq(systemPrompt, userPrompt) {
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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
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

// ── Handler ──────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  // Stricter rate limit for AI plan generation (expensive operation)
  if (!rateLimit(req, res, { name: "generate-plan", limit: 10 })) return;

  try {
    const body = await readJsonBody(req);
    const errors = validateInput(body);

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed.", details: errors });
    }

    const startedAt = Date.now();
    const plan = await callGroq(buildSystemPrompt(), buildUserPrompt(body));

    console.info(
      JSON.stringify({
        level: "info",
        event: "generate-plan.completed",
        examType: body.examType,
        durationMs: Date.now() - startedAt,
      })
    );

    return res.status(200).json({ plan });
  } catch (err) {
    return sendError(req, res, err, "Could not generate study plan right now.");
  }
};
