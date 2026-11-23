/**
 * South Africa (ZA) Curriculum Dataset
 * Department of Basic Education (DBE) CAPS (FET Phase Grades 10–12) & NSC Matric.
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const ZA_STAGES: AcademicStage[] = [
  { id: "za_stage_fet_gr10", trackId: "za_caps", countryCode: "ZA", stageName: "FET Phase", gradeLabel: "Grade 10", sortOrder: 10, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "za_stage_fet_gr11", trackId: "za_caps", countryCode: "ZA", stageName: "FET Phase", gradeLabel: "Grade 11", sortOrder: 11, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "za_stage_fet_gr12", trackId: "za_caps", countryCode: "ZA", stageName: "FET Phase Matric", gradeLabel: "Grade 12 (NSC)", sortOrder: 12, ageRange: "17-18", verificationStatus: "officially_verified" },
];

export const ZA_SUBJECTS: Subject[] = [
  {
    id: "za_caps_physical_sciences_12",
    gradeId: "za_stage_fet_gr12",
    trackId: "za_caps",
    countryCode: "ZA",
    name: "Physical Sciences (Physics & Chemistry)",
    code: "DBE-PHSC",
    slug: "physical-sciences-grade-12-caps",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS)/CAPSFET/FETPhysicalSciences.aspx",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Physics - 150 marks, 3 hours) and Paper 2 (Chemistry - 150 marks, 3 hours).",
    chapterCount: 6,
  },
  {
    id: "za_caps_mathematics_12",
    gradeId: "za_stage_fet_gr12",
    trackId: "za_caps",
    countryCode: "ZA",
    name: "Mathematics",
    code: "DBE-MATH",
    slug: "mathematics-grade-12-caps",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Algebra, Calculus, Financial Maths) and Paper 2 (Geometry, Trigonometry, Statistics).",
    chapterCount: 6,
  },
];

export const ZA_CHAPTERS: Chapter[] = [
  {
    id: "za_caps_phys_ch1",
    subjectId: "za_caps_physical_sciences_12",
    number: 1,
    title: "Vertical Projectile Motion in One Dimension",
    slug: "vertical-projectile-motion-1d",
    summary: "Motion of objects thrown vertically upwards, downwards, and bouncing off surfaces; equations of motion under constant gravitational acceleration g; displacement-time, velocity-time, and acceleration-time graphs.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Interpret velocity vs. time graphs with direction changes and reversal of motion",
      "Calculate time of flight and maximum height using equations of motion",
      "Analyze non-elastic kinetic energy losses during ground bounces",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const ZA_LESSONS: Lesson[] = [
  {
    id: "za_caps_phys_ch1_l1",
    chapterId: "za_caps_phys_ch1",
    subjectId: "za_caps_physical_sciences_12",
    gradeId: "za_stage_fet_gr12",
    trackId: "za_caps",
    countryCode: "ZA",
    number: 1,
    title: "Velocity-Time Graphs and Direction Sign Conventions",
    slug: "velocity-time-graphs-sign-conventions",
    topics: ["Upward vs Downward Positive Vectors", "Zero Velocity at Apex", "Gradient equals Acceleration"],
    subtopics: ["Area under graph represents displacement", "Contact time during bounce"],
    learningObjectives: [
      "Demonstrate why the acceleration is constant at 9.8 m/s^2 downwards even at the exact peak where velocity is 0 m/s",
      "Draw accurate position-time curves reflecting parabolic displacement",
    ],
    keyVocabulary: ["Projectile", "Free fall", "Apex", "Displacement"],
    verificationStatus: "officially_verified",
  },
];
