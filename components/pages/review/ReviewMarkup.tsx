import Link from "next/link";

/**
 * Review page shell. vanilla/review.js loads users/{uid}/reviews and renders
 * the due queue, state counters and retention timeline.
 */
export function ReviewMarkup() {
  return (
    <div className="dashboard-page page-review">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Spaced Review</span>
          </div>
        </div>
        <div className="topbar-right">
          <Link href="/quiz" className="dash-btn">
            Practice Quiz
          </Link>
        </div>
      </div>

      <div className="page-content review-content">
        <Link href="/home" className="review-back">
          ← Back to Home
        </Link>

        <div className="page-head">
          <div>
            <h1 className="page-title">Today&apos;s Review</h1>
            <p className="page-sub">
              Concepts are scheduled here from your quizzes and practice so you
              revisit them before they fade.
            </p>
          </div>
          <Link
            href="/quiz"
            id="reviewStart"
            className="dash-btn primary review-start"
            hidden
          >
            Start Review
          </Link>
        </div>

        <div className="review-stats" id="reviewStats" aria-live="polite">
          <div className="dash-loading">Loading your review queue…</div>
        </div>

        <div className="review-list" id="reviewList" aria-live="polite" />

        <div className="review-graph aq-graph-card" id="reviewGraph" />
      </div>
    </div>
  );
}
