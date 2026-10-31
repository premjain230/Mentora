/**
 * Study Session page shell (setup, live session, history). vanilla/study-session.js
 * drives the views, timer, checklist and Firestore persistence.
 */
export function StudySessionMarkup() {
  return (
    <div className="dashboard-page page-study-session">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Study Session</span>
          </div>
        </div>
      </div>

      <div className="page-content study-content">
        <div className="study-inner">
          <div id="ssSetupView">
            <h1 className="page-title">Study Session</h1>
            <p className="page-sub">
              A guided focus block — pick a subject and topic, set a timer, and
              Learning Allied builds you goals, key points and practice
              questions to work through.
            </p>

            <div className="study-card fade-up">
              <div className="study-card-label">Set up your session</div>

              <label className="study-field-label" htmlFor="ssSubject">
                Subject
              </label>
              <input
                type="text"
                id="ssSubject"
                className="study-input"
                placeholder="e.g. Physics"
                maxLength={100}
                autoComplete="off"
              />

              <label className="study-field-label" htmlFor="ssTopic">
                Topic
              </label>
              <input
                type="text"
                id="ssTopic"
                className="study-input"
                placeholder="e.g. Newton's Laws of Motion"
                maxLength={200}
                autoComplete="off"
              />

              <div className="study-field-label">Duration</div>
              <div className="study-duration-row" id="ssDurations">
                {[10, 20, 25, 30, 45, 60].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`study-duration-chip${minutes === 25 ? " active" : ""}`}
                    data-min={minutes}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>

              <label className="study-field-label" htmlFor="ssGoal">
                Focus goal <span className="study-optional">(optional)</span>
              </label>
              <textarea
                id="ssGoal"
                className="study-textarea"
                placeholder="e.g. Master the three laws and solve 5 problems."
              />

              <button type="button" className="study-btn-gradient" id="ssStartBtn">
                Start Session
              </button>
            </div>

            <div className="study-card fade-up">
              <div className="study-card-label">Recent sessions</div>
              <div id="ssHistory">
                <div className="study-loading">
                  <span className="study-loading-dot" />
                  <span className="study-loading-dot" />
                  <span className="study-loading-dot" />
                </div>
              </div>
            </div>
          </div>

          <div id="ssSessionView" hidden>
            <div className="study-session-header fade-up">
              <div className="study-session-title" id="ssSessionTitle" />
              <div className="study-session-meta" id="ssSessionMeta" />
            </div>

            <div className="study-card study-card-center fade-up">
              <div className="study-timer-wrap">
                <div className="study-timer-ring" id="ssTimerRing">
                  <div>
                    <div className="study-timer-time" id="ssTimer">
                      00:00
                    </div>
                    <div className="study-timer-sub">focused time</div>
                  </div>
                </div>
              </div>
              <div className="study-goal-box" id="ssGoalBox" hidden>
                <span className="study-goal-label">Focus goal</span>
                <span id="ssGoalText" />
              </div>
              <div className="study-session-actions">
                <button type="button" className="study-btn-outline" id="ssPauseBtn">
                  Pause
                </button>
                <button
                  type="button"
                  className="study-btn-outline"
                  id="ssResumeBtn"
                  hidden
                >
                  Resume
                </button>
                <button type="button" className="study-btn-danger" id="ssEndBtn">
                  Finish Session
                </button>
              </div>
            </div>

            <div className="study-card fade-up">
              <div className="study-section-heading">Today&apos;s goals</div>
              <div id="ssObjectives" />
              <div id="ssTipsSection" hidden>
                <div className="study-section-heading study-tips-heading">
                  Stay focused
                </div>
                <div id="ssTips" />
              </div>
            </div>

            <div className="study-card fade-up">
              <div className="study-section-heading">Key concepts</div>
              <div id="ssKeyPoints" />
              <div id="ssPracticeSection" hidden>
                <div className="study-section-heading">Practice questions</div>
                <div id="ssPracticeQuestions" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
