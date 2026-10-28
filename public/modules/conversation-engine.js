/**
 * Conversation Engine Module
 * Manages conversation flow, message handling, and AI interaction.
 * Integrates all other modules into a coherent tutoring session.
 */

import { auth, db } from '../firebase-config.js';
import {
  collection, addDoc, doc, setDoc, getDoc,
  getDocs, query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  updateMastery, recordInteraction, getSessionSummary,
  getRecommendedDifficulty, getForgettingProbability, getWeakestConcepts
} from './student-model.js';
import { getNextReviewBatch, calculateNextReview } from './retrieval-scheduler.js';
import { SYSTEM_PROMPT } from '../js/ai/system-prompt.js';
import { buildExplanationPlan, generateExplanation } from './explanation-engine.js';
import { detectMisconception, evaluateAnswer, getAssessmentMix } from './assessment-engine.js';
import { apiUrl } from '../api-base.js';

const API_ENDPOINT = apiUrl('/api/groq-proxy');
const MAX_HISTORY = 60;

const TEACHING_PHASES = [
  'assess',       // Check what the learner knows
  'explain',      // Introduce new concept
  'recall',       // Active recall prompt
  'apply',        // Application problem
  'feedback',     // Evaluate and correct
  'reflect',      // Metacognitive reflection
  'advance'       // Move to next concept
];

export function createSession(studentProfile) {
  return {
    phase: 'assess',
    currentConcept: null,
    conceptsCovered: [],
    interactionCount: 0,
    sessionStart: Date.now(),
    phaseHistory: [],
    studentProfile: { ...studentProfile }
  };
}

export async function processMessage(session, userMessage, cards = []) {
  session.interactionCount++;
  const phase = determineNextPhase(session);
  session.phase = phase;
  session.phaseHistory.push({ phase, timestamp: Date.now() });

  if (phase === 'assess') {
    return handleAssessmentPhase(session, userMessage);
  }
  if (phase === 'recall') {
    return handleRecallPhase(session, userMessage, cards);
  }
  if (phase === 'apply') {
    return handleApplicationPhase(session, userMessage);
  }

  return { type: 'generate', phase, session };
}

export function buildSystemPrompt(session, studentProfile) {
  const summary = getSessionSummary(studentProfile);
  const difficulty = getRecommendedDifficulty(studentProfile);
  const weakConcepts = getWeakestConcepts(studentProfile, 3);

  return SYSTEM_PROMPT + `

---

## SESSION CONTEXT

CURRENT TEACHING PHASE: ${session.phase}

STUDENT PROFILE:
- Average mastery: ${summary.averageMastery}%
- Learning velocity: ${summary.learningVelocity}%
- Recommended difficulty: ${difficulty}
- Total interactions: ${summary.totalInteractions}
- Weakest concepts: ${weakConcepts.map(c => c.conceptId).join(', ') || 'none yet'}

Current phase instruction: ${getPhaseInstruction(session.phase)}`;
}

export function getPhaseInstruction(phase) {
  const instructions = {
    assess: 'Ask what the learner already knows about the topic. Identify gaps. Do NOT teach yet.',
    explain: 'Introduce ONE concept. Start simple. Use an analogy. Connect to prior knowledge. Keep it short.',
    recall: 'Ask the learner to explain the concept in their own words. Do not repeat the explanation.',
    apply: 'Give a problem that requires applying the concept. Let them try before helping.',
    feedback: 'Evaluate their response. If correct, confirm. If wrong, identify the misconception and correct it.',
    reflect: 'Ask how confident they feel. What was hardest? What helped most?',
    advance: 'Summarize what was learned. Then introduce the next logical concept.'
  };
  return instructions[phase] || 'Continue teaching adaptively.';
}

export function getPhaseProgression(session, lastResponse) {
  const phaseSequence = ['assess', 'explain', 'recall', 'apply', 'feedback', 'reflect', 'advance'];
  const currentIdx = phaseSequence.indexOf(session.phase);
  const nextIdx = Math.min(currentIdx + 1, phaseSequence.length - 1);
  return phaseSequence[nextIdx];
}

function determineNextPhase(session) {
  const phaseSequence = ['assess', 'explain', 'recall', 'apply', 'feedback', 'reflect', 'advance'];
  if (!session.phaseHistory.length) return 'assess';
  const lastPhase = session.phase;
  const currentIdx = phaseSequence.indexOf(lastPhase);
  if (currentIdx < 0) return 'explain';
  return phaseSequence[(currentIdx + 1) % phaseSequence.length];
}

async function handleAssessmentPhase(session, message) {
  return { type: 'assessment_question', content: `Let me understand what you know. What do you already know about ${session.currentConcept || 'this topic'}?` };
}

async function handleRecallPhase(session, message, cards) {
  const dueCards = getNextReviewBatch(cards, session.studentProfile, 3);
  if (dueCards.length > 0) {
    const card = dueCards[0];
    session.currentConcept = card.conceptId;
    return { type: 'recall_question', content: `Let's review. Can you explain "${card.topic}"?`, card };
  }
  return { type: 'proceed', content: 'Ready to learn something new?', phase: 'explain' };
}

async function handleApplicationPhase(session, message) {
  return { type: 'application_question', content: `Great! Now let's apply this. Here's a problem for you...` };
}

export async function saveMessageToDb(chatRef, role, content) {
  if (!chatRef || !db) return;
  await addDoc(collection(chatRef, 'messages'), { role, content, ts: serverTimestamp() });
  await setDoc(chatRef, { updatedAt: serverTimestamp() }, { merge: true });
}

export async function ensureChatSession(activeChatId, firstMessage) {
  const user = auth?.currentUser;
  if (!user) return null;
  if (activeChatId) return doc(db, 'users', user.uid, 'chats', activeChatId);

  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');
  const chatRef = await addDoc(collection(db, 'users', user.uid, 'chats'), {
    title, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), messageCount: 0
  });
  return chatRef;
}
