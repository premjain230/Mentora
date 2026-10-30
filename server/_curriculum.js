// api/_curriculum.js
// Server-side, read-only adapter over the existing curriculum dataset.
//
// There is exactly one curriculum source of truth in this repo:
// js/learning/curriculum-data.js (590 concepts, used by Arena, onboarding and the
// legacy Learning Hub). That file is an ES module importing createConceptV1, so it
// cannot be require()d from a CommonJS serverless function. Rather than duplicate
// or hand-copy the syllabus, this adapter reads and indexes that file once per
// function instance. A test asserts the parsed concept count and required fields,
// so a future edit to the dataset cannot silently break this path.

const fs = require("fs");
const path = require("path");

const TRACKS = {
  maharashtra: {
    id: "maharashtra",
    label: "Maharashtra State Board",
    short: "Maharashtra",
    grades: true,
    classes: [9, 10, 11, 12],
    prefixes: (cls) => [`maharashtra.${cls}.`],
  },
  cbse: {
    id: "cbse",
    label: "CBSE",
    short: "CBSE",
    grades: true,
    classes: [9, 10, 11, 12],
    prefixes: (cls) => [`cbse.${cls}.`],
  },
  jee_main: {
    id: "jee_main",
    label: "JEE Main",
    short: "JEE Main",
    grades: false,
    classes: [],
    prefixes: () => ["jee.main."],
  },
  jee_advanced: {
    id: "jee_advanced",
    label: "JEE Advanced",
    short: "JEE Advanced",
    grades: false,
    classes: [],
    prefixes: () => ["jee.advanced.", "jee.main."],
    notice: "JEE Advanced covers the JEE Main foundation chapters present in our dataset plus the Advanced-only chapters we have built.",
  },
  neet: {
    id: "neet",
    label: "NEET",
    short: "NEET",
    grades: false,
    classes: [],
    prefixes: () => ["neet."],
    notice: "NEET uses its own units plus the CBSE Class 11 and 12 science chapters, matching the syllabus mapping already used by the Arena.",
  },
};

const NEET_SUBJECTS = new Set(["Physics", "Chemistry", "Biology"]);
const NEET_FALLBACK_CLASSES = new Set([11, 12]);

const SUBJECT_ORDER = [
  "Physics",
  "Chemistry",
  "Biology",
  "Mathematics",
  "Science",
  "Science & Technology - Part 1",
  "Science & Technology - Part 2",
  "Mathematics - Part 1",
  "Mathematics - Part 2",
  "Mathematics - Part 1 (Algebra)",
  "Mathematics - Part 2 (Geometry)",
  "History",
  "Political Science",
  "Geography",
  "Social Science",
  "English",
];

function subjectRank(subject) {
  const i = SUBJECT_ORDER.indexOf(subject);
  return i === -1 ? 999 : i;
}

function parseString(body, key) {
  const re = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = re.exec(body);
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch (_) {
    return m[1];
  }
}

function parseArray(body, key) {
  const re = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*\\[([^\\]]*)\\]`);
  const m = re.exec(body);
  if (!m) return [];
  const out = [];
  const itemRe = /"((?:[^"\\]|\\.)*)"/g;
  let item;
  while ((item = itemRe.exec(m[1]))) {
    try {
      out.push(JSON.parse(`"${item[1]}"`));
    } catch (_) {
      out.push(item[1]);
    }
  }
  return out;
}

function parseNumber(body, key) {
  const m = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*([0-9.]+)`).exec(body);
  if (!m) return 0.5;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
}

let conceptCache = null;
let conceptById = null;

function loadConcepts() {
  if (conceptCache) return conceptCache;
  const file = path.join(process.cwd(), "js", "learning", "curriculum-data.js");
  const source = fs.readFileSync(file, "utf8");
  const concepts = [];
  const lines = source.split(/\r?\n/);
  const lineRe = /^\s*createConceptV1\(\{(.*)\}\),?\s*$/;
  for (const line of lines) {
    const m = lineRe.exec(line);
    if (!m) continue;
    const body = m[1];
    const conceptId = parseString(body, "conceptId");
    const name = parseString(body, "name");
    const subject = parseString(body, "subject");
    if (!conceptId || !name || !subject) continue;
    concepts.push({
      conceptId,
      name,
      subject,
      topic: parseString(body, "topic"),
      difficulty: parseNumber(body, "difficulty"),
      prerequisites: parseArray(body, "prerequisites"),
      tags: parseArray(body, "tags"),
      curriculumPaths: parseArray(body, "curriculumPaths"),
    });
  }
  conceptCache = concepts;
  conceptById = new Map(concepts.map((c) => [c.conceptId, c]));
  return concepts;
}

function getConcept(conceptId) {
  loadConcepts();
  return conceptById.get(String(conceptId || "")) || null;
}

function getTrack(trackId) {
  return TRACKS[String(trackId || "").toLowerCase()] || null;
}

let trackCountCache = null;

function countForTrack(track) {
  if (!track) return 0;
  if (!trackCountCache) trackCountCache = new Map();
  if (trackCountCache.has(track.id)) return trackCountCache.get(track.id);
  const classes = track.grades ? track.classes : [null];
  let count = 0;
  for (const concept of loadConcepts()) {
    if (classes.some((cls) => matchesTrack(concept, track, cls))) count += 1;
  }
  trackCountCache.set(track.id, count);
  return count;
}

function listTracks() {
  return Object.values(TRACKS).map((t) => ({
    id: t.id,
    label: t.label,
    short: t.short,
    grades: t.grades,
    classes: t.classes,
    notice: t.notice || null,
    chapterCount: countForTrack(t),
  }));
}

function matchesTrack(concept, track, classNum) {
  const paths = concept.curriculumPaths || [];
  if (track.id === "maharashtra" || track.id === "cbse") {
    if (!classNum) return false;
    const prefix = `${track.id}.${classNum}.`;
    return paths.some((p) => p.startsWith(prefix));
  }
  if (track.id === "jee_main") {
    return paths.some((p) => p.startsWith("jee.main."));
  }
  if (track.id === "jee_advanced") {
    return paths.some((p) => p.startsWith("jee.advanced.") || p.startsWith("jee.main."));
  }
  if (track.id === "neet") {
    if (paths.some((p) => p.startsWith("neet."))) return true;
    if (!NEET_SUBJECTS.has(concept.subject)) return false;
    return paths.some((p) => {
      const parts = String(p).split(".");
      return parts[0] === "cbse" && NEET_FALLBACK_CLASSES.has(Number(parts[1]));
    });
  }
  return false;
}

function filterConcepts({ trackId, classNum, subject, query }) {
  const track = getTrack(trackId);
  if (!track) return [];
  const cls = track.grades ? Number(classNum) || null : null;
  if (track.grades && !cls) return [];
  const q = String(query || "").trim().toLowerCase();
  return loadConcepts().filter((c) => {
    if (!matchesTrack(c, track, cls)) return false;
    if (subject && c.subject !== subject) return false;
    if (q) {
      const hay = `${c.name} ${c.topic} ${c.conceptId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function listSubjects({ trackId, classNum }) {
  const track = getTrack(trackId);
  if (!track) return [];
  const cls = track.grades ? Number(classNum) || null : null;
  if (track.grades && !cls) return [];
  const seen = new Map();
  for (const c of loadConcepts()) {
    if (!matchesTrack(c, track, cls)) continue;
    seen.set(c.subject, (seen.get(c.subject) || 0) + 1);
  }
  return [...seen.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => subjectRank(a.name) - subjectRank(b.name) || a.name.localeCompare(b.name));
}

function topologicalChapters(concepts) {
  const byId = new Map(concepts.map((c) => [c.conceptId, c]));
  const indeg = new Map();
  const children = new Map();
  for (const c of concepts) {
    indeg.set(c.conceptId, 0);
    children.set(c.conceptId, []);
  }
  for (const c of concepts) {
    for (const prereq of c.prerequisites || []) {
      if (!byId.has(prereq)) continue;
      children.get(prereq).push(c.conceptId);
      indeg.set(c.conceptId, (indeg.get(c.conceptId) || 0) + 1);
    }
  }
  const queue = concepts.filter((c) => (indeg.get(c.conceptId) || 0) === 0).sort((a, b) => a.difficulty - b.difficulty);
  const out = [];
  const seen = new Set();
  while (queue.length) {
    queue.sort((a, b) => a.difficulty - b.difficulty);
    const current = queue.shift();
    if (seen.has(current.conceptId)) continue;
    out.push(current);
    seen.add(current.conceptId);
    for (const next of children.get(current.conceptId) || []) {
      indeg.set(next, (indeg.get(next) || 0) - 1);
      if (indeg.get(next) === 0 && byId.has(next)) queue.push(byId.get(next));
    }
  }
  for (const c of concepts) if (!seen.has(c.conceptId)) out.push(c);
  return out;
}

function difficultyLabel(d) {
  if (d < 0.35) return "Foundation";
  if (d < 0.55) return "Intermediate";
  if (d < 0.75) return "Advanced";
  return "Challenging";
}

function getChapters({ trackId, classNum, subject, query }) {
  const track = getTrack(trackId);
  if (!track || !subject) return [];
  const filtered = filterConcepts({ trackId, classNum, subject, query });
  return topologicalChapters(filtered).map((c, index) => ({
    conceptId: c.conceptId,
    name: c.name,
    subject: c.subject,
    topic: c.topic,
    difficulty: c.difficulty,
    difficultyLabel: difficultyLabel(c.difficulty),
    prerequisites: c.prerequisites,
    number: index + 1,
  }));
}

function getCatalog({ trackId, classNum, subject, query } = {}) {
  const track = getTrack(trackId);
  if (!track) {
    return { step: "board", tracks: listTracks() };
  }
  const cls = track.grades ? Number(classNum) || null : null;
  if (track.grades && !cls) {
    return {
      step: "class",
      track: { id: track.id, label: track.label, grades: true, classes: track.classes, notice: track.notice || null },
      classes: track.classes,
    };
  }
  if (!subject) {
    return {
      step: "subject",
      track: { id: track.id, label: track.label, short: track.short, grades: track.grades, classes: track.classes, notice: track.notice || null },
      classNum: cls,
      subjects: listSubjects({ trackId: track.id, classNum: cls }),
    };
  }
  return {
    step: "chapter",
    track: { id: track.id, label: track.label, short: track.short, grades: track.grades, classes: track.classes, notice: track.notice || null },
    classNum: cls,
    subject,
    chapters: getChapters({ trackId: track.id, classNum: cls, subject, query }),
  };
}

const STOPWORDS = new Set(
  "a an the is are was were be been being of in on at to for from with by about into through during before after above below between under and or but if then than that this these those it its as i you we they he she them what why how when where which who whom do does did can could should would will shall may might must not no yes please explain tell me give show find solve calculate help understand concept topic chapter question problem example definition meaning means".split(/\s+/)
);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Find the curriculum concept a free-text question is about. This is deliberately
 * local and deterministic — no AI call is spent on classification. It returns
 * null rather than guessing when the overlap is weak, and the caller then lets
 * the tutor generate an answer without curriculum anchoring.
 */
function matchConcept(text, opts = {}) {
  const queryTokens = new Set(tokenize(text));
  if (!queryTokens.size) return null;
  const candidates = opts.trackId
    ? filterConcepts({ trackId: opts.trackId, classNum: opts.classNum, subject: opts.subject })
    : loadConcepts();
  if (!candidates.length) return null;
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const nameTokens = tokenize(c.name);
    const topicTokens = tokenize(c.topic);
    let score = 0;
    for (const t of nameTokens) if (queryTokens.has(t)) score += 3;
    for (const t of topicTokens) if (queryTokens.has(t)) score += 1;
    const idTokens = tokenize(c.conceptId.replace(/\./g, " "));
    for (const t of idTokens) if (queryTokens.has(t)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best || bestScore < 4) return null;
  const nameMatches = tokenize(best.name).filter((t) => queryTokens.has(t));
  const longestMatch = nameMatches.reduce((max, t) => Math.max(max, t.length), 0);
  // One generic word is not enough evidence of the topic. Accept a single match
  // only when it is a distinctive word, and require two matches otherwise.
  if (nameMatches.length < 2 && !(nameMatches.length === 1 && longestMatch >= 8 && bestScore >= 5)) return null;
  return best;
}

function getPrerequisiteInfo(concept) {
  if (!concept) return [];
  return (concept.prerequisites || [])
    .map((id) => getConcept(id))
    .filter(Boolean)
    .map((c) => ({ conceptId: c.conceptId, name: c.name, subject: c.subject }));
}

function curriculumStats() {
  loadConcepts();
  return { concepts: conceptCache.length, tracks: Object.keys(TRACKS).length };
}

module.exports = {
  TRACKS,
  listTracks,
  getTrack,
  getConcept,
  getCatalog,
  getChapters,
  listSubjects,
  filterConcepts,
  matchConcept,
  getPrerequisiteInfo,
  difficultyLabel,
  curriculumStats,
  tokenize,
};
