/**
 * Aquila Arena — Curriculum Engine v2 (versioned, lazy, scalable)
 * Centralized, official-source-of-truth, supports 2026-27, 2027-28, etc. without destroying progress.
 * Web + Mobile share same logical IDs via js/learning/curriculum/*.json and mobile/assets/curriculum/*.
 */
import { CURRICULUM_CONCEPTS as LEGACY_CONCEPTS } from "./curriculum-data.js";

const CURRICULUM_VERSION = "2026.1";
const ACADEMIC_YEAR = "2026-27";

// Registry — lazy-loaded JSONs (not bundled)
let _index = null;
let _cache = new Map(); // key: curriculum_id -> data

export async function loadCurriculumIndex(){
  if(_index) return _index;
  try{
    const res = await fetch("/js/learning/curriculum/index.json", {cache: "no-store"});
    if(res.ok) _index = await res.json();
  }catch{}
  if(!_index){
    // fallback minimal
    _index = { curricula: [{curriculum_id:"msb_2026_09", board_or_exam:"maharashtra", class_or_level:9, file:"2026-27/maharashtra_09.json", status:"verified"}] };
  }
  return _index;
}

export async function loadCurriculum(curriculumId){
  if(_cache.has(curriculumId)) return _cache.get(curriculumId);
  const idx = await loadCurriculumIndex();
  const entry = idx.curricula.find(c=> c.curriculum_id===curriculumId);
  if(!entry) return null;
  if(entry.status && entry.status.includes("pending")) {
    // Return placeholder with subjects but no chapters (do not guess)
    return { curriculum_id: entry.curriculum_id, board_or_exam: entry.board_or_exam, class_or_level: entry.class_or_level, academic_year: entry.academic_year, official_source: entry.official_source, status: entry.status, subjects: [], note: entry.note };
  }
  try{
    const res = await fetch(`/js/learning/curriculum/${entry.file}`, {cache: "force-cache"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cache.set(curriculumId, data);
    return data;
  }catch(e){
    console.warn("[curriculum] load failed", curriculumId, e);
    return null;
  }
}

// Map legacy CURRICULUM_CONCEPTS to new versioned structure for migration
export function getLegacyConcepts(){ return LEGACY_CONCEPTS; }

// Stable ID helpers — never use display name as DB ID
export function makeChapterId(board, cls, subjectId, order){ return `${board}_${cls}_${subjectId}_ch${String(order).padStart(2,"0")}`; }
export function makeSubjectKey(board, cls, subjectName){
  const t = String(board).toLowerCase().replace(/[^a-z0-9]+/g,"_");
  const s = String(subjectName).toLowerCase().replace(/[^a-z0-9]+/g,"_");
  return `${t}_${cls}_${s}`;
}

// Versioning: preserve old progress by keeping subjectKey stable across versions.
// If syllabus changes, create new curriculum_version, do NOT delete old chapter IDs.
// Learner progress doc stores curriculum_version it was created with.
export function getCurrentVersion(){ return CURRICULUM_VERSION; }
export function getAcademicYear(){ return ACADEMIC_YEAR; }

// Diff existing Maharashtra 9 data vs official (62 chapters) — used before migration
export function diffMaharashtra09(){
  const legacy = LEGACY_CONCEPTS.filter(c=> (c.curriculumPaths||[]).some(p=> p.startsWith("maharashtra.9.")));
  return {
    legacy_count: legacy.length,
    verified_count: 62,
    legacy_ids: legacy.map(c=> c.conceptId).sort(),
    // No duplicates expected after 62 import (checked via python)
  };
}
