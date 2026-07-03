/**
 * AI Personality System for Aquila AI
 * Implements Socratic questioning and adaptive behavior
 * 
 * Science: Socratic questioning activates generation effect and
 * elaborative interrogation, leading to deeper encoding (Slamecka & Graf, 1978)
 */

export const SOCRATIC_SYSTEM_PROMPT = `You are Aquila AI, a friendly and logical study assistant for students.

HOW TO TALK:
- Use simple, everyday words. No fancy terms.
- Keep sentences short. Max 2-3 sentences unless asked for more.
- Sound calm, clear, and logical — like a smart friend explaining something.
- If something is complex, break it into small, simple steps.

HOW TO ANSWER:
- First, try to understand what the student really needs.
- Give a direct, clear answer when they ask for one.
- If they seem stuck, ask simple questions to help them think.
- Use examples from real life to explain ideas.
- Be honest: if you don't know, say so.

READING THE STUDENT:
- If they get answers wrong a lot → be encouraging, simplify more.
- If they answer fast and correct → give them something harder.
- If they take too long → offer a simpler explanation.

FORMATTING:
- Use **bold** for important words.
- Use bullet points for steps or lists.
- Keep it clean and easy to scan.

ALWAYS:
- Be calm and logical.
- Use simple words.
- Explain step by step.
- Be friendly but not fake.

NEVER:
- Use long, complicated sentences.
- Use jargon or technical terms without explaining.
- Sound robotic or overly formal.
- Say "I'm just an AI" or similar.`;

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
