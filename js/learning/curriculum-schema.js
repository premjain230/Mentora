/**
 * Curriculum Schema V1 — versioned concept model
 */
export const CURRICULUM_MODEL_VERSION = 1;

const ID_RE = /^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/; // e.g. math.rational_numbers , science.physics.motion

export function isValidConceptId(id){
  return typeof id==="string" && id.length>=3 && id.length<=80 && ID_RE.test(id);
}
export function isValidSubject(s){ return typeof s==="string" && s.length>=2 && s.length<=40; }
export function isValidTopic(t){ return typeof t==="string" && t.length>=2 && t.length<=60; }

export function validateConcept(c, allIds){
  const errors=[];
  if(!c || typeof c==="object"===false) return ["concept must be object"];
  if(!isValidConceptId(c.conceptId)) errors.push("conceptId invalid: "+c.conceptId);
  if(!isValidSubject(c.subject)) errors.push("subject invalid");
  if(!isValidTopic(c.topic)) errors.push("topic invalid");
  if(typeof c.name!=="string" || !c.name.trim()) errors.push("name required");
  if(typeof c.difficulty!=="number" || c.difficulty<0 || c.difficulty>1) errors.push("difficulty 0..1");
  if(!Array.isArray(c.prerequisites)) errors.push("prerequisites must be array");
  else {
    for(const p of c.prerequisites){
      if(p===c.conceptId) errors.push("self-prerequisite: "+p);
      if(allIds && !allIds.has(p)) errors.push("missing prerequisite: "+p);
    }
    if(new Set(c.prerequisites).size !== c.prerequisites.length) errors.push("duplicate prerequisites");
  }
  if(!Array.isArray(c.relatedConcepts)) errors.push("relatedConcepts must be array");
  else {
    for(const r of c.relatedConcepts){
      if(r===c.conceptId) errors.push("self-related: "+r);
      if(allIds && !allIds.has(r)) errors.push("missing related: "+r);
    }
  }
  if(!Array.isArray(c.tags)) errors.push("tags must be array");
  if(c.version!==CURRICULUM_MODEL_VERSION) errors.push("version must be 1");
  return errors;
}

export function createConceptV1(overrides){
  return {
    conceptId: String(overrides.conceptId||""),
    subject: String(overrides.subject||""),
    topic: String(overrides.topic||""),
    name: String(overrides.name||""),
    description: String(overrides.description||""),
    difficulty: Math.max(0,Math.min(1, Number(overrides.difficulty)||0.5)),
    prerequisites: Array.isArray(overrides.prerequisites)? [...overrides.prerequisites]:[],
    relatedConcepts: Array.isArray(overrides.relatedConcepts)? [...overrides.relatedConcepts]:[],
    tags: Array.isArray(overrides.tags)? [...overrides.tags]:[],
    curriculumPaths: Array.isArray(overrides.curriculumPaths)? [...overrides.curriculumPaths]:[],
    version: CURRICULUM_MODEL_VERSION,
  };
}
