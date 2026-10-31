/**
 * Chat shell — React owns the static markup; vanilla/chat.js hydrates the
 * context selectors, conversation, checks and composer.
 */
export function ChatMarkup() {
  return (
    <div className="dashboard-page page-chat">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>AI Tutor Chat</span>
          </div>
          <span className="chat-topbar-tag">Adaptive teaching</span>
        </div>
        <div className="topbar-center" />
        <div className="topbar-right">
          <a className="chat-history-link" href="/chat-history">
            History
          </a>
          <span className="chat-pro-tag" id="chatProTag" hidden>
            ★ Pro Unlimited
          </span>
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

      <div className="chat-shell">
        <div className="chat-context" aria-label="Learning context">
          <span className="chat-context-label">Learning context</span>
          <select
            id="chatBoard"
            aria-label="Board or exam"
            className="chat-select"
          >
            <option value="">General</option>
          </select>

          <select id="chatClass" aria-label="Class" className="chat-select" hidden>
            <option value="">Class</option>
          </select>

          <select
            id="chatSubject"
            aria-label="Subject"
            className="chat-select"
            disabled
          >
            <option value="">All subjects</option>
          </select>

          <select
            id="chatLanguage"
            aria-label="Explanation language"
            className="chat-select"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
          </select>

          <select id="chatModel" aria-label="Model" className="chat-select">
            <option value="fast">Fast</option>
            <option value="strong">Strong</option>
          </select>

          <button
            type="button"
            id="chatWeb"
            className="chat-chip chat-toggle"
            aria-pressed="false"
          >
            Web search: off
          </button>
        </div>

        <div
          className="chat-log"
          id="chatLog"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
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
              Teaching…
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
              placeholder="Ask a question or paste a problem…"
              rows={1}
              aria-label="Your question"
              maxLength={2000}
              className="chat-input"
            />
            <button
              type="submit"
              id="chatSend"
              className="btn btn-primary chat-send"
              disabled
            >
              Send
            </button>
          </div>
          <div className="chat-composer-meta">
            <span>Enter to send · Shift+Enter for a new line</span>
            <span id="chatCharCount" hidden />
          </div>
        </form>
      </div>
    </div>
  );
}
