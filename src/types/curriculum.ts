/**
 * Global Personal AI Learning OS — Curriculum & Taxonomy Schema
 * Multi-country educational taxonomy, syllabus verification metadata,
 * regional conventions, and backward-compatible adapters.
 */

export type TaxonomyEntityType =
  | "national_curriculum"
  | "state_provincial_curriculum"
  | "awarding_body_exam_board"
  | "qualification_pathway"
  | "competitive_entrance_exam";

export type VerificationStatus =
  | "officially_verified"
  | "partially_verified"
  | "awaiting_verification"
  | "outdated"
  | "unavailable";

export type SubjectCategory =
  | "stem"
  | "humanities"
  | "languages"
  | "business_economics"
  | "arts"
  | "other";

export interface CoverageMetrics {
  totalSubjects: number;
  verifiedSubjects: number;
  totalChapters: number;
  verifiedChapters: number;
  totalLessons: number;
  verifiedLessons: number;
}

export interface VerificationMetadata {
  academicYear: string;
  sourceAuthority: string;
  sourceUrl: string;
  verifiedAt: string;
  verificationStatus: VerificationStatus;
  coverageMetrics: CoverageMetrics;
  changelogNotes?: string;
}

export interface RegionalConventions {
  locale: string;
  spellingVariant: "en-US" | "en-GB" | "en-IN" | "en-CA" | "en-AU" | "en-SG" | "en-NZ" | "en-ZA" | "en-IE" | "en-MY" | "en-PK" | "en-NG";
  primaryMeasurementSystem: "metric" | "us_customary" | "imperial";
  currencySymbol: string;
  currencyCode: string;
  mathTerminology: {
    divisionOfOperations: "PEMDAS" | "BIDMAS" | "BODMAS" | "BEDMAS" | "BIMDAS";
    slope: "slope" | "gradient";
    trapezoid: "trapezoid" | "trapezium";
    radicals: "radicals" | "surds";
    reviewTerm: "review" | "revise";
    gradingTerm: "points" | "marks" | "credits";
  };
  examQuestionStyle: string;
  scopeBoundaries?: {
    includedTopicsPrompt?: string;
    excludedTopicsPrompt?: string;
  };
}

export interface HierarchyTerminology {
  stageLabel: string;
  gradeLabel: string;
  subjectLabel: string;
  chapterLabel: string;
  lessonLabel: string;
}

export interface Country {
  code: string; // ISO-3166-1 alpha-2 (e.g. IN, US, GB, CA, AU, NZ, SG, AE, SA, MY, PK, BD, ZA, NG, IE)
  name: string;
  slug: string;
  region: "South Asia" | "North America" | "Europe" | "Oceania" | "Southeast Asia" | "Middle East" | "Africa";
  defaultCurrency: string;
  defaultTimezone: string;
  defaultLocale: string;
  academicCalendarCycle: string; // e.g. "April - March", "September - June", "February - November"
  supportedTrackTypes: TaxonomyEntityType[];
  featured: boolean;
  flagEmoji: string;
}

export interface EducationTrack {
  id: string;
  countryCode: string;
  name: string;
  shortName: string;
  slug: string;
  authorityType: TaxonomyEntityType;
  description: string;
  officialUrl: string;
  academicYear: string;
  verificationStatus: VerificationStatus;
  supportedLocales: string[];
  regionalConventions: RegionalConventions;
  hierarchyTerminology: HierarchyTerminology;
  notice?: string | null;
  coverageMetrics?: CoverageMetrics;
}

export interface AcademicStage {
  id: string;
  trackId: string;
  countryCode: string;
  stageName: string;
  gradeLabel: string;
  sortOrder: number;
  ageRange?: string;
  verificationStatus: VerificationStatus;
}

export interface Subject {
  id: string;
  gradeId: string;
  trackId: string;
  countryCode: string;
  name: string;
  code?: string;
  slug: string;
  category: SubjectCategory;
  academicYear: string;
  verificationStatus: VerificationStatus;
  sourceUrl: string;
  verifiedAt: string;
  assessmentOverview?: string;
  examBoardOptions?: string[];
  unitCount?: number;
  chapterCount?: number;
}

export interface Unit {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  slug: string;
  description?: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  unitId?: string;
  number: number;
  title: string;
  slug: string;
  summary: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  prerequisiteConceptIds: string[];
  verificationStatus: VerificationStatus;
  legacyConceptId?: string;
}

export interface Lesson {
  id: string;
  chapterId: string;
  subjectId: string;
  gradeId: string;
  trackId: string;
  countryCode: string;
  number: number;
  title: string;
  slug: string;
  topics: string[];
  subtopics: string[];
  learningObjectives: string[];
  keyVocabulary: string[];
  regionalConventions?: Partial<RegionalConventions>;
  assessmentCriteria?: string[];
  verificationStatus: VerificationStatus;
  legacyConceptId?: string;
}

export interface Concept {
  id: string;
  fullId: string;
  name: string;
  subject: string;
  topic: string;
  difficulty: number;
  prerequisites: string[];
  relatedConcepts?: string[];
  tags: string[];
  curriculumPaths: string[];
  countryCode?: string;
  trackId?: string;
  legacyConceptId?: string;
}

export type LessonProgressState =
  | "not_started"
  | "opened"
  | "in_progress"
  | "practiced"
  | "completed"
  | "mastered";

export interface UserLessonProgress {
  lessonId: string;
  chapterId: string;
  subjectId: string;
  trackId: string;
  countryCode: string;
  status: LessonProgressState;
  openedAt?: string;
  lastStudiedAt: string;
  completedAt?: string | null;
  masteryScore: number;
  practiceStats: {
    attempts: number;
    correct: number;
    highestDifficulty: number;
  };
  conceptMasteryMap: Record<string, number>;
  nextRevisionDueAt?: string | null;
}

export interface UserCurriculumPreferences {
  countryCode: string;
  primaryTrackId: string;
  primaryGradeId?: string | null;
  secondaryTrackIds?: string[];
  locale?: string;
  timezone?: string;
  currency?: string;
  measurementSystem?: "metric" | "us_customary" | "imperial";
}
