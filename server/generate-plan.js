const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken } = require("./_admin");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "generate-plan", limit: 10 })) return;

  // Require auth (P0-2: prevent quota abuse)
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

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

    // Curriculum-aware prompt (full CBSE/JEE/NEET — 80+ topics, no hallucination)
    const CURRICULUM_SEED = {
      "Mathematics": ["Number System — Rational Numbers", "Number System — Irrational Numbers", "Real Numbers", "Sets", "Relations and Functions", "Algebra — Algebraic Expressions", "Algebra — Linear Equations", "Algebra — Polynomials", "Trigonometry", "Inverse Trigonometry", "Permutations", "Combinations", "Binomial Theorem", "Sequence and Series", "Coordinate Geometry — Straight Lines", "Circles", "Conic Sections", "Three Dimensional Geometry", "Vectors", "Matrices", "Determinants", "Calculus — Limits", "Continuity", "Calculus — Derivatives", "Application of Derivatives", "Calculus — Integrals", "Application of Integrals", "Differential Equations", "Linear Programming", "Probability", "Statistics", "Solve one-step equations", "Solve multi-step equations", "Apply equations to word problems"],
      "Science": ["Physics — Units and Dimensions", "Physics — Kinematics", "Physics — Motion", "Physics — Force and Laws of Motion", "Physics — Work and Energy", "Physics — System of Particles", "Physics — Gravitation", "Physics — Mechanical Properties", "Physics — Sound", "Physics — Light", "Physics — Thermodynamics", "Physics — Kinetic Theory", "Physics — Oscillations", "Physics — Waves", "Physics — Electrostatics", "Physics — Current Electricity", "Physics — Magnetism", "Physics — Electromagnetic Induction", "Physics — Alternating Current", "Physics — Electromagnetic Waves", "Physics — Optics", "Physics — Dual Nature", "Physics — Atoms", "Physics — Nuclei", "Physics — Semiconductor", "Chemistry — Some Basic Concepts", "Chemistry — Matter", "Chemistry — Atoms and Molecules", "Chemistry — Structure of Atom", "Chemistry — Chemical Bonding", "Chemistry — States of Matter", "Chemistry — Elements Classification", "Chemistry — Acids Bases Salts", "Chemistry — Equilibrium", "Chemistry — Redox Reactions", "Chemistry — Hydrogen", "Chemistry — s-Block", "Chemistry — p-Block", "Chemistry — Chemical Thermodynamics", "Chemistry — Organic Basics", "Chemistry — Hydrocarbons (Organic)", "Biology — Cell", "Biology — Biomolecules", "Biology — Cell Cycle", "Biology — Tissues", "Biology — Diversity", "Biology — Plant Physiology", "Biology — Human Physiology", "Biology — Health", "Biology — Natural Resources", "Biology — Reproduction", "Biology — Genetics", "Biology — Genetics — Advanced", "Biology — Evolution", "Biology — Biotechnology", "Biology — Ecology"],
      "Physics": ["Units and Dimensions", "Kinematics", "Motion", "Force and Laws of Motion", "Work and Energy", "System of Particles", "Gravitation", "Mechanical Properties", "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves", "Electrostatics", "Current Electricity", "Magnetism", "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves", "Ray Optics", "Wave Optics", "Dual Nature", "Atoms", "Nuclei", "Semiconductor"],
      "Chemistry": ["Some Basic Concepts", "Matter", "Atoms and Molecules", "Structure of Atom", "Chemical Bonding", "States of Matter", "Elements Classification", "Acids Bases Salts", "Equilibrium", "Redox Reactions", "Hydrogen", "s-Block", "p-Block", "Chemical Thermodynamics", "Organic Basics", "Hydrocarbons (Organic)"],
      "Biology": ["Cell", "Biomolecules", "Cell Cycle", "Tissues", "Diversity in Living Organisms", "Plant Physiology", "Human Physiology", "Health and Diseases", "Natural Resources", "Reproduction", "Genetics", "Genetics — Advanced", "Evolution", "Biotechnology", "Ecology"],
    };
    const allowedList = subjects.map(s => {
      const key = Object.keys(CURRICULUM_SEED).find(k => k.toLowerCase() === String(s).toLowerCase().trim()) || s;
      const pool = CURRICULUM_SEED[key] || CURRICULUM_SEED[key.charAt(0).toUpperCase()+key.slice(1)] || [];
      return pool.length ? `${s}: ${pool.join(", ")}` : `${s}: (no seed — use subject name only, do not invent chapters)`;
    }).join("\n");
    const weakStr = weakTopics?.length ? `Weak topics (must prioritize early, after prerequisites): ${weakTopics.join(", ")}` : "";
    const prereqNote = `Prerequisite order (must respect): Rational Numbers → Irrational → Real Numbers → Algebraic Expressions → Linear Equations → Polynomials → word problems → Trigonometry → Coordinate Geometry → Limits → Derivatives → Integrals; Motion → Force → Work/Energy → Thermodynamics → Electrostatics → Current Electricity → Magnetism; Light → Optics; Matter → Atoms → Structure/Elements → Chemical Thermodynamics / Hydrocarbons; Cell → Tissues → Genetics → Evolution; Natural Resources → Ecology; Cell → Health.`;

    const prompt = `Generate a weekly study plan for a ${examType || "academic"} exam.
Target score: ${targetScore || "Not specified"}
Subjects: ${subjects.join(", ")}
${weakStr}
Daily study hours: ${dailyHours || 6}
Start date: ${startDate || "today"}
Exam date: ${examDate || "Not specified"}

Curriculum seed (V1 — authoritative, do NOT hallucinate beyond this):
${allowedList}

${prereqNote}
Constraints:
- Only use topics from the seed lists above for those subjects. If a subject has no seed, use the subject name as the only topic.
- Order topics so prerequisites come before dependents.
- Weak topics must appear in weeks 1-2 if their prerequisites are met, otherwise schedule prerequisites first.
- Do NOT invent chapters, curriculum paths, or prerequisites beyond the seed.

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
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
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

    // Post-validation: strip hallucinated topics (P2-13) — only seed topics allowed
    try {
      const allowedSet = new Set(Object.values(CURRICULUM_SEED).flat().map(t => String(t).toLowerCase()));
      const getPool = (name) => {
        const key = Object.keys(CURRICULUM_SEED).find(k => k.toLowerCase() === String(name).toLowerCase().trim());
        return key ? CURRICULUM_SEED[key] : [];
      };
      weeklyPlan = (Array.isArray(weeklyPlan) ? weeklyPlan : []).map(w => ({
        ...w,
        week: Number(w.week) || 1,
        title: String(w.title || `Week ${w.week || 1}` ).slice(0, 120),
        focus: String(w.focus || "").slice(0, 300),
        subjects: (Array.isArray(w.subjects) ? w.subjects : []).map(s => {
          const pool = getPool(s.name);
          const allowedLower = new Set(pool.map(t => String(t).toLowerCase()));
          const topics = Array.isArray(s.topics) ? s.topics : [];
          const filtered = topics.filter(t => allowedLower.has(String(t).toLowerCase()) || String(t).toLowerCase() === String(s.name).toLowerCase().trim());
          return { name: String(s.name).slice(0, 80), topics: filtered.length ? filtered : (pool.length ? [pool[0]] : [String(s.name).slice(0,80)]), hours: Math.min(20, Math.max(1, Number(s.hours) || 2)) };
        }).filter(s => s.topics && s.topics.length)
      })).filter(w => w.subjects && w.subjects.length);
      if (!weeklyPlan.length) {
        weeklyPlan = subjects.slice(0, 3).map((s, i) => ({ week: i+1, title: `Week ${i+1}: ${s}`, subjects: [{ name: s, topics: [s], hours: Math.min((Number(dailyHours)||6)*5, 10) }], focus: `Build foundation in ${s}` }));
      }
      // Cap at 8 weeks
      weeklyPlan = weeklyPlan.slice(0, 8);
    } catch (e) { console.warn("curriculum validation skipped", e?.message); if (!Array.isArray(weeklyPlan) || !weeklyPlan.length) weeklyPlan = []; }

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
