// api/_learn-core.js
// Shared learning intelligence used by BOTH AI Chat and the Learning Hub.
//
// Design rules enforced here:
//  * Curriculum before generation: questions are anchored to the existing
//    curriculum dataset, and reviewed lesson packs are preferred over AI output.
//  * One model call per task. Evaluation returns the next authored question from
//    the local bank, so adapting does not trigger another generation call.
//  * Generated content is validated and normalised before it can reach the UI.
//  * Cached content is keyed by curriculum + level + language + version only.
//    Student-specific text and personalisation are never written to the cache.
//  * When AI or image search fails, an authored fallback is used if one exists;
//    otherwise the failure is reported honestly and never replaced with fake data.
//  * No retries, no background loops. The caller decides whether to retry.

const crypto = require("crypto");
const { groqComplete } = require("./_ai");
const { firestore } = require("./_admin");
const {
  getConcept,
  getTrack,
  getCatalog,
  getChapters,
  matchConcept,
  getPrerequisiteInfo,
  curriculumStats,
} = require("./_curriculum");

const VISUALS = require("../lib/learning/visual-catalog.json");
const PACKS = require("../lib/learning/lesson-packs.json");

const GENERATION_VERSION = 2;
const CACHE_COLLECTION = "adaptiveLessons";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 45;
const HUB_COLLECTION = "learning";
const HUB_DOC = "learningHub";
const MODEL_FAST = process.env.LEARN_MODEL_FAST || "openai/gpt-oss-20b";
const MODEL_STRONG = process.env.LEARN_MODEL_STRONG || "openai/gpt-oss-120b";
const MAX_QUESTION_CHARS = 2000;
const MAX_ANSWER_CHARS = 3000;
const MAX_ATTEMPTS = 8;

const VISUAL_BY_ID = new Map(VISUALS.templates.map((t) => [t.id, t]));
const TRUSTED_IMAGE_HOSTS = (VISUALS.domains && VISUALS.domains.allowedImageHosts) || [];

/* ── small utilities ─────────────────────────────────────────────────────── */

function clip(value, max) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function clipMultiline(value, max) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim().slice(0, max);
}

function strList(value, { maxItems = 8, maxLen = 260 } = {}) {
  const raw = Array.isArray(value) ? value : typeof value === "string" && value.trim() ? [value] : [];
  return raw
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => clipMultiline(v, maxLen))
    .slice(0, maxItems);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeAnswer(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/−/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function logMetric(event) {
  try {
    const safe = { ...event };
    if (safe.uid) safe.uid = sha256(safe.uid).slice(0, 12);
    console.log(`[learn-metric] ${JSON.stringify(safe)}`);
  } catch (_) {
    /* metrics must never break a lesson */
  }
}

/** Key tokens only, so two different questions about one concept do not collide. */
function questionSignature(question) {
  const tokens = String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 12)
    .sort();
  return tokens.slice(0, 6).join("-");
}

function fail(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

/* ── visual catalog ──────────────────────────────────────────────────────── */

function listVisualTemplates() {
  return VISUALS.templates;
}

function getVisualTemplate(id) {
  return VISUAL_BY_ID.get(String(id || "")) || null;
}

function scoreVisual(template, text, subject) {
  const hay = ` ${String(text || "").toLowerCase()} `;
  let score = 0;
  for (const keyword of template.keywords || []) {
    const k = String(keyword).toLowerCase();
    if (hay.includes(` ${k} `) || hay.includes(`${k}s `) || hay.includes(`${k},`) || hay.includes(`${k}.`)) {
      score += k.includes(" ") ? 3 : 2;
    }
  }
  if (subject && (template.subjects || []).some((s) => String(subject).toLowerCase().includes(String(s).toLowerCase()))) {
    score += 1;
  }
  if (template.renderer === "photo") score -= 3; // photos only when explicitly needed
  if (template.dimension === "3d") score -= 1; // prefer 2D unless 3D genuinely helps
  return score;
}

/** Rank the approved visual templates for a topic. Deterministic, no AI call. */
function selectVisualCandidates(text, subject, limit = 3) {
  const scored = VISUALS.templates
    .map((t) => ({ template: t, score: scoreVisual(t, text, subject) }))
    .filter((x) => x.score > 0 && x.template.renderer !== "photo")
    .sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id));
  if (!scored.length) return [];
  // Only offer visuals that are genuinely close to the best match. This stops an
  // irrelevant template (e.g. an atom for photosynthesis) creeping into the
  // candidate list the model is allowed to choose from.
  const threshold = Math.max(2, scored[0].score * 0.5);
  return scored
    .filter((x) => x.score >= threshold)
    .slice(0, limit)
    .map((x) => x.template);
}

function clampVisualParams(template, params) {
  const out = {};
  if (!template || !template.params || typeof template.params !== "object") return out;
  const provided = params && typeof params === "object" ? params : {};
  for (const [key, spec] of Object.entries(template.params)) {
    if (!spec || typeof spec !== "object") continue;
    const value = provided[key];
    if (spec.enum) {
      out[key] = spec.enum.includes(value) ? value : spec.default;
    } else if (spec.type === "stringArray") {
      const arr = Array.isArray(value)
        ? value.filter((v) => typeof v === "string" && v.trim()).map((v) => clipMultiline(v, spec.maxChars || 90))
        : [];
      const minItems = spec.minItems || 1;
      const maxItems = spec.maxItems || 6;
      out[key] = arr.length >= minItems ? arr.slice(0, maxItems) : spec.default;
    } else {
      const n = Number(value);
      const fallback = Number(spec.default);
      const min = Number.isFinite(Number(spec.min)) ? Number(spec.min) : fallback;
      const max = Number.isFinite(Number(spec.max)) ? Number(spec.max) : fallback;
      out[key] = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    }
  }
  return out;
}

function describeVisual(template, params) {
  if (!template) return null;
  return {
    id: template.id,
    renderer: template.renderer,
    dimension: template.dimension,
    title: template.title,
    observe: clipMultiline(template.observe, 360),
    altText: clipMultiline(template.altText, 300),
    followUp: clipMultiline(template.followUp, 240),
    params: clampVisualParams(template, params),
    attribution: null,
  };
}

function validateVisualSelection(selection, candidates, text, subject) {
  const allowed = new Set((candidates || []).map((c) => c.id));
  if (selection && typeof selection === "object") {
    const template = getVisualTemplate(selection.id);
    if (template && template.renderer !== "photo" && (allowed.size === 0 || allowed.has(template.id))) {
      const described = describeVisual(template, selection.params);
      if (selection.observe) described.observe = clipMultiline(selection.observe, 360);
      return described;
    }
  }
  const fallback = (candidates || [])[0] || selectVisualCandidates(text, subject, 1)[0] || null;
  return fallback ? describeVisual(fallback, null) : null;
}

function visualCandidatesForPrompt(candidates) {
  return (candidates || []).map((template) => ({
    id: template.id,
    title: template.title,
    dimension: template.dimension,
    params: template.params,
  }));
}

function isTrustedImageUrl(url) {
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return TRUSTED_IMAGE_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch (_) {
    return false;
  }
}

function needsPhotograph(text) {
  const hay = String(text || "").toLowerCase();
  return /(photograph|photo|picture of|show me|look like|real[- ]life|real[- ]world|apparatus|experiment setup|monument|landform|satellite image|wildlife|historical|geography|map of|where is .{2,40} located)/i.test(hay);
}

/* ── authored lesson packs ───────────────────────────────────────────────── */

function packSubjectMatches(pack, concept, subject) {
  const candidates = [concept && concept.subject, subject].filter(Boolean).map((s) => String(s).toLowerCase());
  if (!candidates.length) return true;
  return (pack.subjects || []).some((s) => {
    const low = String(s).toLowerCase();
    return candidates.some((c) => c === low || c.startsWith(low) || low.startsWith(c));
  });
}

function packScore(pack, concept, text) {
  const name = String((concept && concept.name) || "").toLowerCase();
  const id = String((concept && concept.conceptId) || "").toLowerCase();
  const question = String(text || "").toLowerCase();
  let score = 0;
  for (const keyword of pack.keywords || []) {
    const k = String(keyword).toLowerCase();
    if (name.includes(k)) score += 3;
    if (id.replace(/[._]/g, " ").includes(k)) score += 2;
    if (question.includes(k)) score += 1;
  }
  if (name.includes(String(pack.title || "").toLowerCase())) score += 2;
  return score;
}

function findPack(concept, text, subject) {
  let best = null;
  let bestScore = 0;
  for (const pack of PACKS.packs) {
    if (!packSubjectMatches(pack, concept, subject)) continue;
    const score = packScore(pack, concept, text);
    if (score > bestScore) {
      bestScore = score;
      best = pack;
    }
  }
  return best && bestScore >= 2 ? best : null;
}

/** Used only when no curriculum concept was matched, e.g. as an AI-failure fallback. */
function findPackByQuestion(text, subject) {
  const question = String(text || "").toLowerCase();
  if (question.length < 8) return null;
  let best = null;
  let bestScore = 0;
  for (const pack of PACKS.packs) {
    if (!packSubjectMatches(pack, null, subject)) continue;
    let score = 0;
    for (const keyword of pack.keywords || []) {
      if (question.includes(String(keyword).toLowerCase())) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pack;
    }
  }
  return best && bestScore >= 2 ? best : null;
}

function getPackById(id) {
  return PACKS.packs.find((p) => p.id === id) || null;
}

function levelFromMastery(masteryScore, evidenceStrength, difficulty) {
  const score = Number(masteryScore);
  const evidence = Number(evidenceStrength);
  const diff = Number(difficulty);
  if (!Number.isFinite(score) || !Number.isFinite(evidence) || evidence < 0.1) {
    if (!Number.isFinite(diff)) return "intermediate";
    if (diff < 0.45) return "foundation";
    if (diff < 0.7) return "intermediate";
    return "advanced";
  }
  if (score < 0.45) return "foundation";
  if (score < 0.75) return "intermediate";
  return "advanced";
}

function difficultyTarget(level) {
  if (level === "foundation") return 1;
  if (level === "advanced") return 3;
  return 2;
}

function sanitizeAttempts(attempts) {
  if (!Array.isArray(attempts)) return [];
  return attempts
    .filter((a) => a && typeof a === "object")
    .slice(-MAX_ATTEMPTS)
    .map((a) => ({
      questionId: clip(a.questionId, 120),
      difficulty: Math.min(3, Math.max(1, Number(a.difficulty) || 1)),
      verdict: ["correct", "partially_correct", "incorrect", "unknown"].includes(a.verdict) ? a.verdict : "unknown",
    }))
    .filter((a) => a.questionId);
}

function nextTargetDifficulty(level, attempts) {
  let target = difficultyTarget(level);
  const meaningful = (attempts || []).filter((a) => a.verdict !== "unknown");
  if (meaningful.length) {
    const last = meaningful[meaningful.length - 1];
    if (last.verdict === "correct") target = Math.min(3, last.difficulty + 1);
    else if (last.verdict === "incorrect") target = Math.max(1, last.difficulty - 1);
    else target = last.difficulty;
  }
  return target;
}

function pickNextQuestion(pack, attempts, level) {
  if (!pack || !Array.isArray(pack.questions) || !pack.questions.length) return null;
  const used = new Set((attempts || []).map((a) => a.questionId));
  const target = nextTargetDifficulty(level, attempts);
  const unused = pack.questions.filter((q) => !used.has(q.id));
  if (!unused.length) return null;
  const exact = unused.find((q) => Number(q.difficulty) === target);
  if (exact) return exact;
  const adjacent = unused
    .slice()
    .sort((a, b) => Math.abs(Number(a.difficulty) - target) - Math.abs(Number(b.difficulty) - target));
  return adjacent[0] || null;
}

function publicQuestion(question) {
  if (!question) return null;
  return {
    questionId: question.id,
    prompt: clipMultiline(question.prompt, 400),
    difficulty: Number(question.difficulty) || 1,
    kind: question.kind || "short",
    hint: question.hint ? clipMultiline(question.hint, 240) : null,
  };
}

function normalizePackSections(pack, level) {
  const sections = Array.isArray(pack.sections) ? pack.sections.slice() : [];
  const trimmed = level === "foundation" ? sections.slice(0, 2) : sections;
  const out = trimmed.map((s) => ({
    heading: clip(s.heading, 90),
    body: clipMultiline(s.body, 950),
    equation: s.equation ? clipMultiline(s.equation, 200) : null,
  }));
  if (level === "advanced" && pack.derivation) {
    out.push({
      heading: clip(pack.derivation.heading, 90),
      body: clipMultiline(pack.derivation.body, 1100),
      equation: pack.derivation.equation ? clipMultiline(pack.derivation.equation, 200) : null,
    });
  }
  return out;
}

function buildReusableLesson({ pack, concept, level, attempts, mastery, mode, trackLabel }) {
  const candidates = selectVisualCandidates(`${concept.name} ${concept.topic}`, concept.subject, 3);
  const packTemplate = getVisualTemplate(pack.visualId);
  const visual = packTemplate ? describeVisual(packTemplate, pack.visualParams) : validateVisualSelection(null, candidates, concept.name, concept.subject);
  const nextQuestion = pickNextQuestion(pack, attempts, level);
  const lastVerdict = attempts.length ? attempts[attempts.length - 1].verdict : null;
  const reteach = mode === "reteach" || lastVerdict === "incorrect";
  const sections = normalizePackSections(pack, level);
  if (reteach && pack.alternate) {
    sections.unshift({
      heading: clip(pack.alternate.heading, 90) || "A different way to see it",
      body: clipMultiline(pack.alternate.body, 950),
      equation: null,
    });
  }
  return {
    conceptId: concept.conceptId,
    name: clip(concept.name, 160),
    subject: clip(concept.subject, 120),
    topic: clip(concept.topic, 120),
    trackLabel: trackLabel || null,
    level,
    source: "authored",
    reviewed: !!pack.reviewed,
    reviewer: pack.reviewer || null,
    version: `pack-${PACKS.version}`,
    prerequisites: getPrerequisiteInfo(concept),
    intro: clipMultiline(
      reteach && pack.levelIntros.foundation ? pack.levelIntros.foundation : pack.levelIntros[level] || pack.levelIntros.intermediate || "",
      900
    ),
    sections,
    keyTerms: [],
    workedExample: pack.workedExample
      ? {
          problem: clipMultiline(pack.workedExample.problem, 500),
          steps: strList(pack.workedExample.steps, { maxItems: 8, maxLen: 500 }),
          answer: clipMultiline(pack.workedExample.answer, 400),
        }
      : null,
    visual,
    check: publicQuestion(nextQuestion),
    reteach: reteach
      ? {
          changedApproach: true,
          note: "Different route: start from the worked example and the picture, then try a simpler question instead of rereading the same explanation.",
        }
      : null,
    completed: !nextQuestion,
    nextStep: null,
    revision: {
      suggestedDays: Array.isArray(pack.revisionDays) ? pack.revisionDays : [1, 3, 7],
      nextReviewAt: null,
    },
    mastery: masterySummary(mastery),
  };
}

/* ── student state (Firestore, read-only for teaching) ────────────────────── */

function safeDb() {
  try {
    return firestore();
  } catch (_) {
    return null;
  }
}

function normalizeBoardValue(value) {
  const raw = String(value || "").toLowerCase();
  if (!raw) return null;
  if (raw.includes("maharashtra")) return "maharashtra";
  if (raw === "cbse" || raw.includes("cbse")) return "cbse";
  if (raw.includes("jee advanced") || raw.includes("jee_advanced")) return "jee_advanced";
  if (raw.includes("jee")) return "jee_main";
  if (raw.includes("neet")) return "neet";
  return null;
}

function masterySummary(mastery) {
  if (!mastery) return { score: null, state: "unknown", evidence: 0, attempts: 0, nextReviewAt: null };
  return {
    score: typeof mastery.masteryScore === "number" ? mastery.masteryScore : null,
    state: mastery.masteryState || "unknown",
    evidence: typeof mastery.evidenceStrength === "number" ? mastery.evidenceStrength : 0,
    attempts: Number(mastery.attempts) || 0,
    nextReviewAt: mastery.nextReviewAtIso || mastery.nextReviewAt || null,
  };
}

function emptyState() {
  return {
    profile: { board: null, classNum: null, language: "en", prioritySubject: null, subjects: [], weakTopics: [] },
    mastery: null,
    review: null,
    misconceptions: [],
    weakConcepts: [],
    masteryByConcept: {},
    hub: { last: null, topics: {} },
  };
}

async function loadStudentState(uid, { conceptId } = {}) {
  const db = safeDb();
  if (!db || !uid) return emptyState();
  try {
    const base = db.doc(`users/${uid}`);
    const [profileSnap, masterySnap, reviewSnap, misconSnap, masteryList, hubSnap] = await Promise.all([
      base.collection("learning").doc("profile").get().catch(() => null),
      conceptId ? base.collection("mastery").doc(String(conceptId)).get().catch(() => null) : Promise.resolve(null),
      conceptId ? base.collection("reviews").doc(String(conceptId)).get().catch(() => null) : Promise.resolve(null),
      base.collection("misconceptions").where("resolved", "==", false).limit(10).get().catch(() => null),
      base.collection("mastery").limit(40).get().catch(() => null),
      base.collection("learning").doc(HUB_DOC).get().catch(() => null),
    ]);
    const profileData = profileSnap && profileSnap.exists ? profileSnap.data() : {};
    const masteryData = masterySnap && masterySnap.exists ? masterySnap.data() : null;
    const reviewData = reviewSnap && reviewSnap.exists ? reviewSnap.data() : null;
    const misconceptions = [];
    if (misconSnap) {
      misconSnap.forEach((d) => {
        const data = d.data() || {};
        misconceptions.push({
          conceptId: data.conceptId || d.id,
          label: clip(data.misconception, 180),
          correction: clip(data.correction, 300),
        });
      });
    }
    const weakConcepts = [];
    const masteryByConcept = {};
    if (masteryList) {
      masteryList.forEach((d) => {
        const data = d.data() || {};
        const score = Number(data.masteryScore) || 0;
        const evidence = Number(data.evidenceStrength) || 0;
        masteryByConcept[d.id] = {
          score,
          evidence,
          state: data.masteryState || "unknown",
        };
        if (evidence < 0.15) return;
        weakConcepts.push({
          conceptId: d.id,
          subject: data.subject || "",
          topic: data.topic || d.id,
          score,
        });
      });
    }
    weakConcepts.sort((a, b) => a.score - b.score);
    const hubData = hubSnap && hubSnap.exists ? hubSnap.data() : {};
    const academic = profileData.academic && typeof profileData.academic === "object" ? profileData.academic : {};
    const classCandidate = profileData.classNum ?? profileData.grade ?? profileData.class ?? academic.grade;
    const classNumValue = Number.parseInt(String(classCandidate ?? ""), 10);
    const board =
      normalizeBoardValue(academic.board) ||
      normalizeBoardValue(profileData.board) ||
      normalizeBoardValue(profileData.exam) ||
      normalizeBoardValue(profileData.competitiveExam) ||
      null;
    return {
      profile: {
        board,
        classNum: Number.isFinite(classNumValue) && classNumValue >= 9 && classNumValue <= 12 ? classNumValue : null,
        language: typeof profileData.language === "string" ? clip(profileData.language, 12) : "en",
        prioritySubject: profileData.prioritySubject ? clip(profileData.prioritySubject, 80) : null,
        subjects: strList(profileData.subjects, { maxItems: 8, maxLen: 60 }),
        weakTopics: strList(profileData.weakTopics, { maxItems: 10, maxLen: 80 }),
      },
      mastery: masteryData ? { ...masteryData } : null,
      review: reviewData ? { ...reviewData } : null,
      misconceptions: misconceptions.slice(0, 6),
      weakConcepts: weakConcepts.slice(0, 5),
      masteryByConcept,
      hub: {
        last: hubData.last || null,
        topics: hubData.topics && typeof hubData.topics === "object" ? hubData.topics : {},
      },
    };
  } catch (err) {
    logMetric({ event: "state_read_failed", message: clip(err && err.message, 160) });
    return emptyState();
  }
}

async function loadHubProgress(uid) {
  const state = await loadStudentState(uid);
  return state.hub;
}

async function saveHubTopic(uid, concept, patch) {
  const db = safeDb();
  if (!db || !uid || !concept) return null;
  try {
    const ref = db.doc(`users/${uid}/${HUB_COLLECTION}/${HUB_DOC}`);
    const snap = await ref.get();
    const current = snap.exists ? snap.data() || {} : {};
    const topics = current.topics && typeof current.topics === "object" ? { ...current.topics } : {};
    const previous = topics[concept.conceptId] || {};
    const cleanPatch = {};
    for (const [key, value] of Object.entries(patch || {})) {
      if (value !== undefined) cleanPatch[key] = value;
    }
    const next = {
      ...previous,
      ...cleanPatch,
      conceptId: concept.conceptId,
      name: clip(concept.name, 160),
      subject: clip(concept.subject, 120),
      updatedAt: Date.now(),
    };
    topics[concept.conceptId] = next;
    const last = {
      conceptId: concept.conceptId,
      name: clip(concept.name, 160),
      subject: clip(concept.subject, 120),
      updatedAt: Date.now(),
    };
    await ref.set({ topics, last, updatedAt: Date.now() }, { merge: true });
    return { last, topics };
  } catch (err) {
    logMetric({ event: "hub_progress_write_failed", message: clip(err && err.message, 160) });
    return null;
  }
}

/* ── Firestore content cache (never personalised) ────────────────────────── */

function lessonCacheKey({ kind, conceptId, trackId, classNum, language, level, intent }) {
  const raw = [GENERATION_VERSION, kind, conceptId || "-", trackId || "-", classNum || "-", language || "en", level, intent || "-"].join("|");
  return sha256(raw).slice(0, 48);
}

async function readContentCache(key) {
  const db = safeDb();
  if (!db || !key) return null;
  try {
    const snap = await db.doc(`${CACHE_COLLECTION}/${key}`).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (data.generationVersion !== GENERATION_VERSION) return null;
    if (!data.createdAtMs || Date.now() - data.createdAtMs > CACHE_MAX_AGE_MS) return null;
    return data;
  } catch (_) {
    return null;
  }
}

async function writeContentCache(key, payload) {
  const db = safeDb();
  if (!db || !key) return false;
  try {
    await db.doc(`${CACHE_COLLECTION}/${key}`).set(
      {
        ...payload,
        generationVersion: GENERATION_VERSION,
        createdAtMs: Date.now(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    logMetric({ event: "cache_write_failed", message: clip(err && err.message, 160) });
    return false;
  }
}

/* ── AI calls (one at a time, bounded) ───────────────────────────────────── */

async function askJson(messages, { model, temperature = 0.4, maxTokens = 1200, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const usage = {};
  try {
    const parsed = await groqComplete({
      messages,
      json: true,
      model,
      temperature,
      maxTokens,
      signal: controller.signal,
      usageOut: usage,
    });
    return { parsed, usage: usage.usage || null, model };
  } catch (err) {
    const message = String((err && err.message) || "");
    // One bounded fallback when the fast model is unavailable to this key/region.
    // Anything else (rate limit, context length, network) is reported, not retried.
    if (/Groq error \(404\)/.test(message) && model && model !== MODEL_STRONG) {
      try {
        const parsed = await groqComplete({
          messages,
          json: true,
          model: MODEL_STRONG,
          temperature,
          maxTokens,
          signal: controller.signal,
          usageOut: usage,
        });
        logMetric({ event: "model_fallback", from: model, to: MODEL_STRONG });
        return { parsed, usage: usage.usage || null, model: MODEL_STRONG };
      } catch (fallbackErr) {
        logMetric({ event: "ai_failed", model: MODEL_STRONG, message: clip(fallbackErr && fallbackErr.message, 180) });
        return null;
      }
    }
    logMetric({ event: "ai_failed", model, message: clip(message, 180) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ── prompts ─────────────────────────────────────────────────────────────── */

const TEACHING_SYSTEM_PROMPT = `You are Learning Allied, an expert teacher for Indian school, JEE and NEET students.

Your job is to make ONE idea genuinely understood, not to write a long generic article. Accuracy is more important than sounding impressive. Admit uncertainty instead of inventing facts.

Return ONLY a JSON object. No markdown fences, no prose outside the JSON. Shape:
{
  "kind": "short" | "lesson",
  "title": "short title",
  "directAnswer": "the actual answer, 1-4 sentences",
  "sections": [{ "heading": "short heading", "body": "2-5 sentences", "equation": "optional equation or null" }],
  "example": { "problem": "worked example or real application", "steps": ["step 1", "step 2"], "answer": "final answer" },
  "check": { "prompt": "one useful understanding-check question", "hint": "optional nudge", "answerKey": "a short model answer for the app's checker; never shown to the student" },
  "visualId": "one id from the supplied candidates or null",
  "visualParams": { "paramName": "value" },
  "visualObserve": "one sentence telling the student what to watch",
  "personalization": "optional short note on how this fits the student's level or prior answer",
  "advanced": { "heading": "optional deeper point", "body": "optional" }
}

Rules:
- Use kind "short" for greetings, logistics and simple factual questions; then keep directAnswer brief and sections empty.
- Use kind "lesson" only when the concept genuinely needs explanation. 2-4 sections, each under ~90 words.
- Answer the student's ACTUAL question first. Do not pad with unrelated syllabus content.
- Adapt wording and depth to the supplied level, board, class and previously demonstrated understanding.
- For numerical problems show every step in example.steps and explain WHY each step is valid.
- Include units and check the arithmetic. Do not state a result you have not verified.
- Only choose a visualId from the supplied candidates. Use null if no visual helps. Never invent a visual id.
- Visual params must obey the supplied ranges/enums. Do not describe an animation as something it is not.
- The check question must be answerable from the explanation and must not repeat the question the student asked.
- Never claim you searched the web, viewed an image, ran a simulation or saw the student's screen. Never invent image URLs or citations.
- If the student is mistaken, correct the cause of the misconception kindly and concretely.
- If the student writes in another language, reply in that language unless the requested language is explicit.`;

function contextBlock({ concept, trackId, classNum, language, level, state, history, summary, question, candidates, photosAllowed }) {
  const track = getTrack(trackId);
  const lines = [];
  lines.push(`Board/exam: ${track ? track.label : "not specified"}`);
  if (classNum) lines.push(`Class: ${classNum}`);
  if (language) lines.push(`Language: ${language}`);
  lines.push(`Student level: ${level}`);
  if (concept) {
    lines.push(`Curriculum concept: ${concept.name} (${concept.subject}; id ${concept.conceptId}; difficulty ${concept.difficulty})`);
    const prereqs = getPrerequisiteInfo(concept).map((p) => p.name).join(", ");
    if (prereqs) lines.push(`Prerequisites in the dataset: ${prereqs}`);
  } else {
    lines.push("Curriculum concept: no exact match, answer from the question itself.");
  }
  if (state && state.profile && state.profile.prioritySubject) lines.push(`Priority subject: ${state.profile.prioritySubject}`);
  if (state && state.weakConcepts && state.weakConcepts.length) {
    lines.push(`Recently weak topics: ${state.weakConcepts.map((w) => w.topic).join("; ")}`);
  }
  if (state && state.misconceptions && state.misconceptions.length) {
    lines.push(`Known misconceptions to avoid reinforcing: ${state.misconceptions.map((m) => m.label).slice(0, 3).join("; ")}`);
  }
  if (summary) lines.push(`Earlier conversation summary: ${clip(summary, 500)}`);
  if (Array.isArray(history) && history.length) {
    const turns = history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-4)
      .map((m) => `${m.role === "user" ? "Student" : "You"}: ${clip(m.content, 320)}`);
    if (turns.length) lines.push(`Recent turns:\n${turns.join("\n")}`);
  }
  lines.push(`Approved visual candidates: ${JSON.stringify(visualCandidatesForPrompt(candidates))}`);
  if (photosAllowed) {
    lines.push("A real photograph may be useful for this question, but you cannot supply an image URL. Set visualId to null and explain the example in words; the app will decide whether a trusted photo is available.");
  }
  lines.push(`Student question: ${clipMultiline(question, MAX_QUESTION_CHARS)}`);
  return lines.join("\n");
}

function buildChatMessages(args) {
  return [
    { role: "system", content: TEACHING_SYSTEM_PROMPT },
    { role: "user", content: contextBlock({ ...args, photosAllowed: needsPhotograph(args.question) }) },
  ];
}

const TUTOR_EVALUATION_PROMPT = `You are evaluating a student's answer for Learning Allied. Be fair and specific.

Return ONLY JSON:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "whatWorked": ["specific thing the student got right"],
  "missing": ["specific idea that is missing or wrong"],
  "misconception": null | { "label": "short name", "explanation": "why the student likely thinks this", "remediation": "what to do next" },
  "feedback": "2-4 sentences addressed to the student",
  "next": { "difficulty": "easier" | "same" | "harder", "step": "retry" | "continue" | "explain_differently", "message": "one short instruction" }
}

Rules:
- Judge correctness against the expected answer / rubric supplied, not against your own alternative method.
- Accept a correct answer in different words. Ignore spelling and grammar.
- "partially_correct" means the core idea is right but a key part is missing or an error remains; say exactly which part.
- Only name a misconception when the answer actually shows that reasoning. Otherwise null.
- Do not praise generically. Do not reveal the full answer before the student has tried.
- Never claim to have run code, browsed, or viewed an image.`;

function buildEvaluationMessages({ question, expected, rubric, studentAnswer, concept, level, packMisconceptions }) {
  const lines = [
    `Concept: ${concept ? `${concept.name} (${concept.subject})` : "general"}`,
    `Student level: ${level}`,
    `Question: ${clipMultiline(question, 500)}`,
    expected ? `Expected answer / rubric: ${clipMultiline(expected, 800)}` : "Expected answer: not supplied; judge the reasoning itself.",
    rubric ? `Extra rubric: ${clipMultiline(rubric, 500)}` : "",
    packMisconceptions && packMisconceptions.length
      ? `Known misconceptions for this concept: ${packMisconceptions.map((m) => `${m.label} (${m.id})`).join("; ")}`
      : "",
    `Student answer: ${clipMultiline(studentAnswer, MAX_ANSWER_CHARS)}`,
  ].filter(Boolean);
  return [
    { role: "system", content: TUTOR_EVALUATION_PROMPT },
    { role: "user", content: lines.join("\n") },
  ];
}

/* ── deterministic grading (used before spending an AI call) ─────────────── */

function matchesAccept(answer, accepted) {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return false;
  const numbersInAnswer = new Set(normalized.match(/-?\d+(?:\.\d+)?/g) || []);
  for (const variant of accepted || []) {
    const normalizedVariant = normalizeAnswer(variant);
    if (!normalizedVariant) continue;
    const variantNumbers = normalizedVariant.match(/-?\d+(?:\.\d+)?/g) || [];
    const looksNumeric = variantNumbers.length > 0 && normalizedVariant.replace(/[^a-z]/g, "").length <= 4;
    if (looksNumeric && variantNumbers.length) {
      if (variantNumbers.every((n) => numbersInAnswer.has(n)) && numbersInAnswer.size <= variantNumbers.length + 1) return true;
      continue;
    }
    if (normalizedVariant.length <= 3) {
      const word = normalizedVariant.replace(/[^a-z0-9-]/g, "");
      if (word && new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(normalized)) return true;
      continue;
    }
    if (normalized.includes(normalizedVariant)) return true;
  }
  return false;
}

function keywordCoverage(answer, keywords) {
  const normalized = normalizeAnswer(answer);
  if (!normalized || !Array.isArray(keywords) || !keywords.length) return 0;
  const hit = keywords.filter((k) => k && normalized.includes(normalizeAnswer(k))).length;
  return hit / keywords.length;
}

function deterministicVerdict({ packQuestion, studentAnswer }) {
  if (!packQuestion) return null;
  const answer = normalizeAnswer(studentAnswer);
  if (!answer) return { verdict: "incorrect", basis: "empty" };
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const needsReasoning = Number(packQuestion.difficulty) >= 3;
  const enoughReasoning = !needsReasoning || wordCount >= 6;
  if (matchesAccept(studentAnswer, packQuestion.accept || []) && enoughReasoning) {
    return { verdict: "correct", basis: "authored-accept" };
  }
  const coverage = keywordCoverage(studentAnswer, packQuestion.keywords || []);
  if (coverage >= 0.75 && enoughReasoning) return { verdict: "correct", basis: "authored-keywords" };
  if (coverage >= 0.4) return { verdict: "partially_correct", basis: "authored-keywords" };
  return null;
}

/* ── normalisation of AI output ──────────────────────────────────────────── */

function normalizeSections(value) {
  const raw = Array.isArray(value) ? value : [];
  return raw
    .filter((s) => s && typeof s === "object")
    .slice(0, 4)
    .map((s) => ({
      heading: clip(s.heading, 90),
      body: clipMultiline(s.body, 950),
      equation: s.equation ? clipMultiline(s.equation, 200) : null,
    }))
    .filter((s) => s.heading && s.body);
}

function normalizeExample(value) {
  if (!value || typeof value !== "object") return null;
  const problem = clipMultiline(value.problem, 600);
  const steps = strList(value.steps, { maxItems: 8, maxLen: 500 });
  const answer = clipMultiline(value.answer, 400);
  if (!problem && !steps.length) return null;
  return { problem, steps, answer };
}

function normalizeCheck(value) {
  if (!value || typeof value !== "object") return null;
  const prompt = clipMultiline(value.prompt, 400);
  if (!prompt) return null;
  return {
    prompt,
    hint: value.hint ? clipMultiline(value.hint, 240) : null,
  };
}

function normalizeChatReply(raw, { candidates, text, subject, level }) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  if (!o) return null;
  const sections = normalizeSections(o.sections);
  const directAnswer = clipMultiline(o.directAnswer, 1800);
  if (!directAnswer && !sections.length) return null;
  const kind = o.kind === "short" || (!sections.length && directAnswer.length < 700) ? "short" : "lesson";
  const visual = validateVisualSelection(
    o.visualId ? { id: o.visualId, params: o.visualParams, observe: o.visualObserve } : null,
    candidates,
    text,
    subject
  );
  return {
    kind,
    title: clip(o.title, 120) || null,
    directAnswer,
    sections: kind === "short" ? sections.slice(0, 2) : sections,
    example: kind === "short" ? null : normalizeExample(o.example),
    check: normalizeCheck(o.check),
    visual,
    personalization: o.personalization ? clipMultiline(o.personalization, 260) : null,
    advanced: o.advanced && typeof o.advanced === "object" && o.advanced.body
      ? { heading: clip(o.advanced.heading, 90), body: clipMultiline(o.advanced.body, 800) }
      : null,
    level,
    source: "ai",
  };
}

function normalizeGeneratedLesson(raw, { concept, level, candidates, trackLabel }) {
  const reply = normalizeChatReply(raw, {
    candidates,
    text: concept ? `${concept.name} ${concept.topic}` : "",
    subject: concept ? concept.subject : "",
    level,
  });
  if (!reply) return null;
  const answerKey = clipMultiline(raw && raw.check && raw.check.answerKey, 600);
  return {
    conceptId: concept ? concept.conceptId : null,
    name: concept ? clip(concept.name, 160) : clip(raw.title, 160),
    subject: concept ? clip(concept.subject, 120) : "",
    topic: concept ? clip(concept.topic, 120) : "",
    trackLabel: trackLabel || null,
    level,
    source: "ai",
    reviewed: false,
    reviewer: null,
    version: `generated-v${GENERATION_VERSION}`,
    prerequisites: concept ? getPrerequisiteInfo(concept) : [],
    intro: reply.personalization || null,
    sections: reply.sections,
    keyTerms: [],
    workedExample: reply.example,
    visual: reply.visual,
    check: reply.check
      ? {
          questionId: null,
          prompt: reply.check.prompt,
          hint: reply.check.hint,
          difficulty: difficultyTarget(level),
          kind: "short",
        }
      : null,
    answerKey: answerKey || null,
    completed: !reply.check,
    reteach: null,
    revision: { suggestedDays: [1, 3, 7], nextReviewAt: null },
    mastery: null,
    advanced: reply.advanced,
    generatedNotice: "This explanation was generated for your question and has not yet been reviewed by the curriculum team.",
  };
}

/* ── chat (AI Chat page) ─────────────────────────────────────────────────── */

const CACHEABLE_INTENTS = new Set(["definition", "explain", "why"]);

function classifyIntent(question) {
  const text = String(question || "").toLowerCase().trim();
  if (!text) return "empty";
  if (/^(hi|hello|hey|thanks|thank you|good (morning|evening|afternoon)|ok|okay|great|cool)\b/.test(text)) return "conversational";
  if (/\b(solve|calculate|compute|find the value|evaluate)\b/.test(text) || (/\d/.test(text) && text.length < 300)) return "problem";
  if (/\b(example|application|real[- ]life|where is it used)\b/.test(text)) return "example";
  if (/\b(why|reason|how does|how do)\b/.test(text)) return "why";
  if (/\b(difference|compare|versus|vs\b)\b/.test(text)) return "compare";
  if (/\b(define|definition|what is|what are|meaning of)\b/.test(text)) return "definition";
  return "explain";
}

function chatCacheEligible({ question, intent, concept }) {
  if (!concept) return false;
  if (!CACHEABLE_INTENTS.has(intent)) return false;
  const text = String(question || "");
  if (text.length > 220) return false;
  if (/\d/.test(text)) return false;
  if (/\b(my|me|i |our)\b/i.test(text)) return false;
  return true;
}

async function chatTutor({ uid, body, state }) {
  const startedAt = Date.now();
  const question = clipMultiline(body.question, MAX_QUESTION_CHARS);
  if (!question) throw fail(400, "A question is required.");
  const trackId = getTrack(body.context && body.context.track) ? body.context.track : state.profile.board;
  const classNum = Number((body.context && body.context.classNum) || state.profile.classNum) || null;
  const explicitConcept = body.context && body.context.conceptId ? getConcept(body.context.conceptId) : null;
  const matched = explicitConcept || matchConcept(question, { trackId, classNum, subject: body.context && body.context.subject });
  const subject = matched ? matched.subject : (body.context && body.context.subject) || "";
  const level = levelFromMastery(
    state.mastery ? state.mastery.masteryScore : NaN,
    state.mastery ? state.mastery.evidenceStrength : NaN,
    matched ? matched.difficulty : NaN
  );
  const language = clip((body.context && body.context.language) || state.profile.language || "en", 12);
  const candidates = selectVisualCandidates(`${question} ${matched ? matched.name : ""}`, subject, 3);
  const intent = classifyIntent(question);
  const history = Array.isArray(body.history)
    ? body.history.filter((m) => m && typeof m.content === "string").slice(-4).map((m) => ({ role: m.role, content: clip(m.content, 600) }))
    : [];
  const summary = body.summary ? clip(body.summary, 600) : "";

  // When no curriculum concept matched, a reviewed pack can still anchor a
  // generic topic (for example "explain photosynthesis"). This lets repeat
  // questions reuse cached teaching without a second generation call.
  const packAnchor = matched ? null : findPackByQuestion(question, subject);
  const cacheAnchorId = matched ? matched.conceptId : packAnchor ? `pack.${packAnchor.id}` : null;
  const cacheKey =
    cacheAnchorId && chatCacheEligible({ question, intent, concept: { conceptId: cacheAnchorId } })
      ? lessonCacheKey({
          kind: "chat",
          conceptId: cacheAnchorId,
          trackId,
          classNum,
          language,
          level,
          intent: `${intent}-${questionSignature(question)}`,
        })
      : null;

  if (cacheKey) {
    const cached = await readContentCache(cacheKey);
    if (cached && cached.reply) {
      logMetric({ event: "chat_cache_hit", uid, conceptId: cacheAnchorId, level, intent, latencyMs: Date.now() - startedAt });
      return {
        reply: { ...cached.reply, personalization: null },
        meta: {
          cached: true,
          model: cached.model || null,
          aiCalls: 0,
          latencyMs: Date.now() - startedAt,
          source: "cache",
          conceptId: matched ? matched.conceptId : null,
          level,
        },
      };
    }
  }

  const messages = buildChatMessages({
    concept: matched,
    trackId,
    classNum,
    language,
    level,
    state,
    history,
    summary,
    question,
    candidates,
  });
  const result = await askJson(messages, {
    model: MODEL_STRONG,
    temperature: 0.35,
    maxTokens: 1600,
    timeoutMs: 22000,
  });

  if (result) {
    const reply = normalizeChatReply(result.parsed, {
      candidates,
      text: `${question} ${matched ? matched.name : ""}`,
      subject,
      level,
    });
    if (reply) {
      // A trusted photograph is only added when the curated search is configured
      // and returns a licensed-domain result. The model itself never supplies URLs.
      let visual = reply.visual;
      if (!visual && needsPhotograph(question)) {
        visual = await findTrustedPhoto(`${matched ? matched.name : ""} ${question}`);
        if (visual) reply.visual = visual;
      }
      if (cacheKey && reply.kind === "lesson") {
        await writeContentCache(cacheKey, {
          kind: "chat",
          reply: { ...reply, personalization: null },
          model: result.model,
          conceptId: cacheAnchorId,
          level,
          language,
          intent,
          usage: result.usage,
        });
      }
      logMetric({
        event: "chat_generated",
        uid,
        conceptId: matched ? matched.conceptId : cacheAnchorId,
        level,
        intent,
        cached: false,
        aiCalls: 1,
        usage: result.usage,
        latencyMs: Date.now() - startedAt,
      });
      return {
        reply,
        meta: {
          cached: false,
          model: result.model,
          aiCalls: 1,
          latencyMs: Date.now() - startedAt,
          source: "ai",
          conceptId: matched ? matched.conceptId : null,
          level,
          usage: result.usage,
        },
      };
    }
  }

  // AI failed or returned unusable JSON. Prefer authored, reviewed content.
  const pack = matched ? findPack(matched, question, subject) : findPackByQuestion(question, subject);
  if (pack && !matched) {
    // Without a curriculum anchor we can still serve the reviewed pack; the
    // lesson identifies itself by the pack topic, not by an invented concept id.
    const synthetic = {
      conceptId: `pack.${pack.id}`,
      name: pack.title,
      subject: subject || (pack.subjects && pack.subjects[0]) || "General",
      topic: "Reviewed lesson pack",
      difficulty: 0.5,
      prerequisites: [],
    };
    const lesson = buildReusableLesson({
      pack,
      concept: synthetic,
      level,
      attempts: [],
      mastery: state.mastery,
      mode: "start",
      trackLabel: getTrack(trackId) ? getTrack(trackId).label : null,
    });
    const reply = {
      kind: "lesson",
      title: lesson.name,
      directAnswer: lesson.intro || lesson.sections[0]?.body || "",
      sections: lesson.sections,
      example: lesson.workedExample,
      check: lesson.check,
      visual: lesson.visual,
      personalization: null,
      advanced: null,
      level,
      source: "authored",
      fallback: true,
      fallbackNote: "The AI tutor is unavailable right now, so this is the reviewed lesson content instead.",
    };
    logMetric({ event: "chat_fallback_authored", uid, conceptId: null, packId: pack.id, latencyMs: Date.now() - startedAt });
    return {
      reply,
      meta: { cached: false, model: null, aiCalls: 0, latencyMs: Date.now() - startedAt, source: "authored-fallback", conceptId: null, level },
    };
  }
  if (pack) {
    const lesson = buildReusableLesson({
      pack,
      concept: matched,
      level,
      attempts: [],
      mastery: state.mastery,
      mode: "start",
      trackLabel: getTrack(trackId) ? getTrack(trackId).label : null,
    });
    const reply = {
      kind: "lesson",
      title: lesson.name,
      directAnswer: lesson.intro || `${lesson.name} — reviewed explanation from the curriculum team.`,
      sections: lesson.sections,
      example: lesson.workedExample,
      check: lesson.check,
      visual: lesson.visual,
      personalization: null,
      advanced: null,
      level,
      source: "authored",
      fallback: true,
      fallbackNote: "The AI tutor is unavailable right now, so this is the reviewed lesson content instead.",
    };
    logMetric({ event: "chat_fallback_authored", uid, conceptId: matched.conceptId, latencyMs: Date.now() - startedAt });
    return {
      reply,
      meta: { cached: false, model: null, aiCalls: 0, latencyMs: Date.now() - startedAt, source: "authored-fallback", conceptId: matched.conceptId, level },
    };
  }

  logMetric({ event: "chat_failed", uid, conceptId: matched ? matched.conceptId : null, latencyMs: Date.now() - startedAt });
  return {
    reply: {
      kind: "fallback",
      title: null,
      directAnswer:
        "I could not reach the teaching model just now. Your question has not been answered, so I will not pretend otherwise. Please retry in a moment — your message is saved in this chat.",
      sections: [],
      example: null,
      check: null,
      visual: null,
      personalization: null,
      advanced: null,
      level,
      source: "unavailable",
      retry: true,
    },
    meta: { cached: false, model: null, aiCalls: 1, latencyMs: Date.now() - startedAt, source: "unavailable", conceptId: matched ? matched.conceptId : null, level },
  };
}

async function findTrustedPhoto(query) {
  try {
    const { searchImages } = require("./search");
    if (typeof searchImages !== "function") return null;
    const results = await searchImages(clip(query, 240), 5);
    const trusted = (results || []).filter((r) => r && isTrustedImageUrl(r.imageUrl) && isTrustedImageUrl(r.contextUrl));
    if (!trusted.length) return null;
    const first = trusted[0];
    return {
      id: "photo-evidence",
      renderer: "photo",
      dimension: "image",
      title: clip(first.title, 140) || "Related photograph",
      observe: "This is a real photograph from an educational source. Read the attribution and caption before using it as evidence.",
      altText: clip(first.title, 240) || "Educational photograph related to the question.",
      followUp: null,
      params: {
        imageUrl: first.imageUrl,
        thumbUrl: first.thumbUrl || first.imageUrl,
        title: clip(first.title, 160),
        sourceLabel: first.sourceLabel,
        sourceUrl: first.contextUrl,
        licenseNote: "Licence: check the linked source page before reuse.",
      },
      attribution: { source: first.sourceLabel, url: first.contextUrl },
    };
  } catch (_) {
    return null;
  }
}

/* ── adaptive lesson (Learning Hub) ──────────────────────────────────────── */

function resolveTopic(body) {
  const track = getTrack(body.track || body.trackId);
  const concept = body.conceptId ? getConcept(body.conceptId) : null;
  if (concept) {
    const derivedTrack = getTrack(concept.conceptId.split(".")[0] === "jee" ? `jee_${concept.conceptId.split(".")[1] === "advanced" ? "advanced" : "main"}` : concept.conceptId.split(".")[0]);
    const derivedClass = Number.parseInt(String(concept.conceptId.split(".")[1] || ""), 10);
    return {
      concept,
      trackId: track ? track.id : derivedTrack ? derivedTrack.id : null,
      classNum: Number(body.classNum) || (Number.isFinite(derivedClass) ? derivedClass : null),
      subject: concept.subject,
    };
  }
  const matched = matchConcept(body.topic || body.question || "", {
    trackId: track ? track.id : null,
    classNum: Number(body.classNum) || null,
    subject: body.subject,
  });
  return {
    concept: matched,
    trackId: track ? track.id : null,
    classNum: Number(body.classNum) || null,
    subject: matched ? matched.subject : body.subject || null,
  };
}

function nextChapterSuggestion(trackId, classNum, subject, conceptId) {
  if (!trackId || !subject) return null;
  const chapters = getChapters({ trackId, classNum, subject });
  const index = chapters.findIndex((c) => c.conceptId === conceptId);
  if (index === -1) return null;
  const next = chapters[index + 1];
  return next ? { conceptId: next.conceptId, name: next.name, subject: next.subject, difficultyLabel: next.difficultyLabel } : null;
}

function completionFor(attempts, level) {
  const meaningful = attempts.filter((a) => a.verdict === "correct" || a.verdict === "partially_correct");
  const correct = attempts.filter((a) => a.verdict === "correct");
  const highestCorrect = correct.reduce((max, a) => Math.max(max, a.difficulty), 0);
  const requiredLevel = level === "advanced" ? 3 : 2;
  const completed = correct.length >= 2 && highestCorrect >= requiredLevel;
  return {
    completed,
    correctCount: correct.length,
    answeredCount: attempts.length,
    highestCorrectDifficulty: highestCorrect || null,
    requiredDifficulty: requiredLevel,
    note: completed
      ? "You showed this understanding on more than one question and at a level that rules out a lucky easy answer."
      : meaningful.length === 0
      ? "Answer one question to start collecting evidence."
      : "Keep going: mastery needs more than one correct answer, including a harder one.",
  };
}

async function lessonTutor({ uid, body, state }) {
  const startedAt = Date.now();
  const { concept, trackId, classNum, subject } = resolveTopic(body);
  if (!concept) throw fail(404, "That chapter is not in the curriculum dataset for this selection.");
  const track = getTrack(trackId);
  const language = clip(body.language || state.profile.language || "en", 12);
  const attempts = sanitizeAttempts(body.attempts);
  const level = body.level && ["foundation", "intermediate", "advanced"].includes(body.level)
    ? body.level
    : levelFromMastery(
        state.mastery ? state.mastery.masteryScore : NaN,
        state.mastery ? state.mastery.evidenceStrength : NaN,
        concept.difficulty
      );
  const mode = body.mode === "reteach" ? "reteach" : "start";
  const pack = findPack(concept, body.focus || "", subject);
  const summary = completionFor(attempts, level);
  const trackLabel = track ? track.label : null;

  let lesson;
  let aiCalls = 0;
  let cached = false;
  let generatedCacheKey = null;

  if (pack) {
    lesson = buildReusableLesson({ pack, concept, level, attempts, mastery: state.mastery, mode, trackLabel });
    lesson.reviewed = true;
    lesson.scope = { trackId, classNum, subject };
  } else {
    const cacheKey = lessonCacheKey({
      kind: "lesson",
      conceptId: concept.conceptId,
      trackId,
      classNum,
      language,
      level,
      intent: body.focus ? `focus-${sha256(clip(body.focus, 300)).slice(0, 12)}` : mode === "reteach" ? "reteach" : "core",
    });
    generatedCacheKey = cacheKey;
    const generatedCacheable = !body.focus && mode !== "reteach";
    if (generatedCacheable) {
      const cachedDoc = await readContentCache(cacheKey);
      if (cachedDoc && cachedDoc.lesson) {
        lesson = { ...cachedDoc.lesson, mastery: masterySummary(state.mastery) };
        cached = true;
      }
    }
    if (!lesson) {
      const candidates = selectVisualCandidates(`${concept.name} ${concept.topic}`, concept.subject, 3);
      const question = body.focus
        ? `${body.focus}\n\nTeach this curriculum chapter: ${concept.name} (${concept.topic}), using a DIFFERENT explanation approach from a plain textbook definition.`
        : mode === "reteach"
        ? `The first explanation did not work. Teach ${concept.name} (${concept.topic}) again starting from a concrete everyday example and a different visual, then connect it to the formal idea. Do not repeat the same wording.`
        : `Teach this curriculum chapter: ${concept.name} (${concept.topic}).`;
      const messages = buildChatMessages({
        concept,
        trackId,
        classNum,
        language,
        level,
        state,
        history: [],
        summary: "",
        question,
        candidates,
      });
      const result = await askJson(messages, { model: MODEL_STRONG, temperature: 0.45, maxTokens: 1700, timeoutMs: 22000 });
      aiCalls = 1;
      if (result) {
        const generated = normalizeGeneratedLesson(result.parsed, { concept, level, candidates, trackLabel });
        if (generated) {
          generated.scope = { trackId, classNum, subject };
          if (generatedCacheable) {
            const cachedLesson = { ...generated };
            delete cachedLesson.mastery;
            await writeContentCache(cacheKey, {
              kind: "lesson",
              lesson: cachedLesson,
              model: result.model,
              conceptId: concept.conceptId,
              level,
              language,
              usage: result.usage,
            });
          }
          lesson = { ...generated, mastery: masterySummary(state.mastery) };
        }
      }
    }
    if (!lesson) {
      // Honest fallback: curriculum metadata only, no fabricated teaching.
      lesson = {
        conceptId: concept.conceptId,
        name: concept.name,
        subject: concept.subject,
        topic: concept.topic,
        trackLabel,
        level,
        source: "unavailable",
        reviewed: false,
        version: `generated-v${GENERATION_VERSION}`,
        prerequisites: getPrerequisiteInfo(concept),
        intro: "The teaching model could not be reached, so this is the curriculum outline only. Nothing here is a generated explanation.",
        sections: [
          {
            heading: "What this chapter covers",
            body: `${concept.name} is part of ${concept.subject}${classNum ? ` in Class ${classNum}` : ""}. Prerequisites recorded in the curriculum: ${
              getPrerequisiteInfo(concept).map((p) => p.name).join(", ") || "none"
            }.`,
            equation: null,
          },
        ],
        workedExample: null,
        visual: null,
        check: null,
        completed: false,
        reteach: null,
        revision: { suggestedDays: [1, 3, 7], nextReviewAt: null },
        mastery: masterySummary(state.mastery),
        retry: true,
      };
    }
  }

  // Answer keys never leave the server. A generated question is identified by a
  // cache key the client can echo back; the key resolves to the answer server-side.
  if (lesson && typeof lesson === "object" && "answerKey" in lesson) delete lesson.answerKey;
  if (generatedCacheKey && lesson && lesson.check && lesson.source === "ai") {
    lesson.check = { ...lesson.check, questionId: `gen-${generatedCacheKey}` };
    lesson.cacheKey = generatedCacheKey;
  }
  lesson.completed = lesson.completed || summary.completed || !lesson.check;
  const nextChapter = nextChapterSuggestion(trackId, classNum, lesson.subject || subject, concept.conceptId);
  lesson.nextStep = summary.completed
    ? {
        kind: "complete",
        label: nextChapter ? `Next: ${nextChapter.name}` : "Revise this chapter later with a short check",
        conceptId: nextChapter ? nextChapter.conceptId : concept.conceptId,
        nextChapter,
      }
    : lesson.check
    ? { kind: "practice", label: "Answer the check question", conceptId: concept.conceptId }
    : { kind: "review", label: "Review this explanation", conceptId: concept.conceptId };
  lesson.session = summary;
  lesson.revision = {
    ...lesson.revision,
    ...(summary.completed
      ? { nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), note: "A short review tomorrow will confirm this is still there." }
      : {}),
  };
  lesson.mastery = masterySummary(state.mastery);
  lesson.prerequisites = (lesson.prerequisites || []).map((p) => {
    const record = state.masteryByConcept ? state.masteryByConcept[p.conceptId] : null;
    let status = "not checked yet";
    if (record && record.evidence >= 0.15) {
      if (record.score >= 0.7) status = "likely known";
      else if (record.score < 0.45) status = "may need revision";
      else status = "partly known";
    } else if (state.hub && state.hub.topics && state.hub.topics[p.conceptId]) {
      const topic = state.hub.topics[p.conceptId];
      status = topic.status === "completed" ? "likely known" : "may need revision";
    }
    return { ...p, status };
  });

  // Record the opened chapter so "Continue where you left off" is truthful even
  // before the first answer. Mastery is still written only by the event pipeline.
  await saveHubTopic(uid, concept, {
    status: summary.completed ? "completed" : "started",
    lastLevel: level,
  });

  logMetric({
    event: "lesson_served",
    uid,
    conceptId: concept.conceptId,
    source: lesson.source,
    cached,
    aiCalls,
    level,
    startedBy: mode,
    latencyMs: Date.now() - startedAt,
  });

  return {
    lesson,
    state: {
      profile: state.profile,
      mastery: masterySummary(state.mastery),
      review: state.review ? { state: state.review.reviewState || null, nextReviewAt: state.review.nextReviewAtIso || null, intervalDays: state.review.intervalDays || null } : null,
      hub: state.hub,
    },
    meta: {
      cached,
      model: cached ? null : aiCalls ? MODEL_STRONG : null,
      aiCalls,
      latencyMs: Date.now() - startedAt,
      source: lesson.source,
    },
  };
}

/* ── evaluation (shared by Chat and Hub) ─────────────────────────────────── */

function normalizeEvaluation(raw, { packQuestion, pack, verdictBasis }) {
  const o = raw && typeof raw === "object" ? raw : {};
  const allowed = new Set(["correct", "partially_correct", "incorrect"]);
  const rawVerdict = String(o.verdict || "").toLowerCase();
  const verdict = allowed.has(rawVerdict) ? rawVerdict : "unknown";
  const whatWorked = strList(o.whatWorked, { maxItems: 4, maxLen: 220 });
  const missing = strList(o.missing, { maxItems: 4, maxLen: 220 });
  let misconception = null;
  if (o.misconception && typeof o.misconception === "object") {
    const label = clip(o.misconception.label, 160);
    if (label) {
      const matchedPack = pack && Array.isArray(pack.misconceptions)
        ? pack.misconceptions.find((m) => normalizeAnswer(m.label).includes(normalizeAnswer(label).slice(0, 24)) || normalizeAnswer(label).includes(normalizeAnswer(m.label).slice(0, 24)))
        : null;
      misconception = {
        id: matchedPack ? matchedPack.id : null,
        label,
        explanation: clipMultiline(o.misconception.explanation, 500),
        remediation: clipMultiline(o.misconception.remediation, 400),
        verified: !!matchedPack,
      };
    }
  }
  const next = o.next && typeof o.next === "object" ? o.next : {};
  const nextDifficulty = String(next.difficulty || "").toLowerCase();
  const nextStep = String(next.step || "").toLowerCase();
  return {
    verdict,
    whatWorked,
    missing,
    misconception,
    feedback: clipMultiline(o.feedback, 900) || (verdict === "correct" ? "That is correct. " : ""),
    next: {
      difficulty: ["easier", "same", "harder"].includes(nextDifficulty) ? nextDifficulty : verdict === "correct" ? "harder" : "same",
      step: ["retry", "continue", "explain_differently"].includes(nextStep)
        ? nextStep
        : verdict === "incorrect"
        ? "explain_differently"
        : "continue",
      message: clipMultiline(next.message, 240),
    },
    basis: verdictBasis,
    packExplanation: packQuestion ? clipMultiline(packQuestion.explanation, 700) : "",
  };
}

function authoredEvaluation({ verdict, packQuestion, misconception }) {
  return {
    verdict,
    whatWorked: [],
    missing: [],
    misconception: misconception || null,
    feedback:
      verdict === "correct"
        ? `Correct. ${clipMultiline(packQuestion.explanation, 500)}`
        : `Not quite yet. ${clipMultiline(packQuestion.explanation, 500)}`,
    next: {
      difficulty: verdict === "correct" ? "harder" : "easier",
      step: verdict === "correct" ? "continue" : "explain_differently",
      message: verdict === "correct" ? "Move on to the next question." : "Read the explanation, then try a different question.",
    },
    basis: "authored",
    packExplanation: clipMultiline(packQuestion.explanation, 700),
  };
}

async function evaluateTutor({ uid, body, state }) {
  const startedAt = Date.now();
  const { concept } = resolveTopic(body);
  const studentAnswer = clipMultiline(body.answer, MAX_ANSWER_CHARS);
  if (!studentAnswer) throw fail(400, "An answer is required.");
  const pack = concept ? findPack(concept, body.topic || (concept && concept.name) || "", concept.subject) : null;
  let packQuestion = null;
  // Expected answers come from the reviewed pack or the server-side cached
  // lesson. A client cannot supply its own rubric to the evaluator.
  let expected = null;
  let generatedCacheKey = null;

  if (pack && body.questionId) {
    packQuestion = (pack.questions || []).find((q) => q.id === body.questionId) || null;
    if (packQuestion) expected = packQuestion.expected || expected;
  }

  // A generated lesson's answer key is stored server-side with the cached lesson,
  // never shipped to the browser.
  if (!packQuestion && body.cacheKey && /^[a-f0-9]{24,64}$/.test(String(body.cacheKey))) {
    generatedCacheKey = String(body.cacheKey);
    const cached = await readContentCache(generatedCacheKey);
    if (cached && cached.lesson) {
      expected = cached.lesson.answerKey || expected;
      if (cached.lesson.check) {
        packQuestion = {
          id: cached.lesson.check.questionId || "generated",
          prompt: cached.lesson.check.prompt,
          expected: expected || "",
          explanation: "",
          accept: [],
          keywords: [],
        };
      }
    }
  }

  const question = clipMultiline(body.question || (packQuestion && packQuestion.prompt), 500);
  if (!question) throw fail(400, "The question being answered is required.");

  // Free deterministic check first: a correct authored answer never needs an AI call.
  let evaluation = null;
  let aiCalls = 0;
  const deterministic = deterministicVerdict({ packQuestion, studentAnswer });
  if (packQuestion && deterministic && deterministic.verdict === "correct") {
    const packMisconception = packQuestion.misconceptionId && pack
      ? (pack.misconceptions || []).find((m) => m.id === packQuestion.misconceptionId)
      : null;
    const primary = authoredEvaluation({ verdict: "correct", packQuestion, misconception: packMisconception ? {
      id: packMisconception.id,
      label: packMisconception.label,
      explanation: packMisconception.explanation,
      remediation: packMisconception.remediation,
      verified: true,
    } : null });
    evaluation = { ...primary, basis: deterministic.basis };
    evaluation.whatWorked = ["Your answer matches the key idea for this question."];
  }

  if (!evaluation) {
    const rubricMisconceptions = pack ? pack.misconceptions || [] : [];
    const messages = buildEvaluationMessages({
      question,
      expected: expected || (packQuestion && packQuestion.expected),
      studentAnswer,
      concept,
      level: body.level || "intermediate",
      packMisconceptions: rubricMisconceptions,
    });
    const result = await askJson(messages, { model: MODEL_FAST, temperature: 0.2, maxTokens: 750, timeoutMs: 16000 });
    aiCalls = 1;
    if (result) {
      evaluation = normalizeEvaluation(result.parsed, {
        packQuestion,
        pack,
        verdictBasis: "ai",
      });
      evaluation.aiModel = result.model;
      evaluation.usage = result.usage;
    }
  }

  if (!evaluation) {
    if (packQuestion && deterministic) {
      const packMisconception = pack && packQuestion.misconceptionId
        ? (pack.misconceptions || []).find((m) => m.id === packQuestion.misconceptionId)
        : null;
      evaluation = {
        ...authoredEvaluation({
          verdict: deterministic.verdict,
          packQuestion,
          misconception: packMisconception
            ? { id: packMisconception.id, label: packMisconception.label, explanation: packMisconception.explanation, remediation: packMisconception.remediation, verified: true }
            : null,
        }),
        basis: deterministic.basis,
      };
    } else {
      evaluation = {
        verdict: "unknown",
        whatWorked: [],
        missing: [],
        misconception: null,
        feedback:
          "I could not evaluate this answer automatically right now. I am not going to guess whether it is correct. Retry in a moment, or compare your reasoning with the key idea below.",
        next: { difficulty: "same", step: "retry", message: "Retry the evaluation." },
        basis: "unavailable",
        packExplanation: expected ? clipMultiline(expected, 700) : "",
        retry: true,
      };
    }
  }

  const attempts = sanitizeAttempts(body.attempts);
  const level = body.level && ["foundation", "intermediate", "advanced"].includes(body.level)
    ? body.level
    : levelFromMastery(
        state.mastery ? state.mastery.masteryScore : NaN,
        state.mastery ? state.mastery.evidenceStrength : NaN,
        concept ? concept.difficulty : NaN
      );
  const nextAttempts = evaluation.verdict === "unknown"
    ? attempts
    : [...attempts, { questionId: body.questionId || (packQuestion && packQuestion.id) || "practice", difficulty: Number(body.difficulty) || difficultyTarget(level), verdict: evaluation.verdict }].slice(-MAX_ATTEMPTS);

  const nextQuestion = pack && evaluation.verdict !== "unknown" ? publicQuestion(pickNextQuestion(pack, nextAttempts, level)) : null;
  const summary = completionFor(nextAttempts, level);
  const nextLevel =
    evaluation.verdict === "correct" && summary.completed ? (level === "foundation" ? "intermediate" : level === "intermediate" ? "advanced" : "advanced") : level;

  if (concept && body.surface !== "chat" && evaluation.verdict !== "unknown") {
    const status = summary.completed ? "completed" : evaluation.verdict === "correct" ? "practising" : "needs_support";
    const hubPatch = {
      attempts: (Number(body.attemptCount) || 0) + (evaluation.verdict === "unknown" ? 0 : 1),
      status,
      lastVerdict: evaluation.verdict,
      lastLevel: level,
    };
    if (summary.completed) hubPatch.bestScore = Math.max(0.6, (state.mastery && state.mastery.masteryScore) || 0);
    await saveHubTopic(uid, concept, hubPatch);
  }

  logMetric({
    event: "answer_evaluated",
    uid,
    conceptId: concept ? concept.conceptId : null,
    verdict: evaluation.verdict,
    basis: evaluation.basis,
    aiCalls,
    latencyMs: Date.now() - startedAt,
    usage: evaluation.usage || null,
  });

  return {
    evaluation,
    nextQuestion,
    session: summary,
    nextLevel,
    attempts: nextAttempts,
    state: { mastery: masterySummary(state.mastery) },
    meta: {
      aiCalls,
      model: evaluation.aiModel || null,
      cached: false,
      latencyMs: Date.now() - startedAt,
      source: evaluation.basis,
    },
    // The client records this through the existing server-authoritative pipeline.
    // An unevaluated answer is never recorded as wrong: that would punish the
    // student for a provider outage.
    learningEvent:
      concept && evaluation.verdict !== "unknown"
        ? {
            type: "question_answered",
            conceptId: concept.conceptId,
            subject: concept.subject,
            topic: concept.name,
            source: body.surface === "chat" ? "chat" : "study_session",
            payload: {
              correct: evaluation.verdict === "correct",
              verdict: evaluation.verdict,
              questionId: clip(body.questionId, 120) || null,
              difficulty: Number(body.difficulty) || difficultyTarget(level),
              level,
            },
          }
        : null,
  };
}

/* ── catalog + state actions ─────────────────────────────────────────────── */

async function catalogAction({ uid, body, state }) {
  const requestedTrack = body.track || null;
  const classNum = Number(body.classNum) || null;
  const requestedSubject = body.subject || null;
  const query = clip(body.query, 80);
  const catalog = getCatalog({
    trackId: requestedTrack,
    classNum,
    subject: requestedSubject,
    query,
  });
  // Attach which chapters already have saved progress so the UI can mark them.
  const topics = state && state.hub ? state.hub.topics || {} : {};
  if (catalog.step === "chapter" && Array.isArray(catalog.chapters)) {
    catalog.chapters = catalog.chapters.map((c) => ({
      ...c,
      progress: topics[c.conceptId]
        ? { status: topics[c.conceptId].status || null, lastVerdict: topics[c.conceptId].lastVerdict || null }
        : null,
    }));
  }
  return {
    catalog,
    profile: state ? state.profile : null,
    hub: state ? state.hub : null,
    curriculum: curriculumStats(),
    meta: { aiCalls: 0, cached: false, latencyMs: 0 },
  };
}

async function stateAction({ uid, body, state }) {
  const concept = body.conceptId ? getConcept(body.conceptId) : null;
  const resolved = concept ? resolveTopic({ conceptId: concept.conceptId, track: body.track, classNum: body.classNum }) : null;
  const trackId = getTrack(body.track) ? body.track : resolved && resolved.trackId ? resolved.trackId : null;
  const classNum = Number(body.classNum) || (resolved && resolved.classNum) || null;
  const next = concept ? nextChapterSuggestion(trackId, classNum, concept.subject, concept.conceptId) : null;
  return {
    profile: state.profile,
    mastery: masterySummary(state.mastery),
    review: state.review
      ? {
          state: state.review.reviewState || null,
          nextReviewAt: state.review.nextReviewAtIso || null,
          intervalDays: state.review.intervalDays || null,
        }
      : null,
    misconceptions: state.misconceptions,
    weakConcepts: state.weakConcepts,
    hub: state.hub,
    nextChapter: next,
    meta: { aiCalls: 0, cached: false, latencyMs: 0 },
  };
}

module.exports = {
  GENERATION_VERSION,
  MODEL_FAST,
  MODEL_STRONG,
  chatTutor,
  lessonTutor,
  evaluateTutor,
  catalogAction,
  stateAction,
  loadStudentState,
  loadHubProgress,
  saveHubTopic,
  // exported for tests
  selectVisualCandidates,
  clampVisualParams,
  validateVisualSelection,
  classifyIntent,
  normalizeAnswer,
  matchesAccept,
  keywordCoverage,
  deterministicVerdict,
  findPack,
  pickNextQuestion,
  levelFromMastery,
  nextTargetDifficulty,
  completionFor,
  chatCacheEligible,
  lessonCacheKey,
  normalizeChatReply,
  isTrustedImageUrl,
  resolveTopic,
  getPackById,
  listVisualTemplates,
};
