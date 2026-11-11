/**
 * Chat shell — React owns the static markup; vanilla/chat.js hydrates the
 * conversation rail, header, transcript and composer.
 */

import { ICON_PATHS } from "../../../vanilla/chat/icons.js";

type IconName = keyof typeof ICON_PATHS;

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/* A quiet constellation that fades into the page, echoing the reference's
   dot field without shipping a canvas or a new dependency. */
const SPARK_DOTS = Array.from({ length: 56 }, (_, i) => ({
  x: 22 + hash(i + 1) * 596,
  y: 18 + hash(i + 101) * 184,
  r: 0.6 + hash(i + 201) * 1.05,
  opacity: 0.18 + hash(i + 301) * 0.55,
  tone: i % 9 === 0 ? 1 : i % 4 === 0 ? 2 : 3,
}));

function SparkleField() {
  const tones = {
    1: "var(--chat-sparkle-1)",
    2: "var(--chat-sparkle-2)",
    3: "var(--chat-sparkle-3)",
  } as const;

  return (
    <svg
      className="chat-sparkle"
      viewBox="0 0 640 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {SPARK_DOTS.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x.toFixed(1)}
          cy={dot.y.toFixed(1)}
          r={dot.r.toFixed(2)}
          fill={tones[dot.tone as 1 | 2 | 3]}
          opacity={dot.opacity.toFixed(2)}
        />
      ))}
    </svg>
  );
}

function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}

export function ChatMarkup() {
  return (
    <div className="dashboard-page page-chat">
      <div className="chat-workspace" id="chatWorkspace">
        <aside
          className="chat-rail"
          id="chatRail"
          aria-label="Conversations"
          data-collapsed="false"
        >
          <div className="chat-rail-head">
            <button
              type="button"
              id="chatRailNew"
              className="chat-rail-new"
              aria-label="New chat"
              title="New chat"
            >
              <Icon name="plus" size={18} className="chat-rail-new-icon" />
              <span className="chat-rail-new-label">New chat</span>
            </button>
            <button
              type="button"
              id="chatRailCollapse"
              className="chat-icon-btn chat-rail-collapse"
              aria-label="Collapse conversations"
              title="Collapse conversations"
              aria-expanded="true"
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              id="chatRailClose"
              className="chat-icon-btn chat-rail-close"
              aria-label="Close conversations"
              title="Close conversations"
            >
              <Icon name="close" />
            </button>
          </div>

          <label className="chat-rail-search">
            <Icon name="search" size={14} className="chat-rail-search-icon" />
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
              <Icon name="history" size={14} />
              <span>Conversation history</span>
            </a>
          </div>

          <div className="chat-rail-menu" id="chatRailMenu" hidden role="menu">
            <button type="button" role="menuitem" data-rail-action="rename">
              <Icon name="pencil" size={15} />
              <span>Rename</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-rail-action="pin"
              id="chatRailMenuPin"
            >
              <Icon name="pin" size={15} />
              <span id="chatRailMenuPinLabel">Pin</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-rail-action="delete"
              className="is-danger"
            >
              <Icon name="trash" size={15} />
              <span>Delete</span>
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
          <header className="chat-topbar">
            <div className="chat-topbar-inner">
              <div className="chat-topbar-left">
                <button
                  type="button"
                  id="chatRailToggle"
                  className="chat-icon-btn chat-rail-toggle-btn"
                  aria-label="Open conversations"
                  title="Open conversations"
                  aria-controls="chatRail"
                  aria-expanded="false"
                >
                  <Icon name="panel" />
                </button>

                <div className="chat-heading">
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
                      <span className="chat-title-text">
                        New Study Session
                      </span>
                      <Icon
                        name="pencil"
                        size={14}
                        className="chat-title-edit"
                      />
                    </button>
                  </h1>
                </div>
              </div>

              <div className="chat-topbar-right">
                <button
                  type="button"
                  id="chatNewTop"
                  className="chat-icon-btn chat-top-new"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Icon name="plus" size={18} />
                </button>

                <span id="chatProTag" className="chat-pro-tag" hidden>
                  <Icon name="pro" size={13} />
                  <span>Pro</span>
                </span>

                <div className="chat-head-actions">
                  <button
                    type="button"
                    id="chatContextBtn"
                    className="chat-context-btn"
                    aria-label="Learning context"
                    aria-expanded="false"
                    aria-controls="chatContextPanel"
                  >
                    <Icon name="globe" size={15} />
                    <span id="chatContextChips">
                      General · All subjects · English
                    </span>
                    <Icon
                      name="chevronDown"
                      size={14}
                      className="chat-context-chevron"
                    />
                  </button>

                  <div
                    className="chat-context-panel"
                    id="chatContextPanel"
                    hidden
                  >
                    <p className="chat-context-label">Learning context</p>

                    <label className="chat-context-field">
                      <span>Board or exam</span>
                      <select
                        id="chatBoard"
                        aria-label="Board or exam"
                        className="chat-select"
                      >
                        <option value="">General</option>
                      </select>
                    </label>

                    <label className="chat-context-field">
                      <span>Class</span>
                      <select
                        id="chatClass"
                        aria-label="Class"
                        className="chat-select"
                        hidden
                      >
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
                      The tutor uses this context to pitch explanations. It does
                      not change saved progress on its own.
                    </p>
                  </div>
                </div>

                <img
                  id="topbarAvatar"
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
                  alt="Your account"
                />
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
            <button
              type="button"
              id="chatEarlier"
              className="chat-earlier"
              hidden
            >
              Load earlier messages
            </button>

            <div className="chat-messages" id="chatMessages" />

            <div className="chat-empty" id="chatEmpty" hidden>
              <div className="chat-empty-inner">
                <h2 className="chat-empty-title">
                  What are we learning today?
                </h2>
                <p className="chat-empty-text">
                  Your tutor explains ideas, works through problems, and checks
                  your reasoning — pitched at your level.
                </p>
                <div className="chat-starters" id="chatStarters" />
              </div>
            </div>

            <div className="chat-row is-assistant" id="chatLoading" hidden>
              <div
                className="chat-loading-card"
                role="status"
                aria-label="Loading saved chat"
              >
                <span className="chat-loading-line" />
                <span className="chat-loading-line" />
                <span className="chat-loading-line" />
              </div>
            </div>

            <div className="chat-row is-assistant" id="chatThinking" hidden>
              <div className="chat-thinking" role="status">
                <span className="chat-typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span id="chatThinkingLabel">
                  Thinking through your question…
                </span>
              </div>
            </div>

            <div id="chatEnd" />
          </div>

          <div className="chat-dock">
            <button
              type="button"
              id="chatLatestBtn"
              className="chat-latest-btn"
              aria-label="Jump to latest message"
              title="Jump to latest"
              hidden
            >
              <Icon name="arrowDown" size={17} />
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

            <div
              className="chat-voice-bar"
              id="chatVoiceBar"
              hidden
              role="region"
              aria-label="Live Voice Mode"
            >
              <div className="chat-voice-bar-main">
                <div className="chat-voice-indicator" id="chatVoiceIndicator">
                  <span className="chat-voice-pulse" />
                  <span className="chat-voice-bar-wave">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="chat-voice-info">
                  <span className="chat-voice-status" id="chatVoiceStatus">
                    Connecting to Voice Tutor…
                  </span>
                  <span
                    className="chat-voice-transcript"
                    id="chatVoiceTranscript"
                    hidden
                  />
                </div>
              </div>

              <div className="chat-voice-actions">
                <button
                  type="button"
                  id="chatVoiceInterrupt"
                  className="chat-voice-action-btn is-interrupt"
                  aria-label="Interrupt tutor"
                  title="Interrupt AI speaking"
                  hidden
                >
                  Interrupt
                </button>
                <button
                  type="button"
                  id="chatVoiceMute"
                  className="chat-voice-action-btn is-mute"
                  aria-label="Mute microphone"
                  title="Mute microphone"
                >
                  <span className="chat-voice-glyph is-mic" id="chatVoiceMicIcon">
                    <Icon name="mic" size={16} />
                  </span>
                  <span className="chat-voice-glyph is-muted" id="chatVoiceMicOffIcon" hidden>
                    <Icon name="micOff" size={16} />
                  </span>
                </button>
                <button
                  type="button"
                  id="chatVoiceEnd"
                  className="chat-voice-action-btn is-end"
                  aria-label="End voice session"
                  title="End voice session"
                >
                  <Icon name="phoneOff" size={16} />
                  <span>End</span>
                </button>
              </div>
            </div>

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
                  type="button"
                  id="chatVoiceBtn"
                  className="chat-voice-btn"
                  aria-label="Start Voice Tutor"
                  title="Start Live Voice Mode"
                >
                  <Icon name="mic" size={17} />
                </button>
                <button
                  type="submit"
                  id="chatSend"
                  className="chat-send"
                  disabled
                  aria-label="Send message"
                  data-state="send"
                >
                  <span className="chat-send-glyph chat-send-icon">
                    <Icon name="arrowUp" size={18} />
                  </span>
                  <span className="chat-send-glyph chat-stop-icon">
                    <Icon name="stop" size={18} />
                  </span>
                </button>
              </div>
              <div className="chat-composer-meta">
                <span className="chat-composer-hint">
                  Enter to send · Shift + Enter for a new line
                </span>
                <span id="chatCharCount" hidden />
              </div>
            </form>
          </div>
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
          <button
            type="button"
            id="chatDeleteClose"
            className="chat-modal-close"
            aria-label="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
          <h2 id="chatDeleteTitle">Delete this conversation?</h2>
          <p id="chatDeleteText">
            This removes the conversation and every message in it. It cannot be
            undone.
          </p>
          <div className="chat-modal-actions">
            <button
              type="button"
              id="chatDeleteCancel"
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              id="chatDeleteConfirm"
              className="btn btn-danger"
            >
              Delete conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
