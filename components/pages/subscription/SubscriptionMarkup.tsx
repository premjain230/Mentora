/**
 * Subscription shell (usage, plans, Pro request flow, FAQ).
 * vanilla/subscription.js hydrates it from usage/{uid} and the user document.
 */
export function SubscriptionMarkup() {
  return (
    <div className="dashboard-page page-subscription">
      <div className="topbar">
        <div className="topbar-left">
          <div className="brand-mark">
            <img src="/learningallied-white.svg" alt="" width={24} height={24} />
            <span>Subscription</span>
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

      <div className="page-content subscription-content">
        <div className="subscription-inner">
          <header className="page-header">
            <h1>
              Your <span>Subscription</span>
            </h1>
            <p>Manage your plan and track daily usage across Learning Allied.</p>
          </header>

          <div className="section-label">Today&apos;s Usage</div>
          <div className="usage-grid">
            <div className="usage-card">
              <div className="usage-card-top">
                <div className="usage-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <span className="unlimited-pill" id="chatUnlimited" hidden>
                  ∞ Unlimited
                </span>
                <span className="usage-fraction" id="chatFraction">
                  <span className="used" id="chatUsed">
                    —
                  </span>
                  /<span id="chatLimit">20</span>
                </span>
              </div>
              <div className="usage-label">AI Chats</div>
              <div className="usage-bar" id="chatBarWrap">
                <div className="usage-bar-fill" id="chatBar" />
              </div>
              <div className="usage-status" id="chatStatus">
                Loading usage…
              </div>
            </div>

            <div className="usage-card">
              <div className="usage-card-top">
                <div className="usage-icon violet">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <span className="unlimited-pill" id="analysisUnlimited" hidden>
                  ∞ Unlimited
                </span>
                <span className="usage-fraction" id="analysisFraction">
                  <span className="used used-violet" id="analysisUsed">
                    —
                  </span>
                  /<span id="analysisLimit">20</span>
                </span>
              </div>
              <div className="usage-label">AI Analyses</div>
              <div className="usage-bar" id="analysisBarWrap">
                <div className="usage-bar-fill" id="analysisBar" />
              </div>
              <div className="usage-status" id="analysisStatus">
                Loading usage…
              </div>
            </div>

            <div className="usage-card">
              <div className="usage-card-top">
                <div className="usage-icon coral">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M3 10h18M8 2v4M16 2v4" />
                  </svg>
                </div>
                <span className="unlimited-pill" id="plannerUnlimited" hidden>
                  ∞ Unlimited
                </span>
                <span className="usage-fraction" id="plannerFraction">
                  <span className="used used-coral" id="plannerUsed">
                    —
                  </span>
                  /<span id="plannerLimit">30</span> min
                </span>
              </div>
              <div className="usage-label">Study Planner</div>
              <div className="usage-bar" id="plannerBarWrap">
                <div className="usage-bar-fill planner-fill" id="plannerBar" />
              </div>
              <div className="usage-status" id="plannerStatus">
                Loading usage…
              </div>
            </div>
          </div>

          <div className="section-label">Plans</div>
          <div className="plans-grid">
            <div className="plan-card current-free" id="freePlanCard">
              <div className="plan-header">
                <div className="plan-name">Starter</div>
                <div className="plan-title">Free</div>
                <div className="plan-price">
                  <strong>₹0</strong> <span className="per">/ forever</span>
                </div>
              </div>
              <div className="plan-divider" />
              <ul className="plan-features">
                <li className="plan-feature">
                  <span className="check cyan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>20 AI Chats/day</strong>
                    <span>Resets every 24 hours</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check cyan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>20 AI Analyses/day</strong>
                    <span>Quiz &amp; performance analysis</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check cyan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>30 min Study Planner/day</strong>
                    <span>Plan your daily schedule</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check cyan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Community access</strong>
                    <span>Join other JEE/NEET aspirants</span>
                  </span>
                </li>
              </ul>
              <button className="plan-btn current" id="freePlanBtn" type="button" disabled>
                ✓ Your current plan
              </button>
              <a className="plan-btn current" id="freePlanLink" href="/settings" hidden>
                Manage plan in Settings
              </a>
            </div>

            <div className="plan-card pro" id="proPlanCard">
              <div className="plan-ribbon">✨ Early Access</div>
              <div className="plan-header">
                <div className="plan-name">Premium</div>
                <div className="plan-title pro-gradient">Learning Allied Pro</div>
                <div className="plan-price">
                  <strong>Free*</strong>{" "}
                  <span className="per">during Early Access</span>
                </div>
              </div>
              <div className="plan-divider" />
              <ul className="plan-features">
                <li className="plan-feature">
                  <span className="check violet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Unlimited AI Chats</strong>
                    <span>No daily restrictions</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check violet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Unlimited AI Analyses</strong>
                    <span>Deep-dive any quiz anytime</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check violet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Unlimited Study Planner</strong>
                    <span>Build plans without limits</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check violet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Priority AI responses</strong>
                    <span>Faster, smarter answers</span>
                  </span>
                </li>
                <li className="plan-feature">
                  <span className="check violet">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="feat-text">
                    <strong>Early access to new features</strong>
                    <span>Be the first to try everything</span>
                  </span>
                </li>
              </ul>

              <button className="plan-btn requested" id="proActiveBtn" type="button" disabled hidden>
                ✓ You have Learning Allied Pro
              </button>

              <div id="proRequestBlock">
                <button className="plan-btn request" id="requestProBtn" type="button">
                  ✨ Request Pro Access — Free
                </button>
                <div className="contact-options" id="contactOptions">
                  <div className="contact-label">Choose how to reach us</div>
                  <a
                    href="https://discord.gg/vDvrJhUzud"
                    target="_blank"
                    rel="noreferrer"
                    className="contact-link"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.01.043.027.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                    <span>
                      <span className="cl-label">Join our Discord</span>
                      <span className="cl-sub">Message us directly for instant access</span>
                    </span>
                  </a>
                  <a
                    href="mailto:hello@learningallied.com?subject=Pro%20Access%20Request"
                    id="proMailLink"
                    className="contact-link"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>
                      <span className="cl-label">Send an email</span>
                      <span className="cl-sub">hello@learningallied.com — we&apos;ll reply within 24h</span>
                    </span>
                  </a>
                  <div className="contact-divider" />
                  <div className="contact-label">Or fill this quick form</div>
                  <div className="contact-form">
                    <input id="cfName" type="text" placeholder="Your name" />
                    <input id="cfEmail" type="email" placeholder="Your email" />
                    <textarea
                      id="cfMsg"
                      rows={2}
                      placeholder="Anything you'd like us to know? (optional)"
                    />
                    <button
                      className="contact-form-btn"
                      id="submitProRequestBtn"
                      type="button"
                    >
                      Submit Request
                    </button>
                  </div>
                  <div className="contact-status" id="proRequestStatus" hidden />
                </div>
              </div>
            </div>
          </div>

          <div className="section-label">Frequently Asked Questions</div>
          <div className="faq-list">
            <div className="faq-item">
              <button className="faq-q" type="button" aria-expanded="false">
                When do daily limits reset?
                <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-a">
                All free plan limits reset every 24 hours at midnight. Your usage
                counter starts fresh each day automatically.
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-q" type="button" aria-expanded="false">
                Is Learning Allied Pro really free during Early Access?
                <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-a">
                Yes — Learning Allied Pro is completely free during our Early
                Access period. No credit card, no payment of any kind. We&apos;re
                giving early supporters unlimited access as a thank-you for
                helping us grow.
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-q" type="button" aria-expanded="false">
                How do I get Pro access?
                <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-a">
                Click &quot;Request Pro Access&quot; above and reach out via
                Discord, email, or the contact form. We&apos;ll manually upgrade
                your account within 24 hours. Pro access is granted by our team
                during Early Access.
              </div>
            </div>
            <div className="faq-item">
              <button className="faq-q" type="button" aria-expanded="false">
                What exams does Learning Allied support?
                <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-a">
                Learning Allied is built specifically for Indian students
                preparing for JEE (Main &amp; Advanced), NEET, and Board exams
                (Class 10 &amp; 12). Our AI is tuned to the NCERT and JEE/NEET
                syllabi.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
