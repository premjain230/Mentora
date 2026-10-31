"use strict";

/**
 * Pure helpers for server-verified Arena battles. Sessions live in
 * users/{uid}/arenaSessions/{sessionId} (Admin SDK only; rules deny clients)
 * and carry the answer key so the score is computed server-side from the
 * submitted choices.
 */

const crypto = require("crypto");

const BATTLE_SIZE = 5;
const BOSS_SIZE = 8;
const MIN_DEFEAT = 0.6;
const MIN_BOSS_DEFEAT = 0.7;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_QUESTIONS = 12;
const MAX_QUESTION_CHARS = 1200;
const MAX_OPTION_CHARS = 500;
const MAX_EXPLANATION_CHARS = 1000;

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function trimString(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeQuestions(raw, total) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw && raw.questions)
      ? raw.questions
      : [];
  const limit = Math.max(1, Math.min(MAX_QUESTIONS, Number(total) || BATTLE_SIZE));
  const questions = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const q = trimString(item.q ?? item.question, MAX_QUESTION_CHARS);
    if (!q) continue;
    const options = Array.isArray(item.options)
      ? item.options
          .map((option) => trimString(option, MAX_OPTION_CHARS))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    if (options.length < 2) continue;
    const answer = String(item.answer || "").trim().charAt(0).toUpperCase();
    if (!"ABCD".includes(answer)) continue;
    if ("ABCD".indexOf(answer) >= options.length) continue;
    questions.push({
      q,
      options,
      answer,
      explanation: trimString(item.explanation, MAX_EXPLANATION_CHARS),
    });
    if (questions.length >= limit) break;
  }
  return questions;
}

/** Questions sent to the client never include the answer key. */
function publicQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((question) => ({
    q: question.q,
    options: question.options,
  }));
}

function normalizeChoice(choice, optionCount) {
  const n = Number(choice);
  if (!Number.isInteger(n) || n < 0 || n >= optionCount) {
    throw httpError(400, "choice is out of range.");
  }
  return n;
}

function isCorrectChoice(question, choice) {
  if (!question) return false;
  const letter = String.fromCharCode(65 + choice);
  return letter === question.answer;
}

function toMillis(value) {
  if (value == null) return null;
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Throws a typed error when a session cannot be used by this caller. */
function assertUsableSession(
  session,
  { uid, now = Date.now(), requireComplete = false, subjectKey } = {}
) {
  if (!session) throw httpError(404, "Battle session not found.");
  if (session.uid !== uid) throw httpError(403, "Battle session belongs to another user.");
  if (subjectKey != null && session.subjectKey !== subjectKey) {
    throw httpError(403, "Battle session belongs to another subject.");
  }
  if (session.status === "completed") throw httpError(409, "Battle already completed.");
  if (session.status !== "active") throw httpError(409, "Battle session is not active.");
  const expiresAt = toMillis(session.expiresAt);
  if (expiresAt != null && expiresAt <= now) throw httpError(410, "Battle session expired.");
  const questions = Array.isArray(session.questions) ? session.questions : [];
  const answers = Array.isArray(session.answers) ? session.answers : [];
  if (!questions.length) throw httpError(409, "Battle session has no questions.");
  if (requireComplete && answers.length !== questions.length) {
    throw httpError(400, "Answer every question before finishing.");
  }
  return { questions, answers };
}

/** Validates and scores a completed answer list. */
function scoreAnswers(questions, answers) {
  const qs = Array.isArray(questions) ? questions : [];
  const as = Array.isArray(answers) ? answers : [];
  if (!qs.length) throw httpError(409, "Battle session has no questions.");
  if (as.length !== qs.length) throw httpError(400, "Answer every question before finishing.");
  const seen = new Set();
  let correct = 0;
  for (const answer of as) {
    if (!answer || typeof answer !== "object") throw httpError(400, "Invalid answer record.");
    const index = Number(answer.index);
    if (!Number.isInteger(index) || index < 0 || index >= qs.length) {
      throw httpError(400, "Answer index is out of range.");
    }
    if (seen.has(index)) throw httpError(400, "Duplicate answer.");
    seen.add(index);
    const choice = normalizeChoice(answer.choice, qs[index].options.length);
    if (isCorrectChoice(qs[index], choice)) correct++;
  }
  const total = qs.length;
  return { correct, total, score: clamp01(correct / total) };
}

function newSessionId() {
  return crypto.randomUUID();
}

module.exports = {
  BATTLE_SIZE,
  BOSS_SIZE,
  MIN_DEFEAT,
  MIN_BOSS_DEFEAT,
  SESSION_TTL_MS,
  MAX_QUESTIONS,
  clamp01,
  normalizeQuestions,
  publicQuestions,
  normalizeChoice,
  isCorrectChoice,
  assertUsableSession,
  scoreAnswers,
  newSessionId,
  toMillis,
};
