"use strict";

/**
 * Pure helpers and server-authoritative logic for Quiz Sessions.
 *
 * Sessions live in users/{uid}/quizSessions/{sessionId} (Admin SDK only;
 * client rules deny direct access).
 *
 * Security guarantees:
 * - Answer keys are stripped before questions reach the browser.
 * - Choices and scores are verified server-side.
 * - Out-of-order, duplicate, out-of-range, and post-completion submissions are rejected.
 * - Completed sessions replay outcomes idempotently.
 * - Verified attempts map to users/{uid}/quizAttempts and the mastery pipeline.
 */

const crypto = require("crypto");

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEFAULT_QUIZ_SIZE = 10;
const MAX_QUIZ_QUESTIONS = 25;
const MAX_QUESTION_CHARS = 1200;
const MAX_OPTION_CHARS = 500;
const MAX_EXPLANATION_CHARS = 1000;
const PASSING_THRESHOLD = 0.6; // 60% accuracy to pass

/**
 * Centralized server-authoritative Standard Question Bank.
 * Derived from authored curriculum seeds for CBSE, State Board & Foundation.
 */
const BANK = {
  Physics: {
    Kinematics: [
      { q: "What is the SI unit of velocity?", options: ["m/s", "m/s²", "kg·m/s", "Newton"], answer: 0, explanation: "Velocity is displacement per unit time, so its SI unit is meters per second (m/s)." },
      { q: "A body moving with constant velocity has zero:", options: ["Speed", "Displacement", "Acceleration", "Distance"], answer: 2, explanation: "Acceleration is the time rate of change of velocity. If velocity is constant, acceleration is zero." },
      { q: "Distance covered per unit time is called:", options: ["Velocity", "Speed", "Acceleration", "Momentum"], answer: 1, explanation: "Speed is a scalar quantity defined as the total distance covered per unit time." },
      { q: "The slope of a displacement-time graph gives:", options: ["Acceleration", "Velocity", "Force", "Energy"], answer: 1, explanation: "Slope = dx/dt, which represents instantaneous velocity." },
      { q: "If a car decelerates uniformly, its acceleration is:", options: ["Positive", "Zero", "Negative", "Infinite"], answer: 2, explanation: "Deceleration (retardation) is acceleration in the direction opposite to velocity, represented as negative." },
      { q: "Free fall acceleration on Earth is approximately:", options: ["8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "6.6 m/s²"], answer: 1, explanation: "Standard acceleration due to Earth's gravity at sea level is approximately 9.8 m/s²." },
      { q: "Which equation relates v, u, a, t?", options: ["v = u + at", "v = u - at²", "v² = u + 2as", "v = ut²"], answer: 0, explanation: "The first equation of uniform linear motion is v = u + at." },
      { q: "A scalar quantity has:", options: ["Magnitude and direction", "Only direction", "Only magnitude", "Neither"], answer: 2, explanation: "Scalars possess only magnitude without a specified spatial direction." },
      { q: "The area under a velocity-time graph gives:", options: ["Acceleration", "Displacement", "Force", "Speed"], answer: 1, explanation: "Integrating velocity with respect to time (∫ v dt) yields displacement." },
      { q: "Uniform acceleration means acceleration is:", options: ["Changing", "Zero", "Constant", "Random"], answer: 2, explanation: "Uniform acceleration implies the rate of change of velocity remains constant over time." },
      { q: "Which is a vector quantity?", options: ["Mass", "Speed", "Displacement", "Time"], answer: 2, explanation: "Displacement specifies both magnitude and direction from initial to final position." },
      { q: "Negative acceleration is also called:", options: ["Retardation", "Velocity", "Momentum", "Inertia"], answer: 0, explanation: "Negative acceleration opposed to motion is termed retardation or deceleration." },
    ],
    "Laws of Motion": [
      { q: "Newton's First Law is also called the law of:", options: ["Inertia", "Gravitation", "Energy", "Motion"], answer: 0, explanation: "Newton's First Law defines inertia — an object's resistance to change in its state of rest or uniform motion." },
      { q: "F = ma represents Newton's:", options: ["First Law", "Second Law", "Third Law", "Zeroth Law"], answer: 1, explanation: "The net external force equals the time rate of change of momentum: F = dp/dt = ma." },
      { q: "Every action has an equal and opposite reaction — this is Newton's:", options: ["First Law", "Second Law", "Third Law", "None"], answer: 2, explanation: "Newton's Third Law states forces always occur in matched action-reaction pairs." },
      { q: "SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1, explanation: "The SI unit of force is the Newton (N = kg·m/s²)." },
      { q: "Momentum is the product of:", options: ["Mass and velocity", "Mass and acceleration", "Force and time", "Force and distance"], answer: 0, explanation: "Linear momentum p is defined as the product of mass and velocity (p = mv)." },
      { q: "An object at rest stays at rest unless acted upon by:", options: ["Gravity only", "An external force", "Friction only", "Time"], answer: 1, explanation: "A net external unbalanced force is required to alter an object's inertial state." },
      { q: "The law of conservation of momentum applies to:", options: ["Open systems only", "Isolated systems", "Rotating bodies only", "None"], answer: 1, explanation: "When the net external force on an isolated system is zero, total momentum is conserved." },
      { q: "Friction acts in a direction:", options: ["Same as motion", "Opposite to motion", "Perpendicular to motion", "Random"], answer: 1, explanation: "Frictional resistance always opposes the relative impending or actual motion of contacting surfaces." },
      { q: "Impulse equals change in:", options: ["Velocity", "Momentum", "Force", "Mass"], answer: 1, explanation: "Impulse J = ∫ F dt = Δp (Impulse-Momentum Theorem)." },
      { q: "Heavier objects fall faster than lighter ones in vacuum:", options: ["True", "False", "Depends on shape", "Depends on color"], answer: 1, explanation: "In a vacuum without air resistance, all bodies experience identical gravitational acceleration g." },
    ],
  },
  Chemistry: {
    "Atomic Structure": [
      { q: "The nucleus of an atom contains:", options: ["Electrons only", "Protons and neutrons", "Protons only", "Neutrons only"], answer: 1, explanation: "The dense atomic nucleus is composed of nucleons (protons and neutrons)." },
      { q: "The charge on an electron is:", options: ["Positive", "Negative", "Neutral", "Variable"], answer: 1, explanation: "Electrons carry an elementary negative electrical charge (-1.602 × 10⁻¹⁹ C)." },
      { q: "Isotopes have the same number of:", options: ["Neutrons", "Protons", "Electrons and neutrons", "Mass number"], answer: 1, explanation: "Isotopes are nuclides of the same element possessing identical atomic numbers (protons) but differing neutron counts." },
      { q: "Atomic number equals the number of:", options: ["Neutrons", "Protons", "Protons + neutrons", "Electrons + neutrons"], answer: 1, explanation: "Atomic number (Z) is defined as the number of protons in an atomic nucleus." },
      { q: "Which subatomic particle has negligible mass?", options: ["Proton", "Neutron", "Electron", "Nucleus"], answer: 2, explanation: "The mass of an electron (~9.109 × 10⁻³¹ kg) is roughly 1/1836th of a proton." },
      { q: "The maximum electrons in the K-shell is:", options: ["2", "8", "18", "32"], answer: 0, explanation: "By the 2n² rule, the first shell (n = 1) can accommodate 2(1)² = 2 electrons." },
      { q: "Who proposed the planetary model of the atom?", options: ["Dalton", "Bohr", "Thomson", "Rutherford"], answer: 1, explanation: "Niels Bohr developed the quantized planetary orbital model of the atom." },
      { q: "An ion with a negative charge is called:", options: ["Cation", "Anion", "Isotope", "Radical"], answer: 1, explanation: "An anion forms when a neutral atom gains electrons, acquiring a net negative charge." },
      { q: "Which particle was discovered using the gold foil experiment?", options: ["Electron", "Neutron", "Nucleus", "Photon"], answer: 2, explanation: "Rutherford's alpha-particle scattering experiment revealed the central atomic nucleus." },
      { q: "Mass number = protons +", options: ["Electrons", "Neutrons", "Ions", "Isotopes"], answer: 1, explanation: "Mass number A is the total count of nucleons (protons + neutrons)." },
    ],
    "Chemical Bonding": [
      { q: "Ionic bonds form by transfer of:", options: ["Neutrons", "Protons", "Electrons", "Photons"], answer: 2, explanation: "Ionic bonds arise from electrostatic attraction following valence electron transfer." },
      { q: "A covalent bond involves:", options: ["Sharing of electrons", "Transfer of electrons", "Loss of protons", "Gain of neutrons"], answer: 0, explanation: "Covalent bonds form through the mutual sharing of electron pairs between atoms." },
      { q: "Water (H2O) has what type of bond?", options: ["Ionic", "Covalent", "Metallic", "Hydrogen only"], answer: 1, explanation: "The H-O bonds in water molecules are polar covalent bonds." },
      { q: "NaCl is an example of a:", options: ["Covalent compound", "Ionic compound", "Metallic compound", "Network solid"], answer: 1, explanation: "Sodium chloride forms an ionic lattice between Na⁺ and Cl⁻ ions." },
      { q: "A double bond consists of how many shared electron pairs?", options: ["1", "2", "3", "4"], answer: 1, explanation: "A double covalent bond consists of two shared electron pairs (4 electrons total)." },
      { q: "Metallic bonding involves a 'sea' of:", options: ["Protons", "Neutrons", "Electrons", "Ions only"], answer: 2, explanation: "Metallic bonds are formed by delocalized valence electrons moving among fixed cations." },
      { q: "Which element commonly forms hydrogen bonds with hydrogen?", options: ["Carbon", "Oxygen", "Sulfur", "Sodium"], answer: 1, explanation: "Highly electronegative small atoms (N, O, F) form strong hydrogen bonds." },
      { q: "The octet rule refers to atoms wanting:", options: ["2 electrons", "8 valence electrons", "8 protons", "8 neutrons"], answer: 1, explanation: "Atoms typically react to achieve a stable octet (8 valence electrons) resembling noble gases." },
    ],
  },
  Biology: {
    "Cell Biology": [
      { q: "The powerhouse of the cell is the:", options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"], answer: 1, explanation: "Mitochondria generate the majority of cellular adenosine triphosphate (ATP)." },
      { q: "Which organelle synthesizes proteins?", options: ["Ribosome", "Lysosome", "Vacuole", "Nucleolus"], answer: 0, explanation: "Ribosomes translate messenger RNA transcripts into polypeptide protein chains." },
      { q: "The cell membrane is mainly composed of:", options: ["Cellulose", "Phospholipids", "Chitin", "Starch"], answer: 1, explanation: "Biological membranes are amphipathic phospholipid bilayers with embedded proteins." },
      { q: "DNA is found primarily in the:", options: ["Cytoplasm", "Nucleus", "Mitochondria", "Cell wall"], answer: 1, explanation: "In eukaryotic cells, genomic DNA is housed in the membrane-bound nucleus." },
      { q: "Plant cells, unlike animal cells, have a:", options: ["Nucleus", "Cell wall", "Mitochondria", "Cell membrane"], answer: 1, explanation: "Plant cells possess a rigid outer cellulose cell wall providing structural support." },
      { q: "Which organelle is responsible for photosynthesis?", options: ["Chloroplast", "Mitochondria", "Nucleus", "Ribosome"], answer: 0, explanation: "Chloroplasts contain chlorophyll pigments that harvest light energy." },
      { q: "Lysosomes are known as the cell's:", options: ["Powerhouse", "Suicide bags", "Control center", "Storage units"], answer: 1, explanation: "Lysosomes contain hydrolytic enzymes capable of autophagic cellular digestion." },
      { q: "The process of cell division in somatic cells is called:", options: ["Meiosis", "Mitosis", "Osmosis", "Diffusion"], answer: 1, explanation: "Mitosis produces two genetically identical daughter cells for growth and repair." },
      { q: "Which structure controls what enters and exits the cell?", options: ["Cell wall", "Cell membrane", "Nucleus", "Cytoplasm"], answer: 1, explanation: "The selectively permeable plasma membrane regulates molecular transport." },
      { q: "Ribosomes are found:", options: ["Only in nucleus", "Free in cytoplasm or on ER", "Only in mitochondria", "Only in chloroplasts"], answer: 1, explanation: "Ribosomes reside freely in the cytosol or bound to the rough endoplasmic reticulum." },
    ],
    Genetics: [
      { q: "The basic unit of heredity is called a:", options: ["Chromosome", "Gene", "Allele", "Genome"], answer: 1, explanation: "A gene is a functional nucleotide sequence encoding a discrete heritable trait or protein." },
      { q: "Humans typically have how many chromosomes?", options: ["44", "46", "48", "23"], answer: 1, explanation: "Human somatic cells typically contain 46 chromosomes (23 homologous pairs)." },
      { q: "A cross between two heterozygous parents gives what ratio (Mendel)?", options: ["1:1", "3:1", "9:3:3:1", "1:2:1"], answer: 1, explanation: "A monohybrid cross between Aa parents yields a 3:1 dominant to recessive phenotypic ratio." },
      { q: "DNA stands for:", options: ["Deoxyribonucleic acid", "Dinucleic acid", "Diribose acid", "Deoxy nuclear acid"], answer: 0, explanation: "DNA stands for Deoxyribonucleic acid." },
      { q: "An organism's genetic makeup is its:", options: ["Phenotype", "Genotype", "Karyotype", "Allele"], answer: 1, explanation: "Genotype represents the complete allele composition; phenotype is the observable manifestation." },
      { q: "Dominant alleles are represented by:", options: ["Lowercase letters", "Uppercase letters", "Numbers", "Symbols only"], answer: 1, explanation: "By genetic convention, dominant alleles are indicated by uppercase letters." },
      { q: "Sex chromosomes in humans are:", options: ["XX and XY", "AA and BB", "XY only", "ZZ and ZW"], answer: 0, explanation: "Human sex determination is chromosomal: XX specifies female, XY specifies male." },
      { q: "A change in DNA sequence is called a:", options: ["Mutation", "Mitosis", "Meiosis", "Replication"], answer: 0, explanation: "A mutation is a permanent alteration in the nucleotide sequence of a genome." },
    ],
  },
  Mathematics: {
    Algebra: [
      { q: "Solve: 2x + 4 = 10. x =", options: ["2", "3", "4", "5"], answer: 1, explanation: "2x = 10 - 4 = 6; x = 6/2 = 3." },
      { q: "The value of (a+b)² is:", options: ["a²+b²", "a²+2ab+b²", "a²-b²", "2ab"], answer: 1, explanation: "(a+b)(a+b) = a² + ab + ba + b² = a² + 2ab + b²." },
      { q: "If x² = 49, x =", options: ["±7", "7 only", "-7 only", "49"], answer: 0, explanation: "Taking the square root of both sides gives x = +7 or x = -7 (±7)." },
      { q: "The roots of x² - 5x + 6 = 0 are:", options: ["2,3", "1,6", "-2,-3", "2,-3"], answer: 0, explanation: "(x - 2)(x - 3) = 0, so x = 2 or x = 3." },
      { q: "Simplify: 3x + 2x", options: ["5x", "6x", "x", "5x²"], answer: 0, explanation: "Combining like algebraic terms: (3 + 2)x = 5x." },
      { q: "The degree of polynomial 4x³+2x-1 is:", options: ["1", "2", "3", "4"], answer: 2, explanation: "The degree is the highest exponent of the variable, which is 3." },
      { q: "If f(x)=2x+1, f(3) =", options: ["5", "6", "7", "8"], answer: 2, explanation: "f(3) = 2(3) + 1 = 6 + 1 = 7." },
      { q: "A linear equation in one variable has degree:", options: ["0", "1", "2", "Variable"], answer: 1, explanation: "Linear polynomials have degree 1 (highest power of x is 1)." },
    ],
    Trigonometry: [
      { q: "sin(90°) =", options: ["0", "1", "-1", "Undefined"], answer: 1, explanation: "On the unit circle, the y-coordinate at 90° (π/2 radians) is 1." },
      { q: "cos(0°) =", options: ["0", "1", "-1", "Undefined"], answer: 1, explanation: "On the unit circle, the x-coordinate at 0° is 1." },
      { q: "tan(45°) =", options: ["0", "1", "√3", "Undefined"], answer: 1, explanation: "tan(45°) = sin(45°)/cos(45°) = (1/√2)/(1/√2) = 1." },
      { q: "sin²θ + cos²θ =", options: ["0", "1", "2", "tan θ"], answer: 1, explanation: "The fundamental Pythagorean trigonometric identity states sin²θ + cos²θ = 1." },
      { q: "The value of sin(180°) is:", options: ["1", "-1", "0", "Undefined"], answer: 2, explanation: "At 180° on the unit circle, the y-coordinate is 0." },
      { q: "In a right triangle, the longest side is the:", options: ["Adjacent", "Opposite", "Hypotenuse", "Base"], answer: 2, explanation: "The hypotenuse is opposite the 90° angle and is always the longest side." },
      { q: "tan θ = sin θ /", options: ["cos θ", "sec θ", "cot θ", "csc θ"], answer: 0, explanation: "Tangent is defined as the ratio of sine to cosine." },
      { q: "cos(90° - θ) =", options: ["cos θ", "sin θ", "tan θ", "-sin θ"], answer: 1, explanation: "By the co-function identity, cos(90° - θ) = sin θ." },
    ],
  },
};

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function clamp01(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function trimString(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Normalizes questions into server-canonical structure.
 * Supports:
 * - Numerical answers (0..3) from BANK -> "A".."D"
 * - Letter answers ("A".."D") from AI generation
 */
function normalizeQuizQuestions(rawList, maxCount = DEFAULT_QUIZ_SIZE) {
  const list = Array.isArray(rawList)
    ? rawList
    : Array.isArray(rawList?.questions)
      ? rawList.questions
      : [];
  const limit = Math.max(1, Math.min(MAX_QUIZ_QUESTIONS, Number(maxCount) || DEFAULT_QUIZ_SIZE));
  const questions = [];

  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const q = trimString(item.q ?? item.question, MAX_QUESTION_CHARS);
    if (!q) continue;

    const options = Array.isArray(item.options)
      ? item.options
          .map((opt) => trimString(opt, MAX_OPTION_CHARS))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    if (options.length < 2) continue;

    let answer = "";
    if (typeof item.answer === "number" && Number.isInteger(item.answer)) {
      if (item.answer >= 0 && item.answer < options.length) {
        answer = String.fromCharCode(65 + item.answer);
      }
    } else if (typeof item.answer === "string") {
      const clean = item.answer.trim().charAt(0).toUpperCase();
      if ("ABCD".includes(clean) && "ABCD".indexOf(clean) < options.length) {
        answer = clean;
      }
    }
    if (!answer) continue;

    questions.push({
      q,
      options,
      answer, // Canonical "A", "B", "C", "D"
      explanation: trimString(item.explanation, MAX_EXPLANATION_CHARS),
    });

    if (questions.length >= limit) break;
  }
  return questions;
}

/**
 * Strips answer keys and explanations before questions reach the browser.
 */
function publicQuizQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((q, idx) => ({
    id: `q_${idx}`,
    index: idx,
    q: q.q,
    options: q.options,
  }));
}

/**
 * Normalizes a student's answer choice into a 0-based integer index.
 * Supports:
 * - Integer choice: 0, 1, 2, 3
 * - Letter choice: "A", "B", "C", "D" -> 0, 1, 2, 3
 */
function normalizeChoice(choice, optionCount) {
  let idx = -1;
  if (typeof choice === "number" && Number.isInteger(choice)) {
    idx = choice;
  } else if (typeof choice === "string") {
    const clean = choice.trim().toUpperCase();
    if (clean.length === 1 && "ABCD".includes(clean)) {
      idx = clean.charCodeAt(0) - 65;
    } else {
      const n = Number(clean);
      if (Number.isInteger(n)) idx = n;
    }
  }
  if (idx < 0 || idx >= optionCount) {
    throw httpError(400, "Answer choice is out of range.");
  }
  return idx;
}

function isCorrectChoice(question, choiceIdx) {
  if (!question || typeof choiceIdx !== "number") return false;
  const letter = String.fromCharCode(65 + choiceIdx);
  return letter === question.answer;
}

function toMillis(value) {
  if (value == null) return null;
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = value instanceof Date ? value.getTime() : Number(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Validates session ownership, lifecycle state, and freshness.
 */
function assertUsableQuizSession(session, { uid, now = Date.now(), requireComplete = false } = {}) {
  if (!session) throw httpError(404, "Quiz session not found.");
  if (session.uid !== uid) throw httpError(403, "Quiz session belongs to another user.");
  if (session.status === "completed") throw httpError(409, "Quiz already completed.");
  if (session.status !== "active") throw httpError(409, "Quiz session is not active.");

  const expiresAt = toMillis(session.expiresAt);
  if (expiresAt != null && expiresAt <= now) throw httpError(410, "Quiz session expired.");

  const questions = Array.isArray(session.questions) ? session.questions : [];
  const answers = Array.isArray(session.answers) ? session.answers : [];
  if (!questions.length) throw httpError(409, "Quiz session has no questions.");

  if (requireComplete && answers.length !== questions.length) {
    throw httpError(400, "Answer every question before finishing.");
  }

  return { questions, answers };
}

/**
 * Computes verified score exclusively from server question answer keys.
 */
function scoreQuizAnswers(questions, answers) {
  const qs = Array.isArray(questions) ? questions : [];
  const as = Array.isArray(answers) ? answers : [];

  if (!qs.length) throw httpError(409, "Quiz session has no questions.");
  if (as.length !== qs.length) throw httpError(400, "Answer every question before finishing.");

  const seen = new Set();
  let correct = 0;

  for (const item of as) {
    if (!item || typeof item !== "object") throw httpError(400, "Invalid answer record.");
    const index = Number(item.index);
    if (!Number.isInteger(index) || index < 0 || index >= qs.length) {
      throw httpError(400, "Answer index is out of range.");
    }
    if (seen.has(index)) throw httpError(400, "Duplicate answer submission.");
    seen.add(index);

    const question = qs[index];
    if (item.mode === "written" || (item.choice == null && typeof item.userAnswer === "string")) {
      if (item.correct === true) correct++;
      else if (item.partial === true) correct += 0.5;
    } else {
      const choice = normalizeChoice(item.choice, question.options.length);
      if (isCorrectChoice(question, choice)) correct++;
    }
  }

  const total = qs.length;
  const incorrect = total - correct;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = percentage >= Math.round(PASSING_THRESHOLD * 100);

  return {
    correct,
    incorrect,
    total,
    score: correct,
    maxScore: total,
    percentage,
    passed,
    accuracy: total > 0 ? clamp01(correct / total) : 0,
  };
}

/**
 * Maps subject + topic to canonical curriculum conceptId in LearningAllied registry.
 */
function resolveQuizConceptId(subject, topic) {
  const sub = String(subject || "").toLowerCase();
  const top = String(topic || "").toLowerCase();

  // Maharashtra State Board & Balbharati mapping
  if (sub.includes("science") || sub.includes("maharashtra")) {
    if (top.includes("law") || top.includes("motion") || top.includes("kinemat")) return "maharashtra.9.science1.laws_of_motion";
    if (top.includes("work") || top.includes("energy")) return "maharashtra.9.science1.work_and_energy";
    if (top.includes("current") || top.includes("electric")) return "maharashtra.9.science1.current_electricity";
    if (top.includes("acid") || top.includes("base")) return "maharashtra.9.science1.acids_bases_and_salts";
    if (top.includes("chemical") || top.includes("reaction")) return "maharashtra.10.science.chemical_reactions";
    if (top.includes("refract") || top.includes("lens")) return "maharashtra.10.science.refraction";
    if (top.includes("mirror") || top.includes("reflect")) return "maharashtra.9.science2.reflection_of_light";
    if (top.includes("plant") || top.includes("classif")) return "maharashtra.9.science2.classification_of_plants";
    if (top.includes("ecosystem") || top.includes("flow")) return "maharashtra.9.science2.energy_flow_in_an_ecosystem";
    if (top.includes("cell")) return "maharashtra.9.science2.life_processes_in_living_organisms";
    if (top.includes("heredity") || top.includes("gene")) return "maharashtra.9.science2.heredity_and_variation";
  }

  if (sub.includes("phys")) {
    if (top.includes("kinemat") || top.includes("motion in a straight")) return "jee.main.physics.kinematics.projectile_motion";
    if (top.includes("law") || top.includes("newton") || top.includes("force")) return "jee.main.physics.laws_of_motion.friction";
  }
  if (sub.includes("chem")) {
    if (top.includes("atom") || top.includes("bohr")) return "jee.main.chemistry.atomic_structure.bohr_model";
    if (top.includes("bond") || top.includes("covalent") || top.includes("ionic")) return "jee.main.chemistry.chemical_bonding.hybridization";
  }
  if (sub.includes("bio")) {
    if (top.includes("cell") || top.includes("mitochondria")) return "neet.biology.cell_structure.organelles";
    if (top.includes("gene") || top.includes("mendel") || top.includes("dna")) return "neet.biology.genetics.mendelian_principles";
  }
  if (sub.includes("math")) {
    if (top.includes("algeb") || top.includes("poly") || top.includes("quadratic")) return "cbse.10.mathematics.polynomials.quadratic";
    if (top.includes("trig")) return "cbse.10.mathematics.trigonometry.identities";
  }

  return null;
}

function newQuizSessionId() {
  return crypto.randomUUID();
}

module.exports = {
  BANK,
  SESSION_TTL_MS,
  DEFAULT_QUIZ_SIZE,
  MAX_QUIZ_QUESTIONS,
  PASSING_THRESHOLD,
  normalizeQuizQuestions,
  publicQuizQuestions,
  normalizeChoice,
  isCorrectChoice,
  assertUsableQuizSession,
  scoreQuizAnswers,
  resolveQuizConceptId,
  newQuizSessionId,
  clamp01,
};
