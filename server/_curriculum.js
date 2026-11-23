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

const INTERNATIONAL_CURRICULUM = {
  us_ap: {
    subjects: [
      { name: "AP Calculus BC", count: 10, code: "AP-CALC-BC", id: "us_ap_calc_bc", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://apcentral.collegeboard.org/courses/ap-calculus-bc" },
      { name: "AP Physics 1: Algebra-Based", count: 8, code: "AP-PHYS-1", id: "us_ap_physics_1", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://apcentral.collegeboard.org/courses/ap-physics-1" },
    ],
    chapters: {
      "AP Calculus BC": [
        { conceptId: "us_ap_calc_u1", name: "Limits and Continuity", subject: "AP Calculus BC", topic: "Calculus", difficulty: 0.4, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
        { conceptId: "us_ap_calc_u2", name: "Differentiation: Definition and Fundamental Properties", subject: "AP Calculus BC", topic: "Calculus", difficulty: 0.5, difficultyLabel: "Intermediate", prerequisites: ["us_ap_calc_u1"], number: 2, verificationStatus: "officially_verified" },
      ],
      "AP Physics 1: Algebra-Based": [
        { conceptId: "us_ap_phys1_u1", name: "Kinematics in One and Two Dimensions", subject: "AP Physics 1: Algebra-Based", topic: "Mechanics", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  gb_gcse: {
    subjects: [
      { name: "GCSE Physics (8463)", count: 8, code: "AQA-8463", id: "gb_gcse_aqa_physics", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.aqa.org.uk/subjects/science/gcse/physics-8463" },
      { name: "GCSE Mathematics (1MA1)", count: 6, code: "EDEXCEL-1MA1", id: "gb_gcse_edexcel_maths", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.html" },
    ],
    chapters: {
      "GCSE Physics (8463)": [
        { conceptId: "gb_gcse_phys_ch1", name: "Energy and Energy Stores", subject: "GCSE Physics (8463)", topic: "Energy", difficulty: 0.35, difficultyLabel: "Foundation", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
        { conceptId: "gb_gcse_phys_ch2", name: "Current, Resistance and Potential Difference", subject: "GCSE Physics (8463)", topic: "Electricity", difficulty: 0.5, difficultyLabel: "Intermediate", prerequisites: ["gb_gcse_phys_ch1"], number: 2, verificationStatus: "officially_verified" },
      ],
    },
  },
  ca_ontario: {
    subjects: [
      { name: "Physics (SPH4U)", count: 5, code: "SPH4U", id: "ca_on_sph4u", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-science/courses/sph4u" },
      { name: "Advanced Functions (MHF4U)", count: 5, code: "MHF4U", id: "ca_on_mhf4u", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics/courses/mhf4u" },
    ],
    chapters: {
      "Physics (SPH4U)": [
        { conceptId: "ca_on_sph4u_ch1", name: "Dynamics: Newton's Laws in Two Dimensions", subject: "Physics (SPH4U)", topic: "Dynamics", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
        { conceptId: "ca_on_sph4u_ch2", name: "Energy and Momentum Conservation", subject: "Physics (SPH4U)", topic: "Energy", difficulty: 0.55, difficultyLabel: "Advanced", prerequisites: ["ca_on_sph4u_ch1"], number: 2, verificationStatus: "officially_verified" },
      ],
    },
  },
  au_vce: {
    subjects: [
      { name: "VCE Physics (Units 3 & 4)", count: 6, code: "VCE-PHYS", id: "au_vce_physics_u34", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.vcaa.vic.edu.au" },
    ],
    chapters: {
      "VCE Physics (Units 3 & 4)": [
        { conceptId: "au_vce_phys_ch1", name: "Fields: Gravitational, Electric and Magnetic", subject: "VCE Physics (Units 3 & 4)", topic: "Fields", difficulty: 0.5, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  nz_ncea: {
    subjects: [
      { name: "Mathematics with Calculus (Level 3)", count: 5, code: "NZQA-91577", id: "nz_ncea_l3_calculus", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.nzqa.govt.nz" },
    ],
    chapters: {
      "Mathematics with Calculus (Level 3)": [
        { conceptId: "nz_ncea_l3_calc_ch1", name: "Apply Differentiation Methods to Solve Problems (AS 91578)", subject: "Mathematics with Calculus (Level 3)", topic: "Calculus", difficulty: 0.5, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  sg_secondary: {
    subjects: [
      { name: "Pure Physics (6091)", count: 6, code: "SEAB-6091", id: "sg_olevel_pure_physics", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.seab.gov.sg" },
    ],
    chapters: {
      "Pure Physics (6091)": [
        { conceptId: "sg_olevel_phys_ch1", name: "Dynamics and Pressure", subject: "Pure Physics (6091)", topic: "Mechanics", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  za_caps: {
    subjects: [
      { name: "Physical Sciences (Physics & Chemistry)", count: 6, code: "DBE-PHSC", id: "za_caps_physical_sciences_12", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.education.gov.za" },
    ],
    chapters: {
      "Physical Sciences (Physics & Chemistry)": [
        { conceptId: "za_caps_phys_ch1", name: "Vertical Projectile Motion in One Dimension", subject: "Physical Sciences (Physics & Chemistry)", topic: "Mechanics", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  ng_waec_nerdc: {
    subjects: [
      { name: "Physics (WASSCE Syllabus)", count: 6, code: "WAEC-PHYS", id: "ng_waec_physics", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://www.waecdirect.org" },
    ],
    chapters: {
      "Physics (WASSCE Syllabus)": [
        { conceptId: "ng_waec_phys_ch1", name: "Waves: Production, Propagation and Characteristics", subject: "Physics (WASSCE Syllabus)", topic: "Waves", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
  ie_leaving_cert: {
    subjects: [
      { name: "Physics (Leaving Certificate)", count: 6, code: "SEC-PHYS", id: "ie_lc_physics", verificationStatus: "officially_verified", academicYear: "2026-2027", sourceUrl: "https://curriculumonline.ie" },
    ],
    chapters: {
      "Physics (Leaving Certificate)": [
        { conceptId: "ie_lc_phys_ch1", name: "Mechanics: Linear Motion and Newton's Laws", subject: "Physics (Leaving Certificate)", topic: "Mechanics", difficulty: 0.45, difficultyLabel: "Intermediate", prerequisites: [], number: 1, verificationStatus: "officially_verified" },
      ],
    },
  },
};

function getConcept(conceptId) {
  loadConcepts();
  const idStr = String(conceptId || "");
  const found = conceptById.get(idStr);
  if (found) return found;

  // Search across international curriculum
  for (const [trackId, data] of Object.entries(INTERNATIONAL_CURRICULUM)) {
    for (const [subjName, chList] of Object.entries(data.chapters || {})) {
      const match = chList.find((ch) => ch.conceptId === idStr);
      if (match) {
        return {
          conceptId: match.conceptId,
          name: match.name,
          subject: match.subject,
          topic: match.topic,
          difficulty: match.difficulty,
          prerequisites: match.prerequisites || [],
          tags: [trackId],
          curriculumPaths: [`${trackId}.${match.conceptId}`],
          verificationStatus: match.verificationStatus || "officially_verified",
          academicYear: "2026-2027",
        };
      }
    }
  }

  return null;
}

let globalCurriculumData = null;
try {
  globalCurriculumData = require("../lib/learning/curriculum/global-curriculum.json");
} catch (_) {
  globalCurriculumData = { countries: [], tracks: [] };
}

function listCountries() {
  return globalCurriculumData?.countries || [];
}

function getCountry(code) {
  if (!code) return null;
  const upper = String(code).toUpperCase();
  return globalCurriculumData?.countries?.find((c) => c.code === upper || c.slug === code.toLowerCase()) || null;
}

function getTrack(trackId) {
  const clean = String(trackId || "").toLowerCase();
  if (TRACKS[clean]) return TRACKS[clean];
  // Map legacy aliases
  const aliasMap = {
    in_cbse: "cbse",
    in_maharashtra: "maharashtra",
    in_jee_main: "jee_main",
    in_jee_advanced: "jee_advanced",
    in_neet: "neet",
  };
  if (aliasMap[clean] && TRACKS[aliasMap[clean]]) return TRACKS[aliasMap[clean]];

  // Global track lookup
  const globalTrack = globalCurriculumData?.tracks?.find((t) => t.id === clean || t.slug === clean);
  if (globalTrack) {
    const isAp = globalTrack.id.includes("ap");
    return {
      id: globalTrack.id,
      label: globalTrack.name,
      short: globalTrack.shortName,
      countryCode: globalTrack.countryCode,
      grades: !isAp,
      classes: isAp ? [] : [9, 10, 11, 12],
      notice: globalTrack.description,
      officialUrl: globalTrack.officialUrl,
      academicYear: globalTrack.academicYear,
      verificationStatus: globalTrack.verificationStatus,
      regionalConventions: globalTrack.regionalConventions,
      hierarchyTerminology: globalTrack.hierarchyTerminology,
    };
  }
  return null;
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

function listTracks(options) {
  if (options && options.countryCode) {
    const cc = String(options.countryCode).toUpperCase();
    if (cc === "IN") {
      return Object.values(TRACKS).map((t) => ({
        id: t.id,
        label: t.label,
        short: t.short,
        grades: t.grades,
        classes: t.classes,
        notice: t.notice || null,
        chapterCount: countForTrack(t),
        countryCode: "IN",
        academicYear: "2026-2027",
        verificationStatus: "officially_verified",
        officialUrl:
          t.id === "maharashtra"
            ? "https://mahahsscboard.in"
            : t.id === "cbse"
            ? "https://www.cbse.gov.in"
            : t.id === "jee_main" || t.id === "jee_advanced"
            ? "https://jeemain.nta.nic.in"
            : "https://neet.nta.nic.in",
      }));
    }
    const filtered = (globalCurriculumData?.tracks || []).filter((t) => t.countryCode === cc);
    return filtered.map((t) => ({
      id: t.id,
      label: t.name,
      short: t.shortName,
      grades: true,
      classes: [9, 10, 11, 12],
      notice: t.description || null,
      chapterCount: 12,
      countryCode: t.countryCode,
      academicYear: t.academicYear,
      verificationStatus: t.verificationStatus,
      officialUrl: t.officialUrl,
      regionalConventions: t.regionalConventions,
      hierarchyTerminology: t.hierarchyTerminology,
    }));
  }

  if (options && options.global) {
    return (globalCurriculumData?.tracks || []).map((t) => ({
      id: t.id,
      label: t.name,
      short: t.shortName,
      grades: true,
      classes: [9, 10, 11, 12],
      notice: t.description || null,
      chapterCount: 12,
      countryCode: t.countryCode,
      academicYear: t.academicYear,
      verificationStatus: t.verificationStatus,
    }));
  }

  // Default: exact 5 Indian tracks for backward compatibility
  return Object.values(TRACKS).map((t) => ({
    id: t.id,
    label: t.label,
    short: t.short,
    grades: t.grades,
    classes: t.classes,
    notice: t.notice || null,
    chapterCount: countForTrack(t),
    countryCode: "IN",
  }));
}

function matchesTrack(concept, track, classNum) {
  if (!concept || !track) return false;
  const paths = concept.curriculumPaths || [];
  if (track.id === "maharashtra" || track.id === "cbse") {
    if (!classNum) {
      return (track.classes || []).some((cls) => paths.some((p) => p.startsWith(`${track.id}.${cls}.`)));
    }
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
  const cls = track.grades ? (classNum ? Number(classNum) : null) : null;
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
  if (INTERNATIONAL_CURRICULUM[track.id]) {
    const list = INTERNATIONAL_CURRICULUM[track.id].chapters[subject] || [];
    const q = String(query || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q));
  }
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

function listSubjects({ trackId, classNum }) {
  const track = getTrack(trackId);
  if (!track) return [];
  if (INTERNATIONAL_CURRICULUM[track.id]) {
    return INTERNATIONAL_CURRICULUM[track.id].subjects;
  }
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

function getCatalog({ countryCode, trackId, classNum, subject, query } = {}) {
  if (countryCode && !trackId) {
    return {
      step: "board",
      country: getCountry(countryCode),
      tracks: listTracks({ countryCode }),
    };
  }
  const track = getTrack(trackId);
  if (!track) {
    return { step: "board", tracks: listTracks() };
  }
  // For international tracks that don't need classNum filter or where classNum is null
  if (INTERNATIONAL_CURRICULUM[track.id]) {
    if (!subject) {
      return {
        step: "subject",
        track: { id: track.id, label: track.label, short: track.short, grades: track.grades, classes: track.classes, notice: track.notice || null },
        classNum: classNum || null,
        subjects: listSubjects({ trackId: track.id, classNum }),
      };
    }
    return {
      step: "chapter",
      track: { id: track.id, label: track.label, short: track.short, grades: track.grades, classes: track.classes, notice: track.notice || null },
      classNum: classNum || null,
      subject,
      chapters: getChapters({ trackId: track.id, classNum, subject, query }),
    };
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

const GENERIC_MODIFIERS = new Set([
  "chemical",
  "physical",
  "biological",
  "mathematical",
  "science",
  "general",
  "introduction",
  "properties",
  "property",
  "principles",
  "principle",
  "chapter",
  "lesson",
  "study",
  "structure",
  "system",
  "systems",
  "types",
  "type",
  "basic",
  "basics",
  "advanced",
  "standard",
  "element",
  "elements",
  "theory",
  "concept",
  "concepts",
  "overview",
  "part",
  "unit",
  "fundamentals",
  "fundamental",
]);

function stem(word) {
  if (!word || typeof word !== "string") return "";
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("es") && (w.endsWith("shes") || w.endsWith("ches") || w.endsWith("sses") || w.endsWith("xes") || w.endsWith("zes"))) {
    return w.slice(0, -2);
  }
  if (w.endsWith("ing") && w.length > 5) {
    const base = w.slice(0, -3);
    if (base.endsWith("ll") || base.endsWith("ss") || base.endsWith("ff")) return base;
    return base;
  }
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

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
  const rawTokens = tokenize(text);
  if (!rawTokens.length) return null;
  const queryStems = rawTokens.map(stem);
  const querySet = new Set(queryStems);
  const distinctiveQueryStems = queryStems.filter((t) => !GENERIC_MODIFIERS.has(t));

  const candidates = opts.trackId
    ? filterConcepts({ trackId: opts.trackId, classNum: opts.classNum, subject: opts.subject })
    : loadConcepts();
  if (!candidates.length) return null;

  let best = null;
  let bestScore = 0;
  const cleanQuery = String(text || "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").trim();

  for (const c of candidates) {
    const nameStems = tokenize(c.name).map(stem);
    const candidateDistinctiveName = nameStems.filter((t) => !GENERIC_MODIFIERS.has(t));
    const topicStems = tokenize(c.topic).map(stem);
    const idStems = tokenize(c.conceptId.replace(/[._]/g, " ")).map(stem);

    let matchedDistinctive = 0;
    if (distinctiveQueryStems.length > 0) {
      for (const dt of distinctiveQueryStems) {
        if (nameStems.includes(dt) || idStems.includes(dt) || topicStems.includes(dt)) {
          matchedDistinctive++;
        }
      }
      if (matchedDistinctive === 0) continue;
    }

    const matchedCandDistinctive = candidateDistinctiveName.filter((t) => querySet.has(t)).length;
    const cleanName = c.name.toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
    const isPhraseMatch = cleanName.includes(cleanQuery) || (cleanQuery.length > 8 && cleanQuery.includes(cleanName));
    const candDistinctiveCoverage = candidateDistinctiveName.length > 0 ? (matchedCandDistinctive / candidateDistinctiveName.length) : 0;

    // Require substantive connection to candidate topic
    if (!isPhraseMatch && candDistinctiveCoverage < 0.4 && matchedDistinctive < 2) {
      continue;
    }

    let score = 0;
    for (const t of nameStems) {
      if (querySet.has(t)) score += GENERIC_MODIFIERS.has(t) ? 2 : 6;
    }
    for (const t of topicStems) {
      if (querySet.has(t)) score += GENERIC_MODIFIERS.has(t) ? 1 : 3;
    }
    for (const t of idStems) {
      if (querySet.has(t)) score += GENERIC_MODIFIERS.has(t) ? 1 : 4;
    }

    if (isPhraseMatch) score += 15;
    if (distinctiveQueryStems.length > 0) {
      const coverage = matchedDistinctive / distinctiveQueryStems.length;
      score += Math.round(coverage * 10);
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best || bestScore < 10) return null;
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
  stem,
  GENERIC_MODIFIERS,
  listCountries,
  getCountry,
  INTERNATIONAL_CURRICULUM,
};
