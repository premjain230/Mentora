// ─────────────────────────────────────────────────────────────
// Learning Allied — Centralized AI Intelligence & Research Layer
//
// Core Responsibilities:
//   1. Intent & Task Analysis (simple, complex, educational, research,
//      comparison, coding, problem-solving, strategic, conversational).
//   2. Intelligent Decision-Making (research necessity, visual necessity,
//      depth, structure).
//   3. Real Internet Research Orchestration & Citation Synthesis.
//   4. Automatic Learning Adaptation & Misconception Handling.
//   5. Provider-Independent Model Routing & Selection.
//   6. Strict Output Validation & Quality Assurance (no AI slop, no filler).
// ─────────────────────────────────────────────────────────────

const { searchWeb, searchImages } = require("./search");

/**
 * 1. Comprehensive Intent & Task Detection
 */
const INTENT_TYPES = {
  SIMPLE_QUESTION: "simple_question",
  COMPLEX_QUESTION: "complex_question",
  EDUCATIONAL_TOPIC: "educational_topic",
  RESEARCH: "research",
  COMPARISON: "comparison",
  CODING: "coding",
  PROBLEM_SOLVING: "problem_solving",
  CREATIVE_WORK: "creative_work",
  STRATEGIC_ADVICE: "strategic_advice",
  FOLLOW_UP: "follow_up",
  CONVERSATIONAL: "conversational",
};

/**
 * Checks if question requires real internet research.
 */
function needsInternetResearch(text) {
  const q = String(text || "").toLowerCase();
  
  // Explicit search actions & web lookup requests
  if (/\b(search|search the web|search online|search internet|google|look up|lookup|find online|check online|browse web)\b/i.test(q)) {
    return true;
  }

  // Exclude physical "electric current", "water current", "eddy current", "alternating current"
  const isPhysicalCurrent = /(electric|alternating|direct|water|ocean|eddy)\s+current/i.test(q) ||
    /current\s+(carrying|flows?|in a (?:wire|circuit)|divider|electricity)/i.test(q) ||
    /unit of (?:electric )?current/i.test(q);

  // Explicit temporal markers and dates
  if (/\b(202[4-9]|203[0-9]|latest|recent|newest|this year|today|yesterday|this week|this month|upcoming|current affairs|updates?)\b/.test(q)) {
    return true;
  }
  if (/\bcurrent\b/.test(q) && !isPhysicalCurrent) {
    if (/\b(current\s+(?:events?|affairs?|status|trends?|statistics?|situation|news|price|data|development|scenario))\b/.test(q) ||
        /\b(?:what is the current|as of current)\b/.test(q)) {
      return true;
    }
  }

  // Exam schedules, circulars, admissions, real-world statistics
  if (/\b(cutoff|result date|exam date|admit card|application deadline|registration date|eligibility criteria|syllabus change|pattern change|official notification|circular|counseling|seat matrix|merit list|rankings?|score)\b/.test(q)) {
    return true;
  }

  // Discovery, news, statistics, external validation, people in office
  if (/\b(discovery|discoveries|breakthrough|statistics|census|population of|gdp|nobel prize|who won|election|stock price|market trend|paper published|recent research|according to studies|according to research|fact check|is it true that|who is the (?:current )?(?:prime minister|president|minister|ceo|governor))\b/.test(q)) {
    return true;
  }
  // Technology releases / updates
  if (/\b(version|release date|specifications of|announced|roadmap|changelog)\b/.test(q) && !/\b(newton|coulomb|faraday|dalton)\b/.test(q)) {
    return true;
  }
  // Explicit request for sources/citations
  if (/\b(source|citation|reference|evidence|cite|where is it written|proof from web)\b/.test(q)) {
    return true;
  }

  return false;
}

/**
 * Classifies the detailed intent and structural style of the user prompt.
 */
function analyzeIntent(question, history = []) {
  const text = String(question || "").trim();
  const lower = text.toLowerCase();
  const hasHistory = Array.isArray(history) && history.length > 0;

  // 1. Follow-up detection
  const isFollowUpPattern = /^(and\b|also\b|what about|how about|why is that|can you clarify|(?:can you\s+)?(?:give|show|tell)\s+(?:me\s+)?(?:an?\s+)?(?:everyday\s+)?(?:another\s+)?example|simpler|explain it more simply|tell me more|step \d+|what if|continue)\b/i.test(lower) ||
    (hasHistory && /\b(of this|of that|about this|about that|in this case|in step \d+)\b/i.test(lower));
  if (isFollowUpPattern && hasHistory) {
    return INTENT_TYPES.FOLLOW_UP;
  }

  // 2. Pure Conversational
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy|greetings|thanks|thank you|cool|great|ok|okay|bye|goodbye)[!.?]*$/i.test(lower)) {
    return INTENT_TYPES.CONVERSATIONAL;
  }

  // 3. Coding
  if (/\b(code|function|debug|program|script|syntax|algorithm|python|javascript|typescript|c\+\+|java|html|css|sql|api|regex|compile|bug in|implement)\b/i.test(lower)) {
    return INTENT_TYPES.CODING;
  }

  // 4. Comparison
  if (/\b(compare|difference between|versus|vs\.?|pros and cons|advantages and disadvantages|contrast|better than)\b/i.test(lower)) {
    return INTENT_TYPES.COMPARISON;
  }

  // 5. Problem Solving / Calculation
  if (/\b(solve|calculate|compute|find the value|evaluate|derive|integrate|differentiate|numerical|work out)\b/i.test(lower) ||
      (/\bfind\b/i.test(lower) && /\d+/.test(lower) && lower.length < 250)) {
    return INTENT_TYPES.PROBLEM_SOLVING;
  }

  // 6. Strategic Advice
  if (/\b(strategy|study plan|how should i prepare|roadmap|how to crack|timetable|schedule|tips for|routine)\b/i.test(lower)) {
    return INTENT_TYPES.STRATEGIC_ADVICE;
  }

  // 7. Research
  if (needsInternetResearch(lower)) {
    return INTENT_TYPES.RESEARCH;
  }

  // 8. Creative Work
  if (/\b(write a poem|story|analogy|metaphor|creative|brainstorm|essay idea|roleplay)\b/i.test(lower)) {
    return INTENT_TYPES.CREATIVE_WORK;
  }

  // 9. Simple Question
  const isShortFactual = lower.split(/\s+/).length <= 9 &&
    /^(what is|who is|when was|where is|define|state)\b/i.test(lower) &&
    !lower.includes("why") && !lower.includes("how");
  if (isShortFactual) {
    return INTENT_TYPES.SIMPLE_QUESTION;
  }

  // 10. Complex Question vs Educational Topic
  if (text.length > 180 || lower.includes("explain in detail") || lower.includes("break down") || lower.split("?").length > 2) {
    return INTENT_TYPES.COMPLEX_QUESTION;
  }

  return INTENT_TYPES.EDUCATIONAL_TOPIC;
}

/**
 * 2. Visual Decision Layer
 * Evaluates whether an explanation genuinely benefits from visual information.
 */
function evaluateVisualRequirement(question, concept, intent) {
  const text = `${question || ""} ${concept ? concept.name : ""}`.toLowerCase();

  // Simple definitions or conversational queries do NOT need visuals
  if (intent === INTENT_TYPES.CONVERSATIONAL || intent === INTENT_TYPES.SIMPLE_QUESTION) {
    return { needsVisual: false, type: null, rationale: "Text is completely sufficient for simple factual or conversational response." };
  }

  // 1. Anatomical / biological structure -> scientific illustration
  if (/\b(heart|brain|kidney|nephron|neuron|cell|organelle|chloroplast|mitochondria|digestive system|eye anatomy|ear anatomy|dna structure)\b/i.test(text)) {
    return { needsVisual: true, type: "scientific_illustration", query: `${concept ? concept.name : "human"} anatomy diagram`, rationale: "Anatomical or cellular structures require spatial visualization." };
  }

  // 2. Astronomy / Solar System / Space -> real photograph / visualization
  if (/\b(solar system|planet|mars|jupiter|saturn|black hole|telescope|nebula|galaxy|moon phase|eclipse)\b/i.test(text)) {
    return { needsVisual: true, type: "astronomical_visualization", query: `${concept ? concept.name : "solar system"} high resolution`, rationale: "Astronomical concepts are best understood through authentic imagery." };
  }

  // 3. Technical diagrams (circuits, ray optics, mechanics, vectors)
  if (/\b(circuit|resistor|capacitor|kirchhoff|ray diagram|concave lens|convex mirror|refraction|free body diagram|projectile motion|wave interference)\b/i.test(text)) {
    return { needsVisual: true, type: "technical_diagram", rationale: "Ray paths, circuit schematics, or force vectors clarify physical interactions." };
  }

  // 4. Historical Events -> authentic historical photographs
  if (/\b(world war|independence|revolt of 1857|french revolution|historical monument|dandi march|ancient civilization)\b/i.test(text)) {
    return { needsVisual: true, type: "historical_photograph", query: `${concept ? concept.name : "history"} historical photo`, rationale: "Historical events benefit from verified period documentation." };
  }

  // 5. Graphs -> coordinate / function graphs
  if (/\b(distance-time graph|velocity-time graph|quadratic curve|parabola|sine wave|exponential curve)\b/i.test(text)) {
    return { needsVisual: true, type: "graph", rationale: "Trends, slopes, and kinematics depend directly on coordinate graphs." };
  }

  return { needsVisual: false, type: null, rationale: "Topic is clearly and elegantly explained through structured text." };
}

/**
 * 3. Autonomous Research & Verification Workflow
 */
async function performResearchWorkflow(question, intent) {
  const shouldSearch = intent === INTENT_TYPES.RESEARCH || needsInternetResearch(question);
  if (!shouldSearch) {
    return { didSearch: false, citations: [], researchSummary: null };
  }

  try {
    const searchRes = await searchWeb(question, 4);
    const results = searchRes?.results || [];

    if (!results.length) {
      return {
        didSearch: true,
        citations: [],
        researchSummary: "Searched authoritative sources, but no high-confidence verified external documents were retrieved.",
      };
    }

    const citations = results.map((r, i) => ({
      id: `cite-${i + 1}`,
      refNumber: i + 1,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      sourceLabel: r.source || "web",
    }));

    const researchSummary = citations
      .map((c) => `[${c.refNumber}] ${c.title} (${c.sourceLabel}): ${c.snippet}`)
      .join("\n");

    return {
      didSearch: true,
      citations,
      researchSummary,
    };
  } catch (err) {
    return {
      didSearch: true,
      citations: [],
      error: err.message,
      researchSummary: null,
    };
  }
}

/**
 * 4. Model Selection & Routing Engine
 */
function resolveModelRouting({ requestedModel, intent, needsResearch }) {
  // If user explicitly chose a model, respect it (Never silently override manual selection)
  if (requestedModel && requestedModel !== "auto") {
    const clean = String(requestedModel).toLowerCase().trim();
    if (clean.includes("gemini")) {
      return {
        provider: "gemini",
        model: requestedModel,
        isAuto: false,
        reason: "User manual selection: Gemini",
      };
    }
    if (clean.includes("llama") || clean.includes("groq") || clean.includes("qwen") || clean.includes("gpt-oss")) {
      return {
        provider: "groq",
        model: requestedModel,
        isAuto: false,
        reason: "User manual selection: Groq",
      };
    }
  }

  // AUTO Mode: Intelligently Route
  // Gemini excels at multi-step reasoning, research synthesis, and concept explanations
  // Groq excels at instantaneous streaming for simple, conversational, or coding questions
  if (needsResearch || intent === INTENT_TYPES.RESEARCH || intent === INTENT_TYPES.COMPLEX_QUESTION) {
    return {
      provider: "gemini",
      model: "gemini-2.5-flash",
      isAuto: true,
      reason: "Routed to Gemini for research verification and complex synthesis",
    };
  }

  if (intent === INTENT_TYPES.SIMPLE_QUESTION || intent === INTENT_TYPES.CONVERSATIONAL) {
    return {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      isAuto: true,
      reason: "Routed to Groq for ultra-low latency response",
    };
  }

  // Default optimal educational model
  return {
    provider: "gemini",
    model: "gemini-2.5-flash",
    isAuto: true,
    reason: "Standard educational synthesis: Gemini primary with Groq resilience",
  };
}

/**
 * 5. Professional Response Directives & Tone Standards
 */
function getResponseStyleDirectives(intent) {
  switch (intent) {
    case INTENT_TYPES.SIMPLE_QUESTION:
      return "Direct, concise answer. State the definition or fact immediately in 1-3 sentences without filler introductions, bullet bloat, or pleasantries.";
    case INTENT_TYPES.COMPLEX_QUESTION:
      return "Detailed structured breakdown. Divide into logical sub-parts with clear descriptive headings. Highlight key terminology and explain causes before effects.";
    case INTENT_TYPES.EDUCATIONAL_TOPIC:
      return "Concept-first pedagogical teaching. Anchor with an intuitive core takeaway, followed by progressive depth, a practical worked example or application, and 'Check your understanding in simple things'.";
    case INTENT_TYPES.RESEARCH:
      return "Evidence-based analysis. Ground claims in the provided search results. Provide numbered inline citations [1], [2] referencing verified sources. Differentiate established facts from evolving estimates.";
    case INTENT_TYPES.COMPARISON:
      return "Structured side-by-side comparison. Use a clean markdown comparison table with columns (Feature / Parameter, Option A, Option B) followed by key trade-offs and verdict.";
    case INTENT_TYPES.CODING:
      return "Explain the logic first, implement clean well-commented code inside fenced code blocks with language identifiers, and specify time/space complexity.";
    case INTENT_TYPES.PROBLEM_SOLVING:
      return "Step-by-step mathematical/physics solution. State given quantities, applicable formula, algebraic rearrangement, calculation steps, and final answer with correct SI units.";
    case INTENT_TYPES.STRATEGIC_ADVICE:
      return "Actionable, prioritized analysis. Provide realistic milestones, recommended focus areas, and common traps to avoid.";
    case INTENT_TYPES.FOLLOW_UP:
      return "Continue naturally using previous conversational context. Do not repeat fundamental definitions already discussed.";
    case INTENT_TYPES.CONVERSATIONAL:
      return "Natural, warm, brief response. Avoid robotic formulas or unsolicited mini-lectures.";
    default:
      return "Clear, direct, and structured. Choose formatting that serves the information.";
  }
}

/**
 * 6. Misconception & Adaptation Detection
 */
function detectConfusionPoint(text) {
  const lower = String(text || "").toLowerCase();
  if (/\b(i don'?t understand|don'?t get|didn'?t get|confus(ed|ing)|what does that mean|too complicated|simpler|explain simply|lost me|re-explain|why did you|still don'?t)\b/.test(lower)) {
    return {
      isConfused: true,
      guidance: "The student expressed confusion. Pivot explanation approach: use simpler language, a relatable real-world analogy, break complex mechanisms into smaller stages, and avoid repeating the previous phrasing.",
    };
  }
  return { isConfused: false, guidance: null };
}

module.exports = {
  INTENT_TYPES,
  analyzeIntent,
  needsInternetResearch,
  evaluateVisualRequirement,
  performResearchWorkflow,
  resolveModelRouting,
  getResponseStyleDirectives,
  detectConfusionPoint,
};
