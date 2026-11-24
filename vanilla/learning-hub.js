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

export const GLOBAL_COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳", region: "South Asia", tracks: "CBSE · Maharashtra State Board · CISCE · JEE Main · NEET-UG" },
  { code: "US", name: "United States", flag: "🇺🇸", region: "North America", tracks: "College Board AP Courses · CCSS Math · NGSS Sciences · SAT" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe", tracks: "GCSE (AQA & Edexcel) · GCE A-Levels · SQA Higher (Scotland)" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America", tracks: "Ontario (OSSD Grades 9–12 / SPH4U) · British Columbia Curriculum" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania", tracks: "VCE (Victoria Units 1–4) · NSW HSC · Australian Curriculum v9.0" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", region: "Oceania", tracks: "NZQA NCEA Levels 1, 2, 3 · Te Mātaiaho / NZC Framework" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", region: "Asia", tracks: "Singapore-Cambridge GCE O-Level · Full Subject-Based Banding (MOE)" },
  { code: "AE", name: "UAE", flag: "🇦🇪", region: "Middle East", tracks: "Ministry of Education National Curriculum (Cycle 3 Advanced Stream)" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East", tracks: "Ministry of Education Masarat Pathways (CS & Engineering)" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "Asia", tracks: "KPM KSSM Secondary · SPM (Sijil Pelajaran Malaysia Form 4 & 5)" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "South Asia", tracks: "Federal Board FBISE (SSC Matric Class 10 & HSSC Class 12)" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "South Asia", tracks: "NCTB National Curriculum (SSC Class 10 & HSC Class 12)" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa", tracks: "DBE CAPS (FET Phase Grades 10–12) · National Senior Certificate" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa", tracks: "WAEC WASSCE Senior Secondary · NERDC National Curriculum" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", region: "Europe", tracks: "State Examinations Commission (Leaving Certificate Higher Level)" },
];

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
    viewMode: null,
    countryFilter: "",
    selectedRegion: "all",
    subjectFilter: "",
    subjectCategory: "all",
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
    countrySelect: qs(root, "#hubCountrySelect"),
    countryBar: qs(root, "#hubCountryBar"),
    globalSearchInput: qs(root, "#hubGlobalSearchInput"),
    globalSearchResults: qs(root, "#hubGlobalSearchResults"),
    verificationCard: qs(root, "#hubVerificationCard"),
    verifBadge: qs(root, "#hubVerifBadge"),
    verifAuthority: qs(root, "#hubVerifAuthority"),
    verifSourceLink: qs(root, "#hubVerifSourceLink"),
    countryView: qs(root, "#hubCountryView"),
    countrySearchInput: qs(root, "#hubCountrySearchInput"),
    regionFilters: qs(root, "#hubRegionFilters"),
    countryGrid: qs(root, "#hubCountryGrid"),
    changeCountryBtn: qs(root, "#hubChangeCountryBtn"),
    subjectFilterWrap: qs(root, "#hubSubjectFilterWrap"),
    subjectSearchInput: qs(root, "#hubSubjectSearchInput"),
    subjectCategoryFilters: qs(root, "#hubSubjectCategoryFilters"),
    crossCurriculumBanner: qs(root, "#hubCrossCurriculumBanner"),
  };

  let checkView = null;
  const visual = { source: null, unmount: null };

  hydrateTopbar(root, ctx);
  bindEvents();
  initGlobalSearch();

  // Read URL query parameters to enable direct deep-linking to dedicated concept pages
  const urlParams = typeof window !== "undefined" && window.location ? new URLSearchParams(window.location.search) : null;
  const initialConceptId = urlParams ? (urlParams.get("conceptId") || urlParams.get("chapter")) : null;
  const initialSubConceptId = urlParams ? (urlParams.get("subConceptId") || urlParams.get("concept")) : null;
  const initialCountry = urlParams ? urlParams.get("country")?.toUpperCase() : null;
  const initialTrack = urlParams ? urlParams.get("track") : null;
  const initialClass = urlParams ? Number(urlParams.get("class") || urlParams.get("classNum")) : null;
  const initialSubject = urlParams ? urlParams.get("subject") : null;

  const savedCountry = typeof localStorage !== "undefined" ? localStorage.getItem("learning_allied_country") : null;
  let savedEduProfile = null;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("learning_allied_education_profile") : null;
    if (raw) savedEduProfile = JSON.parse(raw);
  } catch (_) {}

  if (initialCountry) state.selectedCountry = initialCountry;
  else if (savedCountry) state.selectedCountry = savedCountry;
  else if (savedEduProfile?.country) state.selectedCountry = savedEduProfile.country;
  else state.selectedCountry = "IN";

  if (els.countrySelect) els.countrySelect.value = state.selectedCountry;

  if (initialTrack) state.selection.track = initialTrack;
  else if (savedEduProfile?.track) state.selection.track = savedEduProfile.track;

  if (initialClass) state.selection.classNum = initialClass;
  else if (savedEduProfile?.classNum) {
    const parsed = parseInt(String(savedEduProfile.classNum).replace(/\D/g, ""), 10);
    if (!isNaN(parsed)) state.selection.classNum = parsed;
  }

  if (initialSubject) state.selection.subject = initialSubject;
  else if (savedEduProfile?.subjects?.[0]) state.selection.subject = savedEduProfile.subjects[0];

  // Dedicated Country Selection on initial visit:
  // When a student visits Learning Hub without a specific concept or track,
  // present the dedicated country selection experience first!
  if (!initialConceptId && !state.selection.track) {
    state.viewMode = "country";
  } else if (!initialConceptId && state.selection.track) {
    state.viewMode = "catalog";
  }

  render();
  renderCountryBar();

  if (initialConceptId) {
    state.activeSubConceptId = initialSubConceptId;
    void loadLesson(initialConceptId, { mode: "start", subConceptId: initialSubConceptId });
  } else if (state.selection.track) {
    void fetchCatalog({ countryCode: state.selectedCountry, ...state.selection });
  } else {
    state.viewMode = "country";
    render();
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

    if (els.changeCountryBtn) {
      lifecycle.on(els.changeCountryBtn, "click", () => {
        state.viewMode = "country";
        render();
      });
    }

    if (els.countrySearchInput) {
      lifecycle.on(els.countrySearchInput, "input", () => {
        state.countryFilter = els.countrySearchInput.value;
        renderCountryView();
      });
    }

    if (els.subjectSearchInput) {
      lifecycle.on(els.subjectSearchInput, "input", () => {
        state.subjectFilter = els.subjectSearchInput.value;
        if (state.catalog) renderSubjects(state.catalog);
      });
    }

    if (els.countrySelect) {
      lifecycle.on(els.countrySelect, "change", () => {
        const code = els.countrySelect.value;
        if (!code) return;
        state.selectedCountry = code;
        state.viewMode = null;
        state.selection = { track: "", classNum: null, subject: "", query: "" };
        renderCountryBar();
        void fetchCatalog({ countryCode: code, ...EMPTY_SELECTION });
        try {
          localStorage.setItem("learning_allied_country", code);
        } catch (_) {}
      });
    }

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
    if (els.adaptCard && !els.adaptCard.querySelector(".hub-lesson-feedback-btn")) {
      const fbBtn = document.createElement("button");
      fbBtn.type = "button";
      fbBtn.className = "hub-lesson-feedback-btn";
      fbBtn.textContent = "Lesson Feedback & Suggestions";
      fbBtn.style.cssText = "margin-top: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 11.5px; font-weight: 500; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: var(--text-muted, #94a3b8); cursor: pointer;";
      fbBtn.onclick = () => {
        window.dispatchEvent(
          new CustomEvent("open-feedback-modal", {
            detail: {
              category: "learning_experience",
              subject: state.subjectKey || "",
              topic: state.chapter?.name || "",
              page: "/learning-hub",
            },
          })
        );
      };
      els.adaptCard.appendChild(fbBtn);
    }

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

  function renderCountryBar() {
    if (els.countrySelect && els.countrySelect.value !== state.selectedCountry) {
      els.countrySelect.value = state.selectedCountry;
    }
    if (!els.countryBar) return;
    els.countryBar.replaceChildren();
    for (const c of GLOBAL_COUNTRIES) {
      const isCurrent = state.selectedCountry === c.code;
      const pill = el("button", `hub-country-pill${isCurrent ? " is-active" : ""}`, `${c.flag} ${c.name}`);
      pill.type = "button";
      pill.setAttribute("role", "tab");
      pill.setAttribute("aria-selected", isCurrent ? "true" : "false");
      lifecycle.on(pill, "click", () => {
        state.selectedCountry = c.code;
        state.viewMode = null;
        if (els.countrySelect) els.countrySelect.value = c.code;
        state.selection = { track: "", classNum: null, subject: "", query: "" };
        renderCountryBar();
        void fetchCatalog({ countryCode: c.code, ...EMPTY_SELECTION });
        try {
          localStorage.setItem("learning_allied_country", c.code);
        } catch (_) {}
      });
      els.countryBar.appendChild(pill);
    }
  }

  function initGlobalSearch() {
    if (!els.globalSearchInput || !els.globalSearchResults) return;
    let debounceTimer = null;

    lifecycle.on(els.globalSearchInput, "input", () => {
      clearTimeout(debounceTimer);
      const q = els.globalSearchInput.value.trim().toLowerCase();
      if (q.length < 2) {
        els.globalSearchResults.hidden = true;
        els.globalSearchResults.replaceChildren();
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await callTutor(getToken, "catalog", {
            globalSearch: q,
            countryCode: state.selectedCountry || undefined,
          });
          const results = (res && res.searchResults) || [];

          if (results.length > 0) {
            els.globalSearchResults.replaceChildren();
            for (const item of results) {
              const btn = el("button", `hub-search-result-item hub-search-result-item--${item.type}`);
              btn.type = "button";

              const badge = el("span", "hub-search-badge", String(item.type || "").toUpperCase());
              const textWrap = el("div", "hub-search-result-texts");
              textWrap.appendChild(el("span", "hub-search-result-title", item.title));
              textWrap.appendChild(el("span", "hub-search-result-sub", item.sub));

              btn.append(badge, textWrap);
              lifecycle.on(btn, "click", () => {
                els.globalSearchResults.hidden = true;
                els.globalSearchInput.value = "";
                if (item.type === "topic") {
                  if (item.countryCode) state.selectedCountry = item.countryCode;
                  state.selection = {
                    track: item.trackId || state.selection.track,
                    classNum: null,
                    subject: item.subject || state.selection.subject,
                    query: "",
                  };
                  state.activeSubConceptId = item.subConceptId;
                  void loadLesson(item.conceptId, { mode: "start", subConceptId: item.subConceptId });
                } else if (item.type === "chapter") {
                  if (item.countryCode) state.selectedCountry = item.countryCode;
                  state.selection = {
                    track: item.trackId || state.selection.track,
                    classNum: null,
                    subject: item.subject || state.selection.subject,
                    query: "",
                  };
                  void loadLesson(item.conceptId, { mode: "start" });
                } else if (item.type === "subject") {
                  if (item.countryCode) state.selectedCountry = item.countryCode;
                  state.viewMode = null;
                  state.selection = {
                    track: item.trackId,
                    classNum: null,
                    subject: item.subject,
                    query: "",
                  };
                  void fetchCatalog({ countryCode: item.countryCode, track: item.trackId, subject: item.subject });
                } else if (item.type === "board") {
                  if (item.countryCode) state.selectedCountry = item.countryCode;
                  state.viewMode = null;
                  state.selection = {
                    track: item.trackId,
                    classNum: null,
                    subject: "",
                    query: "",
                  };
                  void fetchCatalog({ countryCode: item.countryCode, track: item.trackId });
                } else if (item.type === "country") {
                  state.selectedCountry = item.countryCode;
                  state.viewMode = null;
                  if (els.countrySelect) els.countrySelect.value = item.countryCode;
                  renderCountryBar();
                  void fetchCatalog({ countryCode: item.countryCode, ...EMPTY_SELECTION });
                }
              });
              els.globalSearchResults.appendChild(btn);
            }
            els.globalSearchResults.hidden = false;
          } else {
            els.globalSearchResults.hidden = true;
          }
        } catch (_) {
          // Fallback to local country matching
          const matches = [];
          for (const c of GLOBAL_COUNTRIES) {
            if (c.name.toLowerCase().includes(q)) {
              matches.push({
                title: `${c.flag} ${c.name}`,
                sub: "Country Curriculum",
                action: () => {
                  state.selectedCountry = c.code;
                  state.viewMode = null;
                  if (els.countrySelect) els.countrySelect.value = c.code;
                  renderCountryBar();
                  void fetchCatalog({ countryCode: c.code, ...EMPTY_SELECTION });
                },
              });
            }
          }
          if (matches.length > 0) {
            els.globalSearchResults.replaceChildren();
            for (const m of matches) {
              const item = el("button", "hub-search-result-item");
              item.type = "button";
              item.append(el("span", "hub-search-result-title", m.title), el("span", "hub-search-result-sub", m.sub));
              lifecycle.on(item, "click", () => {
                els.globalSearchResults.hidden = true;
                els.globalSearchInput.value = "";
                m.action();
              });
              els.globalSearchResults.appendChild(item);
            }
            els.globalSearchResults.hidden = false;
          } else {
            els.globalSearchResults.hidden = true;
          }
        }
      }, 180);
    });

    lifecycle.on(document, "click", (e) => {
      if (!els.globalSearchInput.contains(e.target) && !els.globalSearchResults.contains(e.target)) {
        els.globalSearchResults.hidden = true;
      }
    });
  }

  /* ── Catalog & Chapter Selection ────────────────────────────────────── */

  async function fetchCatalog(next) {
    state.catalogLoading = true;
    state.catalogError = null;
    render();

    try {
      const payload = {};
      payload.countryCode = next.countryCode || state.selectedCountry || "IN";
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

  function renderCountryView() {
    if (!els.countryGrid) return;
    if (els.changeCountryBtn) els.changeCountryBtn.hidden = true;
    if (els.boards) els.boards.hidden = true;
    if (els.classes) els.classes.hidden = true;
    if (els.subjects) els.subjects.hidden = true;
    if (els.subjectFilterWrap) els.subjectFilterWrap.hidden = true;
    if (els.chapterStep) els.chapterStep.hidden = true;

    // Render region filter pills
    if (els.regionFilters) {
      els.regionFilters.replaceChildren();
      const regions = ["All", "North America", "Europe", "Asia", "South Asia", "Middle East", "Africa", "Oceania"];
      for (const reg of regions) {
        const regKey = reg.toLowerCase();
        const isCurrent =
          (state.selectedRegion || "all") === regKey ||
          (reg === "All" && (!state.selectedRegion || state.selectedRegion === "all"));
        const pill = el("button", `hub-region-pill${isCurrent ? " is-active" : ""}`, reg);
        pill.type = "button";
        lifecycle.on(pill, "click", () => {
          state.selectedRegion = regKey;
          renderCountryView();
        });
        els.regionFilters.appendChild(pill);
      }
    }

    // Filter countries by query and region
    const q = (state.countryFilter || "").toLowerCase().trim();
    const curReg = state.selectedRegion || "all";
    const filtered = GLOBAL_COUNTRIES.filter((c) => {
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.tracks && c.tracks.toLowerCase().includes(q));
      const matchRegion = curReg === "all" || (c.region && c.region.toLowerCase() === curReg);
      return matchQuery && matchRegion;
    });

    els.countryGrid.replaceChildren();
    for (const c of filtered) {
      const card = el("button", `hub-country-card${state.selectedCountry === c.code ? " is-selected" : ""}`);
      card.type = "button";

      const head = el("div", "hub-country-card-header");
      head.append(
        el("span", "hub-country-card-flag", c.flag),
        el("span", "hub-country-card-name", c.name)
      );

      const regSpan = el("span", "hub-country-card-region", c.region || "International");
      const tracksSpan = el("span", "hub-country-card-tracks", c.tracks || "National & International Frameworks");
      const cta = el("span", "hub-country-card-cta", "Select Country →");

      card.append(head, regSpan, tracksSpan, cta);

      lifecycle.on(card, "click", () => {
        state.selectedCountry = c.code;
        state.viewMode = null;
        state.selection = { track: "", classNum: null, subject: "", query: "" };
        if (els.countrySelect) els.countrySelect.value = c.code;
        renderCountryBar();
        void fetchCatalog({ countryCode: c.code, ...EMPTY_SELECTION });
        try {
          localStorage.setItem("learning_allied_country", c.code);
        } catch (_) {}
      });

      els.countryGrid.appendChild(card);
    }
  }

  function renderPick() {
    if (!els.pick || els.pick.hidden) return;

    const isCountryView = state.viewMode === "country" || state.catalog?.step === "country";

    if (els.countryView) {
      els.countryView.hidden = !isCountryView;
      if (isCountryView) {
        renderCountryView();
      }
    }

    const catalog = state.catalog;
    if (els.pickTitle) {
      const countryObj = catalog?.country || GLOBAL_COUNTRIES.find((c) => c.code === state.selectedCountry);
      els.pickTitle.textContent =
        isCountryView
          ? "Choose Your Country or Education System"
          : catalog?.step === "chapter"
          ? "Select a Chapter to Master"
          : catalog?.step === "subject"
          ? "Choose a Subject"
          : catalog?.step === "class"
          ? "Select Your Class or Stage"
          : catalog?.step === "board" && countryObj
          ? `Select Education System / Board in ${countryObj.name}`
          : "What do you want to master today?";
    }

    if (els.continue) {
      if (state.continueTopic && !isCountryView) {
        if (els.continueTitle) els.continueTitle.textContent = state.continueTopic.name;
        if (els.continueMeta) els.continueMeta.textContent = `${state.continueTopic.subject || "General"} · In Progress`;
        els.continue.hidden = false;
      } else {
        els.continue.hidden = true;
      }
    }

    if (els.catalogLoading) els.catalogLoading.hidden = !(state.catalogLoading && !catalog && !isCountryView);

    if (els.catalogError) {
      els.catalogError.hidden = !state.catalogError;
      if (state.catalogError && els.catalogErrorText) els.catalogErrorText.textContent = state.catalogError;
    }

    if (els.catalog) els.catalog.hidden = !catalog && !isCountryView;
    if (!catalog && !isCountryView) return;

    const showBreadcrumb = !isCountryView && Boolean(catalog);
    if (els.breadcrumb) els.breadcrumb.hidden = !showBreadcrumb;
    if (showBreadcrumb && els.back && els.breadcrumbText) {
      els.back.textContent = `← ${
        catalog.step === "chapter"
          ? state.selection.subject || "Subjects"
          : catalog.step === "subject"
          ? (state.selection.classNum ? `Class ${state.selection.classNum}` : "Boards")
          : catalog.step === "class"
          ? "Boards"
          : "Choose Country"
      }`;
      const countryObj = catalog.country || GLOBAL_COUNTRIES.find((c) => c.code === state.selectedCountry);
      els.breadcrumbText.textContent = `${
        catalog.step === "board"
          ? (countryObj ? `${countryObj.flagEmoji || countryObj.flag || "🌍"} ${countryObj.name}` : (state.selectedCountry || "Global"))
          : `${catalog.track ? catalog.track.label : ""}${
              catalog.classNum ? ` · Class ${catalog.classNum}` : ""
            }${catalog.subject ? ` · ${catalog.subject}` : ""}`
      }`;
    }

    if (els.trackNotice) {
      if (!isCountryView && catalog?.track?.notice) {
        els.trackNotice.textContent = catalog.track.notice;
        els.trackNotice.hidden = false;
      } else {
        els.trackNotice.hidden = true;
      }
    }

    if (!isCountryView && catalog) {
      renderBoards(catalog);
      renderClasses(catalog);
      renderSubjects(catalog);
      renderChapters(catalog);
    } else {
      if (els.boards) els.boards.hidden = true;
      if (els.classes) els.classes.hidden = true;
      if (els.subjects) els.subjects.hidden = true;
      if (els.chapterStep) els.chapterStep.hidden = true;
      if (els.changeCountryBtn) els.changeCountryBtn.hidden = true;
      if (els.subjectFilterWrap) els.subjectFilterWrap.hidden = true;
    }
  }

  function renderBoards(catalog) {
    if (!els.boards) return;
    const visible = catalog.step === "board";
    els.boards.hidden = !visible;
    if (els.changeCountryBtn) {
      els.changeCountryBtn.hidden = !visible;
      const countryObj = catalog.country || GLOBAL_COUNTRIES.find((c) => c.code === state.selectedCountry);
      if (countryObj) {
        els.changeCountryBtn.textContent = `🌍 Change Country (${countryObj.flag || countryObj.flagEmoji || ""} ${countryObj.name})`;
      } else {
        els.changeCountryBtn.textContent = "🌍 Change Country";
      }
    }
    if (!visible) return;

    els.boards.replaceChildren();
    const tracks = catalog.tracks || [];
    if (tracks.length === 0) {
      const emptyNote = el("p", "hub-board-empty-note", "No boards found for this country. Please select another country.");
      els.boards.appendChild(emptyNote);
      return;
    }
    for (const track of tracks) {
      const card = el("button", "hub-board-card");
      card.type = "button";
      const verifText = track.verificationStatus === "officially_verified" ? "✓ Verified 2026–27" : "Academic Year 2026–27";
      card.append(
        el("span", "hub-board-label", track.label),
        el("span", "hub-board-sub", `${track.short || track.label} · ${verifText}`),
        el("span", "hub-board-count", `${track.chapterCount || 10}+ chapters`)
      );
      lifecycle.on(card, "click", () => {
        if (els.verificationCard) {
          els.verificationCard.hidden = false;
          if (els.verifBadge) els.verifBadge.textContent = track.verificationStatus === "officially_verified" ? "Officially Verified 2026–27" : "Partially Verified";
          if (els.verifAuthority) els.verifAuthority.textContent = track.label;
          if (els.verifSourceLink && track.officialUrl) els.verifSourceLink.href = track.officialUrl;
        }
        const next = { track: track.id, classNum: null, subject: "", query: "" };
        state.selection = { ...next };
        void fetchCatalog({ countryCode: state.selectedCountry, ...next });
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
        void fetchCatalog({ countryCode: state.selectedCountry, ...state.selection, classNum, subject: "", query: "" });
      });
      els.classes.appendChild(card);
    }
  }

  function renderSubjects(catalog) {
    if (!els.subjects) return;
    const visible = catalog.step === "subject";
    els.subjects.hidden = !visible;
    if (els.subjectFilterWrap) els.subjectFilterWrap.hidden = !visible;
    if (!visible) return;

    // Filter categories: All, STEM, Sciences, Mathematics, Humanities
    if (els.subjectCategoryFilters) {
      els.subjectCategoryFilters.replaceChildren();
      const categories = ["All", "STEM", "Sciences", "Mathematics", "Humanities"];
      for (const cat of categories) {
        const catKey = cat.toLowerCase();
        const isCurrent =
          (state.subjectCategory || "all") === catKey ||
          (cat === "All" && (!state.subjectCategory || state.subjectCategory === "all"));
        const pill = el("button", `hub-category-pill${isCurrent ? " is-active" : ""}`, cat);
        pill.type = "button";
        lifecycle.on(pill, "click", () => {
          state.subjectCategory = catKey;
          renderSubjects(catalog);
        });
        els.subjectCategoryFilters.appendChild(pill);
      }
    }

    const q = (state.subjectFilter || "").toLowerCase().trim();
    const curCat = state.subjectCategory || "all";

    const allSubjs = catalog.subjects || [];
    const filtered = allSubjs.filter((s) => {
      const matchQuery = !q || s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q));
      let matchCat = true;
      if (curCat === "sciences") {
        matchCat =
          s.name.toLowerCase().includes("phys") ||
          s.name.toLowerCase().includes("chem") ||
          s.name.toLowerCase().includes("bio") ||
          s.name.toLowerCase().includes("sci");
      } else if (curCat === "mathematics") {
        matchCat =
          s.name.toLowerCase().includes("math") ||
          s.name.toLowerCase().includes("calc") ||
          s.name.toLowerCase().includes("alg");
      } else if (curCat === "humanities") {
        matchCat =
          s.name.toLowerCase().includes("hist") ||
          s.name.toLowerCase().includes("geog") ||
          s.name.toLowerCase().includes("pol") ||
          s.name.toLowerCase().includes("eng");
      } else if (curCat === "stem") {
        matchCat = s.category === "stem" || !s.name.toLowerCase().includes("hist");
      }
      return matchQuery && matchCat;
    });

    els.subjects.replaceChildren();
    for (const subject of filtered) {
      const card = el("button", "hub-subject-card");
      card.type = "button";

      // Subject Icon
      let icon = "📖";
      const lower = subject.name.toLowerCase();
      if (lower.includes("phys")) icon = "⚛️";
      else if (lower.includes("calc") || lower.includes("math")) icon = "📐";
      else if (lower.includes("chem")) icon = "🧪";
      else if (lower.includes("bio") || lower.includes("life")) icon = "🧬";
      else if (lower.includes("comput") || lower.includes("csa")) icon = "💻";
      else if (lower.includes("hist") || lower.includes("pol")) icon = "🏛️";
      else if (lower.includes("geog") || lower.includes("earth")) icon = "🌍";

      const nameRow = el("div", "hub-subject-head");
      nameRow.append(
        el("span", "hub-subject-icon", icon),
        el("span", "hub-subject-name", subject.name)
      );

      const metaRow = el("div", "hub-subject-meta-row");
      if (subject.code) {
        metaRow.appendChild(el("span", "hub-subject-code-tag", subject.code));
      }
      metaRow.appendChild(el("span", "hub-subject-count", `${subject.count || 5}+ chapters`));

      card.append(nameRow, metaRow);
      lifecycle.on(card, "click", () => {
        state.selection = { ...state.selection, subject: subject.name, query: "" };
        void fetchCatalog({ countryCode: state.selectedCountry, ...state.selection, subject: subject.name, query: "" });
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

    if (els.crossCurriculumBanner) {
      els.crossCurriculumBanner.replaceChildren();
      const currentSubj = state.selection.subject || "";
      let crossNote = "💡 Compare this topic across international curricula: Also covered in US AP, UK GCSE, and CBSE.";
      if (currentSubj.toLowerCase().includes("phys")) {
        crossNote = "💡 Cross-Curriculum Discovery: Newton's Laws and Kinematics are also covered in US AP Physics 1, UK GCSE Physics (8463), and CBSE Science.";
      } else if (currentSubj.toLowerCase().includes("calc") || currentSubj.toLowerCase().includes("math")) {
        crossNote = "💡 Cross-Curriculum Discovery: Calculus and Functions are also covered in US AP Calculus BC, UK A-Level Maths, and Ontario MHF4U.";
      }
      const tag = el("span", "hub-cross-tag", "Discovery");
      const text = el("span", "hub-cross-text", crossNote);
      els.crossCurriculumBanner.append(tag, text);
      els.crossCurriculumBanner.hidden = false;
    }

    els.chapters.replaceChildren();
    const chapters = catalog.chapters || [];
    for (const chapter of chapters) {
      const group = el("div", "hub-chapter-group");

      const card = el("button", "hub-chapter");
      card.type = "button";

      const body = el("span", "hub-chapter-body");
      body.appendChild(el("span", "hub-chapter-name", chapter.name));

      const prereqs = chapter.prerequisites || [];
      const topicsList = chapter.concepts || chapter.topics || [];
      const meta = [
        chapter.difficultyLabel || "Structured",
        `${topicsList.length || chapter.totalConcepts || 4} topics`,
        `${chapter.estimatedMinutes || 45} min`
      ];

      if (prereqs.length > 0) {
        meta.push(`${prereqs.length} prerequisite${prereqs.length === 1 ? "" : "s"}`);
      }
      if (chapter.progress?.status) {
        meta.push(statusLabel(chapter.progress.status));
      }
      body.appendChild(el("span", "hub-chapter-meta", meta.filter(Boolean).join(" · ")));

      const actionsWrap = el("div", "hub-chapter-actions");
      const toggleTopicsBtn = el("button", "hub-chapter-toggle-topics", `Topics (${topicsList.length || 4}) ▾`);
      toggleTopicsBtn.type = "button";

      const arrow = el("span", "hub-chapter-arrow", "Start Chapter →");
      arrow.setAttribute("aria-hidden", "true");

      actionsWrap.append(toggleTopicsBtn, arrow);
      card.append(el("span", "hub-chapter-num", String(chapter.number)), body, actionsWrap);

      lifecycle.on(card, "click", (e) => {
        if (e.target === toggleTopicsBtn || toggleTopicsBtn.contains(e.target)) return;
        openChapter(chapter);
      });

      // Individual topics accordion
      const topicsContainer = el("div", "hub-chapter-topic-list");
      topicsContainer.hidden = true;

      lifecycle.on(toggleTopicsBtn, "click", (e) => {
        e.stopPropagation();
        const willHide = !topicsContainer.hidden;
        topicsContainer.hidden = willHide;
        toggleTopicsBtn.textContent = willHide ? `Topics (${topicsList.length || 4}) ▾` : "Hide Topics ▴";
      });

      if (topicsList.length > 0) {
        topicsList.forEach((top, idx) => {
          const topItem = el("div", "hub-topic-row");
          const topNum = el("span", "hub-topic-num", `${chapter.number}.${idx + 1}`);
          const topInfo = el("div", "hub-topic-info");
          topInfo.appendChild(el("span", "hub-topic-title", top.title || top.name));
          if (top.description) {
            topInfo.appendChild(el("span", "hub-topic-desc", top.description));
          }
          const topMeta = el("span", "hub-topic-meta", `${top.estimatedMinutes || 12} min · ${top.practiceType || "conceptual"}`);
          topInfo.appendChild(topMeta);

          const startTopicBtn = el("button", "btn btn-secondary btn-sm hub-start-topic-btn", "Start Topic →");
          startTopicBtn.type = "button";
          lifecycle.on(startTopicBtn, "click", (e) => {
            e.stopPropagation();
            openTopic(chapter, { ...top, index: idx + 1 });
          });

          topItem.append(topNum, topInfo, startTopicBtn);
          topicsContainer.appendChild(topItem);
        });
      }

      group.append(card, topicsContainer);
      els.chapters.appendChild(group);
    }
    if (els.empty) els.empty.hidden = chapters.length > 0;
  }

  function showBack() {
    if (state.viewMode === "country") {
      state.viewMode = null;
      render();
      return;
    }
    if (state.selection.subject && state.catalog?.step === "chapter") {
      state.query = "";
      state.subjectFilter = "";
      state.selection.subject = "";
      void fetchCatalog({ countryCode: state.selectedCountry, ...state.selection, subject: "", query: "" });
      return;
    }
    if (state.selection.classNum && state.catalog?.step === "subject") {
      state.subjectFilter = "";
      state.selection.classNum = null;
      void fetchCatalog({ countryCode: state.selectedCountry, ...state.selection, classNum: null, subject: "", query: "" });
      return;
    }
    if (state.selection.track) {
      state.query = "";
      state.subjectFilter = "";
      state.selection.track = "";
      void fetchCatalog({ countryCode: state.selectedCountry, ...EMPTY_SELECTION });
      return;
    }
    state.viewMode = "country";
    render();
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
        countryCode: state.selectedCountry || "IN",
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

      try {
        const profile = {
          country: state.selectedCountry || "IN",
          track: state.selection.track || null,
          classNum: state.selection.classNum || null,
          subject: state.selection.subject || null,
          lastConceptId: conceptId,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("learning_allied_education_profile", JSON.stringify(profile));
      } catch (_) {}

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

  function openTopic(chapter, topic) {
    state.selection = {
      ...state.selection,
      subject: chapter.subject || state.selection.subject,
      query: "",
    };
    state.activeSubConceptId = topic.id;
    state.activeConceptIndex = topic.index || 1;
    void loadLesson(chapter.conceptId, { mode: "start", subConceptId: topic.id });
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
