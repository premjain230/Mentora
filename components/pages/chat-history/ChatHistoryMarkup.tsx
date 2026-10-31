import Link from "next/link";

/**
 * Chat History page shell. The list itself is hydrated by
 * vanilla/chat-history.js from users/{uid}/chats.
 */
export function ChatHistoryMarkup() {
  return (
    <div className="dashboard-page page-chat-history">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Chat History</span>
          </div>
        </div>
        <div className="topbar-right">
          <Link href="/chat" className="dash-btn primary">
            New chat
          </Link>
        </div>
      </div>

      <div className="page-content chat-history-content">
        <Link href="/home" className="chat-history-back">
          ← Back to Home
        </Link>
        <div className="page-head">
          <div>
            <h1 className="page-title">Previous AI Tutor Chats</h1>
            <p className="page-sub">
              Review your previous explanations, problem solving steps, and
              practice sessions.
            </p>
          </div>
        </div>

        <div
          className="chat-history-list"
          id="chatHistoryList"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="dash-loading">Loading chat sessions…</div>
        </div>
      </div>
    </div>
  );
}
