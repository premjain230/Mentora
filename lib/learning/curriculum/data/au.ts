/**
 * Australia (AU) Curriculum Dataset
 * VCAA VCE (Victoria Units 1–4) & Australian Curriculum v9.0 (ACARA).
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const AU_STAGES: AcademicStage[] = [
  { id: "au_stage_vce_u12", trackId: "au_vce", countryCode: "AU", stageName: "VCE Senior Secondary", gradeLabel: "Units 1 & 2 (Year 11)", sortOrder: 11, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "au_stage_vce_u34", trackId: "au_vce", countryCode: "AU", stageName: "VCE Senior Secondary", gradeLabel: "Units 3 & 4 (Year 12)", sortOrder: 12, ageRange: "17-18", verificationStatus: "officially_verified" },
  { id: "au_stage_acara_y10", trackId: "au_acara", countryCode: "AU", stageName: "Secondary", gradeLabel: "Year 10", sortOrder: 10, ageRange: "15-16", verificationStatus: "officially_verified" },
];

export const AU_SUBJECTS: Subject[] = [
  {
    id: "au_vce_physics_u34",
    gradeId: "au_stage_vce_u34",
    trackId: "au_vce",
    countryCode: "AU",
    name: "VCE Physics (Units 3 & 4)",
    code: "VCE-PHYS",
    slug: "vce-physics-units-3-4",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.vcaa.vic.edu.au/curriculum/vce/vce-study-designs/physics/Pages/index.aspx",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "School-Assessed Coursework (SAC) Unit 3 (21%), Unit 4 (19%), and end-of-year external examination (60%).",
    chapterCount: 6,
  },
  {
    id: "au_vce_methods_u34",
    gradeId: "au_stage_vce_u34",
    trackId: "au_vce",
    countryCode: "AU",
    name: "Mathematical Methods (Units 3 & 4)",
    code: "VCE-METH",
    slug: "vce-mathematical-methods-units-3-4",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.vcaa.vic.edu.au/curriculum/vce/vce-study-designs/mathematics/Pages/index.aspx",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Functions, Algebra, Calculus, and Probability & Statistics. Exam 1 (Technology-free, 1h) and Exam 2 (Technology-active, 2h).",
    chapterCount: 6,
  },
];

export const AU_CHAPTERS: Chapter[] = [
  // VCE Physics Unit 3 Area of Study 1
  {
    id: "au_vce_phys_ch1",
    subjectId: "au_vce_physics_u34",
    number: 1,
    title: "Fields: Gravitational, Electric and Magnetic",
    slug: "fields-gravitational-electric-magnetic",
    summary: "Investigation of gravitational, electric, and magnetic fields, field lines, potential energy, particle accelerators, and electromagnetic induction (Faraday's and Lenz's laws).",
    estimatedMinutes: 55,
    learningObjectives: [
      "Compare inverse-square gravitational and electrostatic field representations",
      "Calculate magnetic force on moving charged particles (F = q * v * B)",
      "Apply Lenz's law to determine induced current direction opposing flux change",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const AU_LESSONS: Lesson[] = [
  {
    id: "au_vce_phys_ch1_l1",
    chapterId: "au_vce_phys_ch1",
    subjectId: "au_vce_physics_u34",
    gradeId: "au_stage_vce_u34",
    trackId: "au_vce",
    countryCode: "AU",
    number: 1,
    title: "Electromagnetic Induction and Lenz's Law",
    slug: "electromagnetic-induction-lenzs-law",
    topics: ["Magnetic Flux", "Faraday's Law", "Lenz's Law Conservation of Energy"],
    subtopics: ["Rate of change of magnetic flux", "Induced EMF in rotating loops"],
    learningObjectives: [
      "Explain EMF = -N * (delta Phi / delta t) and why the minus sign represents energy conservation",
      "Predict eddy currents and magnetic braking effects",
    ],
    keyVocabulary: ["Magnetic flux (Webers)", "Induced electromotive force", "Lenz's rule"],
    verificationStatus: "officially_verified",
  },
];
