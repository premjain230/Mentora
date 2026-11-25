const PERSONALITIES = [
  {
    id: "mentor",
    emoji: "🧭",
    name: "Mentor",
    desc: "Wise and experienced, guides you with patience and deep knowledge.",
  },
  {
    id: "friendly",
    emoji: "🤝",
    name: "Friendly Companion",
    desc: "Warm and supportive, like a study buddy who's always there.",
  },
  {
    id: "motivator",
    emoji: "⚡",
    name: "Motivator",
    desc: "High energy, pushes you to do your best and crush your goals.",
  },
  {
    id: "deep-thinker",
    emoji: "🧠",
    name: "Deep Thinker",
    desc: "Philosophical and analytical, explores ideas from every angle.",
  },
  {
    id: "coach",
    emoji: "🎯",
    name: "Coach",
    desc: "Goal-oriented and structured, keeps you on track with clear plans.",
  },
  {
    id: "calm-guide",
    emoji: "🌿",
    name: "Calm Guide",
    desc: "Soothing and gentle, helps you stay relaxed and focused.",
  },
  {
    id: "inspirational",
    emoji: "✨",
    name: "Inspirational",
    desc: "Uplifting and visionary, helps you dream big and reach higher.",
  },
];

/**
 * Profile shell (identity, appearance, AI personality, future-self letter).
 * vanilla/profile.js hydrates it from the owner's user document.
 */
export function ProfileMarkup() {
  return (
    <div className="dashboard-page page-profile">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Profile</span>
          </div>
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

      <div className="page-content profile-content">
        <div className="profile-page">
          <section className="profile-header" aria-label="Your profile">
            <div className="ph">
              <div className="ph-avatar" id="profileAvatar" aria-hidden="true">
                G
              </div>
              <div className="ph-id">
                <h1 className="ph-name" id="profileName">
                  Loading…
                </h1>
                <div className="ph-email" id="profileEmail">
                  –
                </div>
                <span className="plan-pill" id="profilePlan">
                  Free plan
                </span>
              </div>
            </div>
            <div className="stats">
              <div className="stat" id="statChats">
                <span className="stat-v">–</span>
                <span className="stat-l">Chats</span>
              </div>
              <div className="stat" id="statStreak">
                <span className="stat-v">–</span>
                <span className="stat-l">Day streak</span>
              </div>
              <div className="stat" id="statTopics">
                <span className="stat-v">–</span>
                <span className="stat-l">Topics</span>
              </div>
            </div>
          </section>

          {/* Academic Identity & Curriculum Section */}
          <section aria-labelledby="h-academic">
            <h2 className="sec-h" id="h-academic">
              Academic Identity & Curriculum
            </h2>
            <p className="sec-d">
              Your syllabus origin, grade, target exam, and priority subjects. Learning Allied personalizes Learning Hub, Arena, and AI Tutor to match this.
            </p>
            <div className="academic-card">
              <div className="academic-grid">
                <div className="academic-item">
                  <span className="academic-label">Country of Study</span>
                  <div className="academic-value" id="profileCountryVal">
                    <span id="profileCountryFlag">🌍</span> <span id="profileCountryName">Global</span>
                  </div>
                </div>
                <div className="academic-item">
                  <span className="academic-label">Education Board / Authority</span>
                  <div className="academic-value" id="profileBoardVal">
                    <span id="profileBoardName">Curriculum</span>
                    <span className="academic-badge" id="profileBoardBadge">Standard</span>
                  </div>
                </div>
                <div className="academic-item">
                  <span className="academic-label">Grade / Year</span>
                  <div className="academic-value" id="profileGradeVal">—</div>
                </div>
                <div className="academic-item">
                  <span className="academic-label">Daily Target Study</span>
                  <div className="academic-value" id="profileDailyHoursVal">4 hours / day</div>
                </div>
                <div className="academic-item">
                  <span className="academic-label">Primary Academic Goal</span>
                  <div className="academic-value" id="profileGoalVal">
                    <span className="academic-badge" id="profileGoalBadge">Top 1%</span>
                    <span id="profileGoalName">Competitive Exam Excellence</span>
                  </div>
                </div>
                <div className="academic-item">
                  <span className="academic-label">Tutoring Language</span>
                  <div className="academic-value" id="profileLanguageVal">English</div>
                </div>
              </div>

              <div className="academic-subjects-wrap">
                <span className="academic-label">Priority Subjects</span>
                <div className="academic-chips" id="profileSubjectsContainer">
                  <span className="academic-chip">Physics</span>
                  <span className="academic-chip">Chemistry</span>
                  <span className="academic-chip">Mathematics</span>
                </div>
              </div>

              <div className="academic-footer">
                <span className="academic-meta-hint">
                  Changes automatically synchronize with Learning Hub, Arena, AI Tutor, and Study Planner.
                </span>
                <button type="button" className="btn-edit-academic" id="editAcademicBtn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  <span>Edit Academic Profile</span>
                </button>
              </div>
            </div>
          </section>

          <section aria-labelledby="h-appearance">
            <h2 className="sec-h" id="h-appearance">
              Appearance
            </h2>
            <p className="sec-d">Choose how Learning Allied looks on this device.</p>
            <div className="panel">
              <div className="row">
                <div>
                  <div className="row-t" id="themeLabel">
                    Light theme
                  </div>
                  <div className="row-s">Switch between light and dark.</div>
                </div>
                <button
                  type="button"
                  className="tswitch"
                  id="themeSwitch"
                  role="switch"
                  aria-checked="false"
                  aria-labelledby="themeLabel"
                >
                  <span className="knob">
                    <svg className="i-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                    </svg>
                    <svg
                      className="i-sun"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section aria-labelledby="h-personality">
            <h2 className="sec-h" id="h-personality">
              AI personality
            </h2>
            <p className="sec-d">
              Choose how your AI companion sounds. This changes the tone of every chat.
            </p>
            <div
              className="pgrid"
              id="personalityGrid"
              role="radiogroup"
              aria-labelledby="h-personality"
            >
              {PERSONALITIES.map((personality) => (
                <button
                  key={personality.id}
                  type="button"
                  className="pcard"
                  role="radio"
                  aria-checked="false"
                  data-id={personality.id}
                >
                  <div className="pcard-top">
                    <span className="pcard-e" aria-hidden="true">
                      {personality.emoji}
                    </span>
                    <span className="pcheck" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                  <div className="pcard-n">{personality.name}</div>
                  <div className="pcard-d">{personality.desc}</div>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="h-letter">
            <h2 className="sec-h" id="h-letter">
              A letter from future you
            </h2>
            <p className="sec-d">
              A note of encouragement written from the version of you who made it.
            </p>
            <div className="panel letter-panel">
              <div className="letter" id="letterPreview">
                <div className="letter-empty" id="letterPlaceholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <p>No letter yet. Generate one to hear from your future self.</p>
                </div>
                <div className="letter-body" id="letterContent" style={{ display: "none" }} />
                <div className="letter-date" id="letterDate" style={{ display: "none" }} />
              </div>
              <div className="letter-foot">
                <button className="btn btn-primary" id="generateLetterBtn" type="button">
                  <svg
                    className="spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <svg className="spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 3l1.8 5.7L19.5 10l-5.7 1.8L12 17.5l-1.8-5.7L4.5 10l5.7-1.3L12 3z" />
                  </svg>
                  <span id="letterBtnText">Generate letter</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Edit Academic Profile Modal */}
      <div className="academic-modal-backdrop" id="academicModal" role="dialog" aria-modal="true" aria-labelledby="modalAcademicTitle">
        <div className="academic-modal-sheet">
          <div className="academic-modal-header">
            <h3 className="academic-modal-title" id="modalAcademicTitle">
              Edit Academic Identity & Curriculum
            </h3>
            <button type="button" className="academic-modal-close" id="closeAcademicModalBtn" aria-label="Close dialog">
              ✕
            </button>
          </div>
          <div className="academic-modal-body">
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editCountrySelect">Country of Study</label>
              <select id="editCountrySelect" className="academic-select"></select>
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editTrackSelect">Curriculum / Education Board</label>
              <select id="editTrackSelect" className="academic-select"></select>
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editGradeSelect">Grade / Stage</label>
              <select id="editGradeSelect" className="academic-select"></select>
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label">Priority Subjects (Tap to toggle)</label>
              <div className="academic-chips-select" id="editSubjectsList"></div>
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editGoalSelect">Primary Academic Goal</label>
              <select id="editGoalSelect" className="academic-select"></select>
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editDailyHours">Daily Study Hours (<span id="editDailyHoursVal">4</span> hours/day)</label>
              <input type="range" id="editDailyHours" min={1} max={10} className="onboard-slider" />
            </div>
            <div className="academic-form-group">
              <label className="academic-form-label" htmlFor="editLanguageSelect">Preferred Tutoring Language</label>
              <select id="editLanguageSelect" className="academic-select"></select>
            </div>
          </div>
          <div className="academic-modal-footer">
            <button type="button" className="academic-btn-cancel" id="cancelAcademicBtn">
              Cancel
            </button>
            <button type="button" className="academic-btn-save" id="saveAcademicBtn">
              Save Academic Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
