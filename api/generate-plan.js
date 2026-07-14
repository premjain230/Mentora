const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "generate-plan", limit: 10 })) return;

  try {
    const body = await readJsonBody(req);
    const { targetScore, subjects, weakTopics, dailyHours, startDate, examDate, examType } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "At least one subject is required." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI provider is not configured." });
    }

    const prompt = `Generate a weekly study plan for a ${examType || "academic"} exam.
Target score: ${targetScore || "Not specified"}
Subjects: ${subjects.join(", ")}
${weakTopics?.length ? `Weak topics: ${weakTopics.join(", ")}` : ""}
Daily study hours: ${dailyHours || 6}
Start date: ${startDate || "today"}
Exam date: ${examDate || "Not specified"}

Return a strict JSON array (no markdown, no code fences) where each element has:
{
  "week": number,
  "title": string,
  "subjects": [{ "name": string, "topics": string[], "hours": number }],
  "focus": string
}

Generate 4-8 weeks.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an expert academic planner. Always return valid JSON arrays without markdown formatting." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `AI request failed (${response.status})`);
    }

    let weeklyPlan;
    try {
      const content = data.choices?.[0]?.message?.content?.trim() || "[]";
      weeklyPlan = JSON.parse(content.replace(/```json?|```/g, "").trim());
    } catch (e) {
      console.error("Failed to parse plan from AI response:", e.message);
      weeklyPlan = [];
    }

    res.status(200).json({
      plan: {
        weeklyPlan,
        examType: examType || "academic",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return sendError(req, res, err, "Could not generate study plan right now.");
  }
};
