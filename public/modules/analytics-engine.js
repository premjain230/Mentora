/**
 * Analytics Engine Module
 * Tracks meaningful learning metrics beyond just usage.
 * 
 * Science: Learning analytics improve outcomes when focused on
 * cognitive and metacognitive measures (Winne & Baker, 2013)
 */

import { getRetentionStrength, getForgettingProbability } from './retrieval-scheduler.js';
import { analyzePatterns, getConfidenceDistribution } from '../metacognition.js';

export function calculateRetentionEstimate(cards) {
  if (!cards || cards.length === 0) return 0;
  const strengths = cards.map(getRetentionStrength);
  return Math.round(strengths.reduce((a, b) => a + b, 0) / strengths.length);
}

export function calculateMasteryProgression(studentProfile) {
  const concepts = Object.entries(studentProfile.conceptMastery || {});
  if (concepts.length === 0) return { current: 0, trend: 'stable', history: [] };

  const current = concepts.reduce((sum, [, v]) => sum + v, 0) / concepts.length;
  const recentSessions = studentProfile.reviewHistory?.slice(-20) || [];
  const halfPoint = Math.floor(recentSessions.length / 2);
  const firstHalf = recentSessions.slice(0, halfPoint).filter(r => r.correct).length;
  const secondHalf = recentSessions.slice(halfPoint).filter(r => r.correct).length;

  let trend = 'stable';
  if (halfPoint > 0) {
    const firstRate = firstHalf / halfPoint;
    const secondRate = secondHalf / halfPoint;
    if (secondRate > firstRate + 0.1) trend = 'improving';
    else if (secondRate < firstRate - 0.1) trend = 'declining';
  }

  return {
    current: Math.round(current * 100),
    trend,
    totalConcepts: concepts.length,
    masteredConcepts: concepts.filter(([, v]) => v >= 0.8).length
  };
}

export function calculateReviewEfficiency(cards) {
  if (!cards || cards.length === 0) return { efficiency: 0, optimalRatio: 0 };
  const reviewedCards = cards.filter(c => c.reviewCount > 0);
  if (reviewedCards.length === 0) return { efficiency: 0, optimalRatio: 0 };
  const avgRetention = reviewedCards.reduce((sum, c) => sum + getRetentionStrength(c), 0) / reviewedCards.length;
  const avgInterval = reviewedCards.reduce((sum, c) => sum + (c.interval || 1), 0) / reviewedCards.length;
  const efficiency = avgRetention / Math.max(1, avgInterval * 10);
  return {
    efficiency: Math.round(efficiency * 100),
    optimalRatio: Math.round((avgRetention / 100) * 100),
    averageRetention: Math.round(avgRetention),
    averageInterval: Math.round(avgInterval)
  };
}

export function analyzeMisconceptions(misconceptionHistory, studentProfile) {
  if (!misconceptionHistory || misconceptionHistory.length === 0) {
    return { frequency: 0, commonTypes: [], pattern: 'none' };
  }

  const resolved = misconceptionHistory.filter(m => m.resolved);
  const unresolved = misconceptionHistory.filter(m => !m.resolved);
  const typeCounts = {};
  misconceptionHistory.forEach(m => {
    const type = m.misconception || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const commonTypes = Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    total: misconceptionHistory.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    frequency: Math.round(misconceptionHistory.length / Math.max(1, getDaysActive(studentProfile))),
    commonTypes,
    pattern: unresolved.length > resolved.length ? 'needs_attention' : 'improving'
  };
}

export function calculateLearningVelocity(studentProfile) {
  const history = studentProfile.reviewHistory || [];
  if (history.length < 10) return { velocity: 0, trend: 'insufficient_data' };

  const windows = [];
  for (let i = 0; i < history.length; i += 10) {
    const window = history.slice(i, i + 10);
    const correct = window.filter(r => r.correct).length;
    windows.push(correct / window.length);
  }

  const current = windows[windows.length - 1] || 0;
  const previous = windows.length > 1 ? windows[windows.length - 2] : current;
  const trend = current > previous + 0.1 ? 'accelerating' : current < previous - 0.1 ? 'decelerating' : 'stable';

  return {
    velocity: Math.round(current * 100),
    trend,
    windows: windows.map(w => Math.round(w * 100))
  };
}

export function buildConceptDependencyMap(cards, studentProfile) {
  const map = {};
  (cards || []).forEach(card => {
    const mastery = studentProfile.conceptMastery?.[card.conceptId] || 0;
    const forgetting = getForgettingProbability(card);
    map[card.conceptId] = {
      name: card.topic || card.conceptId,
      subject: card.subject,
      mastery: Math.round(mastery * 100),
      forgettingRisk: Math.round(forgetting * 100),
      reviewCount: card.reviewCount || 0,
      lastReviewed: card.lastReview,
      needsReview: forgetting > 0.3
    };
  });
  return map;
}

export function calculateEngagementQuality(studentProfile) {
  const history = studentProfile.reviewHistory || [];
  if (history.length === 0) return { score: 0, level: 'insufficient' };

  const totalTime = history.reduce((sum, h) => sum + (h.responseTime || 0), 0);
  const avgResponseTime = totalTime / history.length;
  const responseTimeScore = Math.min(1, avgResponseTime / 30000);

  const correctRate = history.filter(h => h.correct).length / history.length;
  const consistency = history.slice(-10).filter(h => h.correct).length / 10;

  const confidenceEntries = studentProfile.confidenceHistory || [];
  const avgConfidence = confidenceEntries.length > 0
    ? confidenceEntries.reduce((a, b) => a + b, 0) / confidenceEntries.length
    : 0;

  const score = Math.round((responseTimeScore * 0.2 + correctRate * 0.4 + consistency * 0.2 + (avgConfidence / 5) * 0.2) * 100);

  return {
    score,
    level: score >= 80 ? 'high' : score >= 60 ? 'good' : score >= 40 ? 'moderate' : 'low',
    avgResponseTime: Math.round(avgResponseTime),
    correctRate: Math.round(correctRate * 100),
    consistency: Math.round(consistency * 100)
  };
}

export function generateLearningReport(studentProfile, cards) {
  return {
    retention: calculateRetentionEstimate(cards),
    mastery: calculateMasteryProgression(studentProfile),
    reviewEfficiency: calculateReviewEfficiency(cards),
    velocity: calculateLearningVelocity(studentProfile),
    engagement: calculateEngagementQuality(studentProfile),
    conceptMap: buildConceptDependencyMap(cards, studentProfile),
    generatedAt: new Date().toISOString()
  };
}

function getDaysActive(studentProfile) {
  if (!studentProfile?.createdAt) return 1;
  const created = new Date(studentProfile.createdAt);
  const now = new Date();
  const diff = Math.max(1, Math.round((now - created) / (1000 * 60 * 60 * 24)));
  return diff;
}
