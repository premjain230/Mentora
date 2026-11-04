/**
 * Understand / Learning Hub shell — React owns the static markup; vanilla/learning-hub.js
 * hydrates the catalog, chapter overview, concept syllabus, practice and progress panels.
 */
export function LearningHubMarkup() {
  return (
    <div className="dashboard-page page-learning-hub">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Understand</span>
          </div>
          <span className="chat-topbar-tag">Adaptive Curriculum Intelligence</span>
        </div>
        <div className="topbar-center" />
        <div className="topbar-right">
          <span className="greeting">
            Hi, <strong id="greetingName">there</strong>
          </span>
          <img
            id="topbarAvatar"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
            alt="Your account"
          />
        </div>
      </div>

      <div className="lh-content">
        <div className="lh-wrap hub-shell">
          {/* Chapter / Concept Learning Session */}
          <section id="hubSession" className="hub-session" aria-busy="false" hidden>
            <div className="hub-session-nav-bar">
              <button type="button" id="hubSessionBack" className="hub-back">
                ← Back to chapters
              </button>
              <div id="hubChapterBreadcrumbs" className="hub-breadcrumbs-bar" />
            </div>

            <div id="hubSessionLoading" className="hub-loading" role="status" hidden>
              <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>
              Preparing this chapter…
            </div>

            <div id="hubSessionError" className="hub-error" role="alert" hidden>
              <p id="hubSessionErrorText" />
              <button type="button" id="hubSessionRetry" className="btn btn-secondary" hidden>
                Retry
              </button>
            </div>

            <div id="hubSessionBody" hidden>
              {/* Chapter Overview & Concept Roadmap Card */}
              <div id="hubChapterOverview" className="hub-chapter-overview-card">
                <div className="hub-chapter-header">
                  <div className="hub-chapter-title-group">
                    <p id="hubEyebrow" className="lh-eyebrow" />
                    <h1 id="hubLessonTitle" className="lh-hero-title lh-hero-title--sm" tabIndex={-1} />
                    <div id="hubMetaRow" className="hub-meta-row" />
                  </div>
                  <div id="hubChapterProgressBadge" className="hub-progress-badge" />
                </div>

                <p id="hubChapterDescription" className="hub-chapter-desc" />

                {/* Sub-Concept Roadmap */}
                <div className="hub-roadmap-container">
                  <div className="hub-roadmap-header">
                    <span className="hub-roadmap-title">Chapter Concept Roadmap</span>
                    <span id="hubRoadmapProgressText" className="hub-roadmap-progress-text" />
                  </div>
                  <div id="hubConceptsRoadmap" className="hub-concepts-roadmap" />
                </div>
              </div>

              {/* Active Concept Stepper (6 Unified Stages) */}
              <div className="hub-concept-container">
                <div className="hub-concept-head-bar">
                  <div className="hub-concept-info">
                    <span id="hubActiveConceptBadge" className="hub-active-concept-badge">Concept 1 of 5</span>
                    <h2 id="hubActiveConceptTitle" className="hub-active-concept-title">Core Principles</h2>
                  </div>
                  <p id="hubActiveConceptDesc" className="hub-active-concept-desc" />
                </div>

                {/* The 6-Stage Progress Rail */}
                <ol id="hubRail" className="learn-rail" aria-label="Lesson stages" />

                <div className="hub-session-grid">
                  <div className="hub-main">
                    {/* Stage 0 / Pre-check: What you already know */}
                    <section className="hub-block" aria-labelledby="hub-known">
                      <h2 id="hub-known" className="hub-block-title">What you already know</h2>
                      <div id="hubMastery" />
                      <div id="hubPrereqs" />
                    </section>

                    <p id="hubReteachNotice" className="learn-callout learn-callout--accent" hidden />

                    {/* Stage 1: Explain */}
                    <section id="hubExplainStage" className="hub-block" aria-labelledby="hub-explain">
                      <div className="hub-block-header-row">
                        <h2 id="hub-explain" className="hub-block-title">1. Understand & Explain</h2>
                        <span className="hub-stage-indicator">Sequenced Instruction</span>
                      </div>
                      <div id="hubTeaching" />
                      <div id="hubReteachNote" />
                      <button type="button" id="hubLessonRetry" className="btn btn-secondary" hidden>
                        Retry preparing the lesson
                      </button>
                    </section>

                    {/* Stage 2: Visualize (Mobile/Inline view) */}
                    <section id="hubVisualizeStage" className="hub-block hub-visual-stage" hidden>
                      <div className="hub-block-header-row">
                        <h2 className="hub-block-title">2. Visualize & Observe</h2>
                        <span className="hub-stage-indicator">Interactive Model</span>
                      </div>
                      <div id="hubInlineVisual" />
                    </section>

                    {/* Stage 3: Practice */}
                    <section id="hubPractice" className="hub-block hub-practice" aria-labelledby="hub-practice" hidden>
                      <div className="hub-block-header-row">
                        <h2 id="hub-practice" className="hub-block-title">3. Concept Practice</h2>
                        <span className="hub-stage-indicator">Adaptive Difficulty</span>
                      </div>
                      <div id="hubCheck" />
                      <div id="hubNextRow" className="hub-next-row" hidden>
                        <button type="button" id="hubNextBtn" className="btn btn-primary">
                          Next question →
                        </button>
                        <p id="hubNextNote" className="hub-next-note" hidden>
                          Or change the explanation first — the next question is one level easier.
                        </p>
                      </div>
                    </section>

                    {/* Completion & Next Stages */}
                    <div id="hubCompletion" />
                    <div id="hubStageNav" className="hub-stage-nav" />

                    <div id="hubCompleteCallout" className="hub-complete-callout" hidden>
                      <p id="hubCompleteText" />
                      <button type="button" id="hubCompleteChoose" className="btn btn-secondary">
                        Choose another chapter
                      </button>
                    </div>

                    <p id="hubProgressNotice" className="learn-callout learn-callout--warn" role="status" hidden />
                  </div>

                  {/* Aside: Stage 2 (Visual Island), Stage 5 (Adapt) & Stage 6 (Remember) */}
                  <aside className="hub-side">
                    {/* Visual representation */}
                    <div className="hub-card hub-visual-card">
                      <div className="hub-card-header-bar">
                        <h3 className="hub-card-title">Interactive Visual</h3>
                        <span className="hub-card-badge">Stage 2</span>
                      </div>
                      <div id="hubVisual" />
                      <div id="hubVisualFallback" className="hub-card-text hub-card-text--muted" hidden>
                        <p>
                          No approved visual is a good fit for this chapter. The written explanation and worked example carry the lesson.
                        </p>
                      </div>
                    </div>

                    {/* Stage 5: Adapt */}
                    <div id="hubAdaptCard" className="hub-card hub-adapt-card">
                      <div className="hub-card-header-bar">
                        <h3 className="hub-card-title">Adaptive Intelligence</h3>
                        <span className="hub-card-badge">Stage 5</span>
                      </div>
                      <div id="hubAdaptBody">
                        <p id="hubAdaptText" className="hub-card-text">
                          Your responses guide the next pedagogical step.
                        </p>
                      </div>
                    </div>

                    {/* Stage 6: Remember & Spaced Revision */}
                    <div className="hub-card hub-remember-card">
                      <div className="hub-card-header-bar">
                        <h3 className="hub-card-title">6. Lock into Memory</h3>
                        <span className="hub-card-badge">Stage 6</span>
                      </div>
                      <p id="hubRememberText" className="hub-card-text" />
                      <p id="hubReviewState" className="hub-card-text hub-card-meta" hidden />
                      <div id="hubPlannerIntegration" className="hub-planner-box">
                        <a href="/planner" id="hubPlannerLink" className="btn btn-secondary btn-sm">
                          View in Study Planner →
                        </a>
                      </div>
                    </div>

                    {/* Next Chapter recommendation */}
                    <div className="hub-card hub-next-card">
                      <h3 className="hub-card-title">Next Step</h3>
                      <p id="hubNextStepText" className="hub-card-text" />
                      <button type="button" id="hubOpenNext" className="btn btn-secondary" hidden />
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          {/* Main Understand / Catalog Portal */}
          <div id="hubPick">
            <header className="hub-pick-head">
              <p className="lh-eyebrow">Understand Experience</p>
              <h1 id="hubPickTitle" className="lh-hero-title">
                What do you want to master today?
              </h1>
              <p className="lh-hero-sub">
                Curriculum-grounded concepts, interactive visual representations, active practice with diagnostic feedback, and spaced memory revision.
              </p>
            </header>

            {/* Resume Learning Card */}
            <div id="hubContinue" className="hub-continue" hidden>
              <div className="hub-continue-left">
                <span className="hub-continue-label">Continue where you left off</span>
                <span id="hubContinueTitle" className="hub-continue-title" />
                <span id="hubContinueMeta" className="hub-continue-meta" />
              </div>
              <button type="button" id="hubContinueBtn" className="btn btn-primary">
                Resume Chapter →
              </button>
            </div>

            {/* Loading & Error States */}
            <div id="hubCatalogLoading" className="hub-loading" role="status">
              <span className="chat-typing" aria-hidden="true"><i /><i /><i /></span>
              Loading your curriculum…
            </div>

            <div id="hubCatalogError" className="hub-error" role="alert" hidden>
              <p id="hubCatalogErrorText" />
              <button type="button" id="hubCatalogRetry" className="btn btn-secondary">
                Retry
              </button>
            </div>

            {/* Catalog Browser */}
            <div id="hubCatalog" hidden>
              <nav id="hubBreadcrumb" className="hub-breadcrumb" aria-label="Your selection" hidden>
                <button type="button" id="hubBack" className="hub-back" />
                <span id="hubBreadcrumbText" className="hub-breadcrumb-text" />
              </nav>

              <p id="hubTrackNotice" className="lh-notice" hidden />

              {/* Board / Class / Subject Selection */}
              <div id="hubBoards" className="hub-grid hub-grid--boards" hidden />
              <div id="hubClasses" className="hub-grid hub-grid--classes" hidden />
              <div id="hubSubjects" className="hub-grid hub-grid--subjects" hidden />

              {/* Chapter Browser */}
              <div id="hubChapterStep" hidden>
                <div className="hub-chapter-header-bar">
                  <form id="hubSearchForm" className="hub-search" role="search">
                    <label className="lh-sr-only" htmlFor="hub-search-input">Search chapters</label>
                    <input
                      id="hub-search-input"
                      className="hub-search-input"
                      type="search"
                      placeholder="Search chapters in this subject…"
                    />
                    <button type="button" id="hubSearchClear" className="hub-search-clear" aria-label="Clear search" hidden>
                      ×
                    </button>
                    <button type="submit" className="btn btn-secondary">Search</button>
                  </form>
                </div>

                <div id="hubChapters" className="hub-chapters" />
                <p id="hubEmpty" className="hub-empty" hidden>
                  No chapters match this search in the curriculum dataset. Try a shorter search.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
