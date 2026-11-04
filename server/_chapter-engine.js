// server/_chapter-engine.js
// Curriculum-grounded concept decomposition and chapter overview engine for Learning Allied Understand experience.
// Deconstructs textbook chapters into coherent, sequenced sub-concepts with learning objectives,
// estimated durations, visual hints, and pedagogical pathways.

const { getConcept, getPrerequisiteInfo } = require("./_curriculum");
const { getCrossSubjectPrerequisites } = require("./_learn-adaptive");

/**
 * Curated concept decompositions for flagship curriculum chapters across CBSE, Maharashtra, JEE, and NEET.
 */
const CURATED_CONCEPT_DECOMPOSITIONS = {
  // CBSE Class 10 Science — Electricity
  "cbse.10.science.electricity": {
    chapterSummary: "Electricity explores electrical charge, potential difference, Ohm's law, resistor networks, the thermal effects of current, and commercial electrical power.",
    learningObjectives: [
      "Understand electric current as the rate of flow of electric charges in a closed circuit.",
      "Apply the relationship between electric potential difference, work done, and charge (V = W / Q).",
      "Verify and calculate with Ohm's Law (V = I * R) and analyze factors affecting electrical resistance.",
      "Solve equivalent resistance and current distribution in series and parallel resistor combinations.",
      "Calculate Joule's heating effect (H = I^2 * R * t) and electric power (P = V * I = I^2 * R = V^2 / R)."
    ],
    estimatedMinutes: 50,
    concepts: [
      {
        id: "current_and_circuit",
        title: "Electric Charge, Current and Closed Circuits",
        description: "Charge carriers, direction of conventional current versus electron flow, and continuous closed conducting paths.",
        learningObjectives: "Define electric current (I = Q / t), SI units (Ampere, Coulomb), and circuit continuity.",
        estimatedMinutes: 8,
        visualType: "circuit",
        practiceType: "conceptual"
      },
      {
        id: "potential_difference",
        title: "Electric Potential and Potential Difference",
        description: "The work required to move a unit positive charge between two points in an electrostatic field.",
        learningObjectives: "Apply V = W / Q and interpret battery emf as the chemical driver of charge movement.",
        estimatedMinutes: 8,
        visualType: "circuit",
        practiceType: "numerical"
      },
      {
        id: "ohms_law_resistance",
        title: "Ohm's Law, Resistance and Resistivity",
        description: "Linear V-I relationship for ohmic conductors, definition of resistance, and material resistivity (R = rho * l / A).",
        learningObjectives: "Calculate current using Ohm's Law and predict resistance changes when wire geometry varies.",
        estimatedMinutes: 10,
        visualType: "graph",
        practiceType: "numerical"
      },
      {
        id: "resistor_combinations",
        title: "Resistors in Series and Parallel Networks",
        description: "Series current conservation versus parallel voltage conservation; total equivalent resistance derivations.",
        learningObjectives: "Derive and solve compound resistor circuits using R_s = sum(R_i) and 1/R_p = sum(1/R_i).",
        estimatedMinutes: 12,
        visualType: "circuit",
        practiceType: "problem_solving"
      },
      {
        id: "heating_effect_and_power",
        title: "Heating Effect of Current (Joule's Law) and Electric Power",
        description: "Dissipation of electrical energy as thermal energy in resistive elements and commercial power ratings in kilowatt-hours.",
        learningObjectives: "Calculate electrical energy consumed, power dissipation in household appliances, and safety fuse sizing.",
        estimatedMinutes: 12,
        visualType: "transform",
        practiceType: "application"
      }
    ]
  },

  // CBSE Class 9 Science — Work and Energy
  "cbse.9.science.work_energy_and_simple_machines": {
    chapterSummary: "Work and Energy formalizes the physical definition of mechanical work, kinetic and potential energy transformations, and the universal law of conservation of energy.",
    learningObjectives: [
      "Distinguish everyday psychological/biological effort from mechanical work (W = F * s * cos theta).",
      "Calculate work done by positive, negative, and zero force-displacement orientations.",
      "Derive and calculate translational kinetic energy (E_k = 1/2 * m * v^2) and gravitational potential energy (E_p = m * g * h).",
      "Demonstrate conservation of mechanical energy for a freely falling object.",
      "Define power as the rate of work done (P = W / t) and understand commercial energy units (kWh)."
    ],
    estimatedMinutes: 45,
    concepts: [
      {
        id: "scientific_concept_of_work",
        title: "The Scientific Meaning of Mechanical Work",
        description: "Why pushing an immovable wall produces zero physical work despite human fatigue.",
        learningObjectives: "State conditions for work: non-zero net force and non-zero displacement in the line of force.",
        estimatedMinutes: 8,
        visualType: "force",
        practiceType: "conceptual"
      },
      {
        id: "work_sign_and_magnitude",
        title: "Positive, Negative and Zero Work",
        description: "Work done by driving forces versus opposing forces like friction or gravity during upward motion.",
        learningObjectives: "Calculate work done under varying force directions using W = F * s.",
        estimatedMinutes: 8,
        visualType: "force",
        practiceType: "numerical"
      },
      {
        id: "kinetic_energy",
        title: "Kinetic Energy and Work-Energy Theorem",
        description: "Energy possessed by an object due to its motion and its relationship to the net work done.",
        learningObjectives: "Apply E_k = 1/2 * m * v^2 to find velocity changes resulting from applied work.",
        estimatedMinutes: 10,
        visualType: "transform",
        practiceType: "numerical"
      },
      {
        id: "potential_energy",
        title: "Gravitational Potential Energy",
        description: "Energy stored in an object against a conservative force field (gravity) due to its configuration.",
        learningObjectives: "Calculate E_p = m * g * h and explain why potential energy is path-independent.",
        estimatedMinutes: 9,
        visualType: "transform",
        practiceType: "numerical"
      },
      {
        id: "conservation_of_energy_and_power",
        title: "Conservation of Mechanical Energy and Power",
        description: "Exchange of potential and kinetic energy in free fall and oscillation; rate of energy expenditure.",
        learningObjectives: "Prove constant total mechanical energy (E_k + E_p = constant) and calculate power in Watts.",
        estimatedMinutes: 10,
        visualType: "cycle",
        practiceType: "application"
      }
    ]
  },

  // CBSE Class 10 Science — Light: Reflection and Refraction
  "cbse.10.science.light_reflection_and_refraction": {
    chapterSummary: "Ray optics covers rectilinear propagation of light, image formation by spherical mirrors and lenses, Snell's law of refraction, and optical power.",
    learningObjectives: [
      "Construct ray diagrams for concave and convex spherical mirrors.",
      "Apply the mirror formula (1/v + 1/u = 1/f) and magnification equation with sign convention.",
      "Explain the phenomenon of refraction, refractive index, and Snell's Law.",
      "Construct ray diagrams for convex and concave lenses and apply the lens formula.",
      "Calculate the optical power of lenses (P = 1 / f in meters) in Diopters."
    ],
    estimatedMinutes: 50,
    concepts: [
      {
        id: "reflection_and_spherical_mirrors",
        title: "Reflection of Light and Spherical Mirror Geometry",
        description: "Center of curvature, principal axis, focus, and focal length in concave and convex mirrors.",
        learningObjectives: "Trace principal rays and locate real and virtual images formed by curved reflecting surfaces.",
        estimatedMinutes: 10,
        visualType: "ray",
        practiceType: "conceptual"
      },
      {
        id: "mirror_formula_and_magnification",
        title: "Cartesian Sign Convention and the Mirror Equation",
        description: "Quantitative image distance, object distance, and image magnification calculations.",
        learningObjectives: "Use 1/f = 1/v + 1/u and m = -v/u = h_i/h_o with consistent coordinate signs.",
        estimatedMinutes: 10,
        visualType: "ray",
        practiceType: "numerical"
      },
      {
        id: "refraction_and_snells_law",
        title: "Refraction of Light and the Refractive Index",
        description: "Bending of light across optical boundaries due to wave speed differences in media.",
        learningObjectives: "State Snell's Law (sin i / sin r = n_2 / n_1) and relate refractive index to light speed.",
        estimatedMinutes: 10,
        visualType: "ray",
        practiceType: "numerical"
      },
      {
        id: "lenses_and_image_formation",
        title: "Refraction through Spherical Lenses",
        description: "Converging (convex) and diverging (concave) lenses and standard ray constructions.",
        learningObjectives: "Construct ray diagrams and apply the lens formula (1/v - 1/u = 1/f) and magnification (m = v/u).",
        estimatedMinutes: 10,
        visualType: "ray",
        practiceType: "problem_solving"
      },
      {
        id: "power_of_lens",
        title: "Optical Power of a Lens and Corrective Optics",
        description: "The measure of convergence or divergence of light rays by an optical lens.",
        learningObjectives: "Calculate power in Dioptres (P = 1/f) and combine power for optical systems (P = P_1 + P_2).",
        estimatedMinutes: 10,
        visualType: "ray",
        practiceType: "application"
      }
    ]
  },

  // CBSE Class 10 Science — Life Processes
  "cbse.10.science.life_processes": {
    chapterSummary: "Life Processes investigates the fundamental physiological mechanisms sustaining living organisms: autotrophic/heterotrophic nutrition, cellular respiration, transport, and excretion.",
    learningObjectives: [
      "Explain the biochemical stages of photosynthesis and human holozoic nutrition.",
      "Differentiate between aerobic and anaerobic cellular respiration pathways.",
      "Analyze the human circulatory system (double circulation) and plant vascular transport (xylem/phloem).",
      "Trace the structure and function of the human nephron in waste filtration and urine formation."
    ],
    estimatedMinutes: 45,
    concepts: [
      {
        id: "autotrophic_nutrition",
        title: "Autotrophic Nutrition and Photosynthesis",
        description: "Chlorophyll-mediated light absorption, photolysis of water, and carbon dioxide reduction to glucose.",
        learningObjectives: "Identify the equation of photosynthesis, stomatal gas exchange, and chloroplast function.",
        estimatedMinutes: 9,
        visualType: "cycle",
        practiceType: "conceptual"
      },
      {
        id: "human_digestive_system",
        title: "Heterotrophic Nutrition in Humans",
        description: "Ingestion, mechanical breakdown, enzymatic hydrolysis in stomach and duodenum, and villi absorption.",
        learningObjectives: "Trace food transit through the alimentary canal and explain digestive enzyme specificities.",
        estimatedMinutes: 9,
        visualType: "cell",
        practiceType: "application"
      },
      {
        id: "respiration_pathways",
        title: "Cellular Respiration: Aerobic vs. Anaerobic",
        description: "Glycolysis in cytoplasm followed by mitochondrial Krebs cycle or fermentation pathways.",
        learningObjectives: "Compare ATP yields and metabolic by-products of glucose breakdown in muscle, yeast, and mitochondria.",
        estimatedMinutes: 9,
        visualType: "cycle",
        practiceType: "conceptual"
      },
      {
        id: "transport_systems",
        title: "Transportation in Humans and Plants",
        description: "Four-chambered heart double circulation versus transpiration pull and translocation in plants.",
        learningObjectives: "Explain blood pressure, capillary diffusion, xylem water transport, and phloem sugar delivery.",
        estimatedMinutes: 9,
        visualType: "cell",
        practiceType: "problem_solving"
      },
      {
        id: "excretory_mechanisms",
        title: "Excretion and Nephron Filtration",
        description: "Removal of nitrogenous metabolic wastes and osmoregulation by glomerular filtration and tubular reabsorption.",
        learningObjectives: "Explain Bowman's capsule filtration, selective reabsorption, and artificial dialysis principles.",
        estimatedMinutes: 9,
        visualType: "cell",
        practiceType: "application"
      }
    ]
  },

  // Maharashtra Board Class 9 Science 1 — Laws of Motion
  "maharashtra.9.science1.laws_of_motion": {
    chapterSummary: "Laws of Motion explores distance, displacement, speed, velocity, uniform and non-uniform acceleration, Newton's three laws of motion, and conservation of momentum.",
    learningObjectives: [
      "Distinguish scalar distance from vector displacement and speed from instantaneous velocity.",
      "Derive and apply kinematic equations of motion graphically and algebraically.",
      "Understand inertia, momentum (p = mv), and Newton's three laws of motion.",
      "Solve practical collision and recoil problems using the law of conservation of momentum."
    ],
    estimatedMinutes: 45,
    concepts: [
      {
        id: "distance_displacement_velocity",
        title: "Distance, Displacement, Speed and Velocity",
        description: "Vector foundations of linear kinematics and position-time representations.",
        learningObjectives: "Differentiate scalar vs vector quantities and calculate average speed and velocity.",
        estimatedMinutes: 8,
        visualType: "graph",
        practiceType: "conceptual"
      },
      {
        id: "acceleration_kinematic_equations",
        title: "Acceleration and Newton's Equations of Motion",
        description: "Rate of change of velocity; equations v = u + at, s = ut + 1/2*at^2, and v^2 = u^2 + 2as.",
        learningObjectives: "Calculate motion parameters under constant linear acceleration.",
        estimatedMinutes: 10,
        visualType: "graph",
        practiceType: "numerical"
      },
      {
        id: "first_law_and_inertia",
        title: "Newton's First Law of Motion and Inertia",
        description: "Natural state of motion, balanced forces, and inertia of rest, motion, and direction.",
        learningObjectives: "Explain physical phenomena where inertia resists sudden changes in motion.",
        estimatedMinutes: 8,
        visualType: "force",
        practiceType: "conceptual"
      },
      {
        id: "second_law_and_momentum",
        title: "Newton's Second Law: Force and Momentum",
        description: "Rate of change of momentum is proportional to the applied unbalanced force: F = dp/dt = ma.",
        learningObjectives: "Calculate impulse, momentum changes, and force in dynamic interactions.",
        estimatedMinutes: 10,
        visualType: "force",
        practiceType: "numerical"
      },
      {
        id: "third_law_and_momentum_conservation",
        title: "Newton's Third Law and Conservation of Momentum",
        description: "Action-reaction pairs on interacting bodies and isolated system momentum invariance.",
        learningObjectives: "Solve recoil velocity of guns and rocket propulsion using m1*u1 + m2*u2 = m1*v1 + m2*v2.",
        estimatedMinutes: 9,
        visualType: "force",
        practiceType: "problem_solving"
      }
    ]
  }
};

/**
 * Heuristic generator for chapters without manual curated decompositions.
 * Derives 4 consistent, structured sub-concepts based on chapter topic and difficulty.
 */
function generateHeuristicConcepts(concept) {
  const name = concept.name || "Topic";
  const subject = concept.subject || "General Science";
  const diff = concept.difficulty || 0.45;

  let visualType = "diagram";
  const sLower = subject.toLowerCase();
  const nLower = name.toLowerCase();

  if (sLower.includes("physics") || nLower.includes("motion") || nLower.includes("force")) visualType = "force";
  else if (nLower.includes("circuit") || nLower.includes("electric") || nLower.includes("current")) visualType = "circuit";
  else if (nLower.includes("light") || nLower.includes("optics") || nLower.includes("ray") || nLower.includes("refraction")) visualType = "ray";
  else if (nLower.includes("wave") || nLower.includes("sound") || nLower.includes("oscillation")) visualType = "wave";
  else if (sLower.includes("math") || nLower.includes("graph") || nLower.includes("equation") || nLower.includes("geometry")) visualType = "graph";
  else if (sLower.includes("biology") || nLower.includes("cell") || nLower.includes("life") || nLower.includes("organ")) visualType = "cell";
  else if (sLower.includes("chemistry") || nLower.includes("atom") || nLower.includes("bond") || nLower.includes("reaction")) visualType = "atom";

  const estTotalMins = Math.round(35 + diff * 25);
  const conceptMins = Math.round(estTotalMins / 4);

  return {
    chapterSummary: `${name} is an essential chapter in ${subject}. It establishes the core theoretical principles, governing formulas, analytical models, and real-world applications in this domain.`,
    learningObjectives: [
      `Understand foundational terminology, definitions and physical meaning of ${name}.`,
      `Analyze governing relationships, scientific equations and principles in ${name}.`,
      `Apply problem-solving methods and worked techniques to curriculum problems.`,
      `Synthesize conceptual insights and evaluate real-world applications and edge cases.`
    ],
    estimatedMinutes: estTotalMins,
    concepts: [
      {
        id: "foundations_and_definitions",
        title: `Core Principles and Foundations of ${name}`,
        description: `Introductory concepts, fundamental definitions, and initial physical/mathematical model of ${name}.`,
        learningObjectives: `Define key terminology and state the primary laws or theorems governing ${name}.`,
        estimatedMinutes: conceptMins,
        visualType,
        practiceType: "conceptual"
      },
      {
        id: "governing_equations_and_laws",
        title: `Governing Equations, Mechanisms and Rules`,
        description: `Mathematical expressions, derivations, chemical equations, or formal mechanisms that define how ${name} operates.`,
        learningObjectives: `Derive or apply the primary equations and identify relationships between key variables.`,
        estimatedMinutes: conceptMins,
        visualType,
        practiceType: "numerical"
      },
      {
        id: "worked_analysis_and_methods",
        title: `Worked Problem-Solving and Step-by-Step Analysis`,
        description: `Concrete standard examples, case analyses, and problem-solving algorithms for ${name}.`,
        learningObjectives: `Solve multi-step problems and avoid common calculation or algebraic pitfalls.`,
        estimatedMinutes: conceptMins,
        visualType,
        practiceType: "problem_solving"
      },
      {
        id: "applications_and_extensions",
        title: `Real-World Applications, Synthesis and Retention`,
        description: `Practical technology connections, cross-subject linkages, synthesis questions, and comprehensive retention.`,
        learningObjectives: `Evaluate real-world engineering or natural applications and demonstrate independent mastery.`,
        estimatedMinutes: conceptMins,
        visualType,
        practiceType: "application"
      }
    ]
  };
}

/**
 * Returns complete chapter breakdown and syllabus roadmaps.
 */
function getChapterMetadata(conceptId) {
  if (!conceptId) return null;
  let concept = getConcept(conceptId);
  if (!concept) {
    const parts = String(conceptId || "").split(".");
    const rawName = parts[parts.length - 1] || "Chapter";
    const name = rawName.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const subject = parts.length >= 3 ? parts[2].charAt(0).toUpperCase() + parts[2].slice(1) : "General";
    concept = {
      conceptId,
      name,
      subject,
      topic: name,
      difficulty: 0.5,
      prerequisites: [],
    };
  }
  return CURATED_CONCEPT_DECOMPOSITIONS[conceptId] || generateHeuristicConcepts(concept);
}

function getChapterOutline(conceptId, studentState = null) {
  if (!conceptId) return null;
  let concept = getConcept(conceptId);
  if (!concept) {
    const parts = String(conceptId || "").split(".");
    const rawName = parts[parts.length - 1] || "Chapter";
    const name = rawName.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const subject = parts.length >= 3 ? parts[2].charAt(0).toUpperCase() + parts[2].slice(1) : "General";
    concept = {
      conceptId,
      name,
      subject,
      topic: name,
      difficulty: 0.5,
      prerequisites: [],
    };
  }

  const decomposition = CURATED_CONCEPT_DECOMPOSITIONS[conceptId] || generateHeuristicConcepts(concept);
  const prereqs = getPrerequisiteInfo(concept) || [];
  const crossSubjectPrereqs = getCrossSubjectPrerequisites(conceptId) || [];

  // Derive per-concept status from student state
  const hubTopics = (studentState && studentState.hub && studentState.hub.topics) || {};
  const conceptStates = (studentState && studentState.conceptState) || {};
  const chapterData = hubTopics[conceptId] || {};

  const conceptsWithStatus = decomposition.concepts.map((sub, idx) => {
    const subKey = `${conceptId}.${sub.id}`;
    const subState = conceptStates[subKey] || {};
    let status = "not_started";
    let score = null;

    if (subState.calibratedMastery && subState.calibratedMastery.masteryScore != null) {
      score = subState.calibratedMastery.masteryScore;
      if (score >= 0.75) status = "mastered";
      else if (score >= 0.45) status = "in_progress";
      else status = "needs_revision";
    } else if (chapterData.status === "completed" && idx === 0) {
      status = "mastered";
      score = 0.85;
    } else if (chapterData.status === "started" && idx === 0) {
      status = "in_progress";
      score = 0.5;
    }

    return {
      ...sub,
      learningObjectives: Array.isArray(sub.learningObjectives)
        ? sub.learningObjectives
        : [String(sub.learningObjectives || "Understand core principles and mechanisms.")],
      fullId: subKey,
      index: idx + 1,
      status,
      masteryScore: score,
    };
  });

  // Calculate overall chapter progress
  const completedCount = conceptsWithStatus.filter((c) => c.status === "mastered").length;
  const inProgressCount = conceptsWithStatus.filter((c) => c.status === "in_progress").length;
  const totalCount = conceptsWithStatus.length;
  const progressPercent = totalCount > 0 ? Math.round(((completedCount + inProgressCount * 0.4) / totalCount) * 100) : 0;

  // Determine recommended next concept
  let recommendedConcept = conceptsWithStatus.find((c) => c.status === "needs_revision") ||
    conceptsWithStatus.find((c) => c.status === "in_progress") ||
    conceptsWithStatus.find((c) => c.status === "not_started") ||
    conceptsWithStatus[0];

  return {
    chapterId: concept.conceptId,
    conceptId: concept.conceptId,
    name: concept.name,
    title: concept.name,
    subject: concept.subject,
    topic: concept.topic,
    difficulty: concept.difficulty,
    estimatedMinutes: decomposition.estimatedMinutes,
    chapterSummary: decomposition.chapterSummary,
    learningObjectives: decomposition.learningObjectives,
    prerequisites: prereqs.map((p) => {
      const pData = hubTopics[p.conceptId] || {};
      return {
        ...p,
        isMastered: pData.status === "completed",
      };
    }),
    crossSubjectPrerequisites: crossSubjectPrereqs,
    totalConcepts: totalCount,
    completedConcepts: completedCount,
    progressPercent,
    concepts: conceptsWithStatus,
    recommendedConcept: {
      id: recommendedConcept.id,
      fullId: recommendedConcept.fullId,
      title: recommendedConcept.title,
      index: recommendedConcept.index,
    },
    status: progressPercent >= 90 ? "mastered" : progressPercent > 0 ? "in_progress" : "not_started"
  };
}

module.exports = {
  CURATED_CONCEPT_DECOMPOSITIONS,
  getChapterOutline,
  getChapterMetadata,
  generateHeuristicConcepts,
};
