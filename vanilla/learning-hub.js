/**
 * Learning Hub controller — vanilla port of the adaptive curriculum page.
 * Catalog, lesson, evaluation and progress calls go through the same shared
 * tutor client; the animated lesson visual is an on-demand React island.
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
  "Understand",
  "Explain",
  "Visualize",
  "Practice",
  "Evaluate",
  "Adapt",
  "Remember",
];

const VERDICT_META = {
  correct: { label: "Correct", className: "verdict-good" },
  partially_correct: { label: "Almost there", className: "verdict-partial" },
  incorrect: { label: "Not yet", className: "verdict-bad" },
  unknown: { label: "Not evaluated", className: "verdict-unknown" },
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
  if (source === "authored") return "Reviewed lesson";
  if (source === "ai") return "AI-generated, not yet reviewed";
  if (source === "unavailable") return "Curriculum outline only";
  return source;
}

function statusLabel(status) {
  return String(status).replace(/_/g, " ");
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
  };

  let checkView = null;
  const visual = { source: null, unmount: null };

  hydrateTopbar(root, ctx);
  bindEvents();

  render();
  void fetchCatalog(EMPTY_SELECTION);

  return () => {
    clearVisual();
    lifecycle.dispose();
  };

  /* ── Topbar and events ──────────────────────────────────────────────── */

  function hydrateTopbar(host, context) {
    const user = context.user;
    const displayName =
      context.userData?.displayName ||
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "there");

    const greeting = qs(host, "#greetingName");
    if (greeting) greeting.textContent = displayName;

    const avatar = qs(host, "#topbarAvatar");
    if (avatar && user.photoURL) avatar.src = user.photoURL;
  }

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

  /* ── Rendering shell ────────────────────────────────────────────────── */

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

    els.eyebrow.textContent = `${
      lesson.trackLabel ||
      (state.selection.track ? state.selection.track.replace("_", " ") : "Learning Hub")
    }${state.selection.classNum ? ` · Class ${state.selection.classNum}` : ""}${
      lesson.subject ? ` · ${lesson.subject}` : ""
    }`;
    els.lessonTitle.textContent = lesson.name;

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
      els.metaRow.appendChild(el("span", "lh-pill lh-pill--warn", "AI unavailable"));
    }
    if (revisionLabel) {
      els.metaRow.appendChild(
        el("span", "lh-pill lh-pill--ok", `Revision ${revisionLabel}`)
      );
    }

    renderRail();
    renderMastery();
    renderPrerequisites();

    if (state.reteachNotice) {
      els.reteachNotice.textContent = `Changing the explanation: we are starting from a different route — ${state.reteachNotice}.`;
      els.reteachNotice.hidden = false;
    } else {
      els.reteachNotice.hidden = true;
    }

    renderTeachingPanel(lesson);
    renderPractice();
    renderCompletion(revisionAt, revisionLabel);
    renderAside(revisionLabel);
  }

  function renderRail() {
    if (!els.rail) return;
    const active = state.sessionSummary?.completed
      ? 6
      : state.evaluation
      ? state.pendingNext && state.evaluation.verdict !== "correct"
        ? 5
        : 4
      : state.check
      ? 3
      : state.lesson
      ? 2
      : 1;

    els.rail.replaceChildren();
    RAIL_STEPS.forEach((step, index) => {
      const item = el(
        "li",
        index === active ? "is-active" : index < active ? "is-done" : ""
      );
      if (index === active) item.setAttribute("aria-current", "step");
      const dot = el("span", "learn-rail-dot", index < active ? "✓" : String(index + 1));
      dot.setAttribute("aria-hidden", "true");
      item.append(dot, el("span", "learn-rail-text", step));
      els.rail.appendChild(item);
    });
  }

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
    wrap.setAttribute("aria-label", "Mastery and this session's evidence");

    const head = el("div", "learn-mastery-head");
    head.append(
      el("span", "learn-mastery-label", "Mastery"),
      el("span", "learn-mastery-value", score === null ? "No evidence yet" : `${percent}%`)
    );
    wrap.appendChild(head);

    const bar = el("div", "learn-mastery-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(percent));
    bar.setAttribute("aria-label", "Mastery score");
    const fill = el("span");
    fill.style.width = `${percent}%`;
    bar.appendChild(fill);
    wrap.appendChild(bar);

    const note = session
      ? `${session.correctCount} correct of ${session.answeredCount} answered this session. ${session.note}`
      : mastery.evidence > 0
      ? "Based on your recorded learning events."
      : "Answer a question to start building evidence.";
    wrap.appendChild(el("p", "learn-mastery-note", note));

    els.mastery.replaceChildren(wrap);
  }

  function renderPrerequisites() {
    if (!els.prereqs) return;
    const prerequisites = state.lesson?.prerequisites || [];
    els.prereqs.replaceChildren();
    if (!prerequisites.length) return;

    const wrap = el("div", "learn-prereqs");
    wrap.appendChild(el("span", "learn-feedback-label", "Before this chapter"));
    const chips = el("div", "learn-chips");
    for (const prereq of prerequisites) {
      const chip = el(
        "span",
        `learn-chip${prereq.status === "likely known" ? " is-good" : ""}`,
        prereq.name
      );
      if (prereq.status) chip.appendChild(el("em", null, ` · ${prereq.status}`));
      chips.appendChild(chip);
    }
    wrap.appendChild(chips);
    els.prereqs.appendChild(wrap);
  }

  function renderTeachingPanel(lesson) {
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
      })
    );

    els.reteachNote.replaceChildren();
    if (lesson.reteach?.note) {
      els.reteachNote.appendChild(
        el("p", "learn-callout learn-callout--soft", lesson.reteach.note)
      );
    }

    els.lessonRetry.hidden = lesson.source !== "unavailable";
  }

  /* ── Practice and evaluation ────────────────────────────────────────── */

  function renderPractice() {
    const check = state.check;
    if (els.practice) els.practice.hidden = !check;
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
      els.nextNote.hidden = !(
        state.evaluation && state.evaluation.verdict !== "correct"
      );
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
      el("span", "learn-badge learn-badge--accent", "Check your understanding"),
      el("span", "learn-check-difficulty", `Level ${check.difficulty}/3`)
    );
    card.appendChild(head);
    card.appendChild(el("p", "learn-check-prompt", check.prompt));

    const form = el("form");
    const inputId = `answer-${check.questionId || `hub-${Date.now()}`}`;
    const label = el("label", "learn-check-label", "Your reasoning");
    label.htmlFor = inputId;
    form.appendChild(label);

    const textarea = el("textarea", "learn-textarea");
    textarea.id = inputId;
    textarea.rows = 4;
    textarea.placeholder = "Write the answer and your reasoning in your own words…";
    form.appendChild(textarea);

    const actions = el("div", "learn-check-actions");
    const submit = el("button", "btn btn-primary", "Submit answer");
    submit.type = "submit";
    submit.disabled = true;
    actions.appendChild(submit);

    let hint = null;
    let hintButton = null;
    if (check.hint) {
      hintButton = el("button", "btn btn-secondary", "Show hint");
      hintButton.type = "button";
      hintButton.setAttribute("aria-expanded", "false");
      actions.appendChild(hintButton);
      hint = el("p", "learn-hint", check.hint);
      hint.hidden = true;
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
      submit.textContent = state.evaluating ? "Checking…" : "Submit answer";
    };

    lifecycle.on(textarea, "input", () => {
      error.hidden = true;
      sync();
    });

    if (hintButton) {
      lifecycle.on(hintButton, "click", () => {
        hint.hidden = !hint.hidden;
        hintButton.textContent = hint.hidden ? "Show hint" : "Hide hint";
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
          err?.message || "Your answer could not be checked. Please retry.";
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

  function renderEvaluation(evaluation) {
    const meta = VERDICT_META[evaluation.verdict] || VERDICT_META.unknown;
    const wrap = el("div", `learn-feedback ${meta.className}`);
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");

    const head = el("div", "learn-feedback-head");
    head.appendChild(el("span", `learn-verdict ${meta.className}`, meta.label));
    if (evaluation.basis === "authored") {
      head.appendChild(
        el("span", "learn-badge learn-badge--soft", "Checked against the lesson rubric")
      );
    }
    wrap.appendChild(head);

    if (evaluation.feedback) {
      wrap.appendChild(el("p", "learn-feedback-text", evaluation.feedback));
    }

    appendFeedbackGroup(wrap, "What worked", evaluation.whatWorked);
    appendFeedbackGroup(wrap, "What was missing", evaluation.missing);

    const misconception = evaluation.misconception;
    if (misconception) {
      const box = el("div", "learn-misconception");
      const label = el("div", "learn-misconception-label");
      const marker = el("span", null, "⚠ ");
      marker.setAttribute("aria-hidden", "true");
      label.appendChild(marker);
      label.appendChild(
        document.createTextNode(
          `${
            misconception.verified ? "Common misconception" : "Likely misconception"
          }: ${misconception.label}`
        )
      );
      box.appendChild(label);
      if (misconception.explanation) {
        box.appendChild(el("p", null, misconception.explanation));
      }
      if (misconception.remediation) {
        const remediation = el("p");
        remediation.appendChild(el("strong", null, "Try this:"));
        remediation.appendChild(document.createTextNode(` ${misconception.remediation}`));
        box.appendChild(remediation);
      }
      wrap.appendChild(box);
    }

    if (
      evaluation.packExplanation &&
      !String(evaluation.feedback || "").includes(evaluation.packExplanation)
    ) {
      const details = el("details", "learn-advanced learn-advanced--tight");
      details.appendChild(el("summary", null, "Key idea"));
      details.appendChild(el("p", null, evaluation.packExplanation));
      wrap.appendChild(details);
    }

    if (evaluation.next?.message) {
      wrap.appendChild(el("p", "learn-next-hint", evaluation.next.message));
    }

    const actions = el("div", "learn-feedback-actions");
    if (evaluation.verdict !== "correct") {
      const explain = el("button", "btn btn-secondary", "Explain it a different way");
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

      if (data.learningEvent) {
        const saved = await emitLearningEvent(getToken, {
          ...data.learningEvent,
          eventId: `hub_${lesson.conceptId}_${Date.now()}`,
          source: "study_session",
        });
        if (lifecycle.disposed) return;
        if (!saved) {
          state.progressNotice =
            "Your feedback is shown, but this answer could not be saved to long-term progress. Retrying will not create duplicates.";
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
          : "Your answer could not be checked. Please retry.",
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
    window.setTimeout(() => {
      if (!lifecycle.disposed) els.lessonTitle.focus();
    }, 40);
  }

  function reteach() {
    const lesson = state.lesson;
    if (!lesson) return;
    const focus =
      state.evaluation?.misconception?.label ||
      state.evaluation?.missing?.[0] ||
      "The student needs a different explanation of this idea";
    state.reteachNotice = focus;
    void loadLesson(lesson.conceptId, {
      mode: "reteach",
      focus,
      keepAttempts: true,
    });
  }

  /* ── Completion and side panels ─────────────────────────────────────── */

  function renderCompletion(revisionAt, revisionLabel) {
    if (!els.completion) return;
    els.completion.replaceChildren();

    const session = state.sessionSummary;
    if (session?.completed) {
      const card = el("div", "learn-complete");
      card.setAttribute("role", "status");

      const head = el("div", "learn-complete-head");
      const icon = el("span", "learn-complete-icon", "✓");
      icon.setAttribute("aria-hidden", "true");
      const copy = el("div");
      copy.appendChild(el("h3", null, "Session complete"));
      copy.appendChild(el("p", null, session.note));
      head.append(icon, copy);
      card.appendChild(head);

      const stats = el("dl", "learn-complete-stats");
      stats.appendChild(
        statBlock("Correct answers", `${session.correctCount} / ${session.answeredCount}`)
      );
      stats.appendChild(
        statBlock(
          "Hardest correct level",
          `${session.highestCorrectDifficulty ?? "—"} / 3`
        )
      );
      if (revisionAt) {
        stats.appendChild(
          statBlock(
            "Revision",
            revisionLabel || new Date(revisionAt).toLocaleDateString()
          )
        );
      }
      card.appendChild(stats);

      const actions = el("div", "learn-complete-actions");
      if (state.nextChapter) {
        const next = el(
          "button",
          "btn btn-primary",
          `Next: ${state.nextChapter.name}`
        );
        next.type = "button";
        lifecycle.on(next, "click", () => openChapter(state.nextChapter));
        actions.appendChild(next);
      }
      const exit = el("button", "btn btn-secondary", "Back to chapters");
      exit.type = "button";
      lifecycle.on(exit, "click", closeSession);
      actions.appendChild(exit);
      card.appendChild(actions);

      card.appendChild(
        el(
          "p",
          "learn-complete-note",
          "Mastery updates only from recorded evidence, not from this screen. Your answers were sent to the existing learning pipeline."
        )
      );
      els.completion.appendChild(card);
    }

    const showCallout =
      Boolean(state.lesson?.completed) && !state.sessionSummary?.completed;
    els.completeCallout.hidden = !showCallout;
    if (showCallout) {
      els.completeText.textContent =
        state.lesson.nextStep?.label || "You have reached the end of this chapter.";
    }

    els.progressNotice.hidden = !state.progressNotice;
    if (state.progressNotice) els.progressNotice.textContent = state.progressNotice;
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

    els.rememberText.textContent = revisionLabel
      ? `Next revision ${revisionLabel}. Short, spaced reviews are what keep this topic available later.`
      : "Finish the practice questions to schedule a revision.";

    if (state.review?.state) {
      els.reviewState.textContent = `Review state: ${statusLabel(state.review.state)}`;
      els.reviewState.hidden = false;
    } else {
      els.reviewState.hidden = true;
    }

    const completed = Boolean(state.sessionSummary?.completed);
    const nextChapter = state.nextChapter;
    els.nextStepText.textContent = completed
      ? nextChapter
        ? `Next chapter: ${nextChapter.name}${
            nextChapter.difficultyLabel ? ` (${nextChapter.difficultyLabel})` : ""
          }.`
        : "This is the last chapter in this subject. A short review tomorrow is the next step."
      : "Answer the check question. The tutor will adapt the difficulty from your reasoning.";

    const showNext = Boolean(nextChapter && completed);
    els.openNext.hidden = !showNext;
    if (showNext) els.openNext.textContent = `Open ${nextChapter.name}`;
  }

  function renderVisual(nextVisual) {
    if (!els.visual) return;
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

  /* ── Catalog ────────────────────────────────────────────────────────── */

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
    els.pickTitle.textContent =
      catalog?.step === "chapter"
        ? "Pick a chapter"
        : catalog?.step === "subject"
        ? "Which subject?"
        : catalog?.step === "class"
        ? "Which class are you in?"
        : "What do you want to understand?";

    if (state.continueTopic) {
      els.continueTitle.textContent = state.continueTopic.name;
      els.continueMeta.textContent = state.continueTopic.subject || "";
      els.continue.hidden = false;
    } else {
      els.continue.hidden = true;
    }

    els.catalogLoading.hidden = !(state.catalogLoading && !catalog);

    els.catalogError.hidden = !state.catalogError;
    if (state.catalogError) els.catalogErrorText.textContent = state.catalogError;

    els.catalog.hidden = !catalog;
    if (!catalog) return;

    const showBreadcrumb = catalog.step !== "board";
    els.breadcrumb.hidden = !showBreadcrumb;
    if (showBreadcrumb) {
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

    if (catalog.track?.notice) {
      els.trackNotice.textContent = catalog.track.notice;
      els.trackNotice.hidden = false;
    } else {
      els.trackNotice.hidden = true;
    }

    renderBoards(catalog);
    renderClasses(catalog);
    renderSubjects(catalog);
    renderChapters(catalog);
  }

  function renderBoards(catalog) {
    const visible = catalog.step === "board";
    els.boards.hidden = !visible;
    if (!visible) return;

    els.boards.replaceChildren();
    for (const track of catalog.tracks || []) {
      const card = el("button", "hub-board-card");
      card.type = "button";
      card.append(
        el("span", "hub-board-label", track.label),
        el("span", "hub-board-sub", track.grades ? "Class 9–12" : "Exam preparation"),
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
    const visible = catalog.step === "class";
    els.classes.hidden = !visible;
    if (!visible) return;

    els.classes.replaceChildren();
    for (const classNum of catalog.classes || []) {
      const card = el("button", "hub-class-card");
      card.type = "button";
      card.append(
        el("span", "hub-class-num", `Class ${classNum}`),
        el("span", "hub-class-sub", "Subjects from your board syllabus")
      );
      lifecycle.on(card, "click", () => {
        state.selection = { ...state.selection, classNum, subject: "", query: "" };
        void fetchCatalog({ ...state.selection, classNum, subject: "", query: "" });
      });
      els.classes.appendChild(card);
    }
  }

  function renderSubjects(catalog) {
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
    const visible = catalog.step === "chapter";
    els.chapterStep.hidden = !visible;
    if (!visible) return;

    if (els.searchInput.value !== state.query) {
      els.searchInput.value = state.query;
    }
    els.searchClear.hidden = !state.selection.query;

    els.chapters.replaceChildren();
    const chapters = catalog.chapters || [];
    for (const chapter of chapters) {
      const card = el("button", "hub-chapter");
      card.type = "button";

      const body = el("span", "hub-chapter-body");
      body.appendChild(el("span", "hub-chapter-name", chapter.name));
      const prereqs = chapter.prerequisites || [];
      const meta = [chapter.difficultyLabel];
      if (prereqs.length > 0) {
        meta.push(
          `${prereqs.length} prerequisite${prereqs.length === 1 ? "" : "s"}`
        );
      }
      if (chapter.progress?.status) {
        meta.push(statusLabel(chapter.progress.status));
      }
      body.appendChild(el("span", "hub-chapter-meta", meta.filter(Boolean).join(" · ")));

      const arrow = el("span", "hub-chapter-arrow", "→");
      arrow.setAttribute("aria-hidden", "true");
      card.append(el("span", "hub-chapter-num", chapter.number), body, arrow);

      lifecycle.on(card, "click", () => openChapter(chapter));
      els.chapters.appendChild(card);
    }
    els.empty.hidden = chapters.length > 0;
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

  /* ── Lesson lifecycle ───────────────────────────────────────────────── */

  async function loadLesson(conceptId, opts = {}) {
    state.lessonLoading = true;
    state.lessonError = null;
    state.requestedConceptId = conceptId;
    state.evaluation = null;
    state.pendingNext = null;
    state.reteachNotice = null;
    state.progressNotice = null;
    render();

    try {
      const useAttempts =
        opts.mode === "reteach" && opts.keepAttempts ? state.attempts : [];
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
      });
      if (lifecycle.disposed) return;

      state.lesson = res.lesson;
      state.check = res.lesson.check;
      state.attempts = useAttempts;
      state.sessionSummary = res.lesson.session || null;
      state.mastery = res.state.mastery;
      state.review = res.state.review;
      state.nextChapter = res.lesson.nextStep?.nextChapter || null;
      state.lessonLoading = false;
      render();
      window.setTimeout(() => {
        if (!lifecycle.disposed) els.lessonTitle.focus();
      }, 60);
    } catch (err) {
      if (lifecycle.disposed) return;
      state.lessonLoading = false;
      state.lessonError =
        err instanceof TutorError
          ? err.message
          : "This chapter could not be prepared. Please retry.";
      render();
    }
  }

  function openChapter(chapter) {
    state.selection = {
      ...state.selection,
      subject: chapter.subject || state.selection.subject,
      query: "",
    };
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
    void loadLesson(topic.conceptId, { mode: "start" });
  }

  function closeSession() {
    state.lesson = null;
    state.check = null;
    state.evaluation = null;
    state.pendingNext = null;
    state.sessionSummary = null;
    state.lessonError = null;
    state.reteachNotice = null;
    checkView = null;
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
      /* Progress display is best-effort; the lesson itself must keep working. */
    }
  }
}
