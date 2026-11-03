// api/_learn-adaptive.js
// Learning Allied — Adaptive Learning Intelligence Engine Core
//
// Encapsulates the 10 core pillars of the adaptive tutor:
//  1. Structured Learning State Model
//  2. Personalized Teaching Strategy Engine
//  3. Misconception Detection & Classification Engine (10 diagnostic categories)
//  4. Cross-Session Learning Memory
//  5. Intelligent Questioning & Pedagogical Action Selector
//  6. Calibrated Concept Mastery Scoring Engine
//  7. Interactive Visual Teaching Specifications
//  8. Spaced Revision & Retention Engine
//  9. Cross-Subject Knowledge Graph & Prerequisite Intelligence
// 10. Structured Educational Response Formatter & Validator

const crypto = require("crypto");

/* ──────────────────────────────────────────────────────────────────────────
 * 1. TEACHING STRATEGY TAXONOMY & SELECTION
 * ────────────────────────────────────────────────────────────────────────── */

const TEACHING_STRATEGIES = {
  simple_explanation: {
    id: "simple_explanation",
    label: "Simple Explanation",
    description: "Clear, direct, and concise explanation using accessible vocabulary.",
    promptInstruction:
      "Use the 'Simple Explanation' strategy: Define the core concept clearly in simple, accessible language. Avoid jargon where plain English works. Use short sentences and immediate clarity.",
  },
  real_world_analogy: {
    id: "real_world_analogy",
    label: "Real-World Analogy",
    description: "Grounded in a familiar everyday physical scenario before abstract formalization.",
    promptInstruction:
      "Use the 'Real-World Analogy' strategy: Start with an everyday, familiar physical scenario (e.g. riding a bicycle, pushing a supermarket cart, water flowing in pipes, boiling tea). Connect each physical part of the analogy directly to the scientific/mathematical concept.",
  },
  step_by_step: {
    id: "step_by_step",
    label: "Step-by-Step Breakdown",
    description: "Sequential decomposition into bite-sized logical steps.",
    promptInstruction:
      "Use the 'Step-by-Step Breakdown' strategy: Break the reasoning into numbered, sequential logical steps. Each step must build strictly on the previous one. Explain WHY each step follows.",
  },
  visual_demonstration: {
    id: "visual_demonstration",
    label: "Visual Demonstration",
    description: "Centering the instruction around an interactive visual or spatial model.",
    promptInstruction:
      "Use the 'Visual Demonstration' strategy: Focus the explanation on what can be seen in the diagram or interactive model. Give explicit observation cues: 'Notice how...', 'Look at what happens when...'.",
  },
  example_based: {
    id: "example_based",
    label: "Example-First Teaching",
    description: "Problem or case-first instruction followed by inductive rule derivation.",
    promptInstruction:
      "Use the 'Example-First Teaching' strategy: Present a concrete, worked numerical or practical problem FIRST before stating any formal definitions. Derive the principle inductively from the example.",
  },
  concept_comparison: {
    id: "concept_comparison",
    label: "Concept Comparison",
    description: "Juxtaposing against a familiar, contrasting, or prerequisite concept.",
    promptInstruction:
      "Use the 'Concept Comparison' strategy: Compare and contrast this concept with a closely related or easily confused concept (e.g. mass vs weight, speed vs velocity, distance vs displacement, work vs effort). Highlight the exact dividing line.",
  },
  guided_discovery: {
    id: "guided_discovery",
    label: "Guided Discovery",
    description: "Socratic scaffolding prompting the student to deduce the conclusion.",
    promptInstruction:
      "Use the 'Guided Discovery' strategy: Do not give away the whole concept at once. Provide a foundational premise and ask one targeted thinking question that allows the student to deduce the next step themselves.",
  },
  prerequisite_bridge: {
    id: "prerequisite_bridge",
    label: "Prerequisite Bridge",
    description: "Refreshing an essential prerequisite concept before tackling the current topic.",
    promptInstruction:
      "Use the 'Prerequisite Bridge' strategy: The student is likely missing a prerequisite foundation. Briefly recap the prerequisite concept first, explain why it connects, and then show how it unlocks this topic.",
  },
  practice_based: {
    id: "practice_based",
    label: "Practice-Based Learning",
    description: "Immediate active problem solving with live targeted feedback.",
    promptInstruction:
      "Use the 'Practice-Based Learning' strategy: Keep explanation minimal. Walk through one short practical micro-problem and immediately ask the student to solve a parallel variation.",
  },
  concept_decomposition: {
    id: "concept_decomposition",
    label: "Concept Decomposition",
    description: "Deconstructing a compound idea into fundamental building blocks.",
    promptInstruction:
      "Use the 'Concept Decomposition' strategy: Identify the constituent parts of this complex formula or system. Explain each component in isolation, then reassemble them into the complete whole.",
  },
};

/**
 * Selects an optimal pedagogical teaching strategy based on student learning state,
 * past attempts, misconceptions, and query signals.
 */
function selectTeachingStrategy(params = {}) {
  const explicitStrategy = params.explicitStrategy || params.strategy || null;
  if (explicitStrategy && TEACHING_STRATEGIES[explicitStrategy]) {
    const s = TEACHING_STRATEGIES[explicitStrategy];
    return { ...s, strategy: s.id, strategyLabel: s.label, recommendedStyle: s.description };
  }

  const query = params.query || params.studentInput || "";
  const explanationAttempts = params.explanationAttempts || params.previousAttempts || [];
  const lastStrategy =
    params.lastStrategy ||
    (explanationAttempts.length
      ? typeof explanationAttempts[explanationAttempts.length - 1] === "string"
        ? explanationAttempts[explanationAttempts.length - 1]
        : explanationAttempts[explanationAttempts.length - 1].strategy ||
          explanationAttempts[explanationAttempts.length - 1].id
      : null);
  const verdict = params.verdict || (params.isCorrect === false ? "incorrect" : null);
  const studentState = params.studentState || null;
  const concept = params.concept || null;

  const queryText = String(query || "").toLowerCase();
  const attemptedSet = new Set(
    explanationAttempts.map((a) => (typeof a === "string" ? a : a.strategy || a.id))
  );

  function wrap(s) {
    if (!s) return null;
    return {
      ...s,
      strategy: s.id,
      strategyLabel: s.label,
      recommendedStyle: s.description,
    };
  }

  // If student explicitly asks for analogy
  if (/\b(analogy|real[- ]life|everyday|real[- ]world|like in real life)\b/.test(queryText)) {
    return wrap(TEACHING_STRATEGIES.real_world_analogy);
  }
  // If student asks for step by step or breakdown
  if (/\b(step by step|break it down|step-by-step|in steps|slowly)\b/.test(queryText)) {
    return wrap(TEACHING_STRATEGIES.step_by_step);
  }
  // If student asks for an example
  if (/\b(example|instance|problem|numerical)\b/.test(queryText)) {
    return wrap(TEACHING_STRATEGIES.example_based);
  }
  // If student asks for comparison or difference
  if (/\b(difference|compare|versus|vs|distinguish)\b/.test(queryText)) {
    return wrap(TEACHING_STRATEGIES.concept_comparison);
  }
  // If student asks for visualization
  if (/\b(diagram|picture|visual|draw|graph|show me|look like)\b/.test(queryText)) {
    return wrap(TEACHING_STRATEGIES.visual_demonstration);
  }

  // Student expressed repeated confusion: "I still don't understand work in physics"
  const isConfusion = /\b(still don'?t understand|didn'?t get it|confused|not clear|explain again|hard to understand|what does it mean)\b/.test(
    queryText
  );

  if (isConfusion || verdict === "incorrect") {
    // If simple explanation was already attempted, pivot to real-world analogy
    if (!attemptedSet.has("real_world_analogy") && lastStrategy !== "real_world_analogy") {
      return wrap(TEACHING_STRATEGIES.real_world_analogy);
    }
    // Next pivot: visual demonstration
    if (!attemptedSet.has("visual_demonstration") && lastStrategy !== "visual_demonstration") {
      return wrap(TEACHING_STRATEGIES.visual_demonstration);
    }
    // Next pivot: step-by-step
    if (!attemptedSet.has("step_by_step") && lastStrategy !== "step_by_step") {
      return wrap(TEACHING_STRATEGIES.step_by_step);
    }
    // Next pivot: concept decomposition
    if (!attemptedSet.has("concept_decomposition") && lastStrategy !== "concept_decomposition") {
      return wrap(TEACHING_STRATEGIES.concept_decomposition);
    }
    return wrap(TEACHING_STRATEGIES.example_based);
  }

  // Check student memory for preferred effective approaches
  if (studentState && studentState.learningMemory && studentState.learningMemory.preferredStrategies) {
    const preferred = studentState.learningMemory.preferredStrategies;
    if (concept && concept.subject && preferred[concept.subject.toLowerCase()]) {
      const best = preferred[concept.subject.toLowerCase()];
      if (TEACHING_STRATEGIES[best] && !attemptedSet.has(best)) {
        return wrap(TEACHING_STRATEGIES[best]);
      }
    }
  }

  // Subject default recommendations
  if (concept && concept.subject) {
    const subj = concept.subject.toLowerCase();
    if (subj.includes("physics") && !attemptedSet.has("real_world_analogy")) {
      return wrap(TEACHING_STRATEGIES.real_world_analogy);
    }
    if (subj.includes("math") && !attemptedSet.has("step_by_step")) {
      return wrap(TEACHING_STRATEGIES.step_by_step);
    }
  }

  return wrap(TEACHING_STRATEGIES.simple_explanation);
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2. MISCONCEPTION DETECTION & CLASSIFICATION ENGINE
 * ────────────────────────────────────────────────────────────────────────── */

const MISCONCEPTION_CATEGORIES = {
  conceptual_misunderstanding: {
    id: "conceptual_misunderstanding",
    label: "Conceptual Misunderstanding",
    description: "Flawed intuitive model or misconception about how the physical/mathematical principle operates.",
    indicator: "Student misinterprets the fundamental nature of the concept (e.g. thinking work is done with zero displacement).",
  },
  incorrect_formula_selection: {
    id: "incorrect_formula_selection",
    label: "Incorrect Formula Selection",
    description: "Selected an inapplicable or invalid equation for the given scenario.",
    indicator: "Applied constant acceleration equations when acceleration varies, or used Ohm's law where power formula was needed.",
  },
  incorrect_formula_application: {
    id: "incorrect_formula_application",
    label: "Incorrect Formula Application",
    description: "Correct formula chosen, but variables were substituted incorrectly or rearranged with algebraic errors.",
    indicator: "Swapped numerator and denominator or misassigned given values to variables.",
  },
  calculation_error: {
    id: "calculation_error",
    label: "Calculation Error",
    description: "Core logic and formula are sound, but arithmetic or arithmetic sign error occurred.",
    indicator: "Basic math arithmetic error, wrong multiplication, or negative sign dropped.",
  },
  unit_confusion: {
    id: "unit_confusion",
    label: "Unit Confusion",
    description: "Incompatible units combined, or failure to convert to SI units before calculating.",
    indicator: "Forgot to convert km/h to m/s, cm to m, or confused Joules with Watts.",
  },
  terminology_confusion: {
    id: "terminology_confusion",
    label: "Terminology Confusion",
    description: "Conflating two distinct technical terms with everyday colloquial meanings.",
    indicator: "Confusing heat with temperature, speed with velocity, or mass with weight.",
  },
  missing_prerequisite: {
    id: "missing_prerequisite",
    label: "Missing Prerequisite Knowledge",
    description: "Gap in foundational knowledge from an earlier chapter or another subject.",
    indicator: "Cannot resolve force vectors because basic trigonometry is unmastered.",
  },
  incomplete_reasoning: {
    id: "incomplete_reasoning",
    label: "Incomplete Reasoning",
    description: "Partially correct intuition, but missing a necessary condition or final deduction step.",
    indicator: "Identified one factor affecting rate of reaction but ignored the temperature dependency.",
  },
  misinterpretation_of_question: {
    id: "misinterpretation_of_question",
    label: "Misinterpretation of Question",
    description: "Answered a different question than the one asked due to misreading constraints.",
    indicator: "Found distance when displacement was requested, or answered for series instead of parallel.",
  },
  accidental_slip: {
    id: "accidental_slip",
    label: "Accidental Slip",
    description: "Minor isolated error from a student who otherwise demonstrates solid mastery.",
    indicator: "Typo or momentary slip on an otherwise mastered skill.",
  },
};

function classifyMisconception(params = {}) {
  const studentAnswer = params.studentAnswer || "";
  const expected = params.expected || params.correctAnswer || "";
  const question = params.question || params.questionText || "";
  const concept = params.concept || null;
  const rawMisconception = params.rawMisconception || null;
  const isCorrect = params.isCorrect;
  const verdict = params.verdict || (isCorrect === true ? "correct" : isCorrect === false ? "incorrect" : "incorrect");

  if (verdict === "correct") return null;

  const answer = String(studentAnswer || "").toLowerCase();
  const qText = String(question || "").toLowerCase();
  const expText = String(expected || "").toLowerCase();
  const rawLabel = String((rawMisconception && rawMisconception.label) || "").toLowerCase();
  const rawExpl = String((rawMisconception && rawMisconception.explanation) || "").toLowerCase();
  const combined = `${rawLabel} ${rawExpl} ${answer} ${qText} ${expText}`;

  let category = "conceptual_misunderstanding";
  let label = (rawMisconception && rawMisconception.label) || "Conceptual misunderstanding";
  let explanation =
    (rawMisconception && rawMisconception.explanation) ||
    "The answer demonstrates a misunderstanding of how the core concept operates.";
  let remediation =
    (rawMisconception && rawMisconception.remediation) ||
    "Revisit the relationship between the governing variables and examine a concrete example.";

  // Rule-based classification checks
  if (/\b(units?|joules?|watts?|newtons?|seconds?|meters?|km\/h|m\/s|volts?|amperes?|conversion)\b/i.test(combined) &&
      (/\b(watts?|joules?|volts?|amperes?|units?|conversion|m\/s|km|meters?)\b/i.test(answer) || /\b(unit|conversion)\b/i.test(qText + " " + rawLabel))) {
    category = "unit_confusion";
    label = "Unit Confusion";
    explanation = "Incompatible units or confused base units used in calculation or response.";
    remediation = "Always check that every value is converted to base SI units before substituting into the equation.";
  } else if (/\b(calculation|arithmetic|math error|multiplication|subtraction|addition|math)\b/i.test(rawLabel + " " + rawExpl) ||
             (/\b(\d+(\.\d+)?)\b/.test(answer) && /\b(\d+(\.\d+)?)\b/.test(expText) && /\b(calculate|compute|solve|\*|\+|\-|\/)\b/i.test(qText))) {
    category = "calculation_error";
    label = "Calculation Error";
    explanation = "Core logic or formula is appropriate, but an arithmetic computation error occurred.";
    remediation = "Double-check arithmetic calculations step-by-step.";
  } else if (/\b(formula|equation selection|wrong formula)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "incorrect_formula_selection";
    remediation = "Review the conditions under which this formula applies before selecting it.";
  } else if (/\b(algebra|rearrang|substitut|numerator|denominator)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "incorrect_formula_application";
    remediation = "Isolate the target variable algebraically before plugging in numbers.";
  } else if (/\b(terminology|confus|term|vocabulary|speed vs velocity|mass vs weight)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "terminology_confusion";
    remediation = "Distinguish the precise scientific definition from the everyday informal usage.";
  } else if (/\b(prerequisite|prior knowledge|vector|trigonometry|basic math)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "missing_prerequisite";
    remediation = "Review the prerequisite concept to build the necessary foundation.";
  } else if (/\b(incomplete|partially|half|missing step)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "incomplete_reasoning";
    remediation = "Ensure all necessary conditions are verified before concluding.";
  } else if (/\b(misread|misunderstood question|question asked for)\b/i.test(rawLabel + " " + rawExpl)) {
    category = "misinterpretation_of_question";
    remediation = "Highlight the given values and clearly identify what the question is specifically asking you to find.";
  }

  const hypothesisConfidence = 0.5;

  return {
    id: (rawMisconception && rawMisconception.id) || `misc_${category}_${Date.now().toString(36)}`,
    category,
    categoryLabel: MISCONCEPTION_CATEGORIES[category]?.label || "Misconception",
    label: String(label).slice(0, 160),
    explanation: String(explanation).slice(0, 500),
    remediation: String(remediation).slice(0, 400),
    hypothesisConfidence,
    occurrences: 1,
    status: "hypothesis",
    isHypothesis: true,
    confidence: hypothesisConfidence,
    actualMistake: String(explanation).slice(0, 500),
    remediationApproach: String(remediation).slice(0, 400),
    firstIdentifiedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 3. CALIBRATED CONCEPT MASTERY ENGINE
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Transparent, multi-signal mastery scoring model.
 *
 * Factors:
 *  - Performance accuracy ($A \in [0, 1]$)
 *  - Evidence quantity & sample weight ($S \in [0, 1]$)
 *  - Question difficulty weighting ($D \in [1, 3]$)
 *  - Hint penalty factor (hints reduce immediate evidence strength)
 *  - Retention decay over elapsed time ($R = e^{-\lambda \Delta t}$)
 *  - Recovery bonus when a prior misconception is successfully overcome
 *
 * Returns:
 *  - masteryScore: Calibrated estimate [0.0, 1.0]
 *  - confidenceScore: Calibrated evidence confidence [0.0, 1.0]
 *  - masteryState: "unknown" | "emerging" | "developing" | "proficient" | "mastered"
 *  - explainabilityFactors: Array of readable explanations for transparency
 */
function calculateCalibratedMastery(params = {}) {
  const evidenceList = params.evidenceList || params.history || [];
  const attempts = params.attempts || evidenceList.length;
  const resolvedMisconception = params.resolvedMisconception || false;
  const lastReviewedAt = params.lastReviewedAt || params.lastStudiedAt || null;
  const now = params.now || new Date();

  const factors = [];

  // 1. Analyze historical evidence window
  const cleanEvidence = Array.isArray(evidenceList) ? evidenceList.slice(0, 20) : [];
  let weightedCorrect = 0;
  let totalWeight = 0;

  for (const ev of cleanEvidence) {
    const isCorrect = ev.correct === true || ev.verdict === "correct" || ev.isCorrect === true;
    const isPartial = ev.verdict === "partially_correct";
    const evDifficulty = Math.max(1, Math.min(3, Number(ev.difficulty) > 0 ? (Number(ev.difficulty) <= 1 ? (ev.difficulty >= 0.7 ? 3 : ev.difficulty >= 0.4 ? 2 : 1) : Number(ev.difficulty)) : 2));
    const evHints = Math.max(0, Number(ev.hintCount || ev.hintsUsed || (ev.usedHint ? 1 : 0)) || 0);

    // Hint penalty: each hint reduces weight by 35%
    const hintFactor = Math.max(0.2, 1.0 - evHints * 0.35);

    // Difficulty weighting: difficulty 1: 0.8, difficulty 2: 1.0, difficulty 3: 1.3
    const diffMultiplier = evDifficulty === 1 ? 0.8 : evDifficulty === 2 ? 1.0 : 1.3;

    // Weight calculation
    const w = diffMultiplier * hintFactor;
    totalWeight += w;

    if (isCorrect) {
      weightedCorrect += w;
    } else if (isPartial) {
      weightedCorrect += w * 0.5;
    }
  }

  // 2. Base accuracy from weighted evidence
  const rawAccuracy = totalWeight > 0 ? weightedCorrect / totalWeight : 0.1;

  // 3. Evidence sample confidence
  const evidenceConfidence = Math.min(1.0, totalWeight / 3.0);

  // 4. Time-based retention decay (Ebbinghaus forgetting curve approximation)
  let retentionFactor = 1.0;
  if (lastReviewedAt) {
    const lastDate = new Date(lastReviewedAt);
    if (!isNaN(lastDate.getTime())) {
      const elapsedDays = Math.max(0, (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (elapsedDays > 7) {
        retentionFactor = Math.max(0.55, Math.exp(-0.02 * (elapsedDays - 7)));
        factors.push(`Time decay applied: ${elapsedDays.toFixed(0)} days since last practice.`);
      }
    }
  }

  // 5. Recovery bonus
  let recoveryBonus = 0;
  if (resolvedMisconception) {
    recoveryBonus = 0.08;
    factors.push("Recovery bonus: Successfully demonstrated understanding after previously flagged misconception.");
  }

  // 6. Calibrate final score
  if (cleanEvidence.length === 0) {
    factors.push("Initial prior assessment: No evidence recorded yet.");
    return {
      masteryScore: 0.1,
      confidenceScore: 0.1,
      confidence: 0.1,
      masteryState: "novice",
      masteryLevel: "novice",
      totalEvidenceWeight: 0,
      retentionFactor: 1.0,
      factors,
      explainabilityFactors: factors,
    };
  }

  const priorWeight = 0.6;
  const regularizedScore = (weightedCorrect + 0.1 * priorWeight) / (totalWeight + priorWeight);

  let finalScore = regularizedScore * retentionFactor + recoveryBonus;
  finalScore = Math.max(0.05, Math.min(0.98, finalScore));

  let finalConfidence = Math.min(0.95, evidenceConfidence * (cleanEvidence.length >= 2 ? 1.0 : 0.6));
  if (cleanEvidence.length <= 1) {
    finalConfidence = Math.min(finalConfidence, 0.35);
    factors.push("Single answer evidence: Low confidence estimate pending further practice.");
  } else {
    factors.push(`Evidence from ${cleanEvidence.length} questions across difficulty levels.`);
  }

  let masteryState = "novice";
  if (finalConfidence < 0.2) {
    masteryState = "novice";
  } else if (finalConfidence < 0.45) {
    masteryState = finalScore >= 0.6 ? "developing" : "emerging";
  } else {
    if (finalScore < 0.35) masteryState = "emerging";
    else if (finalScore < 0.65) masteryState = "developing";
    else if (finalScore < 0.85) masteryState = "proficient";
    else masteryState = "mastered";
  }

  const scoreRounded = Math.round(finalScore * 100) / 100;
  const confRounded = Math.round(finalConfidence * 100) / 100;

  return {
    masteryScore: scoreRounded,
    confidenceScore: confRounded,
    confidence: confRounded,
    masteryState,
    masteryLevel: masteryState,
    totalEvidenceWeight: Math.round(totalWeight * 100) / 100,
    retentionFactor: Math.round(retentionFactor * 100) / 100,
    factors,
    explainabilityFactors: factors,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4. INTELLIGENT QUESTIONING & PEDAGOGICAL ACTION SELECTOR
 * ────────────────────────────────────────────────────────────────────────── */

const PEDAGOGICAL_ACTIONS = {
  EXPLAIN: "explain",
  DIAGNOSTIC_QUESTION: "diagnostic_question",
  GIVE_HINT: "give_hint",
  BREAK_DOWN_PROBLEM: "break_down_problem",
  PREDICT_OUTCOME: "predict_outcome",
  REQUEST_CLARIFICATION: "request_clarification",
  WORKED_EXAMPLE: "worked_example",
  REVEAL_WITH_REASONING: "reveal_with_reasoning",
  RECOMMEND_PREREQUISITE: "recommend_prerequisite",
};

/**
 * Intelligently chooses the next pedagogical action.
 * Balances direct answers, scaffolding, and guided discovery without trapping
 * the student in endless unhelpful loops.
 */
function selectPedagogicalAction(params = {}) {
  const prompt = String(params.userPrompt || params.studentInput || "").toLowerCase().trim();
  const concept = params.concept || null;
  const studentState = params.studentState || null;

  // 1. Direct answer request ("Just tell me the answer", "What is the answer?", "Give up")
  if (
    /\b(just tell me (the )?answer|what is the (final )?answer|give up|don'?t know the answer|show me the solution|reveal answer)\b/.test(
      prompt
    )
  ) {
    return {
      action: PEDAGOGICAL_ACTIONS.REVEAL_WITH_REASONING,
      revealsAnswer: true,
      reason: "Student explicitly requested the direct solution; respect request while providing complete educational reasoning.",
    };
  }

  // 2. Request for hint
  if (/\b(hint|clue|nudge|give me a hint|can i get a hint)\b/.test(prompt)) {
    return {
      action: PEDAGOGICAL_ACTIONS.GIVE_HINT,
      revealsAnswer: false,
      reason: "Student requested scaffolding assistance without full solution.",
    };
  }

  // 3. Request for step breakdown
  if (/\b(step by step|break this down|break it down|walk me through|steps for me)\b/.test(prompt)) {
    return {
      action: "breakdown",
      revealsAnswer: false,
      reason: "Complex multi-step problem requires decomposed stages.",
    };
  }

  // 4. Request for worked example or calculation demonstration
  if (/\b(worked example|solve an example|show me how to solve|numerical example)\b/.test(prompt)) {
    return {
      action: PEDAGOGICAL_ACTIONS.WORKED_EXAMPLE,
      revealsAnswer: true,
      reason: "Student benefits from seeing a concrete model problem solved end-to-end.",
    };
  }

  // 5. Ambiguous question
  if (prompt.length < 4 && !/\b(hi|hello|ok|yes|no)\b/.test(prompt)) {
    return {
      action: PEDAGOGICAL_ACTIONS.REQUEST_CLARIFICATION,
      revealsAnswer: false,
      reason: "Query too brief or ambiguous to identify learning objective.",
    };
  }

  return {
    action: PEDAGOGICAL_ACTIONS.EXPLAIN,
    revealsAnswer: false,
    reason: "Standard adaptive explanation with guided check question.",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 5. CROSS-SUBJECT KNOWLEDGE INTELLIGENCE & CURRICULUM GRAPH
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Curriculum-grounded explicit relationships connecting concepts across subjects:
 * Mathematics -> Physics
 * Chemistry -> Biology
 * Geography -> Environmental Science
 * Physics -> Chemistry
 */
const CROSS_SUBJECT_GRAPH = [
  {
    sourceConceptId: "cbse.10.science.electricity",
    targetConceptId: "cbse.10.mathematics.pair_of_linear_equations_in_two_variables",
    sourceSubject: "Science (Physics)",
    targetSubject: "Mathematics",
    relationship: "prerequisite",
    rationale:
      "Solving series and parallel circuit networks and Kirchhoff's loop currents requires solving pairs of linear equations in two variables ($I_1, I_2$).",
  },
  {
    sourceConceptId: "cbse.10.science.light_reflection_and_refraction",
    targetConceptId: "cbse.10.mathematics.introduction_to_trigonometry",
    sourceSubject: "Science (Physics)",
    targetSubject: "Mathematics",
    relationship: "prerequisite",
    rationale:
      "Snell's Law of refraction ($\\frac{\\sin i}{\\sin r} = n$) relies on trigonometric ratios of angles of incidence and refraction.",
  },
  {
    sourceConceptId: "cbse.9.science.work_energy_and_simple_machines",
    targetConceptId: "cbse.9.mathematics.linear_equations_in_two_variables",
    sourceSubject: "Science (Physics)",
    targetSubject: "Mathematics",
    relationship: "prerequisite",
    rationale:
      "Calculating work done ($W = F \\cdot s$) and kinetic energy ($\\frac{1}{2}mv^2$) requires algebraic equation manipulation and rearranging linear/quadratic relations.",
  },
  {
    sourceConceptId: "cbse.10.science.life_processes",
    targetConceptId: "cbse.10.science.acids_bases_and_salts",
    sourceSubject: "Science (Biology)",
    targetSubject: "Science (Chemistry)",
    relationship: "cross_domain",
    rationale:
      "Gastric digestion and enzyme activity in the stomach require an acidic pH (hydrochloric acid), while intestinal enzymes require an alkaline pH created by bile salts.",
  },
  {
    sourceConceptId: "cbse.10.science.heredity",
    targetConceptId: "cbse.10.mathematics.probability",
    sourceSubject: "Science (Biology)",
    targetSubject: "Mathematics",
    relationship: "prerequisite",
    rationale:
      "Mendel's monohybrid ($3:1$) and dihybrid ($9:3:3:1$) phenotypic ratios are direct applications of independent event probability and Punnett squares.",
  },
  {
    sourceConceptId: "cbse.10.science.our_environment",
    targetConceptId: "cbse.10.social_science.water_resources",
    sourceSubject: "Science (Environmental)",
    targetSubject: "Social Science (Geography)",
    relationship: "cross_domain",
    rationale:
      "Ecosystem food webs and bioaccumulation in aquatic food chains directly influence water harvesting sustainability and river basin pollution.",
  },
  {
    sourceConceptId: "cbse.10.science.carbon_and_its_compounds",
    targetConceptId: "cbse.10.science.metals_and_non_metals",
    sourceSubject: "Science (Chemistry)",
    targetSubject: "Science (Chemistry)",
    relationship: "prerequisite",
    rationale:
      "Understanding covalent bond sharing in carbon requires contrasting with ionic transfer in metal-nonmetal reactions.",
  },
  {
    sourceConceptId: "jee.main.physics.work_power_energy",
    targetConceptId: "jee.main.mathematics.differential_calculus",
    sourceSubject: "Physics",
    targetSubject: "Mathematics",
    relationship: "prerequisite",
    rationale:
      "Variable force work requires definite integration ($W = \\int F(x) \\, dx$) and power is the time derivative of work ($P = \\frac{dW}{dt}$).",
  },
];

const CROSS_SUBJECT_BY_SOURCE = new Map();
for (const edge of CROSS_SUBJECT_GRAPH) {
  if (!CROSS_SUBJECT_BY_SOURCE.has(edge.sourceConceptId)) {
    CROSS_SUBJECT_BY_SOURCE.set(edge.sourceConceptId, []);
  }
  CROSS_SUBJECT_BY_SOURCE.get(edge.sourceConceptId).push(edge);
}

/**
 * Returns curriculum-grounded cross-subject prerequisites for a concept.
 */
function getCrossSubjectPrerequisites(conceptId) {
  if (!conceptId) return [];
  const edges = CROSS_SUBJECT_BY_SOURCE.get(conceptId) || [];
  return edges.map((edge) => ({
    targetConceptId: edge.targetConceptId,
    targetSubject: edge.targetSubject,
    sourceSubject: edge.sourceSubject,
    relationship: edge.relationship,
    rationale: edge.rationale,
    educationalRationale: edge.rationale,
    prerequisiteConceptId: edge.targetConceptId,
  }));
}

/* ──────────────────────────────────────────────────────────────────────────
 * 6. INTELLIGENT SPACED REVISION STRATEGY
 * ────────────────────────────────────────────────────────────────────────── */

const SPACED_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

/**
 * Computes the optimal next revision interval and urgency priority.
 */
function calculateSpacedRevision(params = {}) {
  const conceptId = params.conceptId || "general";
  const masteryScore = params.masteryScore || 0.5;
  const confidenceScore = params.confidenceScore || params.confidence || 0;
  const reviewCount = params.reviewCount || 0;
  const hasActiveMisconception = params.hasActiveMisconception || (params.unresolvedMisconceptions && params.unresolvedMisconceptions.length > 0) || false;
  const lastReviewedAt = params.lastReviewedAt || params.lastStudiedAt || null;
  const now = params.now || new Date();

  let intervalIndex = Math.min(reviewCount, SPACED_INTERVALS_DAYS.length - 1);

  if (hasActiveMisconception || masteryScore < 0.5) {
    intervalIndex = 0; // 1 day
  } else if (masteryScore >= 0.8 && confidenceScore >= 0.7) {
    intervalIndex = Math.min(intervalIndex + 1, SPACED_INTERVALS_DAYS.length - 1);
  }

  const intervalDays = SPACED_INTERVALS_DAYS[intervalIndex];
  const nextReviewDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  let urgency = 0.2;
  let isDue = false;
  if (lastReviewedAt) {
    const lastDate = new Date(lastReviewedAt);
    if (!isNaN(lastDate.getTime())) {
      const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince >= intervalDays) {
        isDue = true;
        urgency = Math.min(1.0, 0.6 + (daysSince - intervalDays) * 0.1);
      }
    }
  }

  if (hasActiveMisconception) urgency = Math.max(urgency, 0.85);
  if (masteryScore < 0.45) urgency = Math.max(urgency, 0.75);

  const urgencyScore = Math.round(urgency * 100);
  const priority = urgencyScore >= 75 ? "high" : urgencyScore >= 45 ? "medium" : "low";
  const reason = hasActiveMisconception
    ? (params.unresolvedMisconceptions && params.unresolvedMisconceptions[0]) || "Active misconception requires reinforcement"
    : urgencyScore >= 75
    ? "Review is overdue to prevent memory decay"
    : "Scheduled spaced retention check";

  return {
    conceptId,
    intervalDays,
    intervalIndex,
    nextReviewAtIso: nextReviewDate.toISOString(),
    nextRecommendedReviewDate: nextReviewDate.toISOString(),
    urgencyScore,
    priorityLevel: priority,
    priority,
    isDue,
    reason,
    recommendedFocus: reason,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * 7. PERSISTENT LEARNING MEMORY MODEL
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Creates or normalizes a persistent learning memory structure.
 */
function createInitialLearningMemory(uid) {
  return {
    uid,
    studentId: uid,
    repeatedStruggles: [],
    repeatedMisconceptions: [],
    masteredConcepts: [],
    unresolvedMisconceptions: [],
    preferredStrategies: {},
    successfulStrategies: [],
    successfulTeachingApproaches: {},
    strategyEffectiveness: {},
    crossSubjectReadiness: {},
    strengthsBySubject: {},
    lastUpdated: new Date().toISOString(),
  };
}

function recordTeachingAttempt(firstArg, secondArg) {
  let mem, conceptId, strategy, success, subject;
  if (secondArg && typeof secondArg === "object") {
    mem = firstArg;
    conceptId = secondArg.conceptId;
    strategy = secondArg.strategy;
    success = secondArg.wasSuccessful !== undefined ? secondArg.wasSuccessful : secondArg.success;
    subject = secondArg.subject || "general";
  } else {
    const params = firstArg || {};
    mem = params.learningMemory;
    conceptId = params.conceptId;
    strategy = params.strategy;
    success = params.success;
    subject = params.subject || "general";
  }

  mem = mem || createInitialLearningMemory("");
  const subjKey = String(subject || "general").toLowerCase();

  if (!mem.successfulTeachingApproaches) mem.successfulTeachingApproaches = {};
  if (!mem.preferredStrategies) mem.preferredStrategies = {};
  if (!mem.successfulStrategies) mem.successfulStrategies = [];
  if (!mem.strategyEffectiveness) mem.strategyEffectiveness = {};

  if (!mem.strategyEffectiveness[strategy]) {
    mem.strategyEffectiveness[strategy] = { attempts: 0, successes: 0 };
  }
  mem.strategyEffectiveness[strategy].attempts++;

  if (success && strategy) {
    mem.successfulTeachingApproaches[conceptId] = strategy;
    mem.preferredStrategies[subjKey] = strategy;
    if (!mem.successfulStrategies.includes(strategy)) {
      mem.successfulStrategies.push(strategy);
    }
    mem.strategyEffectiveness[strategy].successes++;
  }

  mem.lastUpdated = new Date().toISOString();
  return mem;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 8. STRUCTURED EDUCATIONAL RESPONSE FORMATTER & VALIDATOR
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Validates and normalizes structured educational AI responses.
 * Guarantees that the response fits one of the supported educational shapes:
 *  - Standard explanation
 *  - Evaluation
 *  - Guided discovery
 *  - Revision summary
 *
 * Never exposes raw unparsed JSON or broken markdown to the frontend.
 */
function normalizeAdaptiveReply(raw, opts = {}) {
  let parsed = raw;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { parsed = { directAnswer: raw }; }
  } else if (raw && raw.rawText) {
    try { parsed = JSON.parse(raw.rawText); } catch { parsed = { directAnswer: raw.rawText }; }
  }

  const candidates = opts.candidates || [];
  const text = opts.text || "";
  const subject = opts.subject || "";
  const level = opts.level || "intermediate";
  const strategy = opts.strategy || opts.strategyUsed || (raw && (raw.strategyUsed || raw.strategy || raw.teachingStrategy)) || (parsed && (parsed.strategyUsed || parsed.strategy || parsed.teachingStrategy)) || null;
  const crossSubject = opts.crossSubject || null;

  raw = parsed || {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const kind = raw.kind === "short" ? "short" : raw.kind === "guided" ? "guided" : raw.kind === "revision" ? "revision" : "lesson";
  const title = typeof raw.title === "string" ? raw.title.slice(0, 140) : null;
  const directAnswer = typeof raw.directAnswer === "string" ? raw.directAnswer.trim() : "";
  const keyIdea = typeof raw.keyIdea === "string" ? raw.keyIdea.slice(0, 240) : null;

  // Sections
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = rawSections
    .filter((s) => s && typeof s === "object")
    .slice(0, 4)
    .map((s) => ({
      heading: String(s.heading || "").slice(0, 90),
      body: String(s.body || "").slice(0, 950),
      equation: s.equation ? String(s.equation).slice(0, 200) : null,
    }))
    .filter((s) => s.heading && s.body);

  // Worked example
  let example = null;
  if (raw.example && typeof raw.example === "object") {
    const problem = typeof raw.example.problem === "string" ? raw.example.problem.slice(0, 500) : "";
    const steps = Array.isArray(raw.example.steps)
      ? raw.example.steps.map((st) => String(st).slice(0, 400)).filter(Boolean).slice(0, 6)
      : [];
    const answer = typeof raw.example.answer === "string" ? raw.example.answer.slice(0, 300) : "";
    if (problem || steps.length) {
      example = { problem, steps, answer };
    }
  }

  // Check question
  let check = null;
  if (raw.check && typeof raw.check === "object") {
    const prompt = typeof raw.check.prompt === "string" ? raw.check.prompt.slice(0, 400) : "";
    if (prompt) {
      check = {
        prompt,
        hint: typeof raw.check.hint === "string" ? raw.check.hint.slice(0, 240) : null,
        questionId: typeof raw.check.questionId === "string" ? raw.check.questionId : null,
      };
    }
  }

  // Next step
  const nextStep = typeof raw.nextStep === "string" ? raw.nextStep.slice(0, 200) : null;

  return {
    kind,
    title,
    directAnswer,
    summary: directAnswer || (raw && raw.summary) || (parsed && parsed.summary) || "",
    keyIdea: keyIdea || raw.keyIdea || null,
    sections,
    example,
    check,
    nextStep,
    visual: null, // assigned by caller's validator
    teachingStrategy: typeof strategy === "string" ? strategy : strategy ? (strategy.id || strategy.label || strategy) : null,
    crossSubjectLink: crossSubject || null,
    personalization: typeof raw.personalization === "string" ? raw.personalization.slice(0, 260) : null,
    advanced:
      raw.advanced && typeof raw.advanced === "object" && raw.advanced.body
        ? { heading: String(raw.advanced.heading || "Go deeper").slice(0, 90), body: String(raw.advanced.body).slice(0, 800) }
        : null,
    level,
    source: "ai",
  };
}

for (const key of Object.keys(TEACHING_STRATEGIES)) {
  TEACHING_STRATEGIES[key].pedagogicalIntent = TEACHING_STRATEGIES[key].description;
}
TEACHING_STRATEGIES.step_by_step_breakdown = TEACHING_STRATEGIES.step_by_step;

module.exports = {
  TEACHING_STRATEGIES,
  selectTeachingStrategy,
  MISCONCEPTION_CATEGORIES,
  classifyMisconception,
  calculateCalibratedMastery,
  PEDAGOGICAL_ACTIONS,
  selectPedagogicalAction,
  CROSS_SUBJECT_GRAPH,
  getCrossSubjectPrerequisites,
  SPACED_INTERVALS_DAYS,
  calculateSpacedRevision,
  createInitialLearningMemory,
  recordTeachingAttempt,
  normalizeAdaptiveReply,
};
