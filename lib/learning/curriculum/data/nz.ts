/**
 * New Zealand (NZ) Curriculum Dataset
 * Te Mātaiaho & NZQA National Certificate of Educational Achievement (NCEA Levels 1–3).
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const NZ_STAGES: AcademicStage[] = [
  { id: "nz_stage_ncea_l1", trackId: "nz_ncea", countryCode: "NZ", stageName: "Secondary Senior", gradeLabel: "NCEA Level 1 (Year 11)", sortOrder: 11, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "nz_stage_ncea_l2", trackId: "nz_ncea", countryCode: "NZ", stageName: "Secondary Senior", gradeLabel: "NCEA Level 2 (Year 12)", sortOrder: 12, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "nz_stage_ncea_l3", trackId: "nz_ncea", countryCode: "NZ", stageName: "Secondary Senior", gradeLabel: "NCEA Level 3 (Year 13)", sortOrder: 13, ageRange: "17-18", verificationStatus: "officially_verified" },
];

export const NZ_SUBJECTS: Subject[] = [
  {
    id: "nz_ncea_l3_calculus",
    gradeId: "nz_stage_ncea_l3",
    trackId: "nz_ncea",
    countryCode: "NZ",
    name: "Mathematics with Calculus (Level 3)",
    code: "NZQA-91577",
    slug: "ncea-level-3-calculus",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.nzqa.govt.nz/ncea/assessment/search.do?query=Mathematics&view=all&level=03",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Achievement standards assessed externally and internally: Complex numbers (AS 91577), Differentiation (AS 91578), Integration (AS 91579).",
    chapterCount: 5,
  },
  {
    id: "nz_ncea_l2_physics",
    gradeId: "nz_stage_ncea_l2",
    trackId: "nz_ncea",
    countryCode: "NZ",
    name: "Physics (Level 2)",
    code: "NZQA-PHYS2",
    slug: "ncea-level-2-physics",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.nzqa.govt.nz/ncea/assessment/search.do?query=Physics&view=all&level=02",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Mechanics (AS 91171), Electricity & Electromagnetism (AS 91173), Wave Systems (AS 91170).",
    chapterCount: 5,
  },
];

export const NZ_CHAPTERS: Chapter[] = [
  {
    id: "nz_ncea_l3_calc_ch1",
    subjectId: "nz_ncea_l3_calculus",
    number: 1,
    title: "Apply Differentiation Methods to Solve Problems (AS 91578)",
    slug: "differentiation-methods-as91578",
    summary: "Derivatives of trigonometric, exponential, inverse trigonometric and logarithmic functions; chain, product, and quotient rules; tangents, normals, concavity, points of inflection, and optimization.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Select and apply differentiation techniques to complex trigonometric and exponential expressions",
      "Determine points of inflection using second derivative tests (f''(x) = 0 and sign change)",
      "Formulate and solve real-world optimization problems (Achieved, Merit, Excellence criteria)",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const NZ_LESSONS: Lesson[] = [
  {
    id: "nz_ncea_l3_calc_ch1_l1",
    chapterId: "nz_ncea_l3_calc_ch1",
    subjectId: "nz_ncea_l3_calculus",
    gradeId: "nz_stage_ncea_l3",
    trackId: "nz_ncea",
    countryCode: "NZ",
    number: 1,
    title: "Optimization and Related Rates of Change",
    slug: "optimization-and-related-rates",
    topics: ["Constrained Optimization", "Geometric Modeling", "Related Rates"],
    subtopics: ["Expressing objective function in a single independent variable", "Validating domain boundaries"],
    learningObjectives: [
      "Set up mathematical model for volume/cost optimization",
      "Communicate mathematical reasoning satisfying Excellence (E) level rubric requirements",
    ],
    keyVocabulary: ["Critical point", "Concavity", "Point of inflection", "Stationary value"],
    verificationStatus: "officially_verified",
  },
];
