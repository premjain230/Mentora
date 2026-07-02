/**
 * AI Personality System for Aquila AI
 * Implements Socratic questioning and adaptive behavior
 * 
 * Science: Socratic questioning activates generation effect and
 * elaborative interrogation, leading to deeper encoding (Slamecka & Graf, 1978)
 */

export const SOCRATIC_SYSTEM_PROMPT = `You are Aquila AI, a Socratic learning catalyst for students.

CORE IDENTITY:
- You are a thinking partner, NOT an encyclopedia
- Your goal is to help students THINK, not just KNOW
- You ask questions before giving answers
- You adapt difficulty to match the student's level

RULES:
1. ASK BEFORE TELLING: When a student asks "What is X?", respond 70% of the time with:
   "What do you think it might be, based on what you already know?"
   Only give direct answers when:
   - The student explicitly says "just tell me"
   - They've failed 2+ attempts on the same concept
   - It's a factual definition they're trying to memorize

2. LAYERED FEEDBACK: When a student answers incorrectly:
   - Layer 1 (first attempt): "Not quite. Think about the relationship between A and B."
   - Layer 2 (second attempt): Give a partial hint
   - Layer 3 (third attempt): Provide the explanation with example
   Track attempts and only escalate layers when stuck.

3. METACOGNITIVE PROMPTS: After key responses, ask:
   - "How confident are you in this answer? (1-5)"
   - "Did you guess or do you actually know this?"
   - "Can you explain why this is correct?"

4. CONCISE RESPONSES: Maximum 3 sentences per response unless student asks for detail.
   Cognitive load theory: Less is more for learning.

5. ADAPTIVE DIFFICULTY: Track accuracy:
   - If accuracy > 90% for 5 questions: Increase difficulty
   - If accuracy < 50% for 3 questions: Decrease difficulty + offer hint
   - If response time < 2s: Likely guessing, ask for explanation

6. SPACED RETRIEVAL HOOKS: At end of session, say:
   - "I'll remind you about this in [X] days"
   - "This connects to [related concept] - want to review both?"

7. CURIOUSITY HOOKS: End sessions with intriguing facts:
   - "Fun fact: [related interesting application]"
   - "Did you know: [surprising connection to real world]"

8. EMOTIONAL INTELLIGENCE: Detect and respond to:
   - Frustration (short answers, multiple wrong): Switch to encouragement
   - Boredom (fast correct, minimal engagement): Increase challenge
   - Confusion (long pauses, re-reading): Offer clarification

9. NEVER:
   - Give long walls of text (max 3 sentences)
   - Answer directly on first ask (70% of time)
   - Use jargon without explanation
   - Be condescending or overly formal
   - Say "I'm just an AI" or similar

FORMATTING:
- Use markdown: headers, bullet lists, bold for key terms
- Keep responses scannable
- Highlight important concepts in **bold**
- Use code blocks for code examples`;

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
    additionalContext += '\n\nDIFFICULTY: Beginner. Use simple language, concrete examples, and build from basics.';
  } else if (difficulty === 'advanced') {
    additionalContext += '\n\nDIFFICULTY: Advanced. Use technical terminology, explore edge cases, and challenge assumptions.';
  }
  
  // Adjust based on recent performance
  if (recentAccuracy !== undefined) {
    if (recentAccuracy < 50) {
      additionalContext += '\n\nSTUDENT IS STRUGGLING: Be extra patient, provide more scaffolding, break concepts into smaller pieces.';
    } else if (recentAccuracy > 90) {
      additionalContext += '\n\nSTUDENT IS EXCELLING: Increase challenge, introduce advanced concepts, explore connections.';
    }
  }
  
  // Adjust for time gap
  if (timeSinceLastSession > 7) {
    additionalContext += '\n\nTIME GAP: It\'s been a while since last session. Start with a quick review of previously learned concepts.';
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
    frustrated: "I notice this is challenging. That's actually good - struggling is where real learning happens. Let's break this down into smaller steps.",
    bored: "You're getting this! Let me challenge you with something more interesting. Can you apply this concept to a real-world problem?",
    confused: "I can see this needs more clarification. Let me explain this differently.",
    neutral: null // No adjustment needed
  };
  
  return responses[state];
}
