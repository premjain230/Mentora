/**
 * Nigeria (NG) Curriculum Dataset
 * NERDC Senior Secondary Curriculum & WAEC (WASSCE) / JAMB UTME.
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const NG_STAGES: AcademicStage[] = [
  { id: "ng_stage_ss1", trackId: "ng_waec_nerdc", countryCode: "NG", stageName: "Senior Secondary", gradeLabel: "SS1", sortOrder: 10, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "ng_stage_ss2", trackId: "ng_waec_nerdc", countryCode: "NG", stageName: "Senior Secondary", gradeLabel: "SS2", sortOrder: 11, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "ng_stage_ss3", trackId: "ng_waec_nerdc", countryCode: "NG", stageName: "WASSCE Examination", gradeLabel: "SS3 (WASSCE / JAMB)", sortOrder: 12, ageRange: "16-17", verificationStatus: "officially_verified" },
];

export const NG_SUBJECTS: Subject[] = [
  {
    id: "ng_waec_physics",
    gradeId: "ng_stage_ss3",
    trackId: "ng_waec_nerdc",
    countryCode: "NG",
    name: "Physics (WASSCE Syllabus)",
    code: "WAEC-PHYS",
    slug: "wassce-physics-nigeria",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.waecdirect.org",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Multiple Choice 50 items), Paper 2 (Theory - Part I short structured, Part II long questions), Paper 3 (Practical Exam).",
    chapterCount: 6,
  },
  {
    id: "ng_waec_maths",
    gradeId: "ng_stage_ss3",
    trackId: "ng_waec_nerdc",
    countryCode: "NG",
    name: "General Mathematics (WASSCE Syllabus)",
    code: "WAEC-MATH",
    slug: "wassce-mathematics-nigeria",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.waecdirect.org",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Number and Numeration, Algebraic processes, Mensuration, Plane Geometry, Trigonometry, Statistics and Probability.",
    chapterCount: 6,
  },
];

export const NG_CHAPTERS: Chapter[] = [
  {
    id: "ng_waec_phys_ch1",
    subjectId: "ng_waec_physics",
    number: 1,
    title: "Waves: Production, Propagation and Characteristics",
    slug: "waves-production-characteristics",
    summary: "Mechanical and electromagnetic waves; longitudinal and transverse waves; reflection, refraction, diffraction, and interference; superposition principle and standing waves on strings and pipes.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Distinguish mechanical waves requiring a material medium from electromagnetic waves",
      "Calculate wave velocity using fundamental wave equation (v = f * lambda)",
      "Explain stationary wave nodes and antinodes in closed and open resonance tubes",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const NG_LESSONS: Lesson[] = [
  {
    id: "ng_waec_phys_ch1_l1",
    chapterId: "ng_waec_phys_ch1",
    subjectId: "ng_waec_physics",
    gradeId: "ng_stage_ss3",
    trackId: "ng_waec_nerdc",
    countryCode: "NG",
    number: 1,
    title: "Wave Interference and Young's Double Slit",
    slug: "wave-interference-youngs-double-slit",
    topics: ["Coherent Sources", "Constructive Interference", "Destructive Interference", "Fringe Separation"],
    subtopics: ["Path difference = n * lambda", "Phase difference relations"],
    learningObjectives: [
      "State conditions necessary for sustained light wave interference",
      "Calculate fringe width using w = (lambda * D) / d",
    ],
    keyVocabulary: ["Coherent", "Path difference", "Fringe width", "Superposition"],
    verificationStatus: "officially_verified",
  },
];
