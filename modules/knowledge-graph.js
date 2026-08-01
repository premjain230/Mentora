/**
 * Knowledge Graph Module
 * A lightweight concept graph that suggests the next concept to learn based on
 * mastery and declared prerequisites.
 */

const PREREQUISITES = {
  "Laws of Motion": ["Kinematics"],
  "Chemical Bonding": ["Atomic Structure"],
  Genetics: ["Cell Biology"],
  Trigonometry: ["Algebra"],
  "Calculus": ["Algebra", "Trigonometry"],
  Thermodynamics: ["Kinetics"],
  "Chemical Kinetics": ["Thermodynamics"],
  Optics: ["Laws of Motion"],
  Grammar: ["Parts of Speech"],
};

const LABELS = {
  "Parts of Speech": "Parts of Speech",
  Grammar: "Grammar",
  Kinematics: "Kinematics",
  "Laws of Motion": "Laws of Motion",
  "Atomic Structure": "Atomic Structure",
  "Chemical Bonding": "Chemical Bonding",
  "Cell Biology": "Cell Biology",
  Genetics: "Genetics",
  Algebra: "Algebra",
  Trigonometry: "Trigonometry",
  Calculus: "Calculus",
  Thermodynamics: "Thermodynamics",
  "Chemical Kinetics": "Chemical Kinetics",
  Optics: "Optics",
};

export function getConceptLabel(id) {
  return LABELS[id] || id;
}

export function getPrerequisites(conceptId) {
  return PREREQUISITES[conceptId] || [];
}

export function arePrerequisitesMet(conceptId, conceptMastery = {}) {
  const prereqs = getPrerequisites(conceptId);
  if (prereqs.length === 0) return true;
  return prereqs.every((p) => (Number(conceptMastery[p]) || 0) >= 0.5);
}

/**
 * Suggest the next concepts to learn. Prefers concepts whose prerequisites
 * are mastered and that have not been mastered yet.
 */
export function getNextConcepts(conceptMastery = {}, currentConcept = null, count = 2) {
  const known = new Set(Object.keys(conceptMastery));
  if (currentConcept && !known.has(currentConcept)) known.add(currentConcept);

  const candidates = Object.keys(PREREQUISITES)
    .filter((id) => !known.has(id) || (Number(conceptMastery[id]) || 0) < 0.9)
    .filter((id) => arePrerequisitesMet(id, conceptMastery))
    .map((id) => ({
      id,
      name: getConceptLabel(id),
      mastery: Number(conceptMastery[id]) || 0,
    }))
    .sort((a, b) => a.mastery - b.mastery);

  const picked = candidates.slice(0, count);

  if (picked.length < count) {
    const fallback = Object.keys(conceptMastery)
      .map((id) => ({
        id,
        name: getConceptLabel(id),
        mastery: Number(conceptMastery[id]) || 0,
      }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, count - picked.length);
    return picked.concat(fallback);
  }

  return picked;
}
