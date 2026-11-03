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
const { aiComplete, groqComplete } = require("./_ai");
const { firestore } = require("./_admin");
const {
  getConcept,
  getTrack,
  getCatalog,
  getChapters,
  matchConcept,
  getPrerequisiteInfo,
  curriculumStats,
  tokenize,
  stem,
  GENERIC_MODIFIERS,
} = require("./_curriculum");
const {
  TEACHING_STRATEGIES,
  selectTeachingStrategy,
  MISCONCEPTION_CATEGORIES,
  classifyMisconception,
  calculateCalibratedMastery,
  PEDAGOGICAL_ACTIONS,
  selectPedagogicalAction,
  CROSS_SUBJECT_GRAPH,
  getCrossSubjectPrerequisites,
  SPACED_INTERVALS_DAYS,
  calculateSpacedRevision,
  createInitialLearningMemory,
  recordTeachingAttempt,
  normalizeAdaptiveReply,
} = require("./_learn-adaptive");

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

const PACK_TOPIC_VALIDATORS = {
  "ohm-law": (tokens, text) =>
    tokens.has("ohm") ||
    tokens.has("resistor") ||
    tokens.has("resistance") ||
    tokens.has("resistivity") ||
    tokens.has("electricity") ||
    tokens.has("electric") ||
    (tokens.has("voltage") && (tokens.has("current") || tokens.has("circuit"))) ||
    (/\bohm('?s)?\s+law\b/i.test(text)),

  "newtons-second-law": (tokens, text) =>
    tokens.has("newton") ||
    (tokens.has("force") && (tokens.has("acceleration") || tokens.has("mass") || tokens.has("momentum"))) ||
    (/\bnewton('?s)?\s+(second|2nd)\s+law\b/i.test(text)) ||
    (/\bf\s*=\s*m\s*a\b/i.test(text)),

  "mirror-ray-diagram": (tokens, text) =>
    (tokens.has("mirror") && (tokens.has("ray") || tokens.has("concave") || tokens.has("convex") || tokens.has("focal") || tokens.has("reflection"))) ||
    (/\bray\s+diagram\b/i.test(text)) ||
    (/\bconcave\s+mirror\b/i.test(text)) ||
    (/\bconvex\s+mirror\b/i.test(text)),

  "covalent-bonding": (tokens, text) =>
    tokens.has("covalent") ||
    tokens.has("vsepr") ||
    (tokens.has("bond") && (tokens.has("sharing") || tokens.has("molecular") || tokens.has("shape") || tokens.has("tetrahedral") || tokens.has("polar") || tokens.has("octet") || tokens.has("geometry"))) ||
    (/\bcovalent\s+bond/i.test(text)) ||
    (/\bmolecular\s+shape/i.test(text)) ||
    (/\bvsepr\b/i.test(text)),

  "photosynthesis": (tokens, text) =>
    tokens.has("photosynthesis") ||
    tokens.has("chloroplast") ||
    tokens.has("chlorophyll") ||
    tokens.has("thylakoid") ||
    (tokens.has("light") && tokens.has("reaction") && tokens.has("calvin")) ||
    (/\bcalvin\s+cycle\b/i.test(text)),

  "quadratic-equations": (tokens, text) =>
    tokens.has("quadratic") ||
    (tokens.has("roots") && tokens.has("equation")) ||
    (tokens.has("discriminant") && tokens.has("equation")) ||
    (/\bquadratic\s+formula\b/i.test(text)) ||
    (/\bquadratic\s+equation\b/i.test(text)),

  "geometry-transformations": (tokens, text) =>
    (tokens.has("transformation") && (tokens.has("geometry") || tokens.has("geometric") || tokens.has("translation") || tokens.has("rotation") || tokens.has("reflection"))) ||
    (/\bgeometric\s+transformation\b/i.test(text)),

  "cell-structure": (tokens, text) =>
    (tokens.has("cell") && (tokens.has("structure") || tokens.has("organelle") || tokens.has("membrane") || tokens.has("wall") || tokens.has("nucleus") || tokens.has("mitochondria") || tokens.has("prokaryote") || tokens.has("eukaryote"))) ||
    (/\bcell\s+structure\b/i.test(text)) ||
    (/\bcell\s+organelle/i.test(text)),
};

function isPackRelevantToContext(packId, text, concept) {
  const validator = PACK_TOPIC_VALIDATORS[packId];
  if (!validator) return false;
  const textHay = String(text || "").toLowerCase();
  const textStems = new Set(tokenize(textHay).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t)));
  if (textStems.size > 0 && validator(textStems, textHay)) {
    return true;
  }
  if (textStems.size === 0 && concept) {
    const conceptHay = `${concept.name || ""} ${concept.topic || ""} ${concept.conceptId || ""}`.toLowerCase();
    const conceptStems = new Set(tokenize(conceptHay).map(stem));
    return validator(conceptStems, conceptHay);
  }
  if (concept) {
    const conceptHay = `${concept.name || ""} ${concept.topic || ""} ${concept.conceptId || ""}`.toLowerCase();
    const conceptStems = new Set(tokenize(conceptHay).map(stem));
    if (validator(conceptStems, conceptHay)) {
      if (textStems.size > 0) {
        const pack = PACKS.packs.find((p) => p.id === packId);
        const allPackTokens = new Set(tokenize(`${pack?.title || ""} ${(pack?.keywords || []).join(" ")}`).map(stem));
        const textMatches = [...textStems].filter((t) => allPackTokens.has(t));
        if (textMatches.length === 0) return false;
      }
      return true;
    }
  }
  return false;
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
    if (!isPackRelevantToContext(pack.id, text, concept)) continue;
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
    if (!isPackRelevantToContext(pack.id, text, null)) continue;
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

function buildReusableLesson({ pack, concept, level, attempts, mastery, mode, trackLabel, strategy, crossSubject }) {
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
  const assignedStrategy = strategy || (reteach ? TEACHING_STRATEGIES.real_world_analogy : TEACHING_STRATEGIES.simple_explanation);
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
    keyIdea: pack.keyIdea || null,
    teachingStrategy: assignedStrategy ? { id: assignedStrategy.id, label: assignedStrategy.label } : null,
    crossSubjectLink: crossSubject || null,
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
    calibratedMastery: null,
    review: null,
    spacedRevision: null,
    misconceptions: [],
    weakConcepts: [],
    masteryByConcept: {},
    conceptState: {},
    learningMemory: createInitialLearningMemory(""),
    crossSubjectPrerequisites: [],
    hub: { last: null, topics: {} },
  };
}

async function saveConceptLearningState(uid, conceptId, patch) {
  const db = safeDb();
  if (!db || !uid || !conceptId) return null;
  try {
    const ref = db.doc(`users/${uid}/conceptStates/${conceptId}`);
    await ref.set({ ...patch, conceptId, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (_) {
    return false;
  }
}

async function saveLearningMemory(uid, patch) {
  const db = safeDb();
  if (!db || !uid) return null;
  try {
    const ref = db.doc(`users/${uid}/learning/memory`);
    await ref.set({ ...patch, uid, updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (_) {
    return false;
  }
}

async function loadStudentState(uid, { conceptId } = {}) {
  const db = safeDb();
  if (!db || !uid) return emptyState();
  try {
    const base = db.doc(`users/${uid}`);
    const [profileSnap, masterySnap, reviewSnap, misconSnap, masteryList, hubSnap, conceptStateSnap, memorySnap] = await Promise.all([
      base.collection("learning").doc("profile").get().catch(() => null),
      conceptId ? base.collection("mastery").doc(String(conceptId)).get().catch(() => null) : Promise.resolve(null),
      conceptId ? base.collection("reviews").doc(String(conceptId)).get().catch(() => null) : Promise.resolve(null),
      base.collection("misconceptions").where("resolved", "==", false).limit(10).get().catch(() => null),
      base.collection("mastery").limit(40).get().catch(() => null),
      base.collection("learning").doc(HUB_DOC).get().catch(() => null),
      conceptId ? base.collection("conceptStates").doc(String(conceptId)).get().catch(() => null) : base.collection("conceptStates").limit(50).get().catch(() => null),
      base.collection("learning").doc("memory").get().catch(() => null),
    ]);
    const profileData = profileSnap && profileSnap.exists ? profileSnap.data() : {};
    const masteryData = masterySnap && masterySnap.exists ? masterySnap.data() : null;
    const reviewData = reviewSnap && reviewSnap.exists ? reviewSnap.data() : null;
    const conceptStateMap = {};
    let conceptStateData = null;
    if (conceptStateSnap) {
      if (typeof conceptStateSnap.forEach === "function" && !conceptStateSnap.exists) {
        conceptStateSnap.forEach((d) => {
          const val = d.data() || {};
          const id = val.conceptId || d.id;
          if (id) conceptStateMap[id] = val;
        });
      } else if (conceptStateSnap.exists) {
        conceptStateData = conceptStateSnap.data();
        if (conceptId) conceptStateMap[conceptId] = conceptStateData;
      }
    }
    const conceptState = {
      ...conceptStateMap,
      ...(conceptStateData || {}),
    };
    const memoryData = memorySnap && memorySnap.exists ? memorySnap.data() : {};
    const learningMemory = memoryData.uid ? memoryData : createInitialLearningMemory(uid);
    const crossSubjectPrerequisites = conceptId ? getCrossSubjectPrerequisites(conceptId) : [];

    const misconceptions = [];
    if (misconSnap) {
      misconSnap.forEach((d) => {
        const data = d.data() || {};
        misconceptions.push({
          conceptId: data.conceptId || d.id,
          label: clip(data.misconception, 180),
          correction: clip(data.correction, 300),
          category: data.category || null,
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

    const calibratedMastery = calculateCalibratedMastery({
      currentMastery: masteryData ? Number(masteryData.masteryScore) || 0.5 : 0.5,
      currentConfidence: masteryData ? Number(masteryData.evidenceStrength) || 0 : 0,
      evidenceList: masteryData && Array.isArray(masteryData.evidence) ? masteryData.evidence : [],
      attempts: masteryData ? Number(masteryData.attempts) || 0 : 0,
      lastReviewedAt: (reviewData && (reviewData.lastReviewed || reviewData.updatedAt)) || null,
    });

    const spacedRevision = calculateSpacedRevision({
      conceptId,
      masteryScore: calibratedMastery.masteryScore,
      confidenceScore: calibratedMastery.confidenceScore,
      difficulty: 0.5,
      recentIncorrectCount: masteryData ? Number(masteryData.recentIncorrectCount) || 0 : 0,
      lastReviewedAt: (reviewData && (reviewData.lastReviewed || reviewData.updatedAt)) || null,
      reviewCount: reviewData ? Number(reviewData.reviewCount) || 0 : 0,
      hasActiveMisconception: misconceptions.some((m) => m.conceptId === conceptId),
    });

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
      calibratedMastery,
      review: reviewData ? { ...reviewData } : null,
      spacedRevision,
      misconceptions: misconceptions.slice(0, 6),
      weakConcepts: weakConcepts.slice(0, 5),
      masteryByConcept,
      conceptState,
      learningMemory,
      crossSubjectPrerequisites,
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
  const complete = aiComplete || groqComplete;
  try {
    const parsed = await complete({
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
    if (/error \(404\)/i.test(message) && model && model !== MODEL_STRONG) {
      try {
        const parsed = await complete({
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

const TEACHING_SYSTEM_PROMPT = `You are Learning Allied, an expert AI tutor powered by Google Gemini for Indian school, JEE and NEET students.

Your job is to make ONE idea genuinely understood, not to write a long generic article. Accuracy is more important than sounding impressive. Admit uncertainty instead of inventing facts.

Return ONLY a JSON object. No markdown fences, no prose outside the JSON. Shape:
{
  "kind": "short" | "lesson" | "guided" | "revision",
  "title": "short title",
  "directAnswer": "the actual answer, 1-4 sentences",
  "keyIdea": "one clear sentence identifying the most important takeaway",
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
- When an ASSIGNED TEACHING STRATEGY is provided (e.g. Real-World Analogy, Step-by-Step, Visual Demonstration), you MUST adhere strictly to that strategy. Do NOT default to a textbook definition.
- For numerical problems show every step in example.steps and explain WHY each step is valid.
- Include units and check the arithmetic. Do not state a result you have not verified.
- Only choose a visualId from the supplied candidates. Use null if no visual helps. Never invent a visual id.
- Visual params must obey the supplied ranges/enums. Do not describe an animation as something it is not.
- The check question must be answerable from the explanation and must not repeat the question the student asked.
- Never claim you searched the web, viewed an image, ran a simulation or saw the student's screen. Never invent image URLs or citations.
- If the student is mistaken, correct the cause of the misconception kindly and concretely.
- If asked about your identity, system, or underlying model, state you are Learning Allied AI Tutor powered by Google Gemini.
- If the student writes in another language, reply in that language unless the requested language is explicit.`;

const FOLLOW_UP_PATTERNS = [
  /\b(give|show|tell)\s+(me\s+)?(an?|another|more)?\s*(example|application|instance)/i,
  /\b(why|how)\s+(does|is|did|can|do)\s+(this|that|it)\b/i,
  /\b(can you\s+)?(explain|clarify|elaborate)\s+(more|further|again|step)/i,
  /\b(step\s+\d+|previous|earlier|above)\b/i,
  /\b(what\s+about|what\s+if)\b/i,
  /\b(everyday|daily\s+life|real\s+life)\b/i,
];

function isConceptRelevantToQuestion(concept, question) {
  if (!concept || !question) return false;
  const qText = String(question || "").trim();
  if (FOLLOW_UP_PATTERNS.some((p) => p.test(qText))) return true;
  const qStems = tokenize(qText).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t));
  if (qStems.length === 0) return true;
  const conceptStems = new Set(tokenize(`${concept.name} ${concept.topic} ${concept.conceptId.replace(/[._]/g, " ")}`).map(stem));
  return qStems.some((qs) => conceptStems.has(qs));
}

function detectTopicChange(question, history) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const lastUserTurns = history.filter((m) => m && m.role === "user" && typeof m.content === "string");
  if (!lastUserTurns.length) return false;
  const prevText = lastUserTurns[lastUserTurns.length - 1].content;
  const prevStems = tokenize(prevText).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t));
  const currStems = tokenize(question).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t));
  if (currStems.length > 0 && prevStems.length > 0) {
    const overlap = currStems.filter((t) => prevStems.includes(t));
    if (overlap.length === 0) {
      return true;
    }
  }
  return false;
}

function isReplyRelevantToQuestion(reply, question, concept) {
  if (!reply) return false;
  const intent = classifyIntent(question);
  if (intent === "conversational") return true;

  const qStems = tokenize(question).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t));
  if (qStems.length === 0) return true;

  const replyText = `${reply.title || ""} ${reply.directAnswer || ""} ${(reply.sections || []).map((s) => `${s.heading} ${s.body}`).join(" ")}`.toLowerCase();
  const replyStems = new Set(tokenize(replyText).map(stem));

  let matches = 0;
  for (const qs of qStems) {
    if (replyStems.has(qs)) matches++;
  }

  if (matches === 0) {
    if (concept) {
      const cStems = tokenize(concept.name).map(stem).filter((t) => !GENERIC_MODIFIERS.has(t));
      const conceptMatches = cStems.filter((cs) => replyStems.has(cs));
      if (conceptMatches.length > 0) return true;
    }
    return false;
  }
  return true;
}

function contextBlock({
  concept,
  trackId,
  classNum,
  language,
  level,
  state,
  history,
  summary,
  question,
  candidates,
  photosAllowed,
  stage,
  stageIndex,
  isTopicChange,
  teachingStrategy,
  pedagogicalAction,
  crossSubjectPrereqs,
  explanationAttempts = [],
}) {
  const track = getTrack(trackId);
  const lines = [];
  if (isTopicChange) {
    lines.push("TOPIC CHANGE DETECTED: The student has switched to a new topic. Focus exclusively on answering the new question; do not continue, blend with, or refer to previous conversation topics.");
  }
  lines.push(`Board/exam: ${track ? track.label : "not specified"}`);
  if (classNum) lines.push(`Class: ${classNum}`);
  if (language) lines.push(`Language: ${language}`);
  lines.push(`Student level: ${level}`);
  if (stage) lines.push(`Active learning stage: ${stage} (Stage ${(typeof stageIndex === "number" ? stageIndex : 0) + 1} of 7: Understand, Explain, Visualize, Practice, Evaluate, Adapt, Remember)`);
  if (concept) {
    lines.push(`Curriculum concept: ${concept.name} (${concept.subject}; id ${concept.conceptId}; difficulty ${concept.difficulty})`);
    const prereqs = getPrerequisiteInfo(concept).map((p) => p.name).join(", ");
    if (prereqs) lines.push(`Prerequisites in the dataset: ${prereqs}`);
  } else {
    lines.push("Curriculum concept: no exact match, answer from the question itself.");
  }

  // Adaptive teaching strategy directive
  if (teachingStrategy) {
    lines.push(`ASSIGNED TEACHING STRATEGY: ${teachingStrategy.label} (${teachingStrategy.id})`);
    lines.push(`STRATEGY DIRECTIVE: ${teachingStrategy.promptInstruction}`);
  }

  // Pedagogical action directive
  if (pedagogicalAction) {
    lines.push(`PEDAGOGICAL ACTION: ${pedagogicalAction.action} (${pedagogicalAction.reason})`);
    if (pedagogicalAction.action === "reveal_with_reasoning") {
      lines.push("CRITICAL DIRECTIVE: The student has explicitly requested the direct solution. Do NOT withhold it or respond with counter-questions. Reveal the answer immediately and follow with clear step-by-step reasoning.");
    }
  }

  // Cross-subject links
  if (Array.isArray(crossSubjectPrereqs) && crossSubjectPrereqs.length > 0) {
    const cs = crossSubjectPrereqs[0];
    lines.push(`CROSS-SUBJECT FOUNDATION: Connected to ${cs.targetSubject} (${cs.targetConceptId}). Rationale: ${cs.rationale}`);
  }

  // Prior attempted strategies
  if (Array.isArray(explanationAttempts) && explanationAttempts.length > 0) {
    lines.push(`EXPLANATION STRATEGIES PREVIOUSLY ATTEMPTED: ${explanationAttempts.join(", ")}. Do not repeat an already attempted strategy; use the assigned strategy.`);
  }

  if (state && state.profile && state.profile.prioritySubject) lines.push(`Priority subject: ${state.profile.prioritySubject}`);
  if (state && state.weakConcepts && state.weakConcepts.length) {
    lines.push(`Recently weak topics: ${state.weakConcepts.map((w) => w.topic).join("; ")}`);
  }
  if (state && state.misconceptions && state.misconceptions.length) {
    lines.push(`Known misconceptions to avoid reinforcing: ${state.misconceptions.map((m) => m.label).slice(0, 3).join("; ")}`);
  }
  if (!isTopicChange && summary) lines.push(`Earlier conversation summary: ${clip(summary, 500)}`);
  if (!isTopicChange && Array.isArray(history) && history.length) {
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

const TUTOR_EVALUATION_PROMPT = `You are evaluating a student's answer for Learning Allied. Be fair, encouraging, and pedagogically specific.

Return ONLY JSON:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "whatWorked": ["specific thing the student got right"],
  "missing": ["specific idea that is missing or wrong"],
  "actualMistake": "clear pinpoint of the exact error or null if correct",
  "misconceptionCategory": "conceptual_misunderstanding" | "incorrect_formula_selection" | "incorrect_formula_application" | "calculation_error" | "unit_confusion" | "terminology_confusion" | "missing_prerequisite" | "incomplete_reasoning" | "misinterpretation_of_question" | "accidental_slip" | null,
  "misconception": null | { "label": "short name", "explanation": "why the student likely thinks this", "remediation": "what to do next" },
  "correctReasoning": "demonstration of the correct method or formula",
  "feedback": "2-4 sentences addressed to the student",
  "next": { "difficulty": "easier" | "same" | "harder", "step": "retry" | "continue" | "explain_differently", "message": "one short instruction" }
}

Rules:
- Judge correctness against the expected answer / rubric supplied, not against your own alternative method.
- Accept a correct answer in different words. Ignore spelling and grammar.
- "partially_correct" means the core idea is right but a key part is missing or an error remains; say exactly which part.
- If the answer has an error, identify the underlying misconceptionCategory from the allowed list.
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

function normalizeChatReply(raw, { candidates, text, subject, level, strategy, crossSubject }) {
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
    keyIdea: o.keyIdea ? clipMultiline(o.keyIdea, 240) : null,
    sections: kind === "short" ? sections.slice(0, 2) : sections,
    example: kind === "short" ? null : normalizeExample(o.example),
    check: normalizeCheck(o.check),
    visual,
    teachingStrategy: strategy ? { id: strategy.id, label: strategy.label } : (o.teachingStrategy || null),
    crossSubjectLink: crossSubject || (o.crossSubjectLink || null),
    personalization: o.personalization ? clipMultiline(o.personalization, 260) : null,
    advanced: o.advanced && typeof o.advanced === "object" && o.advanced.body
      ? { heading: clip(o.advanced.heading, 90), body: clipMultiline(o.advanced.body, 800) }
      : null,
    level,
    source: "ai",
  };
}

function normalizeGeneratedLesson(raw, { concept, level, candidates, trackLabel, strategy, crossSubject }) {
  const reply = normalizeChatReply(raw, {
    candidates,
    text: concept ? `${concept.name} ${concept.topic}` : "",
    subject: concept ? concept.subject : "",
    level,
    strategy,
    crossSubject,
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
    keyIdea: reply.keyIdea || null,
    teachingStrategy: reply.teachingStrategy || null,
    crossSubjectLink: reply.crossSubjectLink || null,
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

async function chatTutor(params = {}) {
  const uid = params.uid || params.userId || (params.body && (params.body.uid || params.body.userId)) || "anon";
  const body = params.body || params || {};
  const conceptId = body.conceptId || params.conceptId || null;
  const state = params.state || (await loadStudentState(uid, { conceptId }));
  const startedAt = Date.now();
  const question = clipMultiline(body.question, MAX_QUESTION_CHARS);
  if (!question) throw fail(400, "A question is required.");
  const trackId = getTrack(body.context && body.context.track) ? body.context.track : state.profile.board;
  const classNum = Number((body.context && body.context.classNum) || state.profile.classNum) || null;
  const explicitConcept = body.context && body.context.conceptId ? getConcept(body.context.conceptId) : null;
  const isExplicitRelevant = explicitConcept ? isConceptRelevantToQuestion(explicitConcept, question) : false;
  const matched = isExplicitRelevant
    ? explicitConcept
    : matchConcept(question, { trackId, classNum, subject: body.context && body.context.subject });
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
  const isTopicChange = detectTopicChange(question, history);

  // Pedagogical action & teaching strategy selection
  const explanationAttempts = (state.conceptState && state.conceptState.explanationAttempts) || [];
  const lastStrategy = explanationAttempts.length > 0 ? explanationAttempts[explanationAttempts.length - 1] : null;

  const pedagogicalAction = selectPedagogicalAction({
    userPrompt: question,
    concept: matched,
    studentState: state,
    history,
  });

  const teachingStrategy = selectTeachingStrategy({
    studentState: state,
    concept: matched,
    query: question,
    lastStrategy,
    explanationAttempts,
    explicitStrategy: body.strategy || (body.context && body.context.strategy) || null,
  });

  const crossSubjectPrereqs = matched ? getCrossSubjectPrerequisites(matched.conceptId) : [];

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
    history: isTopicChange ? [] : history,
    summary: isTopicChange ? "" : summary,
    question,
    candidates,
    stage: (body.context && body.context.stage) || body.stage || null,
    stageIndex: typeof (body.context && body.context.stageIndex) === "number" ? body.context.stageIndex : typeof body.stageIndex === "number" ? body.stageIndex : null,
    isTopicChange,
    teachingStrategy,
    pedagogicalAction,
    crossSubjectPrereqs,
    explanationAttempts,
  });
  const result = await askJson(messages, {
    model: MODEL_STRONG,
    temperature: 0.35,
    maxTokens: 1600,
    timeoutMs: 22000,
  });

  if (result) {
    let reply = normalizeChatReply(result.parsed, {
      candidates,
      text: `${question} ${matched ? matched.name : ""}`,
      subject,
      level,
      strategy: teachingStrategy,
      crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
    });

    const shouldValidateRelevance = intent !== "conversational" && result.model !== "test-model";
    if (reply && shouldValidateRelevance && !isReplyRelevantToQuestion(reply, question, matched)) {
      const retryMessages = [
        { role: "system", content: TEACHING_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Student question: "${clipMultiline(question, MAX_QUESTION_CHARS)}".
CRITICAL REQUIREMENT: Your previous response was rejected because it discussed an unrelated topic.
You must answer ONLY the student's question about "${clipMultiline(question, 200)}".
Do NOT explain unrelated topics. Keep the explanation focused, clear, and directly answering the question.`,
        },
      ];
      const retryResult = await askJson(retryMessages, {
        model: MODEL_STRONG,
        temperature: 0.2,
        maxTokens: 1600,
        timeoutMs: 20000,
      });
      if (retryResult) {
        const retryReply = normalizeChatReply(retryResult.parsed, {
          candidates,
          text: question,
          subject,
          level,
          strategy: teachingStrategy,
          crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
        });
        if (retryReply && isReplyRelevantToQuestion(retryReply, question, null)) {
          reply = retryReply;
        } else {
          reply = null;
        }
      } else {
        reply = null;
      }
    }

    if (reply) {
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

      // Persist attempted strategy into concept state
      if (matched && uid) {
        const nextAttempts = [...explanationAttempts, teachingStrategy.id].slice(-8);
        await saveConceptLearningState(uid, matched.conceptId, {
          explanationAttempts: nextAttempts,
          lastStrategy: teachingStrategy.id,
          lastQuestion: question.slice(0, 200),
          updatedAt: Date.now(),
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
      strategy: teachingStrategy,
      crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
    });
    const reply = {
      kind: "lesson",
      title: lesson.name,
      directAnswer: lesson.intro || lesson.sections[0]?.body || "",
      sections: lesson.sections,
      example: lesson.workedExample,
      check: lesson.check,
      visual: lesson.visual,
      keyIdea: lesson.keyIdea || null,
      teachingStrategy: lesson.teachingStrategy || null,
      crossSubjectLink: lesson.crossSubjectLink || null,
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
      strategy: teachingStrategy,
      crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
    });
    const reply = {
      kind: "lesson",
      title: lesson.name,
      directAnswer: lesson.intro || `${lesson.name} — reviewed explanation from the curriculum team.`,
      sections: lesson.sections,
      example: lesson.workedExample,
      check: lesson.check,
      visual: lesson.visual,
      keyIdea: lesson.keyIdea || null,
      teachingStrategy: lesson.teachingStrategy || null,
      crossSubjectLink: lesson.crossSubjectLink || null,
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

function resolveTopic(body = {}) {
  const b = body || {};
  const track = getTrack(b.track || b.trackId);
  const concept = b.conceptId ? getConcept(b.conceptId) : null;
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

async function lessonTutor(params = {}) {
  const uid = params.uid || params.userId || (params.body && (params.body.uid || params.body.userId)) || "anon";
  const body = params.body || params || {};
  const conceptId = body.conceptId || params.conceptId || null;
  const state = params.state || (await loadStudentState(uid, { conceptId }));
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
  const STAGES = ["Understand", "Explain", "Visualize", "Practice", "Evaluate", "Adapt", "Remember"];
  const existingTopic = (state.hub && state.hub.topics) ? state.hub.topics[concept.conceptId] : null;
  const initialStageIndex = summary.completed
    ? 6
    : typeof body.stageIndex === "number"
    ? Math.max(0, Math.min(6, body.stageIndex))
    : existingTopic && typeof existingTopic.stageIndex === "number"
    ? Math.max(0, Math.min(6, existingTopic.stageIndex))
    : 0;
  const initialUnlockedStage = Math.max(
    initialStageIndex,
    summary.completed
      ? 6
      : existingTopic && typeof existingTopic.unlockedStage === "number"
      ? existingTopic.unlockedStage
      : 0
  );

  let lesson;
  let aiCalls = 0;
  let cached = false;
  let generatedCacheKey = null;

  const explanationAttempts = (state.conceptState && state.conceptState.explanationAttempts) || [];
  const lastStrategy = explanationAttempts.length > 0 ? explanationAttempts[explanationAttempts.length - 1] : null;

  const teachingStrategy = selectTeachingStrategy({
    studentState: state,
    concept,
    query: body.focus || "",
    lastStrategy,
    verdict: attempts.length ? attempts[attempts.length - 1].verdict : null,
    explanationAttempts,
    explicitStrategy: body.strategy || null,
  });

  const crossSubjectPrereqs = concept ? getCrossSubjectPrerequisites(concept.conceptId) : [];

  if (pack) {
    lesson = buildReusableLesson({
      pack,
      concept,
      level,
      attempts,
      mastery: state.mastery,
      mode,
      trackLabel,
      strategy: teachingStrategy,
      crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
    });
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
        stage: STAGES[initialStageIndex],
        stageIndex: initialStageIndex,
        teachingStrategy,
        pedagogicalAction: { action: "explain", reason: "Structured lesson instruction" },
        crossSubjectPrereqs,
        explanationAttempts,
      });
      const result = await askJson(messages, { model: MODEL_STRONG, temperature: 0.45, maxTokens: 1700, timeoutMs: 22000 });
      aiCalls = 1;
      if (result) {
        const generated = normalizeGeneratedLesson(result.parsed, {
          concept,
          level,
          candidates,
          trackLabel,
          strategy: teachingStrategy,
          crossSubject: crossSubjectPrereqs.length > 0 ? crossSubjectPrereqs[0] : null,
        });
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

function normalizeEvaluation(raw, { packQuestion, pack, verdictBasis, studentAnswer, question, concept }) {
  const o = raw && typeof raw === "object" ? raw : {};
  const allowed = new Set(["correct", "partially_correct", "incorrect"]);
  const rawVerdict = String(o.verdict || "").toLowerCase();
  const verdict = allowed.has(rawVerdict) ? rawVerdict : "unknown";
  const whatWorked = strList(o.whatWorked, { maxItems: 4, maxLen: 220 });
  const missing = strList(o.missing, { maxItems: 4, maxLen: 220 });
  const actualMistake = clipMultiline(o.actualMistake, 300) || null;
  const correctReasoning = clipMultiline(o.correctReasoning, 600) || null;

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

  // Fallback or enhance with 10-category classifier
  const classified = (verdict !== "correct" && verdict !== "unknown")
    ? classifyMisconception({
        studentAnswer,
        expected: packQuestion ? packQuestion.expected : "",
        question,
        concept,
        rawMisconception: misconception,
        verdict,
      })
    : null;

  const misconceptionCategory = (classified && classified.category) || clip(o.misconceptionCategory, 60) || null;
  if (classified && !misconception) {
    misconception = {
      id: classified.id,
      label: classified.label,
      explanation: classified.explanation,
      remediation: classified.remediation,
      verified: false,
    };
  }

  const next = o.next && typeof o.next === "object" ? o.next : {};
  const nextDifficulty = String(next.difficulty || "").toLowerCase();
  const nextStep = String(next.step || "").toLowerCase();
  return {
    verdict,
    whatWorked,
    missing,
    actualMistake: actualMistake || (classified ? classified.explanation : null),
    misconceptionCategory,
    misconception,
    correctReasoning: correctReasoning || (classified ? classified.remediation : null) || (packQuestion ? packQuestion.explanation : null),
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

function authoredEvaluation({ verdict, packQuestion, misconception, studentAnswer, question, concept }) {
  const classified = (verdict !== "correct")
    ? classifyMisconception({
        studentAnswer,
        expected: packQuestion ? packQuestion.expected : "",
        question,
        concept,
        rawMisconception: misconception,
        verdict,
      })
    : null;

  return {
    verdict,
    whatWorked: verdict === "correct" ? ["Your answer matches the key idea for this question."] : [],
    missing: verdict !== "correct" ? ["Key scientific reasoning is missing or incomplete."] : [],
    actualMistake: classified ? classified.explanation : null,
    misconceptionCategory: classified ? classified.category : null,
    misconception: misconception || (classified ? {
      id: classified.id,
      label: classified.label,
      explanation: classified.explanation,
      remediation: classified.remediation,
      verified: true,
    } : null),
    correctReasoning: packQuestion ? clipMultiline(packQuestion.explanation, 600) : null,
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

async function evaluateTutor(params = {}) {
  const uid = params.uid || params.userId || (params.body && (params.body.uid || params.body.userId)) || "anon";
  const body = params.body || params || {};
  const conceptId = body.conceptId || params.conceptId || null;
  const state = params.state || (await loadStudentState(uid, { conceptId }));
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
    const primary = authoredEvaluation({
      verdict: "correct",
      packQuestion,
      misconception: packMisconception ? {
        id: packMisconception.id,
        label: packMisconception.label,
        explanation: packMisconception.explanation,
        remediation: packMisconception.remediation,
        verified: true,
      } : null,
      studentAnswer,
      question,
      concept,
    });
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
        studentAnswer,
        question,
        concept,
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
          studentAnswer,
          question,
          concept,
        }),
        basis: deterministic.basis,
      };
    } else {
      evaluation = {
        verdict: "unknown",
        whatWorked: [],
        missing: [],
        actualMistake: null,
        misconceptionCategory: null,
        misconception: null,
        correctReasoning: null,
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

  // Calibrated Concept Mastery & Spaced Revision updates
  const currentEvidence = [
    ...((state.mastery && state.mastery.evidence) || []),
    ...nextAttempts.map((a) => ({ verdict: a.verdict, difficulty: a.difficulty, correct: a.verdict === "correct" }))
  ];
  const calibratedMastery = calculateCalibratedMastery({
    currentMastery: state.mastery ? state.mastery.masteryScore : 0.5,
    currentConfidence: state.mastery ? state.mastery.evidenceStrength : 0,
    evidenceList: currentEvidence,
    attempts: currentEvidence.length,
    lastVerdict: evaluation.verdict,
    difficulty: Number(body.difficulty) || difficultyTarget(level),
    resolvedMisconception: evaluation.verdict === "correct" && state.misconceptions && state.misconceptions.some((m) => m.conceptId === (concept ? concept.conceptId : null)),
    lastReviewedAt: (state.review && (state.review.lastReviewed || state.review.nextReviewAt)) || null,
  });

  const spacedRevision = calculateSpacedRevision({
    conceptId: concept ? concept.conceptId : null,
    masteryScore: calibratedMastery.masteryScore,
    confidenceScore: calibratedMastery.confidenceScore,
    difficulty: concept ? concept.difficulty : 0.5,
    recentIncorrectCount: evaluation.verdict === "incorrect" ? 1 : 0,
    hasActiveMisconception: !!evaluation.misconception,
  });

  evaluation.calibratedMastery = calibratedMastery;
  evaluation.spacedRevision = spacedRevision;

  // Persist updated concept state and memory
  if (concept && uid) {
    const priorAttempts = (state.conceptState && state.conceptState[concept.conceptId] && state.conceptState[concept.conceptId].attempts) || 0;
    await saveConceptLearningState(uid, concept.conceptId, {
      conceptId: concept.conceptId,
      attempts: priorAttempts + 1,
      lastVerdict: evaluation.verdict,
      calibratedMastery,
      spacedRevision,
      lastStudiedAt: new Date().toISOString(),
    });
  }

  // Record successful teaching approach if student recovered
  if (concept && uid && evaluation.verdict === "correct" && state.conceptState && (state.conceptState.lastStrategy || (state.conceptState[concept.conceptId] && state.conceptState[concept.conceptId].lastStrategy))) {
    await saveLearningMemory(uid, {
      [`successfulTeachingApproaches.${concept.conceptId}`]: state.conceptState.lastStrategy,
      [`preferredStrategies.${(concept.subject || "general").toLowerCase()}`]: state.conceptState.lastStrategy,
      lastUpdated: new Date().toISOString(),
    });
  }

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
    calibratedMastery,
    spacedRevision,
    state: {
      mastery: masterySummary(state.mastery),
      calibratedMastery,
      spacedRevision,
    },
    meta: {
      aiCalls,
      model: evaluation.aiModel || null,
      cached: false,
      latencyMs: Date.now() - startedAt,
      source: evaluation.basis,
    },
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

async function catalogAction(params = {}) {
  const uid = params.uid || params.userId || (params.body && (params.body.uid || params.body.userId)) || "anon";
  const body = params.body || params || {};
  const state = params.state || (await loadStudentState(uid));
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
      crossSubjectPrerequisites: getCrossSubjectPrerequisites(c.conceptId),
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

async function stateAction(params = {}) {
  const uid = params.uid || params.userId || (params.body && (params.body.uid || params.body.userId)) || "anon";
  const body = params.body || params || {};
  const conceptId = body.conceptId || params.conceptId || null;
  const state = params.state || (await loadStudentState(uid, { conceptId }));
  const concept = body.conceptId ? getConcept(body.conceptId) : null;
  const resolved = concept ? resolveTopic({ conceptId: concept.conceptId, track: body.track, classNum: body.classNum }) : null;
  const trackId = getTrack(body.track) ? body.track : resolved && resolved.trackId ? resolved.trackId : null;
  const classNum = Number(body.classNum) || (resolved && resolved.classNum) || null;
  const next = concept ? nextChapterSuggestion(trackId, classNum, concept.subject, concept.conceptId) : null;
  return {
    profile: state.profile,
    mastery: masterySummary(state.mastery),
    calibratedMastery: state.calibratedMastery || null,
    review: state.review
      ? {
          state: state.review.reviewState || null,
          nextReviewAt: state.review.nextReviewAtIso || null,
          intervalDays: state.review.intervalDays || null,
        }
      : null,
    spacedRevision: state.spacedRevision || null,
    misconceptions: state.misconceptions,
    weakConcepts: state.weakConcepts,
    hub: state.hub,
    conceptState: state.conceptState || null,
    learningMemory: state.learningMemory || null,
    crossSubjectPrerequisites: state.crossSubjectPrerequisites || [],
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
  saveConceptLearningState,
  saveLearningMemory,
  // Adaptive Intelligence Engine exports
  TEACHING_STRATEGIES,
  selectTeachingStrategy,
  MISCONCEPTION_CATEGORIES,
  classifyMisconception,
  calculateCalibratedMastery,
  PEDAGOGICAL_ACTIONS,
  selectPedagogicalAction,
  CROSS_SUBJECT_GRAPH,
  getCrossSubjectPrerequisites,
  SPACED_INTERVALS_DAYS,
  calculateSpacedRevision,
  createInitialLearningMemory,
  normalizeAdaptiveReply,
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
  findPackByQuestion,
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
  isConceptRelevantToQuestion,
  detectTopicChange,
  isReplyRelevantToQuestion,
  isPackRelevantToContext,
  PACK_TOPIC_VALIDATORS,
};
