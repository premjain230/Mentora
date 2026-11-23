/**
 * United States (US) Curriculum Dataset
 * College Board AP Courses, Common Core Math & Next Generation Science Standards (NGSS).
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const US_STAGES: AcademicStage[] = [
  { id: "us_stage_ap", trackId: "us_ap", countryCode: "US", stageName: "Advanced Placement", gradeLabel: "AP Courses", sortOrder: 1, ageRange: "15-18", verificationStatus: "officially_verified" },
  { id: "us_stage_hs_9", trackId: "us_ccss_ngss", countryCode: "US", stageName: "High School Freshman", gradeLabel: "Grade 9", sortOrder: 9, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "us_stage_hs_10", trackId: "us_ccss_ngss", countryCode: "US", stageName: "High School Sophomore", gradeLabel: "Grade 10", sortOrder: 10, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "us_stage_hs_11", trackId: "us_ccss_ngss", countryCode: "US", stageName: "High School Junior", gradeLabel: "Grade 11", sortOrder: 11, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "us_stage_hs_12", trackId: "us_ccss_ngss", countryCode: "US", stageName: "High School Senior", gradeLabel: "Grade 12", sortOrder: 12, ageRange: "17-18", verificationStatus: "officially_verified" },
  { id: "us_stage_sat", trackId: "us_sat", countryCode: "US", stageName: "College Readiness", gradeLabel: "Digital SAT", sortOrder: 13, ageRange: "16-18", verificationStatus: "officially_verified" },
];

export const US_SUBJECTS: Subject[] = [
  {
    id: "us_ap_calc_bc",
    gradeId: "us_stage_ap",
    trackId: "us_ap",
    countryCode: "US",
    name: "AP Calculus BC",
    code: "AP-CALC-BC",
    slug: "ap-calculus-bc",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://apcentral.collegeboard.org/courses/ap-calculus-bc",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Section I: 45 Multiple Choice Questions (50% score). Section II: 6 Free-Response Questions (50% score).",
    unitCount: 10,
    chapterCount: 10,
  },
  {
    id: "us_ap_physics_1",
    gradeId: "us_stage_ap",
    trackId: "us_ap",
    countryCode: "US",
    name: "AP Physics 1: Algebra-Based",
    code: "AP-PHYS-1",
    slug: "ap-physics-1",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://apcentral.collegeboard.org/courses/ap-physics-1",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "50 Multiple-Choice Questions (50%), 4-5 Free-Response Questions (50%) emphasizing experimental design and qualitative/quantitative translation.",
    unitCount: 8,
    chapterCount: 8,
  },
  {
    id: "us_ngss_biology",
    gradeId: "us_stage_hs_10",
    trackId: "us_ccss_ngss",
    countryCode: "US",
    name: "High School Biology (NGSS Life Sciences)",
    code: "HS-LS",
    slug: "hs-biology-ngss",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.nextgenscience.org/topic-arrangement/high-school-life-sciences",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Three-Dimensional Learning: Disciplinary Core Ideas, Crosscutting Concepts, Science and Engineering Practices.",
    unitCount: 5,
    chapterCount: 5,
  },
];

export const US_CHAPTERS: Chapter[] = [
  // AP Calculus BC Unit 1
  {
    id: "us_ap_calc_u1",
    subjectId: "us_ap_calc_bc",
    number: 1,
    title: "Limits and Continuity",
    slug: "limits-and-continuity",
    summary: "Determining limits using algebraic properties, squeeze theorem, definition of continuity at a point, one-sided limits, Intermediate Value Theorem (IVT), and infinite limits.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Calculate limits algebraically using factoring, conjugates, and common denominators",
      "Apply the Intermediate Value Theorem to justify existence of roots",
      "Evaluate infinite limits and vertical/horizontal asymptotic behavior",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
  // AP Calculus BC Unit 2
  {
    id: "us_ap_calc_u2",
    subjectId: "us_ap_calc_bc",
    number: 2,
    title: "Differentiation: Definition and Fundamental Properties",
    slug: "differentiation-definition-properties",
    summary: "Derivative as a limit of difference quotient, differentiability and continuity relationship, power rule, product rule, quotient rule, trigonometric derivatives, and linearity.",
    estimatedMinutes: 55,
    learningObjectives: [
      "Express instantaneous rates of change as the formal limit of average rates",
      "Compute derivatives using power, product, quotient, and reciprocal rules",
      "Analyze non-differentiable points: cusps, corners, vertical tangents, and discontinuities",
    ],
    prerequisiteConceptIds: ["us_ap_calc_u1"],
    verificationStatus: "officially_verified",
  },
  // AP Physics 1 Unit 1
  {
    id: "us_ap_phys1_u1",
    subjectId: "us_ap_physics_1",
    number: 1,
    title: "Kinematics in One and Two Dimensions",
    slug: "kinematics",
    summary: "Position, displacement, velocity, acceleration, kinematic equations for constant acceleration, graphical analysis of motion, projectile motion with independent horizontal/vertical components.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Interpret position vs. time, velocity vs. time, and acceleration vs. time graphs",
      "Solve two-dimensional projectile trajectories assuming negligible air resistance",
      "Design and justify experimental setups to measure gravitational acceleration g",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
];

export const US_LESSONS: Lesson[] = [
  {
    id: "us_ap_calc_u1_l1",
    chapterId: "us_ap_calc_u1",
    subjectId: "us_ap_calc_bc",
    gradeId: "us_stage_ap",
    trackId: "us_ap",
    countryCode: "US",
    number: 1,
    title: "Defining Limits and Using Limit Notation",
    slug: "defining-limits-notation",
    topics: ["One-Sided Limits", "Two-Sided Limits", "Indeterminate Forms"],
    subtopics: ["Limit as x approaches c", "Left-hand and right-hand behavior", "0/0 forms"],
    learningObjectives: [
      "Express limit values mathematically using proper notation",
      "Determine when a two-sided limit fails to exist due to jump or oscillation",
    ],
    keyVocabulary: ["Limit", "Indeterminate form", "Continuous function", "Discontinuity"],
    assessmentCriteria: ["AP Rubric: Accurate notation lim_{x->c} without algebraic drop until evaluated."],
    verificationStatus: "officially_verified",
  },
  {
    id: "us_ap_phys1_u1_l1",
    chapterId: "us_ap_phys1_u1",
    subjectId: "us_ap_physics_1",
    gradeId: "us_stage_ap",
    trackId: "us_ap",
    countryCode: "US",
    number: 1,
    title: "Vectors and Projectile Motion",
    slug: "vectors-and-projectile-motion",
    topics: ["Vector Resolution", "Independent Orthogonal Motion", "Trajectory Parabolas"],
    subtopics: ["Horizontal constant velocity", "Vertical constant acceleration under gravity"],
    learningObjectives: [
      "Resolve initial velocity into horizontal (v0 cos theta) and vertical (v0 sin theta) vectors",
      "Derive maximum height, flight time, and horizontal range equations",
    ],
    keyVocabulary: ["Vector magnitude", "Component resolution", "Free fall acceleration"],
    assessmentCriteria: ["AP Quantitative/Qualitative Translation (QQT) rubric."],
    verificationStatus: "officially_verified",
  },
];
