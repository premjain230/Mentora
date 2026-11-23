/**
 * International Tracks Dataset for UAE, Saudi Arabia, Malaysia, Pakistan & Bangladesh.
 * Authentic Ministry frameworks, official specifications, and syllabus grounding.
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const INTL_STAGES: AcademicStage[] = [
  // UAE (AE)
  { id: "ae_stage_gr10", trackId: "ae_moe_national", countryCode: "AE", stageName: "Cycle 3", gradeLabel: "Grade 10 (Advanced Stream)", sortOrder: 10, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "ae_stage_gr12", trackId: "ae_moe_national", countryCode: "AE", stageName: "Cycle 3 Graduation", gradeLabel: "Grade 12 (Advanced Stream)", sortOrder: 12, ageRange: "17-18", verificationStatus: "partially_verified" },

  // Saudi Arabia (SA)
  { id: "sa_stage_masar_y1", trackId: "sa_moe_masarat", countryCode: "SA", stageName: "Common First Year", gradeLabel: "First Secondary Year", sortOrder: 10, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "sa_stage_masar_cs_eng", trackId: "sa_moe_masarat", countryCode: "SA", stageName: "Specialized Track", gradeLabel: "Second & Third Year (CS & Engineering)", sortOrder: 11, ageRange: "16-18", verificationStatus: "partially_verified" },

  // Malaysia (MY)
  { id: "my_stage_form4", trackId: "my_kpm_spm", countryCode: "MY", stageName: "Upper Secondary", gradeLabel: "Form 4 (Tingkatan 4)", sortOrder: 10, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "my_stage_form5", trackId: "my_kpm_spm", countryCode: "MY", stageName: "SPM Examination", gradeLabel: "Form 5 (Tingkatan 5)", sortOrder: 11, ageRange: "16-17", verificationStatus: "partially_verified" },

  // Pakistan (PK)
  { id: "pk_stage_ssc2", trackId: "pk_fbise", countryCode: "PK", stageName: "Secondary School Certificate", gradeLabel: "Class 10 (Matric)", sortOrder: 10, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "pk_stage_hssc2", trackId: "pk_fbise", countryCode: "PK", stageName: "Higher Secondary", gradeLabel: "Class 12 (FSc Pre-Engineering/Medical)", sortOrder: 12, ageRange: "17-18", verificationStatus: "partially_verified" },

  // Bangladesh (BD)
  { id: "bd_stage_ssc", trackId: "bd_nctb", countryCode: "BD", stageName: "Secondary", gradeLabel: "Class 10 (SSC)", sortOrder: 10, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "bd_stage_hsc", trackId: "bd_nctb", countryCode: "BD", stageName: "Higher Secondary", gradeLabel: "Class 12 (HSC)", sortOrder: 12, ageRange: "17-18", verificationStatus: "partially_verified" },
];

export const INTL_SUBJECTS: Subject[] = [
  // UAE
  {
    id: "ae_moe_physics_12",
    gradeId: "ae_stage_gr12",
    trackId: "ae_moe_national",
    countryCode: "AE",
    name: "Physics (Advanced Stream)",
    code: "MOE-PHYS-ADV",
    slug: "uae-physics-advanced-grade-12",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "partially_verified",
    sourceUrl: "https://www.moe.gov.ae",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "MoE term exams and EmSAT physics standardized alignment.",
    chapterCount: 5,
  },

  // Saudi Arabia
  {
    id: "sa_masarat_physics_2",
    gradeId: "sa_stage_masar_cs_eng",
    trackId: "sa_moe_masarat",
    countryCode: "SA",
    name: "Physics 2 (Computer Science & Engineering Pathway)",
    code: "MASAR-PHYS-2",
    slug: "saudi-physics-2-masarat",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "partially_verified",
    sourceUrl: "https://moe.gov.sa",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Semester assessments, laboratory coursework, and Qiyas Tahsili exam alignment.",
    chapterCount: 5,
  },

  // Malaysia
  {
    id: "my_kssm_fizik_f5",
    gradeId: "my_stage_form5",
    trackId: "my_kpm_spm",
    countryCode: "MY",
    name: "Physics (Fizik KSSM Form 5)",
    code: "KPM-4531",
    slug: "physics-kssm-form-5-spm",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "partially_verified",
    sourceUrl: "https://www.moe.gov.my",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "SPM Format: Kertas 1 (40 Objective questions), Kertas 2 (Bahagian A, B, C subjective), Kertas 3 (Practical).",
    chapterCount: 5,
  },

  // Pakistan
  {
    id: "pk_fbise_physics_10",
    gradeId: "pk_stage_ssc2",
    trackId: "pk_fbise",
    countryCode: "PK",
    name: "Physics (SSC-II Class 10)",
    code: "FBISE-PHYS-10",
    slug: "fbise-class-10-physics",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "partially_verified",
    sourceUrl: "https://www.fbise.edu.pk",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Section A (12 MCQs), Section B (Short Questions), Section C (Long Application Questions).",
    chapterCount: 9,
  },

  // Bangladesh
  {
    id: "bd_nctb_physics_10",
    gradeId: "bd_stage_ssc",
    trackId: "bd_nctb",
    countryCode: "BD",
    name: "Physics (SSC Classes 9–10)",
    code: "NCTB-136",
    slug: "nctb-class-10-physics",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "partially_verified",
    sourceUrl: "https://nctb.gov.bd",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Creative Questions (CQ 50 marks) and Multiple Choice Questions (MCQ 25 marks).",
    chapterCount: 14,
  },
];

export const INTL_CHAPTERS: Chapter[] = [
  // UAE MoE Physics
  {
    id: "ae_moe_phys_ch1",
    subjectId: "ae_moe_physics_12",
    number: 1,
    title: "Electric Fields and Potential",
    slug: "electric-fields-and-potential",
    summary: "Coulomb's law, electric field lines for point charges and parallel plates, electric potential difference, capacitors, and energy storage.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Calculate electric field strength E = F / q and potential V = W / q",
      "Analyze uniform electric fields between parallel conducting plates",
      "Apply capacitance formula C = epsilon * (A / d) to dielectric materials",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "partially_verified",
  },

  // Saudi Arabia Masarat
  {
    id: "sa_masarat_phys_ch1",
    subjectId: "sa_masarat_physics_2",
    number: 1,
    title: "Rotational Motion and Equilibrium",
    slug: "rotational-motion-and-equilibrium",
    summary: "Angular displacement, angular velocity, angular acceleration, torque (tau = r * F * sin theta), moment of inertia, center of mass, and conditions for static equilibrium.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Relate linear quantities to angular quantities (v = r * omega, a = r * alpha)",
      "Calculate torque produced by forces applied at various angles",
      "Apply the two conditions of equilibrium: net force = 0 and net torque = 0",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "partially_verified",
  },

  // Malaysia KSSM Physics Form 5
  {
    id: "my_kssm_fizik_ch1",
    subjectId: "my_kssm_fizik_f5",
    number: 1,
    title: "Force and Motion II (Daya dan Gerakan II)",
    slug: "force-and-motion-ii",
    summary: "Resultant force on inclined planes, resolution of forces into orthogonal components, forces in equilibrium, elasticity, and Hooke's Law (F = k * x).",
    estimatedMinutes: 50,
    learningObjectives: [
      "Resolve a single force into perpendicular horizontal and vertical components",
      "Draw triangle of forces for objects in stationary equilibrium",
      "Determine spring constant k from force-extension graphs and calculate elastic potential energy",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "partially_verified",
  },

  // Pakistan FBISE Physics 10
  {
    id: "pk_fbise_phys_ch10",
    subjectId: "pk_fbise_physics_10",
    number: 1,
    title: "Simple Harmonic Motion and Waves (Unit 10)",
    slug: "simple-harmonic-motion-and-waves",
    summary: "Mass-spring system, simple pendulum, restoring force, damping, wave motion, ripple tank experiments, reflection, refraction, and diffraction of waves.",
    estimatedMinutes: 45,
    learningObjectives: [
      "Explain the restoring force in a simple pendulum and derive period T = 2 * pi * sqrt(l / g)",
      "Analyze wave motion in a ripple tank demonstrating diffraction around obstacles",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "partially_verified",
  },

  // Bangladesh NCTB Physics
  {
    id: "bd_nctb_phys_ch2",
    subjectId: "bd_nctb_physics_10",
    number: 2,
    title: "Motion (Chapter 2)",
    slug: "motion",
    summary: "Rest and motion, scalar and vector quantities, distance and displacement, speed and velocity, acceleration and deceleration, equations of uniform acceleration, motion of falling bodies.",
    estimatedMinutes: 45,
    learningObjectives: [
      "Differentiate scalar and vector quantities with real-life motion scenarios",
      "Solve numerical problems using equations of motion (v = u + at, s = ut + 0.5at^2)",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "partially_verified",
  },
];

export const INTL_LESSONS: Lesson[] = [
  {
    id: "ae_moe_phys_ch1_l1",
    chapterId: "ae_moe_phys_ch1",
    subjectId: "ae_moe_physics_12",
    gradeId: "ae_stage_gr12",
    trackId: "ae_moe_national",
    countryCode: "AE",
    number: 1,
    title: "Coulomb's Law and Electrostatic Force",
    slug: "coulombs-law-electrostatic-force",
    topics: ["Inverse Square Law", "Permittivity of Free Space", "Point Charge Superposition"],
    subtopics: ["Attraction vs Repulsion", "Vector addition of electrostatic forces"],
    learningObjectives: [
      "Calculate electrostatic force F = k * |q1 * q2| / r^2 between point charges",
      "Find net force on a charge in a linear or triangular configuration",
    ],
    keyVocabulary: ["Coulomb", "Permittivity", "Electrostatic field", "Vector superposition"],
    verificationStatus: "partially_verified",
  },
  {
    id: "my_kssm_fizik_ch1_l1",
    chapterId: "my_kssm_fizik_ch1",
    subjectId: "my_kssm_fizik_f5",
    gradeId: "my_stage_form5",
    trackId: "my_kpm_spm",
    countryCode: "MY",
    number: 1,
    title: "Resolution of Forces and Equilibrium (Leraian Daya)",
    slug: "resolution-of-forces-equilibrium",
    topics: ["Orthogonal Resolution", "Weight Components on an Incline (mg sin theta, mg cos theta)"],
    subtopics: ["Normal reaction force", "Friction threshold"],
    learningObjectives: [
      "Resolve weight parallel and perpendicular to an inclined slope",
      "Calculate acceleration of a block sliding down a rough ramp",
    ],
    keyVocabulary: ["Leraian daya (Resolution)", "Keseimbangan daya (Equilibrium)", "Tindak balas normal (Normal reaction)"],
    verificationStatus: "partially_verified",
  },
];
