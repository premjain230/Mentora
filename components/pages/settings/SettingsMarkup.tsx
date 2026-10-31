/**
 * Settings shell (account, appearance, AI memory, security, support, session).
 * vanilla/settings.js hydrates it from the signed-in user's Firestore data.
 */
export function SettingsMarkup() {
  return (
    <div className="dashboard-page page-settings">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Settings</span>
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

      <div className="page-content settings-content">
        <div className="settings-grid">
          <div className="page-header">
            <h1>Settings</h1>
            <p>
              Manage your account, get help, and personalise your Learning
              Allied experience.
            </p>
          </div>

          <section className="settings-card" aria-labelledby="settings-account">
            <div className="card-header">
              <div className="card-header-icon cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-account">Account</h2>
                <p>Your profile and sign-in details</p>
              </div>
            </div>
            <div className="card-body">
              <div className="info-row">
                <div>
                  <div className="info-label">Name</div>
                  <div className="info-value" id="displayName">
                    —
                  </div>
                </div>
              </div>
              <div className="info-row">
                <div>
                  <div className="info-label">Email address</div>
                  <div className="info-value" id="displayEmail">
                    —
                  </div>
                </div>
                <span className="info-badge" id="emailBadge">
                  Verified
                </span>
              </div>
              <div className="info-row">
                <div>
                  <div className="info-label">Plan</div>
                  <div className="info-value" id="displayPlan">
                    Free Plan
                  </div>
                </div>
                <span className="info-badge" id="planBadge">
                  Active
                </span>
              </div>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-appearance">
            <div className="card-header">
              <div className="card-header-icon cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-appearance">Appearance</h2>
                <p>Choose how Learning Allied looks on this device</p>
              </div>
            </div>
            <div className="card-body">
              <div className="theme-row">
                <div>
                  <div className="theme-row-title" id="settingsThemeLabel">
                    Light theme
                  </div>
                  <div className="theme-row-sub">
                    Switch between light and dark mode.
                  </div>
                </div>
                <button
                  type="button"
                  className="tswitch"
                  id="settingsThemeSwitch"
                  role="switch"
                  aria-checked="false"
                  aria-labelledby="settingsThemeLabel"
                >
                  <span className="knob">
                    <svg className="i-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                    </svg>
                    <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-memory">
            <div className="card-header">
              <div className="card-header-icon cyan">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-memory">AI Memory</h2>
                <p>Facts &amp; preferences Learning Allied remembers for you</p>
              </div>
            </div>
            <div className="card-body">
              <p className="card-copy">
                Learning Allied recalls these in every chat — on this website and
                on the mobile app.
              </p>
              <div className="memory-form">
                <input
                  className="form-input"
                  type="text"
                  id="memoryInput"
                  placeholder="e.g. I'm preparing for JEE 2027 and find integration hardest"
                  maxLength={2000}
                />
                <button className="btn btn-primary" id="addMemoryBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add
                </button>
              </div>
              <div id="memoryList" className="memory-list">
                <p className="memory-empty">Loading memories…</p>
              </div>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-security">
            <div className="card-header">
              <div className="card-header-icon purple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-security">Security &amp; password</h2>
                <p>Reset your sign-in credentials</p>
              </div>
            </div>
            <div className="card-body">
              <p className="card-copy">
                We&apos;ll send a password reset link to{" "}
                <span className="card-copy-strong" id="resetEmail">
                  your registered email
                </span>
                .
              </p>
              <button className="btn btn-ghost" id="resetPasswordBtn" type="button">
                Send password reset email
              </button>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-support">
            <div className="card-header">
              <div className="card-header-icon purple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-support">Help &amp; Support</h2>
                <p>Send us a message and we&apos;ll get back to you</p>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label" htmlFor="supportFrom">
                  From
                </label>
                <input
                  className="form-input"
                  type="email"
                  id="supportFrom"
                  disabled
                  placeholder="Loading…"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supportSubject">
                  Subject
                </label>
                <input
                  className="form-input"
                  type="text"
                  id="supportSubject"
                  placeholder="e.g. Issue with study planner"
                  maxLength={100}
                />
                <div className="form-meta">
                  <span />
                  <span className="char-count" id="subjectCount">
                    0 / 100
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supportMessage">
                  Message
                </label>
                <textarea
                  className="form-textarea"
                  id="supportMessage"
                  placeholder="Describe your issue or question in detail..."
                  maxLength={1000}
                />
                <div className="form-meta">
                  <span />
                  <span className="char-count" id="messageCount">
                    0 / 1000
                  </span>
                </div>
              </div>
              <button className="btn btn-primary" id="sendSupportBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Send message
              </button>
            </div>
          </section>

          <section className="settings-card" aria-labelledby="settings-session">
            <div className="card-header">
              <div className="card-header-icon red">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="card-header-text">
                <h2 id="settings-session">Sign out</h2>
                <p>End your current session</p>
              </div>
            </div>
            <div className="card-body">
              <p className="card-copy">
                Signing out will end this session on this device. Your chats and
                study data are saved and will be available when you sign back
                in.
              </p>
              <div className="btn-row">
                <button className="btn btn-danger" id="logoutBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign out of Learning Allied
                </button>
              </div>
              <div className="danger-zone">
                <div className="danger-zone-text">
                  <h4>Delete account</h4>
                  <p>Permanently remove your account and all associated data.</p>
                </div>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled
                  title="Coming soon"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-modal" id="logoutModal" hidden>
        <div
          className="modal-card settings-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logoutModalTitle"
        >
          <span className="modal-icon" aria-hidden="true">
            🔐
          </span>
          <h3 id="logoutModalTitle">Sign out of Learning Allied?</h3>
          <p>
            You&apos;ll need to sign in again to access your chats, study
            planner, and learning tools.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" id="cancelLogout" type="button">
              Cancel
            </button>
            <button className="btn btn-danger" id="confirmLogout" type="button">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
