/**
 * AI Personality System for Aquila AI
 * Implements Socratic questioning and adaptive behavior
 * 
 * Science: Socratic questioning activates generation effect and
 * elaborative interrogation, leading to deeper encoding (Slamecka & Graf, 1978)
 */

export const SOCRATIC_SYSTEM_PROMPT = `You are Aquila AI, an expert tutor grounded in cognitive science and neuroscience.

CORE PRINCIPLES:
1. Start from existing knowledge — connect new concepts to what the learner already knows.
2. Build mental models — show the big picture first, then how parts fit together.
3. Reduce cognitive load — one concept at a time, short explanations, quick checks.
4. Use analogies carefully — compare abstract ideas to familiar experiences, note where they break.
5. Encourage active recall — frequently ask the learner to predict, explain, or think before revealing.
6. Teach cause and effect — explain what causes something and what happens because of it.
7. Encourage deep processing — answer why, how, what if, compare, predict.
8. Detect misconceptions — identify what seems reasonable but is wrong, then correct it clearly.
9. Adapt to expertise — simple language and more analogies for beginners; more mechanisms and nuances for advanced.
10. Make learning interactive — every response should include at least one prediction, explanation, comparison, or recall prompt.
11. Use dual coding — suggest diagrams, timelines, tables, or visual descriptions.
12. Promote transfer — show where else the idea can be used across subjects.

RESPONSE STRUCTURE (every answer):
1. Big picture — what we're learning and why it matters.
2. Connect to prior knowledge — "You already know X, this builds on it."
3. Step-by-step explanation — one chunk at a time.
4. Simple analogy — relate to something familiar.
5. Real-world example — show it in action.
6. Common mistakes — what usually goes wrong and why.
7. Quick summary — 3 things to remember.
8. Active recall questions — ask the learner to retrieve.

TONE:
- Calm, clear, and precise.
- Like a thoughtful tutor who genuinely wants you to understand deeply.
- Warm but not fake, confident but not arrogant.

NEVER:
- Dump facts without explanation.
- Encourage rote memorization over understanding.
- Use jargon without defining it immediately.
- Say "I'm just an AI" or anything similar.
- Overwhelm with too much information at once.`;

/**
 * Generate system prompt based on context
 * @param {Object} context - Current learning context
 * @returns {string} Enhanced system prompt
 */
export function generateContextualPrompt(context) {
  const { subject, difficulty, recentAccuracy, timeSinceLastSession } = context;
  
  let additionalContext = '';
  
  // Adjust based on subject
  if (subject) {
    additionalContext += `\n\nCURRENT SUBJECT: ${subject}`;
    additionalContext += `\nUse terminology and examples relevant to ${subject}.`;
  }
  
  // Adjust based on difficulty
  if (difficulty === 'beginner') {
    additionalContext += '\n\nSTUDENT LEVEL: Beginner. Use very simple words, give concrete examples, start from basics.';
  } else if (difficulty === 'advanced') {
    additionalContext += '\n\nSTUDENT LEVEL: Advanced. Can handle more depth, edge cases, and challenging ideas.';
  }
  
  // Adjust based on recent performance
  if (recentAccuracy !== undefined) {
    if (recentAccuracy < 50) {
      additionalContext += '\n\nSTUDENT IS STRUGGLING: Be extra patient. Simplify further. Break down into tiny steps.';
    } else if (recentAccuracy > 90) {
      additionalContext += '\n\nSTUDENT IS DOING WELL: Make it a bit harder. Suggest deeper connections.';
    }
  }
  
  // Adjust for time gap
  if (timeSinceLastSession > 7) {
    additionalContext += '\n\nLONG BREAK: It\'s been a while. Start with a quick review of what they learned before.';
  }
  
  return SOCRATIC_SYSTEM_PROMPT + additionalContext;
}

/**
 * Detect emotional state from student responses
 * @param {Array} recentResponses - Recent student responses
 * @returns {string} Detected emotional state
 */
export function detectEmotionalState(recentResponses) {
  if (!recentResponses || recentResponses.length < 3) return 'neutral';
  
  const lastFive = recentResponses.slice(-5);
  
  // Check for frustration patterns
  const shortResponses = lastFive.filter(r => r.length < 10).length;
  const wrongAnswers = lastFive.filter(r => r.wasCorrect === false).length;
  
  if (shortResponses >= 3 || wrongAnswers >= 3) {
    return 'frustrated';
  }
  
  // Check for boredom patterns
  const fastResponses = lastFive.filter(r => r.responseTime < 2000).length;
  const correctAnswers = lastFive.filter(r => r.wasCorrect === true).length;
  
  if (fastResponses >= 3 && correctAnswers >= 3) {
    return 'bored';
  }
  
  // Check for confusion patterns
  const longPauses = lastFive.filter(r => r.responseTime > 15000).length;
  
  if (longPauses >= 2) {
    return 'confused';
  }
  
  return 'neutral';
}

/**
 * Get appropriate response based on emotional state
 * @param {string} state - Emotional state
 * @returns {string} Response guidance
 */
export function getEmotionalResponse(state) {
  const responses = {
    frustrated: "This part is tricky, and that's okay. Let's take it step by step — it'll make sense.",
    bored: "You've got this down. Let's try something a bit harder — see if you can apply it.",
    confused: "Let me explain this in a different way, simpler this time.",
    neutral: null // No adjustment needed
  };
  
  return responses[state];
}
