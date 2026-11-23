/**
 * United Kingdom (GB) Curriculum Dataset
 * England Key Stage 4 GCSE & Sixth Form GCE A-Levels (AQA / Edexcel / OCR / Ofqual).
 */
import { AcademicStage, Subject, Chapter, Lesson } from "@/src/types/curriculum";

export const GB_STAGES: AcademicStage[] = [
  { id: "gb_stage_ks4_y10", trackId: "gb_gcse", countryCode: "GB", stageName: "Key Stage 4", gradeLabel: "Year 10 (GCSE)", sortOrder: 10, ageRange: "14-15", verificationStatus: "officially_verified" },
  { id: "gb_stage_ks4_y11", trackId: "gb_gcse", countryCode: "GB", stageName: "Key Stage 4 Examination", gradeLabel: "Year 11 (GCSE)", sortOrder: 11, ageRange: "15-16", verificationStatus: "officially_verified" },
  { id: "gb_stage_sixth_y12", trackId: "gb_alevel", countryCode: "GB", stageName: "Sixth Form Year 1", gradeLabel: "Year 12 (AS / A-Level)", sortOrder: 12, ageRange: "16-17", verificationStatus: "officially_verified" },
  { id: "gb_stage_sixth_y13", trackId: "gb_alevel", countryCode: "GB", stageName: "Sixth Form Year 2", gradeLabel: "Year 13 (A-Level)", sortOrder: 13, ageRange: "17-18", verificationStatus: "officially_verified" },
  { id: "gb_stage_scotland_nat5", trackId: "gb_scotland_sqa", countryCode: "GB", stageName: "Senior Phase", gradeLabel: "National 5 (S4)", sortOrder: 14, ageRange: "15-16", verificationStatus: "partially_verified" },
  { id: "gb_stage_scotland_higher", trackId: "gb_scotland_sqa", countryCode: "GB", stageName: "Senior Phase", gradeLabel: "Higher (S5/S6)", sortOrder: 15, ageRange: "16-18", verificationStatus: "partially_verified" },
];

export const GB_SUBJECTS: Subject[] = [
  {
    id: "gb_gcse_aqa_physics",
    gradeId: "gb_stage_ks4_y11",
    trackId: "gb_gcse",
    countryCode: "GB",
    name: "GCSE Physics (8463)",
    code: "AQA-8463",
    slug: "gcse-physics-aqa",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.aqa.org.uk/subjects/science/gcse/physics-8463",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Topics 1–4, 50%, 1h 45m) and Paper 2 (Topics 5–8, 50%, 1h 45m). Graded 9 to 1.",
    examBoardOptions: ["AQA", "Pearson Edexcel", "OCR Gateway"],
    chapterCount: 8,
  },
  {
    id: "gb_gcse_edexcel_maths",
    gradeId: "gb_stage_ks4_y11",
    trackId: "gb_gcse",
    countryCode: "GB",
    name: "GCSE Mathematics (1MA1)",
    code: "EDEXCEL-1MA1",
    slug: "gcse-mathematics-edexcel",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.html",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Three written papers: Paper 1 (Non-Calculator), Paper 2 (Calculator), Paper 3 (Calculator). Foundation Tier (Grades 1–5) and Higher Tier (Grades 4–9).",
    chapterCount: 6,
  },
  {
    id: "gb_alevel_aqa_chemistry",
    gradeId: "gb_stage_sixth_y13",
    trackId: "gb_alevel",
    countryCode: "GB",
    name: "A-Level Chemistry (7405)",
    code: "AQA-7405",
    slug: "alevel-chemistry-aqa",
    category: "stem",
    academicYear: "2026-2027",
    verificationStatus: "officially_verified",
    sourceUrl: "https://www.aqa.org.uk/subjects/science/as-and-a-level/chemistry-7404-7405",
    verifiedAt: "2026-11-20T10:00:00Z",
    assessmentOverview: "Paper 1 (Inorganic & Physical), Paper 2 (Organic & Physical), Paper 3 (Practical skills & synoptic).",
    chapterCount: 12,
  },
];

export const GB_CHAPTERS: Chapter[] = [
  // GCSE Physics Topic 1: Energy
  {
    id: "gb_gcse_phys_ch1",
    subjectId: "gb_gcse_aqa_physics",
    number: 1,
    title: "Energy and Energy Stores",
    slug: "energy-and-energy-stores",
    summary: "System changes and energy stores (kinetic, gravitational potential, elastic, thermal, chemical, nuclear), calculations using conservation of energy, specific heat capacity, power, and efficiency.",
    estimatedMinutes: 50,
    learningObjectives: [
      "Calculate kinetic energy (0.5 * m * v^2) and gravitational potential energy (m * g * h)",
      "Explain the conservation of energy principle in closed systems with dissipation",
      "Describe required practical 1: determine specific heat capacity of materials",
    ],
    prerequisiteConceptIds: [],
    verificationStatus: "officially_verified",
  },
  // GCSE Physics Topic 2: Electricity
  {
    id: "gb_gcse_phys_ch2",
    subjectId: "gb_gcse_aqa_physics",
    number: 2,
    title: "Current, Resistance and Potential Difference",
    slug: "current-resistance-potential-difference",
    summary: "Electric circuits, charge flow, current and resistance (V = I * R), ohmic conductors, filament lamps, diodes, thermistors and LDRs, series and parallel circuit rules.",
    estimatedMinutes: 55,
    learningObjectives: [
      "Investigate I-V characteristics for ohmic resistor, filament bulb, and diode",
      "Calculate equivalent resistance and current distribution in series and parallel loops",
      "Explain sensor circuits utilizing thermistors and light-dependent resistors",
    ],
    prerequisiteConceptIds: ["gb_gcse_phys_ch1"],
    verificationStatus: "officially_verified",
  },
];

export const GB_LESSONS: Lesson[] = [
  {
    id: "gb_gcse_phys_ch1_l1",
    chapterId: "gb_gcse_phys_ch1",
    subjectId: "gb_gcse_aqa_physics",
    gradeId: "gb_stage_ks4_y11",
    trackId: "gb_gcse",
    countryCode: "GB",
    number: 1,
    title: "Energy Transfers and Conservation",
    slug: "energy-transfers-and-conservation",
    topics: ["Stores of Energy", "Dissipation and Waste", "Sankey Diagrams", "Efficiency"],
    subtopics: ["Work done by a force", "Heating and electrical transfer pathways"],
    learningObjectives: [
      "Describe energy changes in an oscillating pendulum and falling rock",
      "Calculate efficiency = useful energy output / total energy input * 100%",
    ],
    keyVocabulary: ["Joules", "Specific heat capacity", "Dissipation", "Conservation"],
    assessmentCriteria: ["AQA 6-mark extended writing: Explain energy dissipation in mechanical devices."],
    verificationStatus: "officially_verified",
  },
];
