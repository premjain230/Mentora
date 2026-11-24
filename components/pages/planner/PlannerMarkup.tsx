import Link from "next/link";

/**
 * Planner page shell (Today / Weekly / Progress / Milestones). vanilla/planner.js
 * hydrates it from studyPlans, tasks and progress, and owns replan/delete.
 */
export function PlannerMarkup() {
  return (
    <div className="dashboard-page page-planner">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Study Planner</span>
          </div>
        </div>
        <div className="topbar-right planner-actions">
          <Link className="dash-btn ghost planner-edit-link" href="/planner-onboarding">
            Edit exam goals
          </Link>
          <button
            className="dash-btn planner-replan-btn"
            id="plannerReplanBtn"
            type="button"
            hidden
          >
            ⚡ Replan
          </button>
          <button
            className="dash-btn danger"
            id="plannerDeleteBtn"
            type="button"
            hidden
          >
            Delete plan
          </button>
        </div>
      </div>

      <div className="page-content planner-content">
        <div className="planner-inner">
          <header className="planner-head">
            <h1 className="page-title">Study planner</h1>
            <p className="page-sub">
              Your daily schedule, weekly roadmap and progress toward exam day.
            </p>
          </header>

          {/* Interactive Exam Countdown & Velocity Pulse */}
          <div
            className="planner-hero-card ui-interactive-card"
            id="plannerHeroCard"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              padding: "16px 22px",
              background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg, 10px)",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="ui-badge-pulse" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Target Exam Countdown
                </span>
              </div>
              <div
                id="plannerExamTitle"
                style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}
              >
                Personalized Preparation Roadmap
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div
                  id="plannerDaysLeft"
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "var(--accent, #3b82f6)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  —
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Days Remaining
                </div>
              </div>
              <div style={{ width: "1px", height: "32px", background: "var(--border)" }} />
              <div style={{ textAlign: "center" }}>
                <div
                  id="plannerTotalStudied"
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  —
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Hours Logged
                </div>
              </div>
            </div>
          </div>

          <div className="planner-tabs" id="plannerTabs" role="tablist">
            <button
              className="planner-tab active"
              type="button"
              role="tab"
              aria-selected="true"
              data-tab="today"
            >
              Today
            </button>
            <button
              className="planner-tab"
              type="button"
              role="tab"
              aria-selected="false"
              data-tab="weekly"
            >
              Weekly
            </button>
            <button
              className="planner-tab"
              type="button"
              role="tab"
              aria-selected="false"
              data-tab="progress"
            >
              Progress
            </button>
            <button
              className="planner-tab"
              type="button"
              role="tab"
              aria-selected="false"
              data-tab="milestones"
            >
              Milestones
            </button>
          </div>

          <div
            className="planner-body"
            id="plannerContent"
            aria-live="polite"
          >
            <div className="planner-loading">
              <span className="planner-loading-dot" />
              <span className="planner-loading-dot" />
              <span className="planner-loading-dot" />
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-modal" id="plannerReplanModal" hidden>
        <div
          className="modal-card planner-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plannerReplanTitle"
        >
          <h3 className="planner-modal-title" id="plannerReplanTitle">
            Smart replan
          </h3>
          <p className="planner-modal-sub" id="plannerReplanSub">
            You have missed tasks. Learning Allied will generate a catch-up
            schedule that prioritises what you missed without overloading your
            remaining days.
          </p>
          <div className="planner-modal-actions">
            <button
              className="dash-btn ghost"
              id="plannerReplanCancel"
              type="button"
            >
              Cancel
            </button>
            <button
              className="dash-btn primary"
              id="plannerReplanConfirm"
              type="button"
            >
              Generate catch-up plan
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-modal" id="plannerDeleteModal" hidden>
        <div
          className="modal-card planner-modal planner-modal-danger"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plannerDeleteTitle"
        >
          <h3 className="planner-modal-title" id="plannerDeleteTitle">
            Delete study plan
          </h3>
          <p className="planner-modal-sub">
            This will permanently remove your active plan and all its data from
            Learning Allied.
          </p>
          <div className="planner-delete-warning">
            <strong>This action cannot be undone.</strong>
            All scheduled sessions, weekly schedule, and milestone data will be
            permanently erased. Your study streak and total hours logged will be
            preserved.
            <br />
            <span className="planner-delete-stat" id="plannerDeleteCount">
              0 tasks
            </span>{" "}
            will be deleted.
          </div>
          <div className="planner-modal-actions">
            <button
              className="dash-btn ghost"
              id="plannerDeleteCancel"
              type="button"
            >
              Cancel
            </button>
            <button
              className="dash-btn danger solid"
              id="plannerDeleteConfirm"
              type="button"
            >
              Yes, delete plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
