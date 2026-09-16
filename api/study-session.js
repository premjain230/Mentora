const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken } = require("./_admin");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "study-session", limit: 10 })) return;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  try {
    const body = await readJsonBody(req);
    const { subject, topic, durationMinutes, goal } = body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ error: "A subject is required." });
    }
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "A topic is required." });
    }

    const minutes = Math.min(Math.max(parseInt(durationMinutes, 10) || 25, 5), 120);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI provider is not configured." });
    }

    const curriculumNote = `Curriculum guard: Only use key points that are plausible for ${subject} → ${topic} within standard NCERT/JEE/NEET/Board scope. Do not invent chapters beyond standard syllabus. Keep practice questions solvable within ${minutes} minutes.`;
    const prompt = `Create an AI-guided study session for a ${subject} student preparing for JEE, NEET or board exams.

Subject: ${subject}
Topic: ${topic}
Session length: ${minutes} minutes
${goal ? `Student's focus goal: ${goal}` : ""}
${curriculumNote}

Return a strict JSON object (no markdown, no code fences) shaped exactly like:
{
  "title": "short session title (max 80 chars)",
  "objectives": ["2-3 specific things to master this session (each max 120 chars)"],
  "keyPoints": ["5-7 crisp key concepts for this topic (each max 140 chars)"],
  "practiceQuestions": ["3 short practice questions to test understanding (each max 180 chars)"],
  "focusTips": ["2-3 ways to stay focused for this session (each max 120 chars)"]
}

Make it specific to the topic, exam-relevant, and achievable within ${minutes} minutes. Do not hallucinate curriculum beyond the topic.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are an expert study coach. Always return valid JSON without markdown formatting." },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `AI request failed (${response.status})`);
    }

    let plan;
    try {
      const content = data.choices?.[0]?.message?.content?.trim() || "{}";
      plan = JSON.parse(content.replace(/```json?|```/g, "").trim());
    } catch (e) {
      console.error("Failed to parse study session from AI response:", e.message);
      plan = {};
    }

    // Validate: ensure arrays are strings, capped, no hallucinated extra fields (P2-13)
    const cleanArr = (arr, maxLen, maxItems) => (Array.isArray(arr) ? arr : []).filter(v => typeof v === "string" && v.trim()).map(s => String(s).trim().slice(0, maxLen)).slice(0, maxItems);
    res.status(200).json({
      plan: {
        title: String(plan.title || `${subject} — ${topic}`).slice(0, 80),
        objectives: cleanArr(plan.objectives, 120, 3),
        keyPoints: cleanArr(plan.keyPoints, 140, 7),
        practiceQuestions: cleanArr(plan.practiceQuestions, 180, 3),
        focusTips: cleanArr(plan.focusTips, 120, 3),
        subject: String(subject).slice(0, 80),
        topic: String(topic).slice(0, 120),
        durationMinutes: minutes,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return sendError(req, res, err, "Could not create a study session right now.");
  }
};