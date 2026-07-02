/**
 * Today View for Aquila AI Dashboard
 * Shows review queue, learning session, and memory strength
 * 
 * Based on: Spaced repetition, active recall, and interleaving
 */

import { getDueCards, getRetentionStrength, calculateSessionParams } from './spaced-repetition.js';

/**
 * Render the Today view
 * @param {Object} params - View parameters
 * @returns {string} HTML for Today view
 */
export function renderTodayView({ dueCards = [], memoryCards = [], currentStreak = 0 }) {
  const sessionParams = calculateSessionParams(dueCards);
  const totalStrength = memoryCards.length > 0 
    ? Math.round(memoryCards.reduce((sum, c) => sum + getRetentionStrength(c), 0) / memoryCards.length)
    : 0;
  
  return `
    <div class="today-view">
      <!-- Welcome Header -->
      <div class="today-header">
        <h1 class="today-greeting">${getGreeting()}</h1>
        <p class="today-subtitle">Let's continue your learning journey</p>
      </div>

      <!-- Quick Actions -->
      <div class="today-actions">
        <a href="home.html" class="action-card primary">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="action-content">
            <h3>Start Learning</h3>
            <p>Ask Aquila anything</p>
          </div>
          <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>

        <div class="action-card ${dueCards.length > 0 ? 'warning' : 'success'}" onclick="startReviewSession()">
          <div class="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          </div>
          <div class="action-content">
            <h3>Review Session</h3>
            <p>${dueCards.length > 0 ? `${dueCards.length} concepts due` : 'All caught up!'}</p>
          </div>
          ${dueCards.length > 0 ? `<span class="action-badge">${sessionParams.sessionLength}min</span>` : ''}
        </div>
      </div>

      <!-- Stats Row -->
      <div class="today-stats">
        <div class="stat-item">
          <div class="stat-value">${totalStrength}%</div>
          <div class="stat-label">Memory Strength</div>
          <div class="stat-bar">
            <div class="stat-fill" style="width: ${totalStrength}%; background: ${getStrengthColor(totalStrength)}"></div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${currentStreak}</div>
          <div class="stat-label">Day Streak</div>
          <div class="stat-icon">🔥</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${memoryCards.length}</div>
          <div class="stat-label">Concepts Learned</div>
          <div class="stat-icon">📚</div>
        </div>
      </div>

      <!-- Review Queue -->
      ${dueCards.length > 0 ? `
        <div class="review-queue">
          <h2 class="section-title">
            <span>Due for Review</span>
            <button class="btn-sm btn-outline" onclick="startReviewSession()">Start All</button>
          </h2>
          <div class="review-list">
            ${dueCards.slice(0, 5).map(card => renderReviewCard(card)).join('')}
          </div>
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h3>All caught up!</h3>
          <p>No reviews due today. Start learning something new or check back tomorrow.</p>
        </div>
      `}

      <!-- Learning Streak Visualization -->
      <div class="streak-visual">
        <h2 class="section-title">This Week</h2>
        <div class="week-dots">
          ${renderWeekDots()}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a single review card
 */
function renderReviewCard(card) {
  const strength = getRetentionStrength(card);
  const urgency = getUrgencyLevel(strength);
  
  return `
    <div class="review-card ${urgency}" data-concept-id="${card.conceptId}">
      <div class="review-strength">
        <div class="strength-ring">
          <svg viewBox="0 0 36 36">
            <path class="strength-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
            <path class="strength-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${getStrengthColor(strength)}" stroke-width="3" stroke-dasharray="${strength}, 100"/>
          </svg>
          <span class="strength-text">${strength}%</span>
        </div>
      </div>
      <div class="review-info">
        <h4 class="review-topic">${card.topic}</h4>
        <p class="review-subject">${card.subject}</p>
        <p class="review-meta">Reviewed ${getTimeSince(card.lastReview)}</p>
      </div>
      <button class="review-start" onclick="startSingleReview('${card.conceptId}')">
        Review
      </button>
    </div>
  `;
}

/**
 * Render week dots visualization
 */
function renderWeekDots() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  
  return days.map((day, i) => {
    const isToday = i === (today === 0 ? 6 : today - 1);
    const isPast = i < (today === 0 ? 6 : today - 1);
    
    return `
      <div class="day-dot ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
        <div class="dot"></div>
        <span class="day-label">${day}</span>
      </div>
    `;
  }).join('');
}

/**
 * Get greeting based on time of day
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get strength color based on percentage
 */
function getStrengthColor(strength) {
  if (strength >= 80) return '#22c55e';
  if (strength >= 60) return '#f59e0b';
  if (strength >= 40) return '#f97316';
  return '#ef4444';
}

/**
 * Get urgency level based on strength
 */
function getUrgencyLevel(strength) {
  if (strength < 30) return 'critical';
  if (strength < 50) return 'warning';
  return 'normal';
}

/**
 * Get human-readable time since date
 */
function getTimeSince(dateStr) {
  if (!dateStr) return 'never';
  
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Start a review session
 */
export function startReviewSession() {
  // This would trigger the review flow
  console.log('Starting review session...');
  // Navigate to chat with review mode
  window.location.href = 'home.html?mode=review';
}

/**
 * Start review for a single concept
 */
export function startSingleReview(conceptId) {
  console.log(`Starting review for concept: ${conceptId}`);
  window.location.href = `home.html?mode=review&concept=${conceptId}`;
}
