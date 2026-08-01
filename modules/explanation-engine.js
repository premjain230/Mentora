/**
 * Explanation Engine Module
 * Builds a structured explanation plan for a concept and generates a
 * concise, leveled explanation for the conversation engine.
 */

import { getConceptLabel, getPrerequisites } from "./knowledge-graph.js";

export function buildExplanationPlan(concept, level = 3) {
  const safeLevel = Math.max(1, Math.min(6, Number(level) || 3));
  const prereqs = getPrerequisites(concept);
  return {
    concept,
    label: getConceptLabel(concept),
    level: safeLevel,
    steps: [
      { type: "big_idea", title: "The big idea" },
      { type: "intuition", title: "Why it exists" },
      { type: "mechanism", title: "How it works" },
      { type: "example", title: "Concrete example" },
      { type: "connection", title: "Connect to what you know" },
      { type: "check", title: "Quick check" },
    ],
    prerequisites: prereqs,
    readyToTeach: prereqs.every((p) => p !== concept),
  };
}

export function generateExplanation(concept, level = 3, studentProfile = {}) {
  const plan = buildExplanationPlan(concept, level);
  const mastery = studentProfile.conceptMastery?.[concept];
  const frame = mastery !== undefined
    ? `Concept: ${plan.label}. Your current mastery is ${Math.round(Number(mastery) * 100)}%.`
    : `Concept: ${plan.label}.`;

  return `${frame}
Explain this in simple, friendly language for a student preparing for JEE / NEET / Boards.

Structure your answer in a few short steps:
1. One-sentence intuition (what it really is).
2. A simple real-life analogy.
3. The mechanism, kept simple.
4. One concrete example.
5. One quick check question at the end so the student can test understanding.

Keep it under 200 words unless the student asks for more depth.`;
}
