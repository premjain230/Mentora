/**
 * Singapore (SG) Curriculum Dataset
 * Singapore MOE Full Subject-Based Banding (G1, G2, G3) & SEAB Singapore-Cambridge GCE O-Level.
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const SG_STAGES: AcademicStage[] = [
  { id: "sg_stage_sec1", trackId: "sg_secondary", countryCode: "SG", stageName: "Lower Secondary", gradeLabel: "Secondary 1 (G3/G2)", sortOrder: 7, ageRange: "12-13", verificationStatus: "officially_verified" },
  { id: "sg_stage_sec2", trackId: "sg_secondary", countryCode: "SG", stageName: "Lower Secondary", gradeLabel: "Secondary 2 (G3/G2)", sortOrder: 8, ageRange: "13-14", verificationStatus: "officially_verified" },
  { id: "sg_stage_sec3", trackId: "sg_secondary", countryCode: "SG", stageName: "Upper Secondary", gradeLabel: "Secondary 3 (G3/O-Level)", sortOrder: 9, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "sg_stage_sec4", trackId: "sg_secondary", countryCode: "SG", stageName: "Upper Secondary", gradeLabel: "Secondary 4 (G3/O-Level)", sortOrder: 10, ageRange: "15-16", verificationStatus: "officially_verified" },
];

export const SG_SUBJECTS: Subject[] = [
  {
    id: "sg_olevel_pure_physics",
    gradeId: "sg_stage_sec4",
    trackId: "sg_secondary",
    countryCode: "SG",
    name: "Pure Physics (6091)",
    code: "SEAB-6091",
    slug: "o-level-pure-physics-singapore",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.seab.gov.sg/home/examinations/gce-o-level",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (MCQ 30%), Paper 2 (Structured and Free Response 50%), Paper 3 (Practical Exam 20%).",
    chapterCount: 6,
  },
  {
    id: "sg_olevel_add_maths",
    gradeId: "sg_stage_sec4",
    trackId: "sg_secondary",
    countryCode: "SG",
    name: "Additional Mathematics (4049)",
    code: "SEAB-4049",
    slug: "o-level-additional-mathematics",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.seab.gov.sg/home/examinations/gce-o-level",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (50%, 2h 15m) and Paper 2 (50%, 2h 15m). Covers Algebra, Geometry & Trigonometry, and Calculus.",
    chapterCount: 6,
  },
];

export const SG_CHAPTERS: Chapter[] = [
  // SEAB 6091 Section II: Newtonian Mechanics
  {
    id: "sg_olevel_phys_ch1",
    subjectId: "sg_olevel_pure_physics",
    number: 1,
    title: "Dynamics and Pressure",
    slug: "dynamics-and-pressure",
    summary: "Newton’s laws of motion, resultant forces, inertia, terminal velocity in viscous fluids, and pressure in liquids (p = rho * g * h) and hydraulic systems.",
    estimatedMinutes: 50,
    learningObjectives: [
      "State and apply Newton's three laws of motion to multi-body scenarios",
      "Explain the velocity-time profile of a sky diver reaching terminal velocity",
      "Calculate liquid pressure and transmission of pressure in hydraulic presses (Pascal's Principle)",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const SG_LESSONS: Lesson[] = [
  {
    id: "sg_olevel_phys_ch1_l1",
    chapterId: "sg_olevel_phys_ch1",
    subjectId: "sg_olevel_pure_physics",
    gradeId: "sg_stage_sec4",
    trackId: "sg_secondary",
    countryCode: "SG",
    number: 1,
    title: "Newton's Laws and Terminal Velocity",
    slug: "newtons-laws-and-terminal-velocity",
    topics: ["Net Force", "Air Resistance Variation with Velocity", "Equilibrium at Terminal Speed"],
    subtopics: ["Balanced vs Unbalanced forces", "Parachute deployment dynamics"],
    learningObjectives: [
      "Explain why acceleration decreases as drag increases with speed until F_net = 0",
      "Sketch and label acceleration-time and velocity-time graphs for falling bodies",
    ],
    keyVocabulary: ["Inertia", "Terminal velocity", "Fluid resistance", "Equilibrium"],
    verificationStatus: "officially_verified",
  },
];
