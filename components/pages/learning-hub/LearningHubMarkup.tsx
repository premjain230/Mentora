/**
 * Learning Hub shell — React owns the static markup; vanilla/learning-hub.js
 * hydrates the catalog, lesson, practice and progress panels.
 */
export function LearningHubMarkup() {
  return (
    <div className="dashboard-page page-learning-hub">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Learning Hub</span>
          </div>
          <span className="chat-topbar-tag">Adaptive loop</span>
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
          <section id="hubSession" className="hub-session" aria-busy="false" hidden>
            <button type="button" id="hubSessionBack" className="hub-back">
              ← Back to chapters
            </button>

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
              <header className="hub-session-head">
                <p id="hubEyebrow" className="lh-eyebrow" />
                <h1 id="hubLessonTitle" className="lh-hero-title lh-hero-title--sm" tabIndex={-1} />
                <div id="hubMetaRow" className="hub-meta-row" />
              </header>

              <ol id="hubRail" className="learn-rail" aria-label="Lesson stages" />

              <div className="hub-session-grid">
                <div className="hub-main">
                  <section className="hub-block" aria-labelledby="hub-known">
                    <h2 id="hub-known" className="hub-block-title">What you already know</h2>
                    <div id="hubMastery" />
                    <div id="hubPrereqs" />
                  </section>

                  <p id="hubReteachNotice" className="learn-callout learn-callout--accent" hidden />

                  <section className="hub-block" aria-labelledby="hub-explain">
                    <h2 id="hub-explain" className="hub-block-title">Explanation</h2>
                    <div id="hubTeaching" />
                    <div id="hubReteachNote" />
                    <button type="button" id="hubLessonRetry" className="btn btn-secondary" hidden>
                      Retry preparing the lesson
                    </button>
                  </section>

                  <section id="hubPractice" className="hub-block hub-practice" aria-labelledby="hub-practice" hidden>
                    <h2 id="hub-practice" className="hub-block-title">Practice</h2>
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

                <aside className="hub-side">
                  <div id="hubVisual" />
                  <div id="hubVisualFallback" className="hub-card hub-card--muted" hidden>
                    <h3 className="hub-card-title">Visual</h3>
                    <p className="hub-card-text">
                      No approved visual is a good fit for this chapter. The written explanation and worked example carry the lesson.
                    </p>
                  </div>

                  <div className="hub-card">
                    <h3 className="hub-card-title">Remember</h3>
                    <p id="hubRememberText" className="hub-card-text" />
                    <p id="hubReviewState" className="hub-card-text hub-card-meta" hidden />
                  </div>

                  <div className="hub-card">
                    <h3 className="hub-card-title">Next step</h3>
                    <p id="hubNextStepText" className="hub-card-text" />
                    <button type="button" id="hubOpenNext" className="btn btn-secondary" hidden />
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <div id="hubPick">
            <header className="hub-pick-head">
              <p className="lh-eyebrow">Choose a topic</p>
              <h1 id="hubPickTitle" className="lh-hero-title">
                What do you want to understand?
              </h1>
              <p className="lh-hero-sub">
                Short explanations, a visual where it helps, and a question that adapts to your answer. Your progress is saved as you go.
              </p>
            </header>

            <div id="hubContinue" className="hub-continue" hidden>
              <div>
                <span className="hub-continue-label">Continue where you left off</span>
                <span id="hubContinueTitle" className="hub-continue-title" />
                <span id="hubContinueMeta" className="hub-continue-meta" />
              </div>
              <button type="button" id="hubContinueBtn" className="btn btn-primary">
                Resume
              </button>
            </div>

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

            <div id="hubCatalog" hidden>
              <nav id="hubBreadcrumb" className="hub-breadcrumb" aria-label="Your selection" hidden>
                <button type="button" id="hubBack" className="hub-back" />
                <span id="hubBreadcrumbText" className="hub-breadcrumb-text" />
              </nav>

              <p id="hubTrackNotice" className="lh-notice" hidden />

              <div id="hubBoards" className="hub-grid hub-grid--boards" hidden />
              <div id="hubClasses" className="hub-grid hub-grid--classes" hidden />
              <div id="hubSubjects" className="hub-grid hub-grid--subjects" hidden />

              <div id="hubChapterStep" hidden>
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
