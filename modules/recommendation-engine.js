/**
 * Recommendation Engine Module
 * Provides personalized recommendations based on student model.
 * 
 * Science: Personalized content recommendations improve engagement
 * and learning outcomes (Walkington, 2013)
 */

import { getWeakestConcepts, getForgettingProbability } from './student-model.js';
import { getRetentionStrength, getDueCards, sortByPriority } from './retrieval-scheduler.js';
import { getNextConcepts } from './knowledge-graph.js';

export function getNextActions(studentProfile, cards, knowledgeGraph) {
  const actions = [];

  const dueCards = getDueCards(cards);
  if (dueCards.length > 0) {
    const priority = sortByPriority(dueCards, studentProfile);
    actions.push({
      type: 'review',
      priority: 'high',
      title: `${priority.length} concepts need review`,
      description: `${priority[0]?.topic || 'Concept'} has ${Math.round(getForgettingProbability(studentProfile, priority[0]?.conceptId) * 100)}% forgetting risk`,
      action: 'Start Review',
      cards: priority.slice(0, 3)
    });
  }

  const weakConcepts = getWeakestConcepts(studentProfile, 3);
  if (weakConcepts.length > 0) {
    actions.push({
      type: 'strengthen',
      priority: 'high',
      title: `Strengthen weak concepts`,
      description: `${weakConcepts[0].conceptId} needs improvement (${Math.round(weakConcepts[0].mastery * 100)}% mastery)`,
      action: 'Practice',
      concepts: weakConcepts
    });
  }

  const nextConcepts = getNextConcepts(studentProfile.conceptMastery || {}, null, 2);
  if (nextConcepts.length > 0) {
    actions.push({
      type: 'learn',
      priority: 'medium',
      title: `Ready to learn: ${nextConcepts[0].name}`,
      description: `Prerequisites are met. Ready for the next concept.`,
      action: 'Start Learning',
      concepts: nextConcepts
    });
  }

  const metacognitivePatterns = analyzeMetacognitiveNeeds(studentProfile);
  if (metacognitivePatterns) {
    actions.push(metacognitivePatterns);
  }

  actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return actions;
}

export function getStudyPlan(studentProfile, cards, availableHours) {
  const dueCards = getDueCards(cards);
  const prioritized = sortByPriority(dueCards, studentProfile);
  const weakConcepts = getWeakestConcepts(studentProfile, 5);

  const plan = [];
  let hoursAllocated = 0;

  for (const card of prioritized.slice(0, 10)) {
    if (hoursAllocated >= availableHours) break;
    const estimatedMinutes = 5;
    if (hoursAllocated + estimatedMinutes / 60 <= availableHours) {
      plan.push({
        type: 'review',
        conceptId: card.conceptId,
        topic: card.topic,
        duration: estimatedMinutes,
        reason: `${Math.round(getForgettingProbability(studentProfile, card.conceptId) * 100)}% forgetting risk`
      });
      hoursAllocated += estimatedMinutes / 60;
    }
  }

  for (const concept of weakConcepts) {
    if (hoursAllocated >= availableHours) break;
    if (!plan.find(p => p.conceptId === concept.conceptId)) {
      plan.push({
        type: 'practice',
        conceptId: concept.conceptId,
        duration: 10,
        reason: `Only ${Math.round(concept.mastery * 100)}% mastery`
      });
      hoursAllocated += 10 / 60;
    }
  }

  return plan;
}

export function getPersonalizedRecommendations(studentProfile, cards, knowledgeGraph) {
  const nextActions = getNextActions(studentProfile, cards, knowledgeGraph);
  const weakConcepts = getWeakestConcepts(studentProfile, 5);

  return {
    nextActions,
    focusAreas: weakConcepts.map(c => ({
      conceptId: c.conceptId,
      mastery: Math.round(c.mastery * 100),
      tip: 'Review this concept to strengthen your understanding'
    })),
    suggestedStudyTime: calculateSuggestedTime(studentProfile, cards),
    learningPath: nextActions.filter(a => a.type === 'learn').map(a => a.concepts).flat()
  };
}

function analyzeMetacognitiveNeeds(studentProfile) {
  const confidenceHistory = studentProfile.confidenceHistory || [];
  if (confidenceHistory.length < 5) return null;

  const avgConfidence = confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length;
  const recentReviews = (studentProfile.reviewHistory || []).slice(-10);
  const recentCorrect = recentReviews.filter(r => r.correct).length;
  const accuracy = recentReviews.length > 0 ? recentCorrect / recentReviews.length : 0;

  if (avgConfidence > 3.5 && accuracy < 0.5) {
    return {
      type: 'metacognitive',
      priority: 'medium',
      title: 'Calibration needed',
      description: 'You tend to be overconfident. Try rating confidence more carefully.',
      action: 'View Insights'
    };
  }

  if (avgConfidence < 2.5 && accuracy > 0.8) {
    return {
      type: 'metacognitive',
      priority: 'medium',
      title: 'You know more than you think',
      description: 'Your accuracy is high but confidence is low. Trust yourself!',
      action: 'View Insights'
    };
  }

  return null;
}

function calculateSuggestedTime(studentProfile, cards) {
  const dueCards = getDueCards(cards);
  const weakConcepts = getWeakestConcepts(studentProfile, 5);
  const totalMinutes = dueCards.length * 3 + weakConcepts.length * 10;
  return Math.max(10, Math.min(120, totalMinutes));
}
