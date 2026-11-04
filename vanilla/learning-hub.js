/**
 * Understand / Learning Hub controller — Production-Ready Adaptive Curriculum Experience
 *
 * Implements the complete unified 6-stage learning loop:
 *   1. Understand & Explain (high-clarity sequenced instruction + strategy + key ideas)
 *   2. Visualize (interactive SVG/3D spatial models with observation prompts)
 *   3. Practice (progressive difficulty questions + multi-tier hint ladders)
 *   4. Evaluate (misconception diagnosis with our 10 clinical categories)
 *   5. Adapt (dynamic strategy switching & personalized next actions)
 *   6. Remember (Ebbinghaus spaced revision + active recall + Study Planner integration)
 */

import {
  callTutor,
  emitLearningEvent,
  formatRelativeRevision,
  TutorError,
} from "../lib/learning/types";
import { createLifecycle } from "./shared/lifecycle.js";
import { el, qs } from "./shared/dom.js";
import { renderTeaching } from "./shared/learning-blocks.js";

const EMPTY_SELECTION = { track: "", classNum: null, subject: "", query: "" };

const RAIL_STEPS = [
  "Explain",
  "Visualize",
  "Practice",
  "Evaluate",
  "Adapt",
  "Remember",
];

const VERDICT_META = {
  correct: { label: "Mastered", className: "verdict-good" },
  partially_correct: { label: "Developing", className: "verdict-partial" },
  incorrect: { label: "Needs Support", className: "verdict-bad" },
  unknown: { label: "Not Evaluated", className: "verdict-unknown" },
};

function contextFromConceptId(conceptId) {
  const parts = String(conceptId || "").split(".");
  if (parts[0] === "jee") {
    return {
      track: parts[1] === "advanced" ? "jee_advanced" : "jee_main",
      classNum: null,
    };
  }
  if (parts[0] === "neet") return { track: "neet", classNum: null };
  if (parts[0] === "cbse" || parts[0] === "maharashtra") {
    return { track: parts[0], classNum: Number(parts[1]) || null };
  }
  return { track: "", classNum: null };
}

function sourceLabel(source) {
  if (source === "authored") return "Reviewed Curriculum Pack";
  if (source === "ai") return "Adaptive Curriculum Engine";
  if (source === "unavailable") return "Curriculum Syllabus Outline";
  return source;
}

function statusLabel(status) {
  return String(status || "not started").replace(/_/g, " ");
}

export function mount(root, ctx) {
  if (!root) return undefined;

  const lifecycle = createLifecycle();
  const getToken = () => ctx.user.getIdToken();

  const state = {
    catalog: null,
    catalogLoading: true,
    catalogError: null,
    selection: { ...EMPTY_SELECTION },
    continueTopic: null,
    query: "",
    lesson: null,
    check: null,
    pendingNext: null,
    evaluation: null,
    attempts: [],
    sessionSummary: null,
    mastery: null,
    review: null,
    nextChapter: null,
    lessonLoading: false,
    lessonError: null,
    evaluating: false,
    progressNotice: null,
    reteachNotice: null,
    requestedConceptId: null,
    currentStage: 0,
    unlockedStage: 0,
    activeConceptIndex: 1,
  };

  const els = {
    session: qs(root, "#hubSession"),
    sessionBack: qs(root, "#hubSessionBack"),
    sessionLoading: qs(root, "#hubSessionLoading"),
    sessionError: qs(root, "#hubSessionError"),
    sessionErrorText: qs(root, "#hubSessionErrorText"),
    sessionRetry: qs(root, "#hubSessionRetry"),
    sessionBody: qs(root, "#hubSessionBody"),
    eyebrow: qs(root, "#hubEyebrow"),
    lessonTitle: qs(root, "#hubLessonTitle"),
    metaRow: qs(root, "#hubMetaRow"),
    rail: qs(root, "#hubRail"),
    mastery: qs(root, "#hubMastery"),
    prereqs: qs(root, "#hubPrereqs"),
    reteachNotice: qs(root, "#hubReteachNotice"),
    teaching: qs(root, "#hubTeaching"),
    reteachNote: qs(root, "#hubReteachNote"),
    lessonRetry: qs(root, "#hubLessonRetry"),
    practice: qs(root, "#hubPractice"),
    check: qs(root, "#hubCheck"),
    nextRow: qs(root, "#hubNextRow"),
    nextBtn: qs(root, "#hubNextBtn"),
    nextNote: qs(root, "#hubNextNote"),
    completion: qs(root, "#hubCompletion"),
    stageNav: qs(root, "#hubStageNav"),
    completeCallout: qs(root, "#hubCompleteCallout"),
    completeText: qs(root, "#hubCompleteText"),
    completeChoose: qs(root, "#hubCompleteChoose"),
    progressNotice: qs(root, "#hubProgressNotice"),
    visual: qs(root, "#hubVisual"),
    visualFallback: qs(root, "#hubVisualFallback"),
    rememberText: qs(root, "#hubRememberText"),
    reviewState: qs(root, "#hubReviewState"),
    nextStepText: qs(root, "#hubNextStepText"),
    openNext: qs(root, "#hubOpenNext"),
    pick: qs(root, "#hubPick"),
    pickTitle: qs(root, "#hubPickTitle"),
    continue: qs(root, "#hubContinue"),
    continueTitle: qs(root, "#hubContinueTitle"),
    continueMeta: qs(root, "#hubContinueMeta"),
    continueBtn: qs(root, "#hubContinueBtn"),
    catalogLoading: qs(root, "#hubCatalogLoading"),
    catalogError: qs(root, "#hubCatalogError"),
    catalogErrorText: qs(root, "#hubCatalogErrorText"),
    catalogRetry: qs(root, "#hubCatalogRetry"),
    catalog: qs(root, "#hubCatalog"),
    breadcrumb: qs(root, "#hubBreadcrumb"),
    back: qs(root, "#hubBack"),
    breadcrumbText: qs(root, "#hubBreadcrumbText"),
    trackNotice: qs(root, "#hubTrackNotice"),
    boards: qs(root, "#hubBoards"),
    classes: qs(root, "#hubClasses"),
    subjects: qs(root, "#hubSubjects"),
    chapterStep: qs(root, "#hubChapterStep"),
    searchForm: qs(root, "#hubSearchForm"),
    searchInput: qs(root, "#hub-search-input"),
    searchClear: qs(root, "#hubSearchClear"),
    chapters: qs(root, "#hubChapters"),
    empty: qs(root, "#hubEmpty"),
    // Enhanced Understand Elements
    chapterOverview: qs(root, "#hubChapterOverview"),
    chapterDescription: qs(root, "#hubChapterDescription"),
    chapterProgressBadge: qs(root, "#hubChapterProgressBadge"),
    conceptsRoadmap: qs(root, "#hubConceptsRoadmap"),
    roadmapProgressText: qs(root, "#hubRoadmapProgressText"),
    activeConceptBadge: qs(root, "#hubActiveConceptBadge"),
    activeConceptTitle: qs(root, "#hubActiveConceptTitle"),
    activeConceptDesc: qs(root, "#hubActiveConceptDesc"),
    adaptCard: qs(root, "#hubAdaptCard"),
    adaptBody: qs(root, "#hubAdaptBody"),
    adaptText: qs(root, "#hubAdaptText"),
    plannerLink: qs(root, "#hubPlannerLink"),
  };

  let checkView = null;
  const visual = { source: null, unmount: null };

  hydrateTopbar(root, ctx);
  bindEvents();

  // Read URL query parameters to enable direct deep-linking to dedicated concept pages
  const urlParams = typeof window !== "undefined" && window.location ? new URLSearchParams(window.location.search) : null;
  const initialConceptId = urlParams ? (urlParams.get("conceptId") || urlParams.get("chapter")) : null;
  const initialSubConceptId = urlParams ? (urlParams.get("subConceptId") || urlParams.get("concept")) : null;
  const initialTrack = urlParams ? urlParams.get("track") : null;
  const initialClass = urlParams ? Number(urlParams.get("class") || urlParams.get("classNum")) : null;
  const initialSubject = urlParams ? urlParams.get("subject") : null;

  if (initialTrack) state.selection.track = initialTrack;
  if (initialClass) state.selection.classNum = initialClass;
  if (initialSubject) state.selection.subject = initialSubject;

  render();

  if (initialConceptId) {
    state.activeSubConceptId = initialSubConceptId;
    void loadLesson(initialConceptId, { mode: "start", subConceptId: initialSubConceptId });
  } else {
    void fetchCatalog(EMPTY_SELECTION);
  }

  return () => {
    clearVisual();
    lifecycle.dispose();
  };

  /* ── Topbar and user profile ────────────────────────────────────────── */

  function hydrateTopbar(host, context) {
    const user = context.user;
    const displayName =
      context.userData?.displayName ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "there");

    const greeting = qs(host, "#greetingName");
    if (greeting) greeting.textContent = displayName;

    const avatar = qs(host, "#topbarAvatar");
    if (avatar) {
      avatar.alt = displayName;
      const initial = (displayName.charAt(0) || "U").toUpperCase();
      const initialSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="100%" height="100%" fill="%2318181b"/><text x="50%" y="54%" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="%23ffffff" dominant-baseline="middle" text-anchor="middle">${encodeURIComponent(initial)}</text></svg>`;
      if (user.photoURL) {
        avatar.src = user.photoURL;
        avatar.onerror = () => {
          avatar.src = initialSvg;
        };
      } else {
        avatar.src = initialSvg;
      }
    }
  }

  /* ── Event Bindings ─────────────────────────────────────────────────── */

  function bindEvents() {
    lifecycle.on(els.sessionBack, "click", closeSession);
    lifecycle.on(els.sessionRetry, "click", () => {
      if (state.requestedConceptId) {
        void loadLesson(state.requestedConceptId, { mode: "start" });
      }
    });
    lifecycle.on(els.lessonRetry, "click", () => {
      if (state.lesson) void loadLesson(state.lesson.conceptId, { mode: "start" });
    });
    lifecycle.on(els.nextBtn, "click", advanceToNextQuestion);
    lifecycle.on(els.completeChoose, "click", closeSession);
    lifecycle.on(els.openNext, "click", () => {
      if (state.nextChapter) openChapter(state.nextChapter);
    });

    lifecycle.on(els.catalogRetry, "click", () => void fetchCatalog(state.selection));
    lifecycle.on(els.continueBtn, "click", () => {
      if (state.continueTopic) resumeTopic(state.continueTopic);
    });
    lifecycle.on(els.back, "click", showBack);

    lifecycle.on(els.searchForm, "submit", (event) => {
      event.preventDefault();
      void fetchCatalog({ ...state.selection, query: state.query });
    });
    lifecycle.on(els.searchInput, "input", () => {
      state.query = els.searchInput.value;
    });
    lifecycle.on(els.searchClear, "click", () => {
      state.query = "";
      els.searchInput.value = "";
      void fetchCatalog({ ...state.selection, query: "" });
    });
  }

  /* ── Core Rendering Shell ───────────────────────────────────────────── */

  function render() {
    const inSession = Boolean(state.lesson || state.lessonLoading);
    if (els.session) els.session.hidden = !inSession;
    if (els.pick) els.pick.hidden = inSession;

    renderSession();
    renderPick();
  }

  function renderSession() {
    if (!els.session) return;
    els.session.setAttribute("aria-busy", state.lessonLoading ? "true" : "false");
    if (els.sessionLoading) els.sessionLoading.hidden = !state.lessonLoading;

    const showError = Boolean(state.lessonError) && !state.lessonLoading;
    if (els.sessionError) els.sessionError.hidden = !showError;
    if (showError && els.sessionErrorText) {
      els.sessionErrorText.textContent = state.lessonError;
    }
    if (els.sessionRetry) els.sessionRetry.hidden = !state.requestedConceptId;

    const showBody = Boolean(state.lesson) && !state.lessonLoading;
    if (els.sessionBody) els.sessionBody.hidden = !showBody;
    if (!showBody) {
      clearVisual();
      return;
    }
    renderSessionBody();
  }

  function renderSessionBody() {
    const lesson = state.lesson;
    if (!lesson) return;

    const revisionAt =
      state.review?.nextReviewAt || lesson.revision?.nextReviewAt || null;
    const revisionLabel = formatRelativeRevision(revisionAt);

    // Header eyebrow & title
    if (els.eyebrow) {
      els.eyebrow.textContent = `${
        lesson.trackLabel ||
        (state.selection.track ? state.selection.track.replace("_", " ") : "Understand")
      }${state.selection.classNum ? ` · Class ${state.selection.classNum}` : ""}${
        lesson.subject ? ` · ${lesson.subject}` : ""
      }`;
    }
    if (els.lessonTitle) els.lessonTitle.textContent = lesson.name;

    // Metadata pills
    if (els.metaRow) {
      els.metaRow.replaceChildren();
      els.metaRow.appendChild(
        el(
          "span",
          `lh-pill${lesson.level === "advanced" ? " lh-pill--accent" : ""}`,
          `${lesson.level.charAt(0).toUpperCase()}${lesson.level.slice(1)} level`
        )
      );
      els.metaRow.appendChild(el("span", "lh-pill", sourceLabel(lesson.source)));
      if (lesson.retry) {
        els.metaRow.appendChild(el("span", "lh-pill lh-pill--warn", "AI provider fallback active"));
      }
      if (revisionLabel) {
        els.metaRow.appendChild(
          el("span", "lh-pill lh-pill--ok", `Revision ${revisionLabel}`)
        );
      }
      if (lesson.teachingStrategy) {
        els.metaRow.appendChild(
          el("span", "lh-pill lh-pill--accent", lesson.teachingStrategy.label)
        );
      }
    }

    // Render Chapter Overview & Concept Roadmap
    renderChapterOverview(lesson);

    // Active Concept Stepper & Title
    renderActiveConcept(lesson);

    // Render the 6-stage Rail
    renderRail();

    // Render Stage 0: Mastery & Prerequisites
    renderMastery();
    renderPrerequisites();

    // Reteach notification if strategy changed
    if (els.reteachNotice) {
      if (state.reteachNotice) {
        els.reteachNotice.textContent = `Pivoting explanation strategy: ${state.reteachNotice}.`;
        els.reteachNotice.hidden = false;
      } else {
        els.reteachNotice.hidden = true;
      }
    }

    // Render Stage 1: Teaching explanation
    renderTeachingPanel(lesson);

    // Render Stage 3: Practice & diagnostic evaluation
    renderPractice();

    // Render Stage 5: Adapt Card
    renderAdaptCard();

    // Render Stage 6: Remember & Completion
    renderCompletion(revisionAt, revisionLabel);
    renderAside(revisionLabel);

    // Render contextual Stage navigation bar
    renderStageNav();
  }

  /* ── Chapter Overview & Concept Roadmap ─────────────────────────────── */

  function renderChapterOverview(lesson) {
    if (!els.chapterOverview) return;
    const outline = lesson.chapterOutline;

    if (els.chapterDescription && outline?.chapterSummary) {
      els.chapterDescription.textContent = outline.chapterSummary;
    }

    if (els.chapterProgressBadge && outline) {
      els.chapterProgressBadge.textContent = `${outline.completedConcepts} of ${outline.totalConcepts} concepts mastered (${outline.progressPercent}%)`;
    }

    if (els.roadmapProgressText && outline) {
      els.roadmapProgressText.textContent = `${outline.estimatedMinutes} min study effort · ${outline.difficultyLabel || "Structured"} curriculum`;
    }

    if (els.conceptsRoadmap && outline && Array.isArray(outline.concepts)) {
      els.conceptsRoadmap.replaceChildren();
      outline.concepts.forEach((concept, idx) => {
        const isCurrent = concept.index === state.activeConceptIndex;
        const isDone = concept.status === "mastered";
        const inProgress = concept.status === "in_progress";

        const item = el(
          "button",
          `hub-roadmap-item${isCurrent ? " is-active" : ""}${isDone ? " is-done" : ""}${inProgress ? " is-progress" : ""}`
        );
        item.type = "button";

        const numSpan = el("span", "hub-roadmap-num", isDone ? "✓" : String(concept.index));
        const bodySpan = el("div", "hub-roadmap-body");
        bodySpan.appendChild(el("span", "hub-roadmap-concept-title", concept.title));
        bodySpan.appendChild(
          el("span", "hub-roadmap-concept-meta", `${concept.estimatedMinutes} min · ${concept.description.slice(0, 90)}…`)
        );

        const statusTag = el(
          "span",
          `hub-roadmap-tag${isDone ? " tag-good" : inProgress ? " tag-active" : ""}`,
          isDone ? "Mastered" : inProgress ? "In Progress" : "Start"
        );

        item.append(numSpan, bodySpan, statusTag);
        lifecycle.on(item, "click", () => {
          state.activeConceptIndex = concept.index;
          state.activeSubConceptId = concept.id;
          state.currentStage = 0;
          state.unlockedStage = Math.max(state.unlockedStage || 0, 0);
          void loadLesson(state.lesson.chapterId || state.lesson.conceptId, { mode: "start", subConceptId: concept.id });
        });

        els.conceptsRoadmap.appendChild(item);
      });
    }
  }

  function renderActiveConcept(lesson) {
    const outline = lesson.chapterOutline;
    const concepts = outline?.concepts || [];
    const activeConcept = concepts.find((c) => c.index === state.activeConceptIndex || c.id === state.activeSubConceptId || c.fullId === state.activeSubConceptId) || concepts[0] || {
      index: 1,
      title: lesson.name,
      description: "Foundational conceptual instruction and practice."
    };

    if (els.activeConceptBadge) {
      const subjectTag = lesson.subjectType ? `${lesson.subjectType.toUpperCase()} · ` : "";
      els.activeConceptBadge.textContent = `${subjectTag}Concept ${activeConcept.index} of ${concepts.length || 1}`;
    }
    if (els.activeConceptTitle) {
      els.activeConceptTitle.textContent = lesson.name || activeConcept.title;
    }
    if (els.activeConceptDesc) {
      els.activeConceptDesc.textContent = activeConcept.description;
    }
  }

  /* ── 6-Stage Progress Stepper Rail ──────────────────────────────────── */

  function renderRail() {
    if (!els.rail) return;
    const active = state.currentStage ?? 0;

    els.rail.replaceChildren();
    RAIL_STEPS.forEach((step, index) => {
      const isCurrent = index === active;
      const isPast = index < active;
      const isUnlocked = index <= (state.unlockedStage ?? 0);

      const item = el(
        "li",
        isCurrent
          ? "is-active"
          : isPast
          ? "is-done"
          : isUnlocked
          ? "is-unlocked"
          : "is-locked"
      );
      if (isCurrent) item.setAttribute("aria-current", "step");

      if (isUnlocked) {
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.setAttribute(
          "aria-label",
          `Stage ${index + 1}: ${step}${isPast ? " (completed)" : isCurrent ? " (current)" : ""}`
        );
        item.addEventListener("click", () => goToStage(index));
        item.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToStage(index);
          }
        });
      }

      const dot = el("span", "learn-rail-dot", isPast ? "✓" : String(index + 1));
      dot.setAttribute("aria-hidden", "true");
      item.append(dot, el("span", "learn-rail-text", step));
      els.rail.appendChild(item);
    });
  }

  function goToStage(targetStage) {
    if (targetStage < 0 || targetStage >= RAIL_STEPS.length) return;
    if (targetStage > (state.unlockedStage ?? 0)) return;
    state.currentStage = targetStage;
    state.unlockedStage = Math.max(state.unlockedStage ?? 0, targetStage);
    renderSessionBody();
    void persistStageProgress(state.currentStage, state.unlockedStage);
  }

  async function persistStageProgress(stageIndex, unlockedStage) {
    if (!state.lesson || !state.lesson.conceptId) return;
    try {
      await callTutor(getToken, "state", {
        conceptId: state.lesson.conceptId,
        track: state.selection.track || undefined,
        classNum: state.selection.classNum || undefined,
        stageIndex,
        unlockedStage,
        activeConceptIndex: state.activeConceptIndex,
      });
    } catch {
      /* Stage persistence is best effort */
    }
  }

  /* ── Stage 0: Mastery & Prerequisites ───────────────────────────────── */

  function renderMastery() {
    if (!els.mastery) return;
    const mastery = state.mastery || state.lesson?.mastery;
    if (!mastery) {
      els.mastery.replaceChildren();
      return;
    }
    const session = state.sessionSummary || null;
    const score = mastery.score == null ? null : mastery.score;
    const percent = score === null ? 0 : Math.round(score * 100);

    const wrap = el("div", "learn-mastery");
    wrap.setAttribute("aria-label", "Mastery and evidence strength");

    const head = el("div", "learn-mastery-head");
    head.append(
      el("span", "learn-mastery-label", "Concept Mastery"),
      el("span", "learn-mastery-value", score === null ? "Initial Prior" : `${percent}% · ${mastery.state || "Developing"}`)
    );
    wrap.appendChild(head);

    const bar = el("div", "learn-mastery-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(percent));
    bar.setAttribute("aria-label", "Mastery percentage");
    const fill = el("span");
    fill.style.width = `${percent}%`;
    bar.appendChild(fill);
    wrap.appendChild(bar);

    const note = session
      ? `${session.correctCount} correct of ${session.answeredCount} answered in this session. ${session.note}`
      : mastery.evidence > 0
      ? `Calibrated from ${mastery.attempts || 1} independent answers with difficulty weighting.`
      : "Answer practice questions to calibrate your mastery score.";
    wrap.appendChild(el("p", "learn-mastery-note", note));

    els.mastery.replaceChildren(wrap);
  }

  function renderPrerequisites() {
    if (!els.prereqs) return;
    const prerequisites = state.lesson?.prerequisites || [];
    els.prereqs.replaceChildren();
    if (!prerequisites.length) return;

    const wrap = el("div", "learn-prereqs");
    wrap.appendChild(el("span", "learn-feedback-label", "Foundational Prerequisites"));
    const chips = el("div", "learn-chips");
    for (const prereq of prerequisites) {
      const isKnown = prereq.status === "likely known" || prereq.isMastered;
      const chip = el(
        "span",
        `learn-chip${isKnown ? " is-good" : ""}`,
        prereq.name
      );
      chip.appendChild(el("em", null, ` · ${isKnown ? "Mastered" : "Check foundation"}`));
      chips.appendChild(chip);
    }
    wrap.appendChild(chips);
    els.prereqs.appendChild(wrap);
  }

  /* ── Stage 1: Sequenced Explanation Panel ───────────────────────────── */

  function renderTeachingPanel(lesson) {
    if (!els.teaching) return;
    els.teaching.replaceChildren(
      renderTeaching({
        level: lesson.level,
        source: lesson.source,
        reviewed: lesson.reviewed,
        directAnswer: lesson.intro || "",
        sections: lesson.sections || [],
        example: lesson.workedExample,
        advanced: lesson.advanced || null,
        generatedNotice: lesson.generatedNotice,
        exampleFirst: Boolean(lesson.reteach),
        keyIdea: lesson.keyIdea || (lesson.sections && lesson.sections[0] ? lesson.sections[0].heading : null),
        teachingStrategy: lesson.teachingStrategy,
        crossSubjectLink: lesson.crossSubjectLink,
      })
    );

    if (els.reteachNote) {
      els.reteachNote.replaceChildren();
      if (lesson.reteach?.note) {
        els.reteachNote.appendChild(
          el("p", "learn-callout learn-callout--soft", lesson.reteach.note)
        );
      }
    }

    if (els.lessonRetry) els.lessonRetry.hidden = lesson.source !== "unavailable";
  }

  /* ── Stage 3: Practice & Diagnostic Question ────────────────────────── */

  function renderPractice() {
    const check = state.check;
    const showPractice = Boolean(check) && (state.currentStage ?? 0) >= 2;
    if (els.practice) els.practice.hidden = !showPractice;
    if (!check) {
      checkView = null;
      if (els.check) els.check.replaceChildren();
      if (els.nextRow) els.nextRow.hidden = true;
      return;
    }

    ensureCheckView(check);
    if (checkView) checkView.applyEvaluation();
    if (els.nextRow) {
      els.nextRow.hidden = !(
        state.evaluation &&
        state.pendingNext &&
        !state.sessionSummary?.completed
      );
      if (els.nextNote) {
        els.nextNote.hidden = !(
          state.evaluation && state.evaluation.verdict !== "correct"
        );
      }
    }
  }

  function ensureCheckView(check) {
    if (checkView && checkView.questionId === check.questionId) return;
    checkView = buildCheckCard(check);
    if (els.check) els.check.replaceChildren(checkView.card);
  }

  function buildCheckCard(check) {
    const card = el("div", "learn-check");

    const head = el("div", "learn-check-head");
    head.append(
      el("span", "learn-badge learn-badge--accent", "Check Understanding"),
      el("span", "learn-check-difficulty", `Difficulty Level ${check.difficulty}/3`)
    );
    card.appendChild(head);
    card.appendChild(el("p", "learn-check-prompt", check.prompt));

    const form = el("form");
    const inputId = `answer-${check.questionId || `hub-${Date.now()}`}`;
    const label = el("label", "learn-check-label", "Your reasoning & calculation");
    label.htmlFor = inputId;
    form.appendChild(label);

    const textarea = el("textarea", "learn-textarea");
    textarea.id = inputId;
    textarea.rows = 4;
    textarea.placeholder = "Write your answer and explain your scientific/mathematical reasoning in full…";
    form.appendChild(textarea);

    const actions = el("div", "learn-check-actions");
    const submit = el("button", "btn btn-primary", "Submit Answer");
    submit.type = "submit";
    submit.disabled = true;
    actions.appendChild(submit);

    let hint = null;
    let hintButton = null;
    if (check.hint) {
      hintButton = el("button", "btn btn-secondary", "Need a hint?");
      hintButton.type = "button";
      hintButton.setAttribute("aria-expanded", "false");
      actions.appendChild(hintButton);
      hint = el("p", "learn-hint", check.hint);
      hint.hidden = true;
      card.appendChild(hint);
    }
    form.appendChild(actions);

    const error = el("p", "learn-error");
    error.setAttribute("role", "alert");
    error.hidden = true;
    form.appendChild(error);

    const evaluationHost = el("div");
    card.appendChild(form);
    card.appendChild(evaluationHost);

    const locked = () =>
      Boolean(state.evaluation && state.evaluation.verdict !== "unknown");

    const sync = () => {
      const isLocked = locked();
      textarea.disabled = state.evaluating || isLocked;
      submit.disabled = !textarea.value.trim() || state.evaluating || isLocked;
      submit.textContent = state.evaluating ? "Evaluating reasoning…" : "Submit Answer";
    };

    lifecycle.on(textarea, "input", () => {
      error.hidden = true;
      sync();
    });

    if (hintButton) {
      lifecycle.on(hintButton, "click", () => {
        hint.hidden = !hint.hidden;
        hintButton.textContent = hint.hidden ? "Need a hint?" : "Hide hint";
        hintButton.setAttribute("aria-expanded", hint.hidden ? "false" : "true");
      });
    }

    lifecycle.on(form, "submit", async (event) => {
      event.preventDefault();
      const answer = textarea.value.trim();
      if (!answer || state.evaluating || locked()) return;
      error.hidden = true;
      try {
        await submitAnswer(answer);
      } catch (err) {
        if (lifecycle.disposed) return;
        error.textContent =
          err?.message || "Your answer could not be evaluated. Please retry.";
        error.hidden = false;
      } finally {
        if (!lifecycle.disposed) {
          sync();
          if (checkView === view) view.applyEvaluation();
        }
      }
    });

    const view = {
      questionId: check.questionId,
      card,
      applyEvaluation() {
        evaluationHost.replaceChildren();
        if (state.evaluation) {
          evaluationHost.appendChild(renderEvaluation(state.evaluation));
        }
        sync();
      },
    };

    return view;
  }

  /* ── Stage 4: Diagnostic Evaluation ─────────────────────────────────── */

  function renderEvaluation(evaluation) {
    const meta = VERDICT_META[evaluation.verdict] || VERDICT_META.unknown;
    const wrap = el("div", `learn-feedback ${meta.className}`);
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");

    const head = el("div", "learn-feedback-head");
    head.appendChild(el("span", `learn-verdict ${meta.className}`, meta.label));
    if (evaluation.misconceptionCategory) {
      head.appendChild(
        el("span", "learn-misconception-badge", `Diagnosis: ${evaluation.misconceptionCategory.replace(/_/g, " ")}`)
      );
    }
    wrap.appendChild(head);

    if (evaluation.feedback) {
      wrap.appendChild(el("p", "learn-feedback-text", evaluation.feedback));
    }

    appendFeedbackGroup(wrap, "What worked in your reasoning", evaluation.whatWorked);
    appendFeedbackGroup(wrap, "What was missing or needed", evaluation.missing);

    // Specific Mistake & Scientific Reasoning
    if (evaluation.actualMistake) {
      const mistBlock = el("div", "learn-mistake-card");
      mistBlock.append(
        el("span", "learn-feedback-label", "Specific Mistake"),
        el("p", null, evaluation.actualMistake)
      );
      wrap.appendChild(mistBlock);
    }

    if (evaluation.correctReasoning) {
      const corrBlock = el("div", "learn-correct-card");
      corrBlock.append(
        el("span", "learn-feedback-label", "Correct Scientific Reasoning"),
        el("p", null, evaluation.correctReasoning)
      );
      wrap.appendChild(corrBlock);
    }

    if (evaluation.next?.message) {
      wrap.appendChild(el("p", "learn-next-hint", evaluation.next.message));
    }

    const actions = el("div", "learn-feedback-actions");
    if (evaluation.verdict !== "correct") {
      const explain = el("button", "btn btn-secondary", "Explain using different approach");
      explain.type = "button";
      lifecycle.on(explain, "click", reteach);
      actions.appendChild(explain);
    }
    wrap.appendChild(actions);

    return wrap;
  }

  function appendFeedbackGroup(wrap, label, items) {
    if (!Array.isArray(items) || items.length === 0) return;
    const group = el("div", "learn-feedback-group");
    group.appendChild(el("span", "learn-feedback-label", label));
    const list = el("ul");
    for (const item of items) list.appendChild(el("li", null, item));
    group.appendChild(list);
    wrap.appendChild(group);
  }

  async function submitAnswer(answer) {
    const lesson = state.lesson;
    const check = state.check;
    if (!lesson || !check || state.evaluating) return;

    state.evaluating = true;
    state.progressNotice = null;
    renderPractice();

    try {
      const data = await callTutor(getToken, "evaluate", {
        conceptId: lesson.conceptId,
        track: state.selection.track || undefined,
        classNum: state.selection.classNum || undefined,
        subject: lesson.subject || state.selection.subject || undefined,
        topic: lesson.name,
        question: check.prompt,
        questionId: check.questionId,
        difficulty: check.difficulty,
        level: lesson.level,
        answer,
        attempts: state.attempts,
        attemptCount: state.attempts.length,
        surface: "hub",
        cacheKey: check.cacheKey || lesson.cacheKey || undefined,
      });
      if (lifecycle.disposed) return;

      state.evaluation = data.evaluation;
      state.attempts = data.attempts;
      state.pendingNext = data.nextQuestion;
      state.sessionSummary = data.session;
      if (data.nextLevel && data.nextLevel !== lesson.level) {
        lesson.level = data.nextLevel;
      }

      // Unlock evaluation and adapt stages
      state.unlockedStage = Math.max(state.unlockedStage, 4);

      if (data.learningEvent) {
        const saved = await emitLearningEvent(getToken, {
          ...data.learningEvent,
          eventId: `hub_${lesson.conceptId}_${Date.now()}`,
          source: "study_session",
        });
        if (lifecycle.disposed) return;
        if (!saved) {
          state.progressNotice =
            "Your feedback is displayed, but long-term cloud progress synchronization was delayed. Retrying will not duplicate records.";
        } else {
          await refreshState(lesson.conceptId);
          if (lifecycle.disposed) return;
        }
      }

      renderSessionBody();
    } catch (err) {
      throw new TutorError(
        err instanceof TutorError
          ? err.message
          : "Your answer could not be evaluated. Please retry.",
        { status: err instanceof TutorError ? err.status : 0 }
      );
    } finally {
      state.evaluating = false;
      if (!lifecycle.disposed) renderSessionBody();
    }
  }

  function advanceToNextQuestion() {
    if (!state.pendingNext) return;
    state.check = state.pendingNext;
    state.pendingNext = null;
    state.evaluation = null;
    state.reteachNotice = null;
    renderSessionBody();
  }

  function reteach() {
    if (!state.lesson) return;
    state.currentStage = 0;
    void loadLesson(state.lesson.conceptId, { mode: "reteach", keepAttempts: true });
  }

  /* ── Stage 5: Adapt Card ────────────────────────────────────────────── */

  function renderAdaptCard() {
    if (!els.adaptCard || !els.adaptText) return;
    const evaluation = state.evaluation;
    if (!evaluation) {
      els.adaptText.textContent = "Complete practice questions to receive personalized adaptive recommendations.";
      return;
    }

    if (evaluation.verdict === "correct") {
      els.adaptText.textContent = "Demonstrated independent understanding! You are ready to lock this into memory or advance to the next concept.";
    } else {
      const approach = evaluation.misconceptionCategory
        ? `We diagnosed ${evaluation.misconceptionCategory.replace(/_/g, " ")}. Let's review the physical model before moving on.`
        : "Let's examine a different worked example to build confidence.";
      els.adaptText.textContent = approach;
    }
  }

  /* ── Stage 6: Remember & Spaced Retention ───────────────────────────── */

  function renderCompletion(revisionAt, revisionLabel) {
    if (!els.completion) return;
    els.completion.replaceChildren();

    if (state.sessionSummary?.completed) {
      state.unlockedStage = Math.max(state.unlockedStage, 5);

      const card = el("div", "learn-complete");
      card.appendChild(el("h3", "learn-complete-title", "Concept Check Complete"));
      card.appendChild(
        el(
          "p",
          "learn-complete-lead",
          "You have demonstrated multi-question understanding on this curriculum concept."
        )
      );

      const stats = el("dl", "learn-complete-stats");
      stats.appendChild(
        statBlock(
          "Correct Answers",
          `${state.sessionSummary.correctCount} of ${state.sessionSummary.answeredCount}`
        )
      );
      stats.appendChild(statBlock("Mastery State", state.mastery?.state || "Mastered"));
      if (revisionAt) {
        stats.appendChild(
          statBlock(
            "Next Spaced Review",
            revisionLabel || new Date(revisionAt).toLocaleDateString()
          )
        );
      }
      card.appendChild(stats);

      const actions = el("div", "learn-complete-actions");
      const outline = state.lesson?.chapterOutline;
      const nextConcept = outline?.concepts?.find((c) => c.index === state.activeConceptIndex + 1);

      if (nextConcept) {
        const nextConceptBtn = el("button", "btn btn-primary", `Next Concept: ${nextConcept.title} →`);
        nextConceptBtn.type = "button";
        lifecycle.on(nextConceptBtn, "click", () => {
          state.activeConceptIndex = nextConcept.index;
          state.activeSubConceptId = nextConcept.id;
          state.currentStage = 0;
          state.unlockedStage = 0;
          state.check = null;
          state.evaluation = null;
          void loadLesson(state.lesson.chapterId || state.lesson.conceptId, { mode: "start", subConceptId: nextConcept.id });
        });
        actions.appendChild(nextConceptBtn);
      } else if (state.nextChapter) {
        const next = el(
          "button",
          "btn btn-primary",
          `Next Chapter: ${state.nextChapter.name}`
        );
        next.type = "button";
        lifecycle.on(next, "click", () => openChapter(state.nextChapter));
        actions.appendChild(next);
      }

      const exit = el("button", "btn btn-secondary", "Back to Chapter Library");
      exit.type = "button";
      lifecycle.on(exit, "click", closeSession);
      actions.appendChild(exit);
      card.appendChild(actions);

      card.appendChild(
        el(
          "p",
          "learn-complete-note",
          "Mastery is tracked from evidence and updates automatically in your Study Planner and long-term memory."
        )
      );
      els.completion.appendChild(card);
    }

    const showCallout =
      Boolean(state.lesson?.completed) && !state.sessionSummary?.completed;
    if (els.completeCallout) {
      els.completeCallout.hidden = !showCallout;
      if (showCallout && els.completeText) {
        els.completeText.textContent =
          state.lesson.nextStep?.label || "You have reached the end of this concept check.";
      }
    }

    if (els.progressNotice) {
      els.progressNotice.hidden = !state.progressNotice;
      if (state.progressNotice) els.progressNotice.textContent = state.progressNotice;
    }
  }

  function statBlock(term, value) {
    const block = el("div");
    block.append(el("dt", null, term), el("dd", null, value));
    return block;
  }

  function renderAside(revisionLabel) {
    const lesson = state.lesson;
    if (!lesson) return;

    renderVisual(lesson.visual);

    if (els.rememberText) {
      els.rememberText.textContent = revisionLabel
        ? `Review scheduled ${revisionLabel}. Ebbinghaus spaced retention checks ensure long-term retention before exams.`
        : "Complete the practice question to schedule an adaptive retention review.";
    }

    if (els.reviewState) {
      if (state.review?.state) {
        els.reviewState.textContent = `Retention status: ${statusLabel(state.review.state)}`;
        els.reviewState.hidden = false;
      } else {
        els.reviewState.hidden = true;
      }
    }

    const completed = Boolean(state.sessionSummary?.completed);
    const nextChapter = state.nextChapter;
    if (els.nextStepText) {
      els.nextStepText.textContent = completed
        ? nextChapter
          ? `Next chapter: ${nextChapter.name}${
              nextChapter.difficultyLabel ? ` (${nextChapter.difficultyLabel})` : ""
            }.`
          : "Final chapter in this subject. Spaced retention check scheduled."
        : "Study the explanation and complete the practice check to advance.";
    }

    if (els.openNext) {
      els.openNext.hidden = !completed || !nextChapter;
      if (completed && nextChapter) {
        els.openNext.textContent = `Open ${nextChapter.name} →`;
      }
    }
  }

  /* ── Stage 2: Visual Representation Mounting ────────────────────────── */

  function renderVisual(nextVisual) {
    if (!els.visual || !els.visualFallback) return;

    if (!nextVisual) {
      clearVisual();
      els.visualFallback.hidden = false;
      return;
    }

    els.visualFallback.hidden = true;
    if (visual.source === nextVisual) return;

    clearVisual();
    visual.source = nextVisual;
    import("./shared/visual-island.js")
      .then((mod) => {
        if (lifecycle.disposed || visual.source !== nextVisual) return;
        const unmount = mod.mountVisual(els.visual, nextVisual);
        if (typeof unmount === "function") visual.unmount = unmount;
      })
      .catch((err) => console.warn("Could not render visual:", err));
  }

  function clearVisual() {
    if (visual.unmount) {
      try {
        visual.unmount();
      } catch {}
    }
    visual.source = null;
    visual.unmount = null;
    if (els.visual) els.visual.replaceChildren();
  }

  /* ── Stage Navigation Buttons ───────────────────────────────────────── */

  function renderStageNav() {
    if (!els.stageNav) return;
    els.stageNav.replaceChildren();
    if (!state.lesson) return;

    const stage = state.currentStage ?? 0;
    const unlocked = state.unlockedStage ?? 0;
    const wrap = el("div", "hub-stage-nav-inner");

    if (stage > 0) {
      const prevLabels = [
        "",
        "← Back to Overview",
        "← Back to Explanation",
        "← Back to Visual Model",
        "← Back to Practice",
        "← Back to Evaluation",
      ];
      const prevBtn = el("button", "btn btn-secondary hub-stage-btn", prevLabels[stage] || "← Previous Stage");
      prevBtn.type = "button";
      prevBtn.addEventListener("click", () => goToStage(stage - 1));
      wrap.appendChild(prevBtn);
    }

    if (stage === 0) {
      const nextBtn = el("button", "btn btn-primary hub-stage-btn", "Continue to Explanation →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", () => {
        state.unlockedStage = Math.max(unlocked, 1);
        goToStage(1);
      });
      wrap.appendChild(nextBtn);
    } else if (stage === 1) {
      const nextBtn = el("button", "btn btn-primary hub-stage-btn", "Explore Visual Representation →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", () => {
        state.unlockedStage = Math.max(unlocked, 2);
        goToStage(2);
      });
      wrap.appendChild(nextBtn);
    } else if (stage === 2) {
      const nextBtn = el("button", "btn btn-primary hub-stage-btn", "Start Practice Questions →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", () => {
        state.unlockedStage = Math.max(unlocked, 3);
        goToStage(3);
      });
      wrap.appendChild(nextBtn);
    } else if (stage === 3) {
      if (unlocked >= 4) {
        const nextBtn = el("button", "btn btn-primary hub-stage-btn", "View Diagnostic Evaluation →");
        nextBtn.type = "button";
        nextBtn.addEventListener("click", () => goToStage(4));
        wrap.appendChild(nextBtn);
      }
    } else if (stage === 4) {
      const nextBtn = el("button", "btn btn-primary hub-stage-btn", "Lock into Memory (Spaced Revision) →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", () => {
        state.unlockedStage = Math.max(unlocked, 5);
        goToStage(5);
      });
      wrap.appendChild(nextBtn);
    } else if (stage === 5) {
      const outline = state.lesson?.chapterOutline;
      const nextConcept = outline?.concepts?.find((c) => c.index === state.activeConceptIndex + 1);
      if (nextConcept) {
        const nextConceptBtn = el("button", "btn btn-primary hub-stage-btn", `Advance to Concept ${nextConcept.index} →`);
        nextConceptBtn.type = "button";
        nextConceptBtn.addEventListener("click", () => {
          state.activeConceptIndex = nextConcept.index;
          state.currentStage = 0;
          state.unlockedStage = 0;
          state.check = null;
          state.evaluation = null;
          renderSessionBody();
        });
        wrap.appendChild(nextConceptBtn);
      }
    }

    els.stageNav.appendChild(wrap);
  }

  /* ── Catalog & Chapter Selection ────────────────────────────────────── */

  async function fetchCatalog(next) {
    state.catalogLoading = true;
    state.catalogError = null;
    render();

    try {
      const payload = {};
      if (next.track) payload.track = next.track;
      if (next.classNum) payload.classNum = next.classNum;
      if (next.subject) payload.subject = next.subject;
      if (next.query) payload.query = next.query;

      const res = await callTutor(getToken, "catalog", payload);
      if (lifecycle.disposed) return;

      state.catalog = res.catalog;
      if (res.hub?.last) state.continueTopic = res.hub.last;
      state.selection = {
        ...next,
        classNum: res.catalog.classNum ?? next.classNum,
        subject: res.catalog.subject ?? next.subject,
        query: next.query ?? state.selection.query,
      };
    } catch (err) {
      if (lifecycle.disposed) return;
      state.catalogError =
        err instanceof TutorError
          ? err.message
          : "The curriculum could not be loaded. Please retry.";
    } finally {
      if (!lifecycle.disposed) {
        state.catalogLoading = false;
        render();
      }
    }
  }

  function renderPick() {
    if (!els.pick || els.pick.hidden) return;

    const catalog = state.catalog;
    if (els.pickTitle) {
      els.pickTitle.textContent =
        catalog?.step === "chapter"
          ? "Select a Chapter to Master"
          : catalog?.step === "subject"
          ? "Choose a Subject"
          : catalog?.step === "class"
          ? "Select Your Class"
          : "What do you want to master today?";
    }

    if (els.continue) {
      if (state.continueTopic) {
        if (els.continueTitle) els.continueTitle.textContent = state.continueTopic.name;
        if (els.continueMeta) els.continueMeta.textContent = `${state.continueTopic.subject || "General"} · In Progress`;
        els.continue.hidden = false;
      } else {
        els.continue.hidden = true;
      }
    }

    if (els.catalogLoading) els.catalogLoading.hidden = !(state.catalogLoading && !catalog);

    if (els.catalogError) {
      els.catalogError.hidden = !state.catalogError;
      if (state.catalogError && els.catalogErrorText) els.catalogErrorText.textContent = state.catalogError;
    }

    if (els.catalog) els.catalog.hidden = !catalog;
    if (!catalog) return;

    const showBreadcrumb = catalog.step !== "board";
    if (els.breadcrumb) els.breadcrumb.hidden = !showBreadcrumb;
    if (showBreadcrumb && els.back && els.breadcrumbText) {
      els.back.textContent = `← ${
        catalog.step === "chapter"
          ? state.selection.subject || "Subjects"
          : catalog.step === "subject"
          ? `Class ${state.selection.classNum || ""}`
          : "Boards"
      }`;
      els.breadcrumbText.textContent = `${catalog.track ? catalog.track.label : ""}${
        catalog.classNum ? ` · Class ${catalog.classNum}` : ""
      }${catalog.subject ? ` · ${catalog.subject}` : ""}`;
    }

    if (els.trackNotice) {
      if (catalog.track?.notice) {
        els.trackNotice.textContent = catalog.track.notice;
        els.trackNotice.hidden = false;
      } else {
        els.trackNotice.hidden = true;
      }
    }

    renderBoards(catalog);
    renderClasses(catalog);
    renderSubjects(catalog);
    renderChapters(catalog);
  }

  function renderBoards(catalog) {
    if (!els.boards) return;
    const visible = catalog.step === "board";
    els.boards.hidden = !visible;
    if (!visible) return;

    els.boards.replaceChildren();
    for (const track of catalog.tracks || []) {
      const card = el("button", "hub-board-card");
      card.type = "button";
      card.append(
        el("span", "hub-board-label", track.label),
        el("span", "hub-board-sub", track.grades ? "Classes 9–12 Standard Curriculum" : "National Competitive Exam Preparation"),
        el("span", "hub-board-count", `${track.chapterCount} chapters`)
      );
      lifecycle.on(card, "click", () => {
        const next = { track: track.id, classNum: null, subject: "", query: "" };
        state.selection = { ...next };
        void fetchCatalog(next);
      });
      els.boards.appendChild(card);
    }
  }

  function renderClasses(catalog) {
    if (!els.classes) return;
    const visible = catalog.step === "class";
    els.classes.hidden = !visible;
    if (!visible) return;

    els.classes.replaceChildren();
    for (const classNum of catalog.classes || []) {
      const card = el("button", "hub-class-card");
      card.type = "button";
      card.append(
        el("span", "hub-class-num", `Class ${classNum}`),
        el("span", "hub-class-sub", "Official Board Syllabus & Chapters")
      );
      lifecycle.on(card, "click", () => {
        state.selection = { ...state.selection, classNum, subject: "", query: "" };
        void fetchCatalog({ ...state.selection, classNum, subject: "", query: "" });
      });
      els.classes.appendChild(card);
    }
  }

  function renderSubjects(catalog) {
    if (!els.subjects) return;
    const visible = catalog.step === "subject";
    els.subjects.hidden = !visible;
    if (!visible) return;

    els.subjects.replaceChildren();
    for (const subject of catalog.subjects || []) {
      const card = el("button", "hub-subject-card");
      card.type = "button";
      card.append(
        el("span", "hub-subject-name", subject.name),
        el("span", "hub-subject-count", `${subject.count} chapters`)
      );
      lifecycle.on(card, "click", () => {
        state.selection = { ...state.selection, subject: subject.name, query: "" };
        void fetchCatalog({ ...state.selection, subject: subject.name, query: "" });
      });
      els.subjects.appendChild(card);
    }
  }

  function renderChapters(catalog) {
    if (!els.chapterStep || !els.chapters) return;
    const visible = catalog.step === "chapter";
    els.chapterStep.hidden = !visible;
    if (!visible) return;

    if (els.searchInput && els.searchInput.value !== state.query) {
      els.searchInput.value = state.query;
    }
    if (els.searchClear) els.searchClear.hidden = !state.selection.query;

    els.chapters.replaceChildren();
    const chapters = catalog.chapters || [];
    for (const chapter of chapters) {
      const card = el("button", "hub-chapter");
      card.type = "button";

      const body = el("span", "hub-chapter-body");
      body.appendChild(el("span", "hub-chapter-name", chapter.name));

      const prereqs = chapter.prerequisites || [];
      const meta = [
        chapter.difficultyLabel || "Structured",
        `${chapter.totalConcepts || 4} concepts`,
        `${chapter.estimatedMinutes || 45} min`
      ];

      if (prereqs.length > 0) {
        meta.push(`${prereqs.length} prerequisite${prereqs.length === 1 ? "" : "s"}`);
      }
      if (chapter.progress?.status) {
        meta.push(statusLabel(chapter.progress.status));
      }
      body.appendChild(el("span", "hub-chapter-meta", meta.filter(Boolean).join(" · ")));

      const arrow = el("span", "hub-chapter-arrow", "→");
      arrow.setAttribute("aria-hidden", "true");
      card.append(el("span", "hub-chapter-num", String(chapter.number)), body, arrow);

      lifecycle.on(card, "click", () => openChapter(chapter));
      els.chapters.appendChild(card);
    }
    if (els.empty) els.empty.hidden = chapters.length > 0;
  }

  function showBack() {
    if (state.selection.subject && state.catalog?.step === "chapter") {
      state.query = "";
      void fetchCatalog({ ...state.selection, subject: "", query: "" });
      return;
    }
    if (state.selection.classNum && state.catalog?.step === "subject") {
      void fetchCatalog({ ...state.selection, classNum: null, subject: "", query: "" });
      return;
    }
    if (state.selection.track) {
      state.query = "";
      void fetchCatalog({ ...EMPTY_SELECTION });
    }
  }

  /* ── Lesson Lifecycle ───────────────────────────────────────────────── */

  async function loadLesson(conceptId, opts = {}) {
    state.lessonLoading = true;
    state.lessonError = null;
    state.requestedConceptId = conceptId;
    state.evaluation = null;
    state.pendingNext = null;
    state.reteachNotice = null;
    state.progressNotice = null;
    state.currentStage = opts.stageIndex || 0;
    state.unlockedStage = Math.max(state.unlockedStage || 0, opts.stageIndex || 0);
    render();

    try {
      const useAttempts =
        opts.mode === "reteach" && opts.keepAttempts ? state.attempts : [];
      if (opts.subConceptId) {
        state.activeSubConceptId = opts.subConceptId;
      }
      const res = await callTutor(getToken, "lesson", {
        conceptId,
        track: state.selection.track || undefined,
        classNum: state.selection.classNum || undefined,
        subject: state.selection.subject || undefined,
        mode: opts.mode || "start",
        focus: opts.focus || undefined,
        attempts: useAttempts,
        surface: "hub",
        persistGenerated: false,
        stageIndex: state.currentStage,
        conceptIndex: state.activeConceptIndex,
        subConceptId: opts.subConceptId || state.activeSubConceptId || undefined,
      });
      if (lifecycle.disposed) return;

      state.lesson = res.lesson;
      state.check = res.lesson.check;
      state.attempts = useAttempts;
      state.sessionSummary = res.lesson.session || null;
      state.mastery = res.state.mastery;
      state.review = res.state.review;
      state.nextChapter = res.lesson.nextStep?.nextChapter || null;

      if (res.lesson.subConceptId) {
        state.activeSubConceptId = res.lesson.subConceptId;
      } else if (res.lesson.activeConcept && res.lesson.activeConcept.id) {
        state.activeSubConceptId = res.lesson.activeConcept.id;
      }

      // Sync browser URL so every concept is bookmarkable and shareable
      if (typeof window !== "undefined" && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        const chapterId = res.lesson.chapterId || res.lesson.conceptId;
        url.searchParams.set("conceptId", chapterId);
        if (state.activeSubConceptId) {
          url.searchParams.set("subConceptId", state.activeSubConceptId);
        }
        window.history.replaceState({}, "", url.toString());
      }

      state.lessonLoading = false;
      render();
      window.setTimeout(() => {
        if (!lifecycle.disposed && els.lessonTitle) els.lessonTitle.focus();
      }, 60);
    } catch (err) {
      if (lifecycle.disposed) return;
      state.lessonLoading = false;
      state.lessonError =
        err instanceof TutorError
          ? err.message
          : "This chapter could not be loaded. Please retry.";
      render();
    }
  }

  function openChapter(chapter) {
    state.selection = {
      ...state.selection,
      subject: chapter.subject || state.selection.subject,
      query: "",
    };
    state.activeConceptIndex = 1;
    void loadLesson(chapter.conceptId, { mode: "start" });
  }

  function resumeTopic(topic) {
    const derived = contextFromConceptId(topic.conceptId);
    state.selection = {
      ...state.selection,
      track: derived.track || state.selection.track,
      classNum: derived.classNum ?? state.selection.classNum,
      subject: topic.subject || state.selection.subject,
    };
    state.activeConceptIndex = 1;
    void loadLesson(topic.conceptId, { mode: "start" });
  }

  function closeSession() {
    clearVisual();
    state.lesson = null;
    state.check = null;
    state.evaluation = null;
    state.pendingNext = null;
    state.sessionSummary = null;
    state.lessonError = null;
    state.reteachNotice = null;
    state.activeConceptIndex = 1;
    state.activeSubConceptId = null;
    state.currentStage = 0;
    state.unlockedStage = 0;
    checkView = null;
    if (typeof window !== "undefined" && window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("conceptId");
      url.searchParams.delete("subConceptId");
      url.searchParams.delete("chapter");
      url.searchParams.delete("concept");
      window.history.replaceState({}, "", url.toString());
    }
    render();
    if (state.selection.track) void fetchCatalog(state.selection);
  }

  async function refreshState(conceptId) {
    try {
      const res = await callTutor(getToken, "state", {
        conceptId,
        track: state.selection.track || undefined,
        classNum: state.selection.classNum || undefined,
      });
      if (lifecycle.disposed) return;
      state.mastery = res.mastery;
      state.review = res.review;
      state.nextChapter = res.nextChapter;
    } catch {
      /* Progress display is best-effort */
    }
  }
}
