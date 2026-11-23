/**
 * Ireland (IE) Curriculum Dataset
 * National Council for Curriculum and Assessment (NCCA) & State Examinations Commission (SEC).
 * Senior Cycle: Leaving Certificate (Higher and Ordinary Levels).
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const IE_STAGES: AcademicStage[] = [
  { id: "ie_stage_junior_cycle", trackId: "ie_leaving_cert", countryCode: "IE", stageName: "Junior Cycle", gradeLabel: "3rd Year", sortOrder: 9, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "ie_stage_5th_year", trackId: "ie_leaving_cert", countryCode: "IE", stageName: "Senior Cycle", gradeLabel: "5th Year", sortOrder: 11, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "ie_stage_6th_year", trackId: "ie_leaving_cert", countryCode: "IE", stageName: "Senior Cycle Examination", gradeLabel: "6th Year (Leaving Cert)", sortOrder: 12, ageRange: "17-18", verificationStatus: "officially_verified" },
];

export const IE_SUBJECTS: Subject[] = [
  {
    id: "ie_lc_physics",
    gradeId: "ie_stage_6th_year",
    trackId: "ie_leaving_cert",
    countryCode: "IE",
    name: "Physics (Leaving Certificate)",
    code: "SEC-PHYS",
    slug: "leaving-certificate-physics-ireland",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://curriculumonline.ie/senior-cycle/senior-cycle-subjects/physics/",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "SEC Terminal written exam (400 marks, 3 hours). Section A (Mandatory experiments, 120 marks) and Section B (General physics theory, 280 marks).",
    chapterCount: 6,
  },
  {
    id: "ie_lc_maths",
    gradeId: "ie_stage_6th_year",
    trackId: "ie_leaving_cert",
    countryCode: "IE",
    name: "Mathematics (Higher Level)",
    code: "SEC-MATH-HL",
    slug: "leaving-certificate-mathematics-hl",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://curriculumonline.ie/senior-cycle/senior-cycle-subjects/mathematics/",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Algebra, Calculus, Complex Numbers) and Paper 2 (Probability, Statistics, Geometry, Trigonometry).",
    chapterCount: 6,
  },
];

export const IE_CHAPTERS: Chapter[] = [
  {
    id: "ie_lc_phys_ch1",
    subjectId: "ie_lc_physics",
    number: 1,
    title: "Mechanics: Linear Motion and Newton's Laws",
    slug: "mechanics-linear-motion-newtons-laws",
    summary: "Vectors and scalars; equations of uniformly accelerated motion; momentum conservation; force and friction; work, energy, and power; circular motion and simple harmonic motion.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Derive equations of motion (v = u + at, s = ut + 0.5at^2, v^2 = u^2 + 2as) from velocity-time graphs",
      "Formulate conservation of momentum experiment using light gates and data logging",
      "Analyze simple harmonic motion restoring force (a = -omega^2 * s)",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const IE_LESSONS: Lesson[] = [
  {
    id: "ie_lc_phys_ch1_l1",
    chapterId: "ie_lc_phys_ch1",
    subjectId: "ie_lc_physics",
    gradeId: "ie_stage_6th_year",
    trackId: "ie_leaving_cert",
    countryCode: "IE",
    number: 1,
    title: "Mandatory Experiment: Verification of the Principle of Conservation of Momentum",
    slug: "mandatory-experiment-conservation-of-momentum",
    topics: ["Linear Air Track", "Light Gates and Digital Timers", "Inelastic Collision of Gliders"],
    subtopics: ["Calculating initial vs final total momentum", "Minimizing frictional systematic error"],
    learningObjectives: [
      "Describe complete experimental apparatus setup and step-by-step procedure",
      "Calculate percentage discrepancy between total initial momentum and total final momentum",
    ],
    keyVocabulary: ["Linear momentum", "Glider", "Light gate", "Discrepancy"],
    verificationStatus: "officially_verified",
  },
];
