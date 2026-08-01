/**
 * Metacognition Module
 * Analyzes how a learner calibrates their confidence against actual accuracy,
 * and surfaces attention/pattern signals.
 */

export function getConfidenceDistribution(confidenceHistory = []) {
  const buckets = { low: 0, medium: 0, high: 0 };
  confidenceHistory.forEach((c) => {
    const n = Number(c) || 0;
    if (n <= 2) buckets.low += 1;
    else if (n === 3) buckets.medium += 1;
    else buckets.high += 1;
  });
  const total = Math.max(1, confidenceHistory.length);
  return {
    low: Math.round((buckets.low / total) * 100),
    medium: Math.round((buckets.medium / total) * 100),
    high: Math.round((buckets.high / total) * 100),
  };
}

export function analyzePatterns(reviewHistory = []) {
  if (reviewHistory.length < 3) {
    return { hasPatterns: false, insight: "Not enough data yet." };
  }

  const recent = reviewHistory.slice(-10);
  const correctCount = recent.filter((r) => r.correct).length;
  const accuracy = Math.round((correctCount / recent.length) * 100);

  const slowAndWrong = recent.filter(
    (r) => r.responseTime != null && r.responseTime > 30000 && !r.correct
  ).length;

  let insight;
  if (accuracy >= 80) {
    insight = "Strong recent accuracy — keep the same approach.";
  } else if (slowAndWrong >= 2) {
    insight = `You often get it right only when you take your time (${slowAndWrong} slow errors recently). Practice speed on easier sets first.`;
  } else if (accuracy >= 50) {
    insight = "Decent accuracy. Review the concepts you keep missing to push higher.";
  } else {
    insight = "Recent accuracy is low. Let's go back to fundamentals before advancing.";
  }

  return { hasPatterns: true, accuracy, slowAndWrong, insight };
}
