import Link from "next/link";

/**
 * Structural transcription of the legacy home.html dashboard. React owns the
 * markup; vanilla/home.js only hydrates the data widgets inside it.
 */
export function HomeMarkup() {
  return (
    <div className="home-page">
      <div className="ambient-orb orb-1" aria-hidden="true" />
      <div className="ambient-orb orb-2" aria-hidden="true" />
      <div id="scrollProgress" className="scroll-progress" />

      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img
              src="/learningallied-white.svg"
              alt=""
              width={22}
              height={22}
            />
            <span>Learning Allied</span>
          </div>
          <span className="model-selector home-model-hidden">
            <span className="model-dot" />
            Learning Allied — Today
          </span>
          <div id="topbarGreeting" className="greeting">
            Hi, <span id="greetingName">there</span>
          </div>
        </div>

        <div className="topbar-center" />

        <div className="topbar-right">
          <button
            className="scroll-control"
            id="scrollControl"
            type="button"
            data-direction="down"
            aria-label="Scroll to latest"
            title="Scroll to latest"
          >
            <svg
              className="scroll-icon-up"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              className="scroll-icon-down"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <img
            id="topbarAvatar"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
            alt="Your account"
          />
        </div>
      </div>

      <div className="chat-area" id="homeChatArea">
        <div id="homeHub" className="hub-grid">
          <div className="hub-row-head">
            <div>
              <div className="hub-title">Today</div>
              <div id="hubSubtitle" className="hub-subtitle">
                Your personalised progress — real, not demo
              </div>
            </div>
            <Link href="/arena" className="hub-link-pill">
              Open Arena →
            </Link>
          </div>

          <div className="cere-grid-3">
            <Link href="/arena" className="aq-graph-card hub-clickable">
              <div className="hub-eyebrow">Arena progress</div>
              <div id="hubMasteryGauge" className="hub-gauge-wrap">
                Loading…
              </div>
              <div id="hubMasteryCaption" className="hub-caption-center">
                Open Arena →
              </div>
            </Link>

            <Link href="/study-session" className="aq-graph-card hub-clickable">
              <div className="hub-eyebrow">Volume — study time</div>
              <div id="hubStudyTime" className="hub-big-number">
                —
              </div>
              <div id="hubStudyVolume" className="hub-volume-chart" />
              <div id="hubStudyCaption" className="hub-caption">
                Start a session →
              </div>
            </Link>

            <Link href="/review" className="aq-graph-card hub-clickable">
              <div className="hub-eyebrow">Retention</div>
              <div className="hub-medium-label" id="hubSparksTitle">
                Checking…
              </div>
              <div id="hubSparksCounts" className="hub-counts-row" />
              <div id="hubSparksBar" className="hub-bar-strip" />
              <div id="hubSparksEmpty" className="hub-caption hub-hidden" />
            </Link>
          </div>

          <div className="aq-graph-card">
            <div className="hub-row-head hub-row-head--tight">
              <span className="hub-eyebrow">Performance — trend</span>
              <span id="hubStockTag" className="hub-tag">
                Real • 15
              </span>
            </div>
            <div id="hubStockWrap" className="hub-stock-wrap">
              <canvas
                id="hubStockCanvas"
                width={600}
                height={200}
                className="hub-stock-canvas"
              />
            </div>
            <div
              id="hubStockCaption"
              className="hub-caption hub-stock-caption"
            />
          </div>

          <div className="aq-graph-card">
            <div className="hub-row-head hub-row-head--tight">
              <span className="hub-eyebrow">Next steps</span>
              <Link href="/review" className="hub-tag hub-tag-link">
                Review ▾
              </Link>
            </div>
            <div
              id="hubNextSteps"
              className="cere-grid hub-next-grid"
            />
            <div id="hubNextEmpty" className="hub-caption hub-hidden" />
          </div>

          <div className="aq-graph-card">
            <div className="hub-row-head hub-row-head--tight">
              <span className="hub-eyebrow">Holdings — by subject</span>
              <span className="hub-tag">Real</span>
            </div>
            <div
              id="hubSubjectBars"
              className="aq-bar-list hub-subject-bars"
            />
            <div className="hub-caption hub-subject-link">
              <Link href="/arena">Open Arena →</Link>
            </div>
          </div>

          <div className="aq-graph-card">
            <div className="hub-eyebrow">Retention timeline</div>
            <div
              id="hubRetentionTimeline"
              className="hub-retention-timeline"
            />
            <div
              id="hubRetentionEmpty"
              className="hub-caption hub-hidden"
            >
              No timeline yet — your reviews appear after first quiz
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
