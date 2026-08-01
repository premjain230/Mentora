/**
 * Assessment Engine Module
 * Detects misconceptions and evaluates learner answers for the conversation
 * and quiz flows.
 */

export function detectMisconception(userAnswer = "", correctAnswer = "") {
  const ua = String(userAnswer || "").trim().toLowerCase();
  const ca = String(correctAnswer || "").trim().toLowerCase();
  if (!ua || !ca) return null;

  const COMMON_MISCONCEPTIONS = [
    { clue: "force", concept: "force", fix: "Force causes acceleration, not velocity." },
    { clue: "mass and energy", concept: "mass-energy", fix: "Mass and energy are related (E=mc²), not the same thing." },
    { clue: "heat and temperature", concept: "heat-temperature", fix: "Heat is energy transfer; temperature is average kinetic energy." },
    { clue: "power and energy", concept: "power-energy", fix: "Power is energy per unit time, not the same as energy." },
  ];

  for (const entry of COMMON_MISCONCEPTIONS) {
    if (ua.includes(entry.clue) && !ca.includes(entry.clue)) {
      return {
        conceptId: entry.concept,
        misconception: entry.clue,
        correction: entry.fix,
      };
    }
  }
  return null;
}

export function evaluateAnswer(question, userAnswer, correctAnswer) {
  const ua = String(userAnswer || "").trim().toLowerCase();
  const ca = String(correctAnswer || "").trim().toLowerCase();
  if (!ca) return { isCorrect: false, detail: "No reference answer available." };

  const isCorrect = ua.length > 0 && (ua === ca || ua.includes(ca) || ca.includes(ua));
  const misconception = detectMisconception(ua, ca);

  if (isCorrect) return { isCorrect: true, detail: "Correct! You've got it." };
  if (misconception) {
    return { isCorrect: false, detail: `Looks like a common mix-up: ${misconception.correction}` };
  }
  return { isCorrect: false, detail: `Not quite. The correct answer is: ${correctAnswer}` };
}

export function getAssessmentMix(studentProfile = {}, count = 5) {
  const mastery = studentProfile.conceptMastery || {};
  const entries = Object.entries(mastery);
  const mix = [];

  if (entries.length === 0) {
    for (let i = 0; i < count; i++) mix.push({ type: "baseline", reason: "Establish a baseline" });
    return mix;
  }

  const weakest = entries.sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, count);
  const weakCount = Math.min(weakest.length, Math.ceil(count * 0.6));
  weakest.slice(0, weakCount).forEach(([id]) => mix.push({ type: "weak", conceptId: id }));
  while (mix.length < count) {
    mix.push({ type: "review", reason: "Spaced review" });
  }
  return mix;
}
