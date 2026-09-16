/**
 * Curriculum Graph V1 — pure deterministic helpers
 */
import { CURRICULUM_CONCEPTS, resolveConceptId } from "./curriculum-data.js";
import { validateConcept } from "./curriculum-schema.js";

const byId = new Map(CURRICULUM_CONCEPTS.map(c=>[c.conceptId, c]));
const dependentsMap = new Map();
for(const c of CURRICULUM_CONCEPTS){
  for(const p of c.prerequisites){
    if(!dependentsMap.has(p)) dependentsMap.set(p, []);
    dependentsMap.get(p).push(c.conceptId);
  }
}

export function getConcept(conceptId){ return byId.get(resolveConceptId(conceptId)) || null; }
export function getPrerequisites(conceptId){ const c=getConcept(conceptId); return c? [...c.prerequisites] : []; }
export function getDependents(conceptId){ return [...(dependentsMap.get(resolveConceptId(conceptId))||[])]; }
export function getRelatedConcepts(conceptId){ const c=getConcept(conceptId); return c? [...c.relatedConcepts] : []; }
export function getAncestors(conceptId){
  const visited=new Set(); const stack=[resolveConceptId(conceptId)];
  const ancestors=[];
  while(stack.length){
    const cur=stack.pop();
    const prereqs=getPrerequisites(cur);
    for(const p of prereqs){
      if(!visited.has(p)){ visited.add(p); ancestors.push(p); stack.push(p); }
    }
  }
  return [...new Set(ancestors)];
}
export function getDescendants(conceptId){
  const visited=new Set(); const stack=[resolveConceptId(conceptId)];
  const desc=[];
  while(stack.length){
    const cur=stack.pop();
    const deps=getDependents(cur);
    for(const d of deps){
      if(!visited.has(d)){ visited.add(d); desc.push(d); stack.push(d); }
    }
  }
  return [...new Set(desc)];
}
export function hasPrerequisite(conceptId, prerequisiteId){
  return getAncestors(conceptId).includes(resolveConceptId(prerequisiteId));
}
export function getSubjectConcepts(subject){
  return CURRICULUM_CONCEPTS.filter(c=>c.subject===subject).map(c=>c.conceptId);
}
export function getTopicConcepts(subject, topic){
  return CURRICULUM_CONCEPTS.filter(c=>c.subject===subject && c.topic===topic).map(c=>c.conceptId);
}

export function validateGraph(){
  const errors=[];
  const allIds=new Set(CURRICULUM_CONCEPTS.map(c=>c.conceptId));
  if(allIds.size !== CURRICULUM_CONCEPTS.length) errors.push("duplicate concept IDs");
  for(const c of CURRICULUM_CONCEPTS){
    errors.push(...validateConcept(c, allIds));
  }
  const visiting=new Set(), visited=new Set();
  function dfs(id, path){
    if(visiting.has(id)) { errors.push("circular prerequisite: "+[...path, id].join(" -> ")); return; }
    if(visited.has(id)) return;
    visiting.add(id);
    for(const p of getPrerequisites(id)){
      dfs(p, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for(const c of CURRICULUM_CONCEPTS) dfs(c.conceptId, []);
  return errors;
}

const READINESS_CONFIG = { masteryThreshold:0.60, evidenceThreshold:0.35 };

export function getPrerequisiteReadiness(conceptId, masteryMap){
  const prereqs=getPrerequisites(conceptId);
  return prereqs.map(pid=>{
    const m=masteryMap?.[pid] || masteryMap?.[resolveConceptId(pid)];
    const masteryScore = Number(m?.masteryScore ?? 0);
    const evidenceStrength = Number(m?.evidenceStrength ?? 0);
    const masteryState = m?.masteryState || "unknown";
    const ready = evidenceStrength >= READINESS_CONFIG.evidenceThreshold && masteryScore >= READINESS_CONFIG.masteryThreshold;
    let reason="unknown";
    if(evidenceStrength < READINESS_CONFIG.evidenceThreshold) reason="low_evidence";
    else if(masteryScore < READINESS_CONFIG.masteryThreshold) reason="low_mastery";
    else reason="ready";
    return { conceptId:pid, masteryScore, evidenceStrength, masteryState, ready, reason };
  });
}

export function getPrerequisiteRisks(conceptId, masteryMap){
  return getPrerequisiteReadiness(conceptId, masteryMap).filter(r=>!r.ready).map(r=>({
    conceptId:r.conceptId, masteryScore:r.masteryScore, evidenceStrength:r.evidenceStrength, reason: r.reason==="low_evidence"?"low_evidence": r.reason==="low_mastery"?"low_mastery":"unknown"
  }));
}

export function getLearningPath(targetConceptId, masteryMap){
  const target=resolveConceptId(targetConceptId);
  const ordered=[];
  const visited=new Set();
  function visit(id){
    if(visited.has(id)) return;
    for(const p of getPrerequisites(id)) visit(p);
    visited.add(id);
    if(id!==target) ordered.push(id);
  }
  visit(target);
  const full=[...ordered, target];
  return full.map(cid=>{
    const m=masteryMap?.[cid];
    let status="unknown";
    if(cid===target) status="target";
    else if(!m) status="unknown";
    else if(Number(m.evidenceStrength||0) < 0.35) status="needs_evidence";
    else if(Number(m.masteryScore||0) >=0.60) status="ready";
    else status="needs_learning";
    return { conceptId:cid, status };
  });
}

export function getAdaptiveLearningPath(targetConceptId, masteryMap){
  return getLearningPath(targetConceptId, masteryMap);
}

export function isBlockedByPrerequisites(conceptId, masteryMap){
  const risks=getPrerequisiteRisks(conceptId, masteryMap);
  return risks.map(r=>r.conceptId);
}
