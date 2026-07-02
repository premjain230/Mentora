/**
 * Spaced Repetition Engine for Aquila AI
 * Based on Ebbinghaus forgetting curve and SM-2 algorithm
 * 
 * Science: Each successful retrieval strengthens memory and extends
 * the interval before next review. Failed retrieval resets the interval.
 */

const INITIAL_INTERVAL = 1; // days
const INTERVAL_MULTIPLIERS = [1, 3, 7, 14, 30, 60]; // days between reviews
const EASE_FACTOR_MIN = 1.3;
const EASE_FACTOR_MAX = 3.0;

/**
 * Calculate next review date based on retrieval performance
 * @param {Object} card - The knowledge card
 * @param {number} quality - 0-5 quality of response (0=forgot, 5=perfect)
 * @returns {Object} Updated card with next review info
 */
export function calculateNextReview(card, quality) {
  const { reviewCount = 0, easeFactor = 2.5, lastReview } = card;
  
  // Clamp quality between 0 and 5
  quality = Math.max(0, Math.min(5, quality));
  
  let nextInterval;
  let newEaseFactor;
  
  if (quality < 3) {
    // Failed retrieval - reset to initial interval
    nextInterval = INITIAL_INTERVAL;
    newEaseFactor = Math.max(EASE_FACTOR_MIN, easeFactor - 0.2);
  } else {
    // Successful retrieval - extend interval
    const intervalIndex = Math.min(reviewCount, INTERVAL_MULTIPLIERS.length - 1);
    nextInterval = INTERVAL_MULTIPLIERS[intervalIndex];
    
    // Adjust ease factor based on quality
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    newEaseFactor = Math.max(EASE_FACTOR_MIN, Math.min(EASE_FACTOR_MAX, newEaseFactor));
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + nextInterval);
  
  return {
    ...card,
    reviewCount: reviewCount + 1,
    easeFactor: newEaseFactor,
    lastReview: new Date().toISOString(),
    nextReview: nextReview.toISOString(),
    interval: nextInterval,
    quality
  };
}

/**
 * Check if a card is due for review
 * @param {Object} card - The knowledge card
 * @returns {boolean} True if card is due
 */
export function isDueForReview(card) {
  if (!card.nextReview) return true;
  
  const now = new Date();
  const nextReview = new Date(card.nextReview);
  
  return now >= nextReview;
}

/**
 * Get retention strength (0-100%) based on time since last review
 * Uses Ebbinghaus forgetting curve: R = e^(-t/S)
 * where R = retention, t = time, S = stability
 */
export function getRetentionStrength(card) {
  if (!card.lastReview) return 0;
  
  const now = new Date();
  const lastReview = new Date(card.lastReview);
  const daysSinceReview = (now - lastReview) / (1000 * 60 * 60 * 24);
  
  // Stability increases with each successful review
  const stability = card.interval || 1;
  
  // Ebbinghaus forgetting curve
  const retention = Math.exp(-daysSinceReview / stability) * 100;
  
  return Math.max(0, Math.min(100, Math.round(retention)));
}

/**
 * Sort cards by urgency (most overdue first)
 * @param {Array} cards - Array of knowledge cards
 * @returns {Array} Sorted cards
 */
export function sortByUrgency(cards) {
  return [...cards].sort((a, b) => {
    const aStrength = getRetentionStrength(a);
    const bStrength = getRetentionStrength(b);
    
    // Lower strength = more urgent
    return aStrength - bStrength;
  });
}

/**
 * Get cards due for review
 * @param {Array} cards - Array of all knowledge cards
 * @returns {Array} Cards due for review, sorted by urgency
 */
export function getDueCards(cards) {
  const dueCards = cards.filter(isDueForReview);
  return sortByUrgency(dueCards);
}

/**
 * Calculate optimal study session length
 * Based on research: 25-50 minutes is optimal for focused practice
 * @param {Array} dueCards - Cards due for review
 * @returns {Object} Recommended session parameters
 */
export function calculateSessionParams(dueCards) {
  const totalCards = dueCards.length;
  
  // Estimate ~2 minutes per card for active recall
  const estimatedMinutes = totalCards * 2;
  
  // Cap at 50 minutes (research shows diminishing returns)
  const sessionLength = Math.min(50, Math.max(15, estimatedMinutes));
  
  // Number of cards to review in this session
  const cardsPerSession = Math.ceil(sessionLength / 2);
  
  return {
    sessionLength,
    cardsPerSession,
    totalDue: totalCards,
    estimatedSessions: Math.ceil(totalCards / cardsPerSession)
  };
}

/**
 * Create a new knowledge card
 * @param {Object} params - Card parameters
 * @returns {Object} New card with default values
 */
export function createCard({ topic, subject, content, conceptId }) {
  return {
    conceptId: conceptId || `${subject}-${topic}-${Date.now()}`,
    topic,
    subject,
    content,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: INITIAL_INTERVAL,
    lastReview: null,
    nextReview: null,
    createdAt: new Date().toISOString()
  };
}
