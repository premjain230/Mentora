/**
 * Arena shell — structural transcription of the legacy arena.html dashboard.
 * React owns the static markup; vanilla/arena.js hydrates tracks, class and
 * subject selection, the chapter map, battles, the final boss and progress.
 */
export function ArenaMarkup() {
  return (
    <div className="dashboard-page page-arena">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Arena</span>
          </div>
          <span className="greeting arena-topbar-sub">Conquer the syllabus</span>
        </div>
        <div className="topbar-right">
          <span className="greeting">
            Hi, <span id="greetingName">there</span>
          </span>
          <img
            id="topbarAvatar"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
            alt="Your account"
          />
        </div>
      </div>

      <div className="page-content arena-content">
        <div className="arena-wrap">
          <div id="breadcrumb" className="arena-breadcrumb" />

          <section id="viewLanding">
            <div className="arena-hero">
              <h1>Arena</h1>
              <p>Choose your battlefield</p>
              <div className="arena-sub">
                The syllabus is the game. Defeat chapters, conquer the subject.
                JEE · NEET · Maharashtra · CBSE
              </div>
            </div>
            <div className="battle-grid" id="battleGrid" role="list" />
            <div id="continueRow" className="arena-continue hidden">
              <div className="arena-continue-card">
                <div>
                  <div className="arena-continue-title">
                    Continue where you left off
                  </div>
                  <div id="continueLabel" className="arena-continue-meta" />
                </div>
                <button className="resume-btn" id="continueBtn" type="button">
                  Resume →
                </button>
              </div>
            </div>
            <div id="landingError" className="error hidden" role="alert" />
          </section>

          <section id="viewClass" className="hidden">
            <div className="select-head">
              <h2 id="classTitle">Choose class</h2>
              <button className="back-btn" data-arena-back type="button">
                ← Back
              </button>
            </div>
            <div className="pill-row" id="classRow" role="listbox" aria-label="Class" />
          </section>

          <section id="viewSubject" className="hidden">
            <div className="select-head">
              <h2 id="subjectTitle">Choose subject</h2>
              <button className="back-btn" data-arena-back type="button">
                ← Back
              </button>
            </div>
            <div className="subject-grid" id="subjectGrid" />
          </section>

          <section id="viewMap" className="hidden">
            <div className="map-header">
              <div className="map-title">
                <h2 id="mapSubject">Physics</h2>
                <p id="mapSubtitle" />
              </div>
              <div className="map-stats">
                <span className="stat-chip">
                  <span>Progress</span> <strong id="mapProgress">0%</strong>
                </span>
                <span className="stat-chip">
                  <span>Defeated</span> <strong id="mapDefeated">0/0</strong>
                </span>
                <span className="stat-chip hidden" id="masteryChip">
                  <span>Mastered</span> <strong id="mapMastered">0</strong>
                </span>
              </div>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" id="mapProgressFill" />
            </div>
            <div className="map-toolbar">
              <input
                className="search-input"
                id="mapSearch"
                placeholder="Search chapters…"
                aria-label="Search chapters"
              />
              <button
                className="resume-btn hidden"
                id="resumeBtn"
                type="button"
              >
                Resume current →
              </button>
              <button className="back-btn" data-arena-back type="button">
                ← Battlefield
              </button>
            </div>
            <div id="mapLoading" className="arena-map-loading hidden">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
            <div id="mapError" className="error hidden" />
            <div id="mapEmpty" className="empty hidden">
              No curriculum available for this selection yet. Try another
              subject or class — your progress will still sync when content is
              added.
            </div>
            <div
              className="map-stage"
              id="mapStage"
              aria-label="Subject progression map"
            >
              <div className="path-line" aria-hidden="true" />
              <div className="path-progress" id="pathProgress" aria-hidden="true" />
              <div className="map-path" id="mapPath" />
            </div>
          </section>
        </div>
      </div>

      <div className="arena-modal" id="chapterModal" aria-hidden="true">
        <div className="overlay" data-close="chapterModal" />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Chapter battle">
          <div className="sheet-head">
            <div>
              <h3 id="chTitle">Chapter</h3>
              <p id="chSubtitle" />
            </div>
            <button className="close-btn" data-close="chapterModal" aria-label="Close" type="button">
              ✕
            </button>
          </div>
          <div className="sheet-body">
            <div className="kv">
              <div>
                <div className="k">State</div>
                <div className="v" id="chState">—</div>
              </div>
              <div>
                <div className="k">Difficulty</div>
                <div className="v" id="chDiff">—</div>
              </div>
              <div>
                <div className="k">Progress</div>
                <div className="v" id="chProgress">—</div>
              </div>
              <div>
                <div className="k">Mastery</div>
                <div className="v" id="chMastery">—</div>
              </div>
            </div>
            <div id="chTopics" className="arena-chapter-topics" />
            <div className="level-row" id="chLevels" />
            <div id="chLockedMsg" className="error hidden" />
            <button className="battle-btn" id="enterBattleBtn" type="button">
              Enter battle
            </button>
            <button
              className="battle-btn secondary hidden"
              id="replayBtn"
              type="button"
            >
              Replay chapter
            </button>
            <div id="chPrev" className="arena-chapter-prev" />
          </div>
        </div>
      </div>

      <div className="arena-modal" id="battleModal" aria-hidden="true">
        <div className="overlay" data-close="battleModal" />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Battle">
          <div className="sheet-head">
            <div>
              <h3 id="battleTitle">Battle</h3>
              <p id="battleSubtitle">Understand → Practice → Challenge → Boss</p>
            </div>
            <button className="close-btn" data-close="battleModal" aria-label="Close" type="button">
              ✕
            </button>
          </div>
          <div className="sheet-body">
            <div className="q-meta">
              <span id="qCounter">Question 1 / 5</span>
              <span id="qLevelLabel">Foundation</span>
            </div>
            <div className="q-progress">
              <div className="fill" id="qFill" />
            </div>
            <div className="q-text" id="qText" />
            <div className="options" id="qOptions" />
            <div className="feedback hidden" id="qFeedback" />
            <div id="battleError" className="error hidden" />
            <button
              className="battle-btn secondary hidden"
              id="battleRetryBtn"
              type="button"
            >
              Retry questions
            </button>
            <div className="arena-battle-actions">
              <button className="battle-btn secondary" id="quitBattleBtn" type="button">
                Quit
              </button>
              <button className="battle-btn" id="nextQBtn" type="button" disabled>
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="arena-modal" id="victoryModal" aria-hidden="true">
        <div className="overlay" data-close="victoryModal" />
        <div className="sheet arena-victory-sheet" role="dialog" aria-modal="true" aria-label="Victory">
          <div className="confetti" id="confetti" />
          <div className="victory">
            <div className="burst">✓</div>
            <h3 className="arena-victory-title">Chapter defeated</h3>
            <p id="victoryText" className="arena-victory-text" />
            <div className="arena-victory-actions">
              <button className="battle-btn secondary" id="victoryClose" type="button">
                Continue
              </button>
              <button className="battle-btn" id="victoryNext" type="button">
                Next chapter →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="arena-modal" id="bossModal" aria-hidden="true">
        <div className="overlay" data-close="bossModal" />
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Final boss">
          <div className="sheet-head">
            <div>
              <h3>🏆 Final boss</h3>
              <p id="bossSubtitle">Comprehensive subject challenge</p>
            </div>
            <button className="close-btn" data-close="bossModal" aria-label="Close" type="button">
              ✕
            </button>
          </div>
          <div className="sheet-body" id="bossBody" />
        </div>
      </div>
    </div>
  );
}
