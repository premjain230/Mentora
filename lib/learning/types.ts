"use client";

/**
 * Shared client contract for the adaptive teaching engine.
 * Both AI Chat and the Learning Hub talk to the same /api/tutor endpoint and use
 * the same types, so a teaching-logic change never needs to be made twice.
 */

export type TutorAction = "catalog" | "state" | "lesson" | "evaluate" | "chat";

export interface LearningVisual {
  id: string;
  renderer: string;
  dimension: "2d" | "3d" | "image";
  title: string;
  observe: string;
  altText: string;
  followUp?: string | null;
  params: Record<string, unknown>;
  attribution?: { source: string; url: string } | null;
}

export interface LessonSection {
  heading: string;
  body: string;
  equation?: string | null;
}

export interface WorkedExample {
  problem: string;
  steps: string[];
  answer: string;
}

export interface CheckQuestion {
  questionId: string;
  prompt: string;
  difficulty: number;
  kind: string;
  hint?: string | null;
  cacheKey?: string;
}

export interface TeachingReply {
  kind: "short" | "lesson" | "fallback";
  title: string | null;
  directAnswer: string;
  sections: LessonSection[];
  example: WorkedExample | null;
  check: CheckQuestion | null;
  visual: LearningVisual | null;
  personalization: string | null;
  advanced: { heading: string; body: string } | null;
  level: string;
  source: string;
  fallbackNote?: string;
  fallback?: boolean;
  retry?: boolean;
}

export interface Lesson {
  conceptId: string;
  name: string;
  subject: string;
  topic: string;
  trackLabel: string | null;
  level: string;
  source: string;
  reviewed: boolean;
  version: string;
  intro: string | null;
  sections: LessonSection[];
  workedExample: WorkedExample | null;
  visual: LearningVisual | null;
  check: CheckQuestion | null;
  completed: boolean;
  reteach: { changedApproach: boolean; note: string } | null;
  revision: { suggestedDays?: number[]; nextReviewAt?: string | null; note?: string };
  mastery: MasterySummary;
  prerequisites: Array<{ conceptId: string; name: string; subject?: string; status?: string }>;
  nextStep: { kind: string; label: string; conceptId?: string; nextChapter?: { conceptId: string; name: string; subject: string; difficultyLabel?: string } | null } | null;
  session?: SessionSummary;
  generatedNotice?: string;
  retry?: boolean;
  cacheKey?: string;
  advanced?: { heading: string; body: string } | null;
}

export interface MasterySummary {
  score: number | null;
  state: string;
  evidence: number;
  attempts: number;
  nextReviewAt: string | null;
}

export interface SessionSummary {
  completed: boolean;
  correctCount: number;
  answeredCount: number;
  highestCorrectDifficulty: number | null;
  requiredDifficulty: number;
  note: string;
}

export interface Evaluation {
  verdict: "correct" | "partially_correct" | "incorrect" | "unknown";
  whatWorked: string[];
  missing: string[];
  misconception: {
    id: string | null;
    label: string;
    explanation: string;
    remediation: string;
    verified: boolean;
  } | null;
  feedback: string;
  next: { difficulty: "easier" | "same" | "harder"; step: "retry" | "continue" | "explain_differently"; message: string };
  basis: string;
  packExplanation: string;
  retry?: boolean;
}

export interface TutorMeta {
  cached: boolean;
  model: string | null;
  aiCalls: number;
  latencyMs: number;
  source: string;
  conceptId?: string | null;
  level?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}

export interface ChatResponse {
  ok: true;
  reply: TeachingReply;
  meta: TutorMeta;
}

export interface LessonResponse {
  ok: true;
  lesson: Lesson;
  state: {
    profile: LearningProfile;
    mastery: MasterySummary;
    review: { state: string | null; nextReviewAt: string | null; intervalDays: number | null } | null;
    hub: { last: HubLast | null; topics: Record<string, HubTopicProgress> };
  };
  meta: TutorMeta;
}

export interface EvaluationResponse {
  ok: true;
  evaluation: Evaluation;
  nextQuestion: CheckQuestion | null;
  session: SessionSummary;
  nextLevel: string;
  attempts: LessonAttempt[];
  state: { mastery: MasterySummary };
  learningEvent: {
    type: string;
    conceptId: string;
    subject: string;
    topic: string;
    source: string;
    payload: Record<string, unknown>;
  } | null;
  meta: TutorMeta;
}

export interface LessonAttempt {
  questionId: string;
  difficulty: number;
  verdict: "correct" | "partially_correct" | "incorrect" | "unknown";
}

export interface LearningProfile {
  board: string | null;
  classNum: number | null;
  language: string;
  prioritySubject: string | null;
  subjects: string[];
  weakTopics: string[];
}

export interface HubLast {
  conceptId: string;
  name: string;
  subject: string;
  updatedAt: number;
}

export interface HubTopicProgress {
  conceptId: string;
  name: string;
  subject: string;
  status?: string;
  lastVerdict?: string;
  attempts?: number;
  updatedAt?: number;
}

export interface CatalogChapter {
  conceptId: string;
  name: string;
  subject: string;
  topic: string;
  difficulty: number;
  difficultyLabel: string;
  prerequisites: string[];
  number: number;
  progress?: { status: string | null; lastVerdict: string | null } | null;
}

export interface CatalogResponse {
  ok: true;
  catalog: {
    step: "board" | "class" | "subject" | "chapter";
    tracks?: Array<{
      id: string;
      label: string;
      short: string;
      grades: boolean;
      classes: number[];
      notice: string | null;
      chapterCount: number;
    }>;
    classes?: number[];
    subjects?: Array<{ name: string; count: number }>;
    chapters?: CatalogChapter[];
    track?: { id: string; label: string; short: string; grades: boolean; classes: number[]; notice: string | null };
    classNum?: number | null;
    subject?: string | null;
  };
  profile: LearningProfile | null;
  hub: { last: HubLast | null; topics: Record<string, HubTopicProgress> } | null;
  curriculum?: { concepts: number; tracks: number };
  meta: TutorMeta;
}

export interface StateResponse {
  ok: true;
  profile: LearningProfile;
  mastery: MasterySummary;
  review: { state: string | null; nextReviewAt: string | null; intervalDays: number | null } | null;
  misconceptions: Array<{ conceptId: string; label: string; correction: string }>;
  weakConcepts: Array<{ conceptId: string; subject: string; topic: string; score: number }>;
  hub: { last: HubLast | null; topics: Record<string, HubTopicProgress> };
  nextChapter: { conceptId: string; name: string; subject: string; difficultyLabel?: string } | null;
  meta: TutorMeta;
}

export class TutorError extends Error {
  status: number;
  code: string | null;
  retryable: boolean;
  used: number | null;
  limit: number | null;

  constructor(message: string, options: { status?: number; code?: string | null; retryable?: boolean; used?: number | null; limit?: number | null } = {}) {
    super(message);
    this.name = "TutorError";
    this.status = options.status ?? 0;
    this.code = options.code ?? null;
    this.retryable = options.retryable ?? ((options.status ?? 0) === 0 || (options.status ?? 0) >= 500);
    this.used = options.used ?? null;
    this.limit = options.limit ?? null;
  }
}

type TokenGetter = () => Promise<string>;

const inflight = new Map<string, Promise<unknown>>();

function requestKey(action: TutorAction, payload: unknown) {
  try {
    return `${action}:${JSON.stringify(payload)}`;
  } catch (_) {
    return `${action}:unserialisable`;
  }
}

export async function callTutor<T>(
  getIdToken: TokenGetter,
  action: TutorAction,
  payload: Record<string, unknown> = {},
  options: { signal?: AbortSignal; dedupe?: boolean } = {}
): Promise<T> {
  const body = { action, ...payload };
  const key = requestKey(action, body);
  const dedupe = options.dedupe !== false && !options.signal;

  if (dedupe) {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
  }

  const promise = (async () => {
    let token: string;
    try {
      token = await getIdToken();
    } catch (_) {
      throw new TutorError("Your sign-in session expired. Please sign in again.", { status: 401 });
    }

    let response: Response;
    try {
      response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: options.signal,
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
      throw new TutorError("Could not reach the tutor. Check your connection and retry.", { status: 0, retryable: true });
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const raw = data && data.error;
      const message = typeof raw === "string" ? raw : raw && typeof raw.message === "string" ? raw.message : "The tutor could not complete that request.";
      const code = raw && typeof raw.code === "string" ? raw.code : null;
      throw new TutorError(message, {
        status: response.status,
        code,
        retryable: response.status >= 500 || response.status === 429,
        used: raw && typeof raw.used === "number" ? raw.used : null,
        limit: raw && typeof raw.limit === "number" ? raw.limit : null,
      });
    }

    if (!data || data.ok === false) {
      throw new TutorError("The tutor returned an unexpected response. Please retry.", { status: 502, retryable: true });
    }
    return data as T;
  })();

  if (dedupe) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key)).catch(() => {});
  }
  return promise;
}

/** Record evidence through the existing server-authoritative learning pipeline. */
export async function emitLearningEvent(
  getIdToken: TokenGetter,
  event: {
    type: string;
    conceptId?: string | null;
    subject?: string | null;
    topic?: string | null;
    source?: string | null;
    sessionId?: string | null;
    questionId?: string | null;
    payload?: Record<string, unknown>;
    eventId?: string;
  }
): Promise<boolean> {
  try {
    const token = await getIdToken();
    const response = await fetch("/api/learning-event", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...event,
        eventId: event.eventId || `tutor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        source: event.source || "study_session",
      }),
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

/** Compact, deterministic summary of older turns — no AI call is used for this. */
export function summarizeConversation(messages: Array<{ role: string; content: string; title?: string | null }>): string {
  const userTurns = messages.filter((m) => m.role === "user").map((m) => m.content.trim()).filter(Boolean);
  const assistantTitles = messages
    .filter((m) => m.role === "assistant" && m.title)
    .map((m) => String(m.title).trim())
    .filter(Boolean);
  const parts: string[] = [];
  if (userTurns.length) parts.push(`Earlier the student asked about: ${userTurns.slice(-3).map((t) => t.slice(0, 80)).join(" | ")}`);
  if (assistantTitles.length) parts.push(`Topics already covered: ${Array.from(new Set(assistantTitles)).slice(-3).join("; ")}`);
  return parts.join(". ").slice(0, 500);
}

export function formatRelativeRevision(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "due now";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
