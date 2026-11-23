/**
 * Global Curriculum Registry & Backward-Compatible Adapter
 * Powers Learning Hub, Arena, AI Tutoring Grounding, and International SEO.
 */
import {
  Country,
  EducationTrack,
  AcademicStage,
  Subject,
  Chapter,
  Lesson,
  CoverageMetrics,
} from "@/src/types/curriculum";

import { COUNTRIES, getCountry } from "./countries";
import { TRACKS, getTrack, getTracksForCountry } from "./tracks";

// Country datasets
import { IN_STAGES, IN_SUBJECTS, IN_CHAPTERS, IN_LESSONS } from "./data/in";
import { US_STAGES, US_SUBJECTS, US_CHAPTERS, US_LESSONS } from "./data/us";
import { GB_STAGES, GB_SUBJECTS, GB_CHAPTERS, GB_LESSONS } from "./data/gb";
import { CA_STAGES, CA_SUBJECTS, CA_CHAPTERS, CA_LESSONS } from "./data/ca";
import { AU_STAGES, AU_SUBJECTS, AU_CHAPTERS, AU_LESSONS } from "./data/au";
import { NZ_STAGES, NZ_SUBJECTS, NZ_CHAPTERS, NZ_LESSONS } from "./data/nz";
import { SG_STAGES, SG_SUBJECTS, SG_CHAPTERS, SG_LESSONS } from "./data/sg";
import { ZA_STAGES, ZA_SUBJECTS, ZA_CHAPTERS, ZA_LESSONS } from "./data/za";
import { NG_STAGES, NG_SUBJECTS, NG_CHAPTERS, NG_LESSONS } from "./data/ng";
import { IE_STAGES, IE_SUBJECTS, IE_CHAPTERS, IE_LESSONS } from "./data/ie";
import { INTL_STAGES, INTL_SUBJECTS, INTL_CHAPTERS, INTL_LESSONS } from "./data/international";

// Aggregate all stages, subjects, chapters, lessons
export const ALL_STAGES: AcademicStage[] = [
  ...IN_STAGES,
  ...US_STAGES,
  ...GB_STAGES,
  ...CA_STAGES,
  ...AU_STAGES,
  ...NZ_STAGES,
  ...SG_STAGES,
  ...ZA_STAGES,
  ...NG_STAGES,
  ...IE_STAGES,
  ...INTL_STAGES,
];

export const ALL_SUBJECTS: Subject[] = [
  ...IN_SUBJECTS,
  ...US_SUBJECTS,
  ...GB_SUBJECTS,
  ...CA_SUBJECTS,
  ...AU_SUBJECTS,
  ...NZ_SUBJECTS,
  ...SG_SUBJECTS,
  ...ZA_SUBJECTS,
  ...NG_SUBJECTS,
  ...IE_SUBJECTS,
  ...INTL_SUBJECTS,
];

export const ALL_CHAPTERS: Chapter[] = [
  ...IN_CHAPTERS,
  ...US_CHAPTERS,
  ...GB_CHAPTERS,
  ...CA_CHAPTERS,
  ...AU_CHAPTERS,
  ...NZ_CHAPTERS,
  ...SG_CHAPTERS,
  ...ZA_CHAPTERS,
  ...NG_CHAPTERS,
  ...IE_CHAPTERS,
  ...INTL_CHAPTERS,
];

export const ALL_LESSONS: Lesson[] = [
  ...IN_LESSONS,
  ...US_LESSONS,
  ...GB_LESSONS,
  ...CA_LESSONS,
  ...AU_LESSONS,
  ...NZ_LESSONS,
  ...SG_LESSONS,
  ...ZA_LESSONS,
  ...NG_LESSONS,
  ...IE_LESSONS,
  ...INTL_LESSONS,
];

// Lookup Maps
const STAGE_BY_ID = new Map(ALL_STAGES.map((s) => [s.id, s]));
const SUBJECT_BY_ID = new Map(ALL_SUBJECTS.map((s) => [s.id, s]));
const CHAPTER_BY_ID = new Map(ALL_CHAPTERS.map((c) => [c.id, c]));
const LESSON_BY_ID = new Map(ALL_LESSONS.map((l) => [l.id, l]));

// Backward compatibility: Legacy concept ID mapping
const CHAPTER_BY_LEGACY_ID = new Map<string, Chapter>();
const LESSON_BY_LEGACY_ID = new Map<string, Lesson>();

for (const ch of ALL_CHAPTERS) {
  if (ch.legacyConceptId) {
    CHAPTER_BY_LEGACY_ID.set(ch.legacyConceptId, ch);
  }
}
for (const l of ALL_LESSONS) {
  if (l.legacyConceptId) {
    LESSON_BY_LEGACY_ID.set(l.legacyConceptId, l);
  }
}

// Map legacy track aliases to modern track IDs
const LEGACY_TRACK_ALIAS: Record<string, string> = {
  cbse: "in_cbse",
  maharashtra: "in_maharashtra",
  jee_main: "in_jee_main",
  jee_advanced: "in_jee_advanced",
  neet: "in_neet",
};

export function resolveTrackId(idOrAlias: string): string {
  if (!idOrAlias) return "in_cbse";
  const clean = idOrAlias.toLowerCase();
  return LEGACY_TRACK_ALIAS[clean] || clean;
}

export function getAllCountries(): Country[] {
  return COUNTRIES;
}

export function getAllTracks(): EducationTrack[] {
  return TRACKS;
}

export function getTrackById(idOrAlias: string): EducationTrack | undefined {
  const resolved = resolveTrackId(idOrAlias);
  return getTrack(resolved);
}

export function getStagesForTrack(trackIdOrAlias: string): AcademicStage[] {
  const resolved = resolveTrackId(trackIdOrAlias);
  return ALL_STAGES.filter((s) => s.trackId === resolved).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubjectsForStage(stageId: string): Subject[] {
  return ALL_SUBJECTS.filter((s) => s.gradeId === stageId);
}

export function getSubjectsForTrack(trackIdOrAlias: string): Subject[] {
  const resolved = resolveTrackId(trackIdOrAlias);
  return ALL_SUBJECTS.filter((s) => s.trackId === resolved);
}

export function getSubjectById(subjectId: string): Subject | undefined {
  return SUBJECT_BY_ID.get(subjectId);
}

export function getChaptersForSubject(subjectId: string): Chapter[] {
  return ALL_CHAPTERS.filter((c) => c.subjectId === subjectId).sort((a, b) => a.number - b.number);
}

export function getChapterById(chapterId: string): Chapter | undefined {
  return CHAPTER_BY_ID.get(chapterId) || CHAPTER_BY_LEGACY_ID.get(chapterId);
}

export function getLessonsForChapter(chapterId: string): Lesson[] {
  const ch = getChapterById(chapterId);
  const realId = ch ? ch.id : chapterId;
  return ALL_LESSONS.filter((l) => l.chapterId === realId).sort((a, b) => a.number - b.number);
}

export function getLessonById(lessonId: string): Lesson | undefined {
  return LESSON_BY_ID.get(lessonId) || LESSON_BY_LEGACY_ID.get(lessonId);
}

/**
 * Fuzzy search across all 15 countries, tracks, subjects, chapters, and topics.
 */
export interface SearchResultItem {
  type: "country" | "track" | "subject" | "chapter" | "lesson";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  countryCode: string;
  badge?: string;
  verificationStatus?: string;
}

export function searchGlobalCurriculum(query: string, maxResults = 12): SearchResultItem[] {
  if (!query || typeof query !== "string") return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: SearchResultItem[] = [];

  // Search Countries
  for (const c of COUNTRIES) {
    if (c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) {
      results.push({
        type: "country",
        id: c.code,
        title: `${c.flagEmoji} ${c.name}`,
        subtitle: `${c.region} · ${c.defaultCurrency}`,
        url: `/learning-hub?country=${c.code.toLowerCase()}`,
        countryCode: c.code,
      });
    }
  }

  // Search Tracks
  for (const t of TRACKS) {
    if (t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q) || t.id.includes(q)) {
      results.push({
        type: "track",
        id: t.id,
        title: t.name,
        subtitle: `${t.shortName} · ${t.authorityType.replace(/_/g, " ")}`,
        url: `/learning-hub?track=${t.id}`,
        countryCode: t.countryCode,
        badge: t.verificationStatus,
      });
    }
  }

  // Search Subjects
  for (const s of ALL_SUBJECTS) {
    if (s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))) {
      const track = getTrackById(s.trackId);
      results.push({
        type: "subject",
        id: s.id,
        title: s.name,
        subtitle: `${track?.shortName || s.trackId} · ${s.academicYear}`,
        url: `/learning-hub?subject=${s.id}`,
        countryCode: s.countryCode,
        badge: s.verificationStatus,
      });
    }
  }

  // Search Chapters
  for (const ch of ALL_CHAPTERS) {
    if (ch.title.toLowerCase().includes(q) || ch.summary.toLowerCase().includes(q)) {
      const subject = getSubjectById(ch.subjectId);
      results.push({
        type: "chapter",
        id: ch.id,
        title: ch.title,
        subtitle: `${subject?.name || "Subject"} · Chapter ${ch.number}`,
        url: `/arena?chapter=${ch.id}`,
        countryCode: subject?.countryCode || "IN",
        badge: ch.verificationStatus,
      });
    }
  }

  return results.slice(0, maxResults);
}

/**
 * Returns complete verification and coverage audit across all 15 countries.
 */
export function getCurriculumCoverageReport() {
  const report: Record<string, { country: Country; tracks: number; subjects: number; chapters: number; lessons: number; verifiedRatio: number }> = {};

  for (const c of COUNTRIES) {
    const tracks = getTracksForCountry(c.code);
    const subjects = ALL_SUBJECTS.filter((s) => s.countryCode === c.code);
    const subjectIds = new Set(subjects.map((s) => s.id));
    const chapters = ALL_CHAPTERS.filter((ch) => subjectIds.has(ch.subjectId));
    const chapterIds = new Set(chapters.map((ch) => ch.id));
    const lessons = ALL_LESSONS.filter((l) => chapterIds.has(l.chapterId));

    const verifiedChapters = chapters.filter((ch) => ch.verificationStatus === "officially_verified").length;
    const verifiedRatio = chapters.length > 0 ? Math.round((verifiedChapters / chapters.length) * 100) : 100;

    report[c.code] = {
      country: c,
      tracks: tracks.length,
      subjects: subjects.length,
      chapters: chapters.length,
      lessons: lessons.length,
      verifiedRatio,
    };
  }

  return report;
}

export { getCountry, getTrack, getTracksForCountry };
