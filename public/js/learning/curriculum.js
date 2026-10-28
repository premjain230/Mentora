/**
 * Learning Allied Learning — Curriculum (Foundation stub)
 * Prompt 1: types + interfaces + TODOs. No content generation yet.
 *
 * Prompt 5+ will populate actual curriculum graphs per exam.
 */

import { CURRICULUM_VERSION } from "./schema.js";
import { createConcept } from "./contracts.js";

export const CurriculumId = Object.freeze({
  JEE: "jee",
  NEET: "neet",
  BOARDS: "boards",
  UPSC: "upsc",
  GENERIC: "generic",
});

/**
 * Build an empty curriculum skeleton for an exam.
 * TODO Prompt 5: replace with Firestore-backed curriculum/ collection fetch.
 */
export function createEmptyCurriculum(exam = CurriculumId.GENERIC) {
  return {
    curriculumVersion: CURRICULUM_VERSION,
    exam: String(exam),
    subjects: [],
    // TODO: populate subjects/topics/concepts from server curriculum document
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validate conceptId format: lower_snake, 3..120 chars
 * Shared rule: Android must use identical regex.
 */
export function isValidConceptId(id) {
  return typeof id === "string" && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id) && id.length >= 3 && id.length <= 120;
}

/**
 * Service stub — interface that both Web and Android implement against.
 * Real implementation (Prompt 5+) reads from curriculum/ Firestore.
 */
export class CurriculumService {
  constructor(db = null) {
    this.db = db;
  }

  /** @returns {Promise<import('./contracts.js').Curriculum|null>} */
  async getCurriculum(exam) {
    // TODO Prompt 5: fetch from curriculum/{exam} via Firestore / API
    void exam;
    return createEmptyCurriculum(exam);
  }

  /** @returns {Promise<import('./contracts.js').Concept|null>} */
  async getConcept(conceptId) {
    // TODO Prompt 5
    void conceptId;
    return null;
  }

  /** List concepts for a topic. TODO Prompt 5 */
  async listConcepts(subject, topic) {
    void subject; void topic;
    return [];
  }
}
