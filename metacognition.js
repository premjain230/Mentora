/**
 * Metacognition Module for Aquila AI
 * Tracks student confidence vs actual performance
 * 
 * Science: Metacognitive calibration - students who accurately assess
 * their own knowledge learn 20-30% more effectively (Flavell, 1979)
 */

/**
 * Track a response with confidence rating
 * @param {Object} params - Response parameters
 * @returns {Object} Updated metacognition data
 */
export function trackResponse({ conceptId, confidence, correct, responseTime }) {
  const timestamp = new Date().toISOString();
  
  return {
    conceptId,
    confidence, // 1-5 scale
    correct,    // boolean
    responseTime, // milliseconds
    timestamp,
    // Calculate calibration score
    calibrationScore: calculateCalibration(confidence, correct)
  };
}

/**
 * Calculate calibration score for a single response
 * Perfect calibration: confident when correct, uncertain when wrong
 * @param {number} confidence - 1-5 confidence rating
 * @param {boolean} correct - Whether answer was correct
 * @returns {number} Calibration score 0-1
 */
function calculateCalibration(confidence, correct) {
  // Normalize confidence to 0-1
  const confidenceNorm = (confidence - 1) / 4;
  
  if (correct) {
    // High confidence when correct = good
    return confidenceNorm;
  } else {
    // Low confidence when wrong = good (inverse)
    return 1 - confidenceNorm;
  }
}

/**
 * Analyze metacognitive patterns for a student
 * @param {Array} history - Array of tracked responses
 * @returns {Object} Analysis results
 */
export function analyzePatterns(history) {
  if (!history || history.length === 0) {
    return {
      overconfident: false,
      underconfident: false,
      averageCalibration: 0,
      recommendation: 'Start tracking responses to see patterns'
    };
  }
  
  // Calculate overall calibration
  const totalCalibration = history.reduce((sum, h) => sum + h.calibrationScore, 0);
  const averageCalibration = totalCalibration / history.length;
  
  // Check for overconfidence (confident but wrong)
  const overconfidentCount = history.filter(h => h.confidence >= 4 && !h.correct).length;
  const overconfidentRate = overconfidentCount / history.length;
  
  // Check for underconfidence (uncertain but right)
  const underconfidentCount = history.filter(h => h.confidence <= 2 && h.correct).length;
  const underconfidentRate = underconfidentCount / history.length;
  
  // Generate recommendation
  let recommendation = '';
  if (overconfidentRate > 0.3) {
    recommendation = 'You tend to be overconfident. Try rating your confidence lower when you\'re not 100% sure.';
  } else if (underconfidentRate > 0.3) {
    recommendation = 'You tend to be underconfident. You know more than you think! Trust your knowledge.';
  } else if (averageCalibration > 0.7) {
    recommendation = 'Excellent metacognitive awareness! You accurately assess your knowledge.';
  } else {
    recommendation = 'Keep practicing. Your self-assessment will improve with time.';
  }
  
  return {
    overconfident: overconfidentRate > 0.3,
    underconfident: underconfidentRate > 0.3,
    averageCalibration: Math.round(averageCalibration * 100),
    overconfidentRate: Math.round(overconfidentRate * 100),
    underconfidentRate: Math.round(underconfidentRate * 100),
    totalResponses: history.length,
    correctRate: Math.round(history.filter(h => h.correct).length / history.length * 100),
    recommendation
  };
}

/**
 * Get confidence distribution
 * @param {Array} history - Array of tracked responses
 * @returns {Object} Distribution of confidence levels
 */
export function getConfidenceDistribution(history) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  history.forEach(h => {
    const level = Math.max(1, Math.min(5, Math.round(h.confidence)));
    distribution[level]++;
  });
  
  const total = history.length;
  return {
    counts: distribution,
    percentages: Object.fromEntries(
      Object.entries(distribution).map(([k, v]) => [k, Math.round(v / total * 100)])
    )
  };
}

/**
 * Identify concepts with poor calibration
 * These are concepts where student is consistently overconfident
 * @param {Array} history - Array of tracked responses
 * @returns {Array} Concepts needing attention
 */
export function identifyProblematicConcepts(history) {
  const conceptMap = new Map();
  
  // Group by concept
  history.forEach(h => {
    if (!conceptMap.has(h.conceptId)) {
      conceptMap.set(h.conceptId, []);
    }
    conceptMap.get(h.conceptId).push(h);
  });
  
  // Find concepts with poor calibration
  const problematic = [];
  
  conceptMap.forEach((responses, conceptId) => {
    const avgConfidence = responses.reduce((s, r) => s + r.confidence, 0) / responses.length;
    const accuracy = responses.filter(r => r.correct).length / responses.length;
    
    // Overconfident: high confidence but low accuracy
    if (avgConfidence > 3.5 && accuracy < 0.6) {
      problematic.push({
        conceptId,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        accuracy: Math.round(accuracy * 100),
        responses: responses.length,
        severity: 'high'
      });
    }
    // Underconfident: low confidence but high accuracy
    else if (avgConfidence < 2.5 && accuracy > 0.8) {
      problematic.push({
        conceptId,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        accuracy: Math.round(accuracy * 100),
        responses: responses.length,
        severity: 'low' // Low confidence is actually good to address
      });
    }
  });
  
  // Sort by severity
  return problematic.sort((a, b) => {
    const severityOrder = { high: 0, low: 1 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
