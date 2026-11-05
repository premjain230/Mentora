const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const admin = require("./_admin");
const { aiComplete } = require("./_ai");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "replan", limit: 10 })) return;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await admin.verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  try {
    const body = await readJsonBody(req);
    const { missedTasks, dailyHours, examDate, examType } = body;

    if (!missedTasks || !Array.isArray(missedTasks) || missedTasks.length === 0) {
      return res.status(200).json({ message: "No missed tasks to replan.", adjustments: [] });
    }

    const prompt = `I have ${missedTasks.length} missed study tasks that need to be rescheduled:
${missedTasks.map((t, i) => `${i + 1}. ${t.subject}: ${t.topic} (${t.durationMinutes || 30} min)`).join("\n")}

Daily study hours available: ${dailyHours || 6}
Exam date: ${examDate || "Not specified"}
Exam type: ${examType || "academic"}

Return a strict JSON array (no markdown, no code fences) with catch-up suggestions. Each entry:
{
  "subject": string,
  "topic": string,
  "suggestedDate": "YYYY-MM-DD",
  "priority": "high" | "medium" | "low"
}

Distribute tasks across the available days before the exam.`;

    let adjustmentsRaw;
    try {
      adjustmentsRaw = await aiComplete({
        messages: [
          { role: "system", content: "You are an expert study planner. Always return valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        json: true,
        temperature: 0.3,
        maxTokens: 3000,
      });
    } catch (aiErr) {
      console.error("[Replan] AI completion failed:", aiErr.message);
      throw aiErr;
    }

    let adjustments;
    if (Array.isArray(adjustmentsRaw)) {
      adjustments = adjustmentsRaw;
    } else if (adjustmentsRaw && typeof adjustmentsRaw === "object") {
      adjustments = Array.isArray(adjustmentsRaw.adjustments)
        ? adjustmentsRaw.adjustments
        : Array.isArray(adjustmentsRaw.tasks)
        ? adjustmentsRaw.tasks
        : [];
    } else if (typeof adjustmentsRaw === "string") {
      try {
        adjustments = JSON.parse(adjustmentsRaw.replace(/```json?|```/g, "").trim());
      } catch (e) {
        console.error("Failed to parse replan response:", e.message);
        adjustments = [];
      }
    } else {
      adjustments = [];
    }

    // Validate: only reschedule within original subjects/topics, no hallucinated new subjects (P2-13)
    try {
      const allowedSubjects = new Set(missedTasks.map((t) => String(t.subject).toLowerCase().trim()));
      const allowedTopics = new Set(missedTasks.map((t) => String(t.topic).toLowerCase().trim()));
      adjustments = (Array.isArray(adjustments) ? adjustments : [])
        .filter((a) => {
          if (!a || typeof a !== "object") return false;
          const subjOk = allowedSubjects.has(String(a.subject || "").toLowerCase().trim());
          const topicOk = allowedTopics.has(String(a.topic || "").toLowerCase().trim());
          const dateOk = !a.suggestedDate || /^\d{4}-\d{2}-\d{2}$/.test(String(a.suggestedDate));
          const priOk = !a.priority || ["high", "medium", "low"].includes(String(a.priority).toLowerCase());
          return subjOk && topicOk && dateOk && priOk;
        })
        .map((a) => ({
          subject: String(a.subject).slice(0, 80),
          topic: String(a.topic).slice(0, 200),
          suggestedDate: String(a.suggestedDate || "").slice(0, 10),
          priority: ["high", "medium", "low"].includes(String(a.priority).toLowerCase())
            ? String(a.priority).toLowerCase()
            : "medium",
        }))
        .slice(0, missedTasks.length * 2);

      // If model filtered everything out (hallucinated), fallback to simple reschedule
      if (!adjustments.length && missedTasks.length) {
        const base = new Date();
        adjustments = missedTasks.slice(0, 3).map((t, i) => {
          const d = new Date(base);
          d.setDate(d.getDate() + i + 1);
          return {
            subject: String(t.subject).slice(0, 80),
            topic: String(t.topic).slice(0, 200),
            suggestedDate: d.toISOString().slice(0, 10),
            priority: "high",
          };
        });
      }
    } catch (e) {
      console.warn("replan validation skipped", e?.message);
    }

    res.status(200).json({ adjustments, message: `Rescheduled ${adjustments.length} tasks.` });
  } catch (err) {
    return sendError(req, res, err, "Could not generate catch-up plan right now.");
  }
};
