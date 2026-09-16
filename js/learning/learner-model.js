/**
 * Aquila Learning — Learner Model Orchestrator (Prompt 2)
 * Re-exports and migration helper for legacy users.
 */

export * from "./schema.js";
export * from "./contracts.js";
export * from "./onboarding.js";
export * from "./evidence.js";
export * from "./misconceptions.js";
export * from "./history.js";
export * from "./ai-context.js";

import { createAcademicContext } from "./contracts.js";

/**
 * Migrate a legacy profile (pre-Prompt 2) into the new shape without deleting.
 * Backfills AcademicContext defaults and preserves existing fields.
 */
export function migrateLegacyProfile(raw) {
  if (!raw || typeof raw !== "object") return { academic: createAcademicContext({}), preferences: {} };
  const academic = createAcademicContext({
    country: raw.academic?.country ?? raw.country ?? null,
    state: raw.academic?.state ?? raw.state ?? null,
    board: raw.academic?.board ?? raw.board ?? raw.exam ?? null,
    grade: raw.academic?.grade ?? raw.grade ?? raw.class ?? null,
    curriculumId: raw.academic?.curriculumId ?? null,
    academicYear: raw.academic?.academicYear ?? raw.academicYear ?? null,
    track: raw.academic?.track ?? raw.track ?? null,
    schoolName: raw.academic?.schoolName ?? null,
  });
  return {
    ...raw,
    academic,
    preferences: raw.preferences || { preferredStyle: raw.preferredStyle || null },
    learningSchemaVersion: raw.learningSchemaVersion ?? 1,
    onboardingVersion: raw.onboardingVersion ?? 1,
  };
}
