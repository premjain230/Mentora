/**
 * Curriculum Dataset V1 seed — Math 7 + Science 15 concepts
 * IDs: math.* and science.physics/chemistry/biology.*
 */
import { createConceptV1 } from "./curriculum-schema.js";

export const CURRICULUM_CONCEPTS = [
  // Cleared per user request — awaiting guided curriculum. Arena engine stays intact.
];

// Alias map for backward compatibility with old IDs (mathematics_algebra etc)
export const CONCEPT_ALIASES = {
  "mathematics_algebra": "math.algebraic_expressions",
  "mathematics_algebra_linear": "math.linear_equations",
  "mathematics_geometry": "math.sets",
  "physics_kinematics": "science.physics.motion",
  "physics_laws_of_motion": "science.physics.force",
  "chemistry_atomic_structure": "science.chemistry.atoms",
  "chemistry_chemical_bonding": "science.chemistry.atoms",
  "biology_cell_biology": "science.biology.cell",
  "biology_genetics": "science.biology.tissues",
};
export function resolveConceptId(id){ return CONCEPT_ALIASES[id] || id; }