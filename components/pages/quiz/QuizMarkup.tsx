/**
 * Quiz page shell (setup, question, results). vanilla/quiz.js drives the
 * built-in bank and AI adaptive flow, then saves attempts to Firestore.
 */
export function QuizMarkup() {
  return (
    <div className="dashboard-page page-quiz">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Adaptive Quiz</span>
          </div>
        </div>
        <div className="topbar-right">
          <a className="dash-btn ghost" href="/home">
            ← Back to chat
          </a>
        </div>
      </div>

      <div className="page-content quiz-content">
        <div className="quiz-wrap">
          <div className="panel" id="setupPanel">
            <h2>Take a quiz</h2>
            <p className="sub">
              Choose a standard quiz from the built-in bank, or an AI adaptive
              quiz that adjusts to how you&apos;re doing.
            </p>

            <div className="mode-toggle" role="tablist">
              <button
                className="mode-btn active"
                id="modeStandard"
                type="button"
                role="tab"
                aria-selected="true"
              >
                Standard
              </button>
              <button
                className="mode-btn"
                id="modeAI"
                type="button"
                role="tab"
                aria-selected="false"
              >
                AI adaptive <span className="ai-badge">AI</span>
              </button>
            </div>

            <div id="standardSetup">
              <div className="row2">
                <div className="field">
                  <label htmlFor="subjectSelect">Subject</label>
                  <select id="subjectSelect" />
                </div>
                <div className="field">
                  <label htmlFor="topicSelect">Topic</label>
                  <select id="topicSelect" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="countSelect">Number of questions</label>
                <select id="countSelect" defaultValue="10">
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                </select>
              </div>
              <button className="btn quiz-primary" id="startBtn" type="button">
                Start quiz
              </button>
            </div>

            <div id="aiSetup" className="ai-setup" hidden>
              <div className="field">
                <label htmlFor="aiName">Your name</label>
                <input type="text" id="aiName" placeholder="e.g. Aarav" />
              </div>
              <div className="field">
                <label htmlFor="aiSubject">What are you studying?</label>
                <input
                  type="text"
                  id="aiSubject"
                  placeholder="e.g. Physics, JEE, NEET, Class 10 Maths"
                />
              </div>
              <div className="field">
                <label htmlFor="aiTopic">Specific topics to focus on (optional)</label>
                <input
                  type="text"
                  id="aiTopic"
                  placeholder="e.g. Kinematics, Chemical Bonding, Trigonometry"
                />
              </div>
              <div className="row2">
                <div className="field">
                  <label htmlFor="aiDifficulty">Difficulty</label>
                  <select id="aiDifficulty" defaultValue="medium">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="aiCount">Number of questions</label>
                  <select id="aiCount" defaultValue="10">
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                </div>
              </div>
              <button className="btn quiz-primary" id="startAIBtn" type="button">
                Start AI quiz
              </button>
            </div>
          </div>

          <div className="panel" id="quizPanel" hidden>
            <div className="q-meta">
              <span id="qCounter">Question 1 / 10</span>
              <span id="qTopicLabel">Subject · Topic</span>
              <span id="aiIndicator" hidden>
                AI
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" id="progressFill" />
            </div>
            <div className="answer-mode-toggle" id="answerModeRow" hidden>
              <span className="answer-mode-label">Answer mode</span>
              <label>
                <input type="radio" name="ansMode" value="mcq" defaultChecked />
                Multiple choice
              </label>
              <label>
                <input type="radio" name="ansMode" value="written" />
                Type answer
              </label>
            </div>
            <div className="q-text" id="qText" />
            <div className="options" id="optionsList" />
            <textarea
              className="answer-textarea"
              id="answerInput"
              aria-label="Your answer"
              placeholder="Type your answer here…"
              hidden
            />
            <div className="feedback-box" id="feedbackBox" hidden />
            <div className="nav-row">
              <button className="btn secondary" id="quitBtn" type="button">
                Quit
              </button>
              <button className="btn quiz-primary" id="submitBtn" type="button" disabled>
                Submit answer
              </button>
              <button className="btn quiz-primary" id="nextBtn" type="button" hidden>
                Next →
              </button>
            </div>
          </div>

          <div className="panel" id="resultPanel" hidden>
            <div className="result-icon" id="resultEmoji">
              🎉
            </div>
            <div className="result-score" id="resultScore">
              0%
            </div>
            <div className="result-sub" id="resultSub">
              Great effort!
            </div>
            <div className="result-stats">
              <div className="rstat">
                <div className="v" id="rCorrect">
                  0
                </div>
                <div className="l">Correct</div>
              </div>
              <div className="rstat">
                <div className="v" id="rIncorrect">
                  0
                </div>
                <div className="l">Incorrect</div>
              </div>
              <div className="rstat">
                <div className="v" id="rTotal">
                  0
                </div>
                <div className="l">Total</div>
              </div>
            </div>
            <div className="row2">
              <button className="btn secondary" id="retakeBtn" type="button">
                Retake
              </button>
              <a className="btn quiz-primary" href="/arena">
                Open Arena
              </a>
            </div>
            <div className="saving" id="savingMsg">
              Saving attempt…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
