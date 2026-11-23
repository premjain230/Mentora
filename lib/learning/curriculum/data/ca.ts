/**
 * Canada (CA) Curriculum Dataset
 * Provincial Ministry frameworks: Ontario Ministry of Education (OSSD Grades 9–12) & BC Curriculum.
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const CA_STAGES: AcademicStage[] = [
  { id: "ca_stage_on_gr9", trackId: "ca_ontario", countryCode: "CA", stageName: "Secondary", gradeLabel: "Grade 9", sortOrder: 9, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "ca_stage_on_gr10", trackId: "ca_ontario", countryCode: "CA", stageName: "Secondary", gradeLabel: "Grade 10", sortOrder: 10, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "ca_stage_on_gr11", trackId: "ca_ontario", countryCode: "CA", stageName: "Senior Secondary", gradeLabel: "Grade 11 (University Prep)", sortOrder: 11, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "ca_stage_on_gr12", trackId: "ca_ontario", countryCode: "CA", stageName: "Graduation Year", gradeLabel: "Grade 12 (University Prep)", sortOrder: 12, ageRange: "17-18", verificationStatus: "officially_verified" },
];

export const CA_SUBJECTS: Subject[] = [
  {
    id: "ca_on_sph4u",
    gradeId: "ca_stage_on_gr12",
    trackId: "ca_ontario",
    countryCode: "CA",
    name: "Physics (SPH4U)",
    code: "SPH4U",
    slug: "physics-12-sph4u-ontario",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-science/courses/sph4u",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Ontario Achievement Chart: Knowledge and Understanding (25%), Thinking and Investigation (35%), Communication (15%), Application (25%).",
    unitCount: 5,
    chapterCount: 5,
  },
  {
    id: "ca_on_mhf4u",
    gradeId: "ca_stage_on_gr12",
    trackId: "ca_ontario",
    countryCode: "CA",
    name: "Advanced Functions (MHF4U)",
    code: "MHF4U",
    slug: "advanced-functions-12-mhf4u",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics/courses/mhf4u",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Polynomial, Rational, Trigonometric, Exponential and Logarithmic functions with rate of change analysis.",
    unitCount: 5,
    chapterCount: 5,
  },
];

export const CA_CHAPTERS: Chapter[] = [
  // SPH4U Strand B: Dynamics
  {
    id: "ca_on_sph4u_ch1",
    subjectId: "ca_on_sph4u",
    number: 1,
    title: "Dynamics: Newton's Laws in Two Dimensions",
    slug: "dynamics-newtons-laws-2d",
    summary: "Forces, free-body diagrams, static and kinetic friction, inclined planes, circular motion, and gravitational fields.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Construct detailed free-body diagrams in two perpendicular coordinate axes",
      "Calculate normal force and friction coefficients on inclined planes",
      "Analyze uniform circular motion and banking angles without friction",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
  // SPH4U Strand C: Energy and Momentum
  {
    id: "ca_on_sph4u_ch2",
    subjectId: "ca_on_sph4u",
    number: 2,
    title: "Energy and Momentum Conservation",
    slug: "energy-momentum-conservation",
    summary: "Work done by variable forces, elastic potential energy in springs, conservation of momentum in 2D collisions, elastic vs inelastic collisions.",
    estimatedMinutes: 55,
    learningObjectives: [
      "Solve two-dimensional momentum conservation problems with glancing angles",
      "Distinguish kinetic energy conservation in elastic collisions from momentum conservation in all closed systems",
      "Apply Hooke's law and elastic potential energy equation (0.5 * k * x^2)",
    ],
    prerequisiteConceptIds: ["ca_on_sph4u_ch1"],
    verificationStatus: "officially_verified",
  },
];

export const CA_LESSONS: Lesson[] = [
  {
    id: "ca_on_sph4u_ch1_l1",
    chapterId: "ca_on_sph4u_ch1",
    subjectId: "ca_on_sph4u",
    gradeId: "ca_stage_on_gr12",
    trackId: "ca_ontario",
    countryCode: "CA",
    number: 1,
    title: "Centripetal Acceleration and Banked Curves",
    slug: "centripetal-acceleration-banked-curves",
    topics: ["Uniform Circular Motion", "Centripetal Force", "Banked Highway Curves"],
    subtopics: ["Inertial frames of reference", "Horizontal component of normal force"],
    learningObjectives: [
      "Derive tan(theta) = v^2 / (r * g) for frictionless banked curves",
      "Explain why centripetal force is a net resultant rather than a distinct physical force",
    ],
    keyVocabulary: ["Centripetal", "Inertial frame", "Normal force component", "Radius of curvature"],
    verificationStatus: "officially_verified",
  },
];
