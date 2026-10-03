/**
 * Learning Allied Arena — Curriculum Engine
 * Arena Engine + Curriculum Data (not 4 separate systems)
 * Transforms CURRICULUM_CONCEPTS into game-like progression per exam/board.
 */

import { CURRICULUM_CONCEPTS } from "./curriculum-data.js";

// ── Board / Exam definitions ──
export const ARENA_TRACKS = Object.freeze({
  JEE: { id: "jee", label: "JEE", subtitle: "Physics · Chemistry · Mathematics", icon: "◈", color: "#0ea5e9", bg: "linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)" },
  NEET: { id: "neet", label: "NEET", subtitle: "Physics · Chemistry · Biology", icon: "⬢", color: "#10b981", bg: "linear-gradient(135deg,#10b981 0%,#06b6d4 100%)" },
  MAHARASHTRA: { id: "maharashtra", label: "Maharashtra State Board", subtitle: "Class-based curriculum", icon: "⬣", color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)" },
  CBSE: { id: "cbse", label: "CBSE", subtitle: "Class-based curriculum", icon: "⬔", color: "#8b5cf6", bg: "linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%)" },
});

export const ARENA_SUBJECTS = Object.freeze({
  jee: ["Physics", "Chemistry", "Mathematics"],
  neet: ["Physics", "Chemistry", "Biology"],
  maharashtra: null, // dynamic by class
  cbse: null,
});

export const BOARD_CLASSES = Object.freeze({
  maharashtra: [9,10,11,12],
  cbse: [9,10,11,12],
});

// Map concept subject field -> Arena display subject.
//
// This used to be lossy substring matching, which silently merged three DISTINCT
// CBSE subjects into other subjects and created a phantom one:
//   "Social Science"      -> "Science"            (8 chapters folded into cbse_10_science)
//   "Applied Mathematics" -> "Mathematics"        (elective became unreachable)
//   "Computer Science"    -> "Science"/Physics/…  (injected into every CBSE-11 subject)
// Now it is an explicit alias table plus an identity default, so an unknown
// subject is surfaced verbatim instead of being guessed at. The Maharashtra
// canonical names below are load-bearing: they form subjectKey segments
// (maharashtra_9_science_technology_part_1), so they must not be renamed.
//
// Only punctuation variants (em/en dash, spacing, case) are aliased.
const SUBJECT_ALIASES = new Map(Object.entries({
  // Legacy punctuation variants of the Maharashtra canonical names.
  "science & technology — part 1": "Science & Technology - Part 1",
  "science & technology — part 2": "Science & Technology - Part 2",
  "science & technology": "Science & Technology",
  "mathematics - part 1 (algebra)": "Mathematics - Part 1 (Algebra)",
  "mathematics - part 2 (geometry)": "Mathematics - Part 2 (Geometry)",
  "mathematics — part 1": "Mathematics - Part 1",
  "mathematics — part 2": "Mathematics - Part 2",
  "mathematics - part 1": "Mathematics - Part 1",
  "mathematics - part 2": "Mathematics - Part 2",
  // Case-insensitive identity for the plain subjects.
  "physics": "Physics",
  "chemistry": "Chemistry",
  "biology": "Biology",
  "mathematics": "Mathematics",
  "science": "Science",
  "history": "History",
  "political science": "Political Science",
  "history and political science": "History and Political Science",
  "geography": "Geography",
  "social science": "Social Science",
  "applied mathematics": "Applied Mathematics",
  "computer science": "Computer Science",
  "informatics practices": "Informatics Practices",
  "english core": "English Core",
  "accountancy": "Accountancy",
  "business studies": "Business Studies",
  "economics": "Economics",
  "physical education": "Physical Education",
  "psychology": "Psychology",
  "sociology": "Sociology",
}));

export function normalizeSubject(conceptSubject){
  const raw = String(conceptSubject||"").trim();
  if(!raw) return "General";
  const alias = SUBJECT_ALIASES.get(raw.toLowerCase());
  if(alias) return alias;
  // Preserve an already-canonical Maharashtra name that differs only by case.
  for(const candidate of SUBJECT_ALIASES.values()){
    if(candidate.toLowerCase()===raw.toLowerCase()) return candidate;
  }
  return raw;
}

// NEET UG has only 3 placeholder concepts tagged `neet.ug.*` (see
// js/learning/curriculum/index.json -> neet_ug_2026 "source_pending"). The NEET
// UG syllabus is, in board terms, CBSE Class 11 + 12 Physics/Chemistry/Biology —
// and the existing neet.* prerequisites already point at cbse.12.* — so NEET
// falls back to those two classes for its three science subjects.
//
// This is an EXPLICIT, scoped fallback, deliberately different from the old
// behaviour which let any core subject leak in by difficulty and produced 53
// chapters of mixed Maharashtra/CBSE content. It is still content-thin: verify
// against the official NEET UG 2026 PDF before treating it as authoritative.
const NEET_FALLBACK_CLASSES = [11, 12];
const NEET_SUBJECTS = new Set(["Physics", "Chemistry", "Biology"]);


function extractClassAndBoard(path){
  // pattern: board.class.subject...
  const parts = String(path).split(".");
  if(parts.length<2) return null;
  const board = parts[0].toLowerCase(); // maharashtra, cbse, jee, neet, icse
  const cls = parseInt(parts[1],10);
  if(isNaN(cls)) return { board, cls: null };
  return { board, cls };
}

// Build chapter object from concept
function toChapter(concept){
  return {
    conceptId: concept.conceptId,
    name: concept.name,
    topic: concept.topic,
    subject: normalizeSubject(concept.subject, concept.tags),
    difficulty: concept.difficulty,
    difficultyLabel: difficultyLabel(concept.difficulty),
    prerequisites: [...(concept.prerequisites||[])],
    curriculumPaths: [...(concept.curriculumPaths||[])],
    tags: [...(concept.tags||[])],
    description: concept.description || "",
  };
}
function difficultyLabel(d){
  if(d<0.35) return "Foundation";
  if(d<0.55) return "Intermediate";
  if(d<0.75) return "Advanced";
  return "Boss";
}

// ── Public API ──
export function getTracks(){ return Object.values(ARENA_TRACKS); }
export function getTrack(id){ return Object.values(ARENA_TRACKS).find(t=>t.id===id) || null; }

/** Subjects for a track. For boards, requires class; otherwise returns static list. */
export function getSubjectsForTrack(trackId, classNum=null){
  const t = String(trackId).toLowerCase();
  if(t==="jee") return ARENA_SUBJECTS.jee;
  if(t==="neet") return ARENA_SUBJECTS.neet;
  if(t==="maharashtra" || t==="cbse"){
    // Derive available subjects from data for that class
    if(classNum==null) return ["Physics","Chemistry","Biology","Mathematics","Science"];
    return getBoardSubjects(t, classNum);
  }
  return [];
}

function getBoardSubjects(board, classNum){
  const set = new Set();
  for(const c of CURRICULUM_CONCEPTS){
    for(const p of (c.curriculumPaths||[])){
      const parsed = extractClassAndBoard(p);
      if(parsed && parsed.board===board && parsed.cls===classNum){
        set.add(normalizeSubject(c.subject));
      }
    }
  }
  if(set.size===0) return ["Mathematics","Science"];
  // Maharashtra 9 order as per user syllabus: Science Part1, Part2, Maths Part1, Part2, History, Political Science, Geography
  const mh9Order = ["Science & Technology - Part 1","Science & Technology - Part 2","Mathematics - Part 1","Mathematics - Part 2","History","Political Science","Geography"];
  if(board==="maharashtra" && classNum===9){
    // Return in curriculum order if available, otherwise fallback to discovered set sorted by mh9Order
    const ordered = mh9Order.filter(s=> set.has(s));
    // Append any extra discovered (future) at end
    for(const s of set) if(!ordered.includes(s)) ordered.push(s);
    if(ordered.length) return ordered;
  }
  // Prefer order: Physics, Chemistry, Biology, Mathematics
  const order = ["Physics","Chemistry","Biology","Mathematics","Science", ...mh9Order];
  return [...set].sort((a,b)=> {
    const ia = order.indexOf(a); const ib = order.indexOf(b);
    if(ia===-1 && ib===-1) return a.localeCompare(b);
    if(ia===-1) return 1;
    if(ib===-1) return -1;
    return ia-ib;
  });
}

/**
 * Core: build ordered chapter list for (track, subject, class)
 * Returns chapters sorted topologically by prerequisites (syllabus order)
 */
export function getChapters(trackId, subject, classNum=null){
  const t = String(trackId).toLowerCase();
  const subj = subject;
  let filtered = [];
  for(const c of CURRICULUM_CONCEPTS){
    const normSubj = normalizeSubject(c.subject);
    // Subject must match exactly. The old "Science umbrella" allowance merged
    // Physics/Chemistry/Biology into a single Science subject and injected
    // Computer Science into every CBSE-11 science list.
    if(normSubj!==subj) continue;
    // board/class filtering — a concept belongs to a track ONLY if its
    // curriculumPaths actually name that track.
    if(t==="jee"){
      const hasTrack = (c.curriculumPaths||[]).some(p=> p.startsWith("jee."));
      if(hasTrack) filtered.push(c);
    } else if(t==="neet"){
      const hasTrack = (c.curriculumPaths||[]).some(p=> p.startsWith("neet."));
      if(hasTrack){ filtered.push(c); continue; }
      if(NEET_SUBJECTS.has(normSubj)){
        const fromCBSESenior = (c.curriculumPaths||[]).some(p=>{
          const parsed = extractClassAndBoard(p);
          return parsed && parsed.board==="cbse" && NEET_FALLBACK_CLASSES.includes(parsed.cls);
        });
        if(fromCBSESenior) filtered.push(c);
      }
    } else if(t==="maharashtra" || t==="cbse"){
      if(classNum==null){ continue; }
      const hasBoardClass = (c.curriculumPaths||[]).some(p=>{
        const parsed = extractClassAndBoard(p);
        return parsed && parsed.board===t && parsed.cls===classNum;
      });
      if(hasBoardClass) filtered.push(c);
    }
  }
  // Dedupe by conceptId
  const seen = new Set(); const deduped=[];
  for(const c of filtered){ if(!seen.has(c.conceptId)){ seen.add(c.conceptId); deduped.push(c); } }
  // Convert to chapters
  const chapters = deduped.map(toChapter);
  // Topological sort by prerequisites (Kahn) — stable fallback to difficulty ascending
  return topoSort(chapters);
}

function topoSort(chapters){
  const idToChapter = new Map(chapters.map(c=>[c.conceptId,c]));
  const indeg = new Map(); const adj = new Map();
  for(const c of chapters){ indeg.set(c.conceptId,0); adj.set(c.conceptId,[]); }
  for(const c of chapters){
    for(const pre of c.prerequisites){
      if(idToChapter.has(pre)){
        adj.get(pre).push(c.conceptId);
        indeg.set(c.conceptId, indeg.get(c.conceptId)+1);
      }
    }
  }
  // Kahn with difficulty tie-break
  const queue = chapters.filter(c=> indeg.get(c.conceptId)===0).sort((a,b)=> a.difficulty-b.difficulty);
  const result=[]; const visited=new Set();
  while(queue.length){
    // pick lowest difficulty first to feel like progression
    queue.sort((a,b)=> a.difficulty-b.difficulty);
    const cur = queue.shift();
    result.push(cur); visited.add(cur.conceptId);
    for(const nxt of adj.get(cur.conceptId)){
      indeg.set(nxt, indeg.get(nxt)-1);
      if(indeg.get(nxt)===0){
        const chap = idToChapter.get(nxt);
        if(chap) queue.push(chap);
      }
    }
  }
  // Any cycle left — append by difficulty
  for(const c of chapters){
    if(!visited.has(c.conceptId)) result.push(c);
  }
  // Final: stable sort keeps topological order but we already did BFS; no extra global sort
  return result;
}

// Subject key for Firestore: e.g. "jee_physics", "maharashtra_11_mathematics"
export function toSubjectKey(trackId, subject, classNum=null){
  const t = String(trackId).toLowerCase().replace(/[^a-z0-9]+/g,"_");
  const s = String(subject).toLowerCase().replace(/[^a-z0-9]+/g,"_");
  const c = classNum!=null ? `_${classNum}` : "";
  // keep versioned? v1
  if(t==="maharashtra"||t==="cbse"){
    return `${t}${c}_${s}`;
  }
  return `${t}_${s}`;
}

export function parseSubjectKey(key){
  if(!key) return null;
  const parts = String(key).split("_");
  // heuristics
  if(parts[0]==="maharashtra"||parts[0]==="cbse"){
    const cls = parseInt(parts[1],10);
    const subj = parts.slice(isNaN(cls)?1:2).join(" ");
    return { trackId: parts[0], classNum: isNaN(cls)?null:cls, subject: subj };
  }
  const trackId = parts[0];
  const subject = parts.slice(1).join(" ");
  return { trackId, classNum:null, subject };
}

// Helper for UI: get chapter index (0-based) and total
export function getChapterMeta(chapters, conceptId){
  const idx = chapters.findIndex(c=> c.conceptId===conceptId);
  return { index: idx, total: chapters.length, isFirst: idx===0, isLast: idx===chapters.length-1 };
}

// Search within chapters
export function searchChapters(chapters, query){
  const q = String(query||"").trim().toLowerCase();
  if(!q) return chapters;
  return chapters.filter(c=> c.name.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q) || c.conceptId.toLowerCase().includes(q));
}
