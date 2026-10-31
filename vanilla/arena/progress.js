/**
 * Arena progress model — pure functions only.
 * Ported from js/learning/arena-progress.js; persistence stays in vanilla/arena.js
 * because the server owns writes via /api/arena.
 */

export const ArenaState = Object.freeze({
  LOCKED: "locked",
  AVAILABLE: "available",
  IN_PROGRESS: "in_progress",
  DEFEATED: "defeated",
  MASTERED: "mastered",
});

export const ArenaLevel = Object.freeze({
  FOUNDATION: "foundation",
  APPLICATION: "application",
  CHALLENGE: "challenge",
  BOSS: "boss",
});

const LEVEL_ORDER = [
  ArenaLevel.FOUNDATION,
  ArenaLevel.APPLICATION,
  ArenaLevel.CHALLENGE,
  ArenaLevel.BOSS,
];

export function nextLevel(level) {
  const index = LEVEL_ORDER.indexOf(level);
  return index >= 0 && index < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[index + 1]
    : null;
}

export function createDefaultProgress({
  subjectKey,
  trackId,
  subject,
  classNum,
  chapters,
}) {
  const map = {};
  chapters.forEach((chapter, index) => {
    map[chapter.conceptId] = {
      state: index === 0 ? ArenaState.AVAILABLE : ArenaState.LOCKED,
      level: ArenaLevel.FOUNDATION,
      bestScore: 0,
      attempts: 0,
      lastAttemptAt: null,
      defeatedAt: null,
      masteryScore: 0,
    };
  });

  return {
    subjectKey,
    trackId,
    subject,
    classNum: classNum ?? null,
    chapters: map,
    total: chapters.length,
    defeated: 0,
    progressPct: 0,
    currentChapterId: chapters[0]?.conceptId || null,
    finalBossUnlocked: false,
    finalBossDefeated: false,
    finalBossScore: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    arenaVersion: 1,
  };
}

export function computeProgress(progress, chapters) {
  const map = progress.chapters || {};
  let defeated = 0;

  for (const chapter of chapters) {
    const state = map[chapter.conceptId]?.state;
    if (state === ArenaState.DEFEATED || state === ArenaState.MASTERED) {
      defeated += 1;
    }
  }

  const total = chapters.length;
  const progressPct = total
    ? Math.min(100, Math.round((defeated / total) * 100))
    : 0;

  let currentChapterId = null;
  for (const chapter of chapters) {
    const state = map[chapter.conceptId]?.state;
    if (state === ArenaState.AVAILABLE || state === ArenaState.IN_PROGRESS) {
      currentChapterId = chapter.conceptId;
      break;
    }
  }

  if (!currentChapterId) {
    let lastDefeatedIndex = -1;
    chapters.forEach((chapter, index) => {
      const state = map[chapter.conceptId]?.state;
      if (state === ArenaState.DEFEATED || state === ArenaState.MASTERED) {
        lastDefeatedIndex = index;
      }
    });
    if (lastDefeatedIndex >= 0 && lastDefeatedIndex + 1 < chapters.length) {
      currentChapterId = chapters[lastDefeatedIndex + 1].conceptId;
    } else if (total && defeated === total) {
      currentChapterId = null;
    } else {
      currentChapterId = chapters[0]?.conceptId || null;
    }
  }

  return {
    ...progress,
    defeated,
    total,
    progressPct,
    currentChapterId,
    finalBossUnlocked: total > 0 && defeated === total,
  };
}

export function canBattle(chapter, progress, chapters) {
  const entry = progress.chapters[chapter.conceptId];
  if (!entry) return { ok: false, reason: "Chapter not in progress map" };
  if (entry.state === ArenaState.LOCKED) {
    return { ok: false, reason: "Locked — defeat previous chapter first" };
  }

  for (const prerequisite of chapter.prerequisites || []) {
    const previous = progress.chapters[prerequisite];
    if (
      previous &&
      previous.state !== ArenaState.DEFEATED &&
      previous.state !== ArenaState.MASTERED
    ) {
      return { ok: false, reason: "Prerequisite not defeated" };
    }
  }

  return { ok: true };
}

export function applyAttempt(
  progress,
  chapters,
  conceptId,
  { score, masteryScore = null }
) {
  const clone = JSON.parse(JSON.stringify(progress));
  const entry = clone.chapters[conceptId];
  if (!entry) return clone;
  entry.attempts = (entry.attempts || 0) + 1;
  entry.lastAttemptAt = new Date().toISOString();
  if (typeof score === "number") {
    entry.bestScore = Math.max(entry.bestScore || 0, score);
  }
  if (masteryScore != null) entry.masteryScore = masteryScore;
  if (entry.state === ArenaState.AVAILABLE) entry.state = ArenaState.IN_PROGRESS;
  clone.updatedAt = new Date().toISOString();
  return clone;
}

export function defeatChapter(
  progress,
  chapters,
  conceptId,
  { score, masteryScore } = {}
) {
  const clone = JSON.parse(JSON.stringify(progress));
  const entry = clone.chapters[conceptId];
  if (!entry) return clone;
  entry.state =
    masteryScore >= 0.85 ? ArenaState.MASTERED : ArenaState.DEFEATED;
  entry.defeatedAt = new Date().toISOString();
  if (typeof score === "number") {
    entry.bestScore = Math.max(entry.bestScore || 0, score);
  }
  if (masteryScore != null) entry.masteryScore = masteryScore;

  const index = chapters.findIndex((chapter) => chapter.conceptId === conceptId);
  if (index >= 0 && index + 1 < chapters.length) {
    const next = clone.chapters[chapters[index + 1].conceptId];
    if (next && next.state === ArenaState.LOCKED) next.state = ArenaState.AVAILABLE;
  }

  const computed = computeProgress(clone, chapters);
  computed.updatedAt = new Date().toISOString();
  return computed;
}

export const DEFEAT_SCORE = 0.6;
export const BOSS_DEFEAT_SCORE = 0.65;
export const FINAL_BOSS_DEFEAT_SCORE = 0.7;

export function isDefeatedScore(score, isBoss = false) {
  return score >= (isBoss ? BOSS_DEFEAT_SCORE : DEFEAT_SCORE);
}
