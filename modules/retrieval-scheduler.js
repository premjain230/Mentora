/**
 * Retrieval Scheduler Module
 * Spaced-repetition scheduling built on an SM-2 style algorithm with an
 * exponential forgetting curve. Powers the Daily Review feature.
 */

export function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

function daysBetween(dateKey, from) {
  if (!dateKey) return 0;
  const target = new Date(`${dateKey}T00:00:00`);
  const origin = new Date(from);
  origin.setHours(0, 0, 0, 0);
  return Math.round((target - origin) / (1000 * 60 * 60 * 24));
}

/**
 * Schedule the next review for a card given a self-graded quality.
 * quality: 0 = forgot, 2 = hard, 4 = good, 5 = easy
 */
export function calculateNextReview(card, quality = 4) {
  const q = Math.max(0, Math.min(5, Number(quality) || 4));
  const interval = Math.max(0, Number(card.interval) || 1);
  const repetitions = Math.max(0, Number(card.repetitions) || 0);
  let ease = Number(card.ease) || 2.5;

  if (q < 3) {
    ease = Math.max(1.3, ease - 0.2);
    return {
      interval: 1,
      repetitions: 0,
      ease,
      dueDate: todayKey(),
      status: "relearn",
    };
  }

  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  let nextInterval;
  if (repetitions === 0) nextInterval = 1;
  else if (repetitions === 1) nextInterval = 6;
  else nextInterval = Math.round(interval * ease);

  const days = q === 5 ? Math.max(interval + 1, Math.round(nextInterval * 1.3)) : nextInterval;

  const due = new Date();
  due.setDate(due.getDate() + days);

  return {
    interval: Math.max(1, days),
    repetitions: repetitions + 1,
    ease,
    dueDate: toDateKey(due),
    status: "scheduled",
  };
}

/**
 * Estimated memory strength of a card as a percentage (0-100).
 * Higher interval + more recent review = stronger.
 */
export function getRetentionStrength(card) {
  if (!card) return 0;
  const interval = Math.max(1, Number(card.interval) || 1);
  const dueDate = card.dueDate;
  if (!dueDate) return 40;
  const days = daysBetween(dueDate, new Date());
  const decay = 100 * Math.exp(-days / (interval * 1.8));
  return Math.max(0, Math.min(100, Math.round(decay)));
}

export function getForgettingProbability(card) {
  return Math.max(0, Math.min(1, 1 - getRetentionStrength(card) / 100));
}

export function getDueCards(cards) {
  const today = todayKey();
  return (cards || []).filter((c) => {
    if (!c.dueDate) return true;
    return c.dueDate <= today;
  });
}

export function sortByPriority(cards, profile = {}) {
  return [...(cards || [])].sort((a, b) => {
    const riskA = getForgettingProbability(a);
    const riskB = getForgettingProbability(b);
    if (riskB !== riskA) return riskB - riskA;
    return (Number(a.interval) || 0) - (Number(b.interval) || 0);
  });
}

export function getNextReviewBatch(cards, profile = {}, count = 5) {
  const due = getDueCards(cards);
  return sortByPriority(due, profile).slice(0, count);
}
