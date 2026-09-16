/**
 * Student Model Module
 * Maintains a dynamic learner profile that updates after every interaction.
 * 
 * Science: Adaptive learning systems that model the student outperform
 * one-size-fits-all approaches (Bloom, 1984; Chi et al., 2011)
 */

const DEFAULT_PROFILE = {
  conceptMastery: {},
  confidence: {},
  memoryStrength: {},
  reviewHistory: [],
  mistakeHistory: [],
  commonMisconceptions: [],
  confidenceHistory: [],
  learningVelocity: 0,
  attentionPatterns: [],
  preferredStyle: null,
  motivationIndicators: [],
  learningGoals: [],
  sessionCount: 0,
  totalInteractions: 0,
  createdAt: null,
  updatedAt: null
};

export function createProfile(uid) {
  return {
    uid,
    ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function updateMastery(profile, conceptId, masteryLevel, confidence) {
  profile.conceptMastery[conceptId] = Math.max(0, Math.min(1, masteryLevel));
  profile.confidence[conceptId] = Math.max(0, Math.min(1, confidence));
  profile.updatedAt = new Date().toISOString();
  return profile;
}

export function recordInteraction(profile, { conceptId, correct, responseTime, confidence }) {
  profile.totalInteractions++;
  profile.reviewHistory.push({
    conceptId,
    correct,
    responseTime,
    confidence,
    timestamp: new Date().toISOString()
  });

  if (!correct && conceptId) {
    profile.mistakeHistory.push({
      conceptId,
      timestamp: new Date().toISOString()
    });
  }

  updateLearningVelocity(profile);
  return profile;
}

export function recordMisconception(profile, conceptId, misconception, correction) {
  profile.commonMisconceptions.push({
    conceptId,
    misconception,
    correction,
    detectedAt: new Date().toISOString(),
    resolved: false
  });
  return profile;
}

export function resolveMisconception(profile, conceptId) {
  const entry = profile.commonMisconceptions.find(
    m => m.conceptId === conceptId && !m.resolved
  );
  if (entry) entry.resolved = true;
  return profile;
}

export function getMastery(profile, conceptId) {
  return profile.conceptMastery[conceptId] || 0;
}

export function getConfidence(profile, conceptId) {
  return profile.confidence[conceptId] || 0;
}

export function getWeakestConcepts(profile, limit = 5) {
  return Object.entries(profile.conceptMastery)
    .sort(([, a], [, b]) => a - b)
    .slice(0, limit)
    .map(([conceptId, mastery]) => ({ conceptId, mastery }));
}

export function getForgettingProbability(profile, conceptId) {
  const reviews = profile.reviewHistory.filter(r => r.conceptId === conceptId);
  if (reviews.length === 0) return 0.8;
  const lastReview = reviews[reviews.length - 1];
  const daysSinceReview = (Date.now() - new Date(lastReview.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const mastery = profile.conceptMastery[conceptId] || 0;
  const stability = Math.max(1, reviews.length * 2 * (1 + mastery * 2));
  const forgettingProb = 1 - Math.exp(-daysSinceReview / stability);
  return Math.max(0, Math.min(1, forgettingProb));
}

export function getRecommendedDifficulty(profile) {
  const recentReviews = profile.reviewHistory.slice(-10);
  if (recentReviews.length < 3) return 'beginner';
  const recentCorrect = recentReviews.filter(r => r.correct).length;
  const accuracy = recentCorrect / recentReviews.length;
  if (accuracy < 0.4) return 'beginner';
  if (accuracy < 0.7) return 'intermediate';
  return 'advanced';
}

function updateLearningVelocity(profile) {
  if (profile.reviewHistory.length < 10) return;
  const recent = profile.reviewHistory.slice(-10);
  const correct = recent.filter(r => r.correct).length;
  profile.learningVelocity = correct / 10;
}

export function getSessionSummary(profile) {
  const total = profile.totalInteractions;
  const mistakes = (profile.mistakeHistory || []).length;
  const unresolvedMisconceptions = (profile.commonMisconceptions || []).filter(m => !m.resolved).length;
  const avgMastery = Object.values(profile.conceptMastery).length > 0
    ? Object.values(profile.conceptMastery).reduce((a, b) => a + b, 0) / Object.values(profile.conceptMastery).length
    : 0;

  return {
    totalInteractions: total,
    totalMistakes: mistakes,
    unresolvedMisconceptions,
    averageMastery: Math.round(avgMastery * 100),
    learningVelocity: Math.round(profile.learningVelocity * 100),
    conceptsLearned: Object.keys(profile.conceptMastery).length
  };
}
