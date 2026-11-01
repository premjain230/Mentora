/**
 * Chat shell — React owns the static markup; vanilla/chat.js hydrates the
 * conversation rail, header, transcript and composer.
 */
export function ChatMarkup() {
  return (
    <div className="dashboard-page page-chat">
      <div className="topbar chat-topbar">
        <div className="topbar-left">
          <button
            type="button"
            id="chatRailToggle"
            className="chat-icon-btn chat-rail-toggle-btn"
            aria-label="Open conversations"
            aria-controls="chatRail"
            aria-expanded="true"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3 4.5h14M3 10h14M3 15.5h9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Learning Allied</span>
          </div>
          <span className="chat-topbar-tag">Study desk</span>
        </div>
        <div className="topbar-right">
          <span className="chat-pro-tag" id="chatProTag" hidden>
            ★ Pro
          </span>
          <button
            type="button"
            id="chatThemeToggle"
            className="chat-icon-btn chat-theme-toggle"
            aria-label="Switch colour theme"
            aria-pressed="false"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle
                cx="10"
                cy="10"
                r="6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M10 3.5a6.5 6.5 0 0 0 0 13z" fill="currentColor" />
            </svg>
          </button>
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

      <div className="chat-workspace" id="chatWorkspace">
        <aside
          className="chat-rail"
          id="chatRail"
          aria-label="Conversations"
          data-collapsed="false"
        >
          <div className="chat-rail-head">
            <button type="button" id="chatRailNew" className="chat-rail-new">
              <span className="chat-rail-new-icon" aria-hidden="true">
                +
              </span>
              <span className="chat-rail-new-label">New chat</span>
            </button>
            <button
              type="button"
              id="chatRailCollapse"
              className="chat-icon-btn chat-rail-collapse"
              aria-label="Collapse conversations"
              aria-expanded="true"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M12.5 5 7.5 10l5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <label className="chat-rail-search">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle
                cx="9"
                cy="9"
                r="5.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m13 13 3.5 3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              id="chatSearch"
              type="search"
              placeholder="Search conversations"
              aria-label="Search conversations"
              autoComplete="off"
            />
          </label>

          <nav
            className="chat-rail-list"
            id="chatRailList"
            aria-label="Saved conversations"
            aria-busy="true"
          >
            <p className="chat-rail-empty">Loading conversations…</p>
          </nav>

          <div className="chat-rail-foot">
            <a className="chat-rail-link" href="/chat-history">
              Conversation history <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="chat-rail-menu" id="chatRailMenu" hidden>
            <button type="button" data-rail-action="rename">
              Rename
            </button>
            <button type="button" data-rail-action="pin" id="chatRailMenuPin">
              Pin
            </button>
            <button
              type="button"
              data-rail-action="delete"
              className="is-danger"
            >
              Delete
            </button>
          </div>
        </aside>

        <button
          type="button"
          className="chat-rail-scrim"
          id="chatRailScrim"
          aria-label="Close conversations"
          hidden
        />

        <section className="chat-main">
          <header className="chat-head">
            <div className="chat-head-heading">
              <input
                id="chatTitleInput"
                className="chat-title-input"
                aria-label="Conversation title"
                maxLength={200}
                hidden
              />
              <h1 className="chat-title-wrap">
                <button
                  type="button"
                  id="chatTitle"
                  className="chat-title-btn"
                  disabled
                  title="Start a conversation to name it"
                >
                  New study session
                </button>
              </h1>
            </div>

            <div className="chat-head-actions">
              <button
                type="button"
                id="chatContextBtn"
                className="chat-context-btn"
                aria-expanded="false"
                aria-controls="chatContextPanel"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <circle
                    cx="10"
                    cy="10"
                    r="6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M3.5 10h13M10 3.5c2 2 2 11 0 13M10 3.5c-2 2-2 11 0 13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </svg>
                <span id="chatContextChips">General · All subjects · English</span>
                <svg
                  className="chat-context-chevron"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    d="M6 8l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="chat-context-panel" id="chatContextPanel" hidden>
                <p className="chat-context-label">Learning context</p>

                <label className="chat-context-field">
                  <span>Board or exam</span>
                  <select id="chatBoard" aria-label="Board or exam" className="chat-select">
                    <option value="">General</option>
                  </select>
                </label>

                <label className="chat-context-field">
                  <span>Class</span>
                  <select id="chatClass" aria-label="Class" className="chat-select" hidden>
                    <option value="">Class</option>
                  </select>
                </label>

                <label className="chat-context-field">
                  <span>Subject</span>
                  <select
                    id="chatSubject"
                    aria-label="Subject"
                    className="chat-select"
                    disabled
                  >
                    <option value="">All subjects</option>
                  </select>
                </label>

                <label className="chat-context-field">
                  <span>Explanation language</span>
                  <select
                    id="chatLanguage"
                    aria-label="Explanation language"
                    className="chat-select"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                    <option value="mr">मराठी</option>
                  </select>
                </label>

                <p className="chat-context-note">
                  The tutor uses this context to pitch explanations. It does not
                  change saved progress on its own.
                </p>
              </div>
            </div>
          </header>

          <div
            className="chat-log"
            id="chatLog"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            <button type="button" id="chatEarlier" className="chat-earlier" hidden>
              Load earlier messages
            </button>

            <div className="chat-messages" id="chatMessages" />

            <div className="chat-starters" id="chatStarters" hidden />

            <div className="chat-row is-assistant" id="chatLoading" hidden>
              <div
                className="chat-bubble is-assistant chat-thinking"
                role="status"
              >
                Loading saved chat…
              </div>
            </div>

            <div className="chat-row is-assistant" id="chatThinking" hidden>
              <div
                className="chat-bubble is-assistant chat-thinking"
                role="status"
              >
                <span className="chat-typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span id="chatThinkingLabel">Thinking through your question…</span>
              </div>
            </div>

            <div id="chatEnd" />
          </div>

          <button
            type="button"
            id="chatLatestBtn"
            className="chat-chip chat-latest-btn"
            hidden
          >
            ↓ Latest
          </button>

          <p
            className="chat-progress-notice"
            id="chatProgressNotice"
            role="status"
            hidden
          />

          <div
            className="chat-quickbar"
            id="chatQuickbar"
            aria-label="Quick follow-ups"
            hidden
          />

          <form className="chat-composer" id="chatForm">
            <div className="chat-composer-box">
              <textarea
                id="chatInput"
                placeholder="Ask anything from your syllabus…"
                rows={1}
                aria-label="Your question"
                maxLength={2000}
                className="chat-input"
              />
              <button
                type="submit"
                id="chatSend"
                className="chat-send"
                disabled
                aria-label="Send message"
              >
                <span>Send</span>
              </button>
            </div>
            <div className="chat-composer-meta">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span id="chatCharCount" hidden />
            </div>
          </form>
        </section>
      </div>

      <div
        className="chat-modal"
        id="chatDeleteModal"
        hidden
        aria-hidden="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatDeleteTitle"
      >
        <div className="chat-modal-card">
          <h2 id="chatDeleteTitle">Delete this conversation?</h2>
          <p id="chatDeleteText">
            This removes the conversation and every message in it. It cannot be
            undone.
          </p>
          <div className="chat-modal-actions">
            <button type="button" id="chatDeleteCancel" className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" id="chatDeleteConfirm" className="btn btn-danger">
              Delete conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
