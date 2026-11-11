import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";
import { LegalLayout, TocItem } from "../../components/legal/LegalLayout";

export const metadata = constructMetadata({
  title: "Privacy Policy | Learning Allied",
  description:
    "Read the Learning Allied Privacy Policy. Understand how we collect, safeguard, and process student learning data in compliance with India's DPDP Act 2023.",
  path: "/privacy-policy",
});

const PRIVACY_TOC: TocItem[] = [
  { id: "sec-intro", num: "01", title: "Introduction & Scope" },
  { id: "sec-data-collected", num: "02", title: "Information We Collect" },
  { id: "sec-data-usage", num: "03", title: "How We Use Information" },
  { id: "sec-ai-processing", num: "04", title: "AI Tutoring & Chat Interactions" },
  { id: "sec-storage-providers", num: "05", title: "Data Storage & Third Parties" },
  { id: "sec-cookies-analytics", num: "06", title: "Cookies, Storage & Tracking" },
  { id: "sec-security", num: "07", title: "Account Security & Protection" },
  { id: "sec-retention-deletion", num: "08", title: "Data Retention & Deletion" },
  { id: "sec-user-rights", num: "09", title: "Your Rights (DPDP Act 2023)" },
  { id: "sec-children-privacy", num: "10", title: "Children & Student Privacy" },
  { id: "sec-updates", num: "11", title: "Policy Updates & Notifications" },
  { id: "sec-contact", num: "12", title: "Contact & Grievance Redressal" },
];

const PRIVACY_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/privacy-policy#webpage`,
      url: `${SITE_URL}/privacy-policy`,
      name: "Privacy Policy | Learning Allied",
      description:
        "Comprehensive Privacy Policy of Learning Allied detailing data collection, AI processing ethics, Firebase storage, and rights under India's Digital Personal Data Protection Act, 2023.",
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
      datePublished: "2026-08-01",
      dateModified: "2026-11-11",
    },
  ],
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRIVACY_JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="legal-page">
        {/* Document Hero */}
        <header className="legal-hero">
          <div className="wrap">
            <nav aria-label="Breadcrumb" className="legal-breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span>Legal</span>
              <span aria-hidden="true">/</span>
              <span>Privacy Policy</span>
            </nav>

            <div className="legal-hero-switcher" role="tablist" aria-label="Legal documents">
              <Link href="/privacy-policy" className="legal-hero-tab active" role="tab" aria-selected="true">
                Privacy Policy
              </Link>
              <Link href="/terms-of-use" className="legal-hero-tab" role="tab" aria-selected="false">
                Terms of Use
              </Link>
            </div>

            <h1 className="legal-hero-title">
              Privacy Policy
            </h1>

            <p className="legal-hero-lede">
              At Learning Allied, we believe student privacy is a fundamental prerequisite for deep, fearless learning.
              This policy explains what information we collect, how it is used to personalise your study experience, how our AI interactions work,
              and how your data is protected under Indian data protection laws.
            </p>

            <div className="legal-meta-bar">
              <div className="legal-meta-item">
                <span>Last updated:</span>
                <strong>November 11, 2026</strong>
              </div>
              <div className="legal-meta-item">
                <span>Effective date:</span>
                <strong>August 1, 2026</strong>
              </div>
              <div className="legal-badge-dpdp">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>DPDP Act 2023 Aligned</span>
              </div>
              <div className="legal-badge-pill">
                <span>Jurisdiction: India</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Section with Sticky Sidebar */}
        <section className="legal-main-section">
          <LegalLayout toc={PRIVACY_TOC} currentDoc="privacy">
            {/* Section 01: Introduction & Scope */}
            <article id="sec-intro" className="legal-section">
              <div className="legal-section-tag">01. OVERVIEW</div>
              <h2 className="legal-section-title">Introduction &amp; Scope</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied (&ldquo;<strong>Learning Allied</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>our</strong>&rdquo;, or &ldquo;<strong>us</strong>&rdquo;),
                  founded by Prem Jain, provides an AI-powered learning companion for students preparing for competitive and board examinations in India,
                  including JEE Main &amp; Advanced, NEET UG, CBSE, and the Maharashtra State Board.
                </p>
                <p>
                  This Privacy Policy applies to personal data collected through our website (accessible at{" "}
                  <a href={SITE_URL}>{SITE_URL}</a>), our web application, AI tutor chat modules, adaptive quiz engine, revision planner,
                  and related interactive educational features (collectively, the &ldquo;<strong>Platform</strong>&rdquo;).
                </p>
                <p>
                  For the purposes of the <strong>Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;)</strong> and applicable Indian information technology laws,
                  Learning Allied acts as the <strong>Data Fiduciary</strong> regarding the personal data of registered students, parents, and visitors (&ldquo;<strong>Data Principals</strong>&rdquo;).
                </p>

                <div className="legal-callout highlight-blue">
                  <div className="legal-callout-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>Core Privacy Commitment</span>
                  </div>
                  <p>
                    We never sell, lease, or monetize student personal records, query logs, or study behavior to third-party data brokers or advertisers.
                    Our platform is entirely free from commercial banner advertisements and behavioral profiling networks.
                  </p>
                </div>
              </div>
            </article>

            {/* Section 02: Information We Collect */}
            <article id="sec-data-collected" className="legal-section">
              <div className="legal-section-tag">02. DATA COLLECTION</div>
              <h2 className="legal-section-title">Information We Collect</h2>
              <div className="legal-prose">
                <p>
                  We adhere to the principle of <strong>data minimisation</strong>: we only collect the minimum amount of personal data necessary
                  to provide our pedagogical tools, preserve your study continuity, and safeguard the platform.
                </p>

                <h3 className="legal-subsection-title">A. Account &amp; Profile Details Provided Directly by You</h3>
                <p>
                  When you create an account or update your student profile, we collect:
                </p>
                <ul>
                  <li><strong>Identity Information:</strong> Your full name and email address.</li>
                  <li><strong>Authentication Credentials:</strong> Password hash (encrypted and managed securely by Firebase Authentication; we never see or store plain-text passwords) or your federated Google identity profile (display name, email, profile photo) if you sign in with Google.</li>
                  <li><strong>Academic Context:</strong> Your learner role (e.g., JEE aspirant, NEET aspirant, Class 9–12 high school student, undergraduate, or self-learner), primary educational goal, target examination, and academic grade.</li>
                </ul>

                <h3 className="legal-subsection-title">B. Learning Activity &amp; Pedagogical Telemetry</h3>
                <p>
                  To make active recall, spaced repetition, and personalized Socratic hints work effectively, the platform records:
                </p>
                <ul>
                  <li><strong>Study Sessions &amp; Chat History:</strong> Concepts explored, questions asked to the Socratic AI tutor, responses generated, and session duration.</li>
                  <li><strong>Assessment Performance:</strong> Practice quiz attempts, chapter-wise accuracy scores, time spent per numerical problem, question difficulty level, and diagnostic error logs.</li>
                  <li><strong>Cognitive Mastery Metrics:</strong> Topic mastery ratings, spaced retrieval intervals, decay modeling calculations, streak counters, and weekly study plan completion progress.</li>
                  <li><strong>Feedback &amp; Inquiries:</strong> Voluntary feedback submissions, bug reports, and correspondence with our team.</li>
                </ul>

                <h3 className="legal-subsection-title">C. Technical &amp; Device Information Collected Automatically</h3>
                <p>
                  When you browse or interact with Learning Allied, certain technical signals are logged automatically for security, fraud prevention, and performance reliability:
                </p>
                <ul>
                  <li><strong>Device and Network Data:</strong> Internet Protocol (IP) address, browser family, operating system, and language settings.</li>
                  <li><strong>Operational Metrics:</strong> Page response times, API error rates, and client-side performance indicators captured via Vercel Analytics and Speed Insights.</li>
                </ul>

                <div className="legal-callout">
                  <div className="legal-callout-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>What We Never Collect</span>
                  </div>
                  <p>
                    Learning Allied does not collect sensitive biometric identifiers, Aadhaar numbers, government identity cards,
                    or financial payment card numbers. We do not use third-party behavioral tracker SDKs.
                  </p>
                </div>
              </div>
            </article>

            {/* Section 03: How We Use Personal Information */}
            <article id="sec-data-usage" className="legal-section">
              <div className="legal-section-tag">03. DATA PROCESSING PURPOSES</div>
              <h2 className="legal-section-title">How We Use Personal Information</h2>
              <div className="legal-prose">
                <p>
                  Under the DPDP Act 2023, personal data may only be processed for specific, lawful purposes with consent or for legitimate educational uses. We process your data exclusively for:
                </p>

                <div className="legal-cards-grid">
                  <div className="legal-info-card">
                    <h4>Pedagogical Personalisation</h4>
                    <p>Adapting AI hints to your mastery level, sequencing practice questions, and scheduling spaced repetition reviews before conceptual memory decays.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Authentication &amp; Account Safety</h4>
                    <p>Verifying identity, securing student sessions, managing password resets, and blocking credential stuffing or unauthorized logins.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Platform Maintenance</h4>
                    <p>Monitoring server latency, debugging application faults, preventing API abuse, and ensuring platform availability for students during exam periods.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Critical Communications</h4>
                    <p>Delivering essential transactional emails such as email verification links, security notices, and direct responses to your support inquiries.</p>
                  </div>
                </div>

                <p>
                  <strong>No Secondary Commercial Use:</strong> We do not profile student behavior for behavioral targeting, marketing campaigns by third parties, or sale to data brokers.
                </p>
              </div>
            </article>

            {/* Section 04: AI-Powered Learning, Chat Interactions & Generated Responses */}
            <article id="sec-data-ai" className="legal-section">
              <div className="legal-section-tag">04. AI ARCHITECTURE &amp; ETHICS</div>
              <h2 className="legal-section-title">AI-Powered Learning, Chat Interactions &amp; Generated Responses</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied integrates state-of-the-art generative artificial intelligence models (including Google Gemini API via <code>@google/genai</code>)
                  to power our Socratic tutor, conceptual breakdowns, problem generation, and Gemini Live Voice features.
                  To ensure safety and privacy, our AI integration is governed by strict privacy-by-design principles:
                </p>

                <h3 className="legal-subsection-title">1. Context Stripping &amp; Identity Privacy</h3>
                <p>
                  Before any student query or practice request is transmitted to our AI inference pipeline, our application-level context builder
                  (<code>ai-context.js</code> / learner model) deliberately <strong>strips all personal identifiers</strong>:
                </p>
                <ul>
                  <li>Your email address, full name, profile photo, and database UID are completely excluded from the LLM prompt.</li>
                  <li>Only relevant academic parameters (e.g., target examination, subject, chapter, current topic difficulty, and recent error category) are provided to ground the pedagogical response.</li>
                </ul>

                <h3 className="legal-subsection-title">2. No Model Training on Student Prompts</h3>
                <p>
                  We access AI models through enterprise developer API tiers. Under provider terms for developer API endpoints,
                  student inputs, chat queries, and generated explanations are <strong>not used to train public foundational AI models</strong>.
                </p>

                <h3 className="legal-subsection-title">3. Ephemeral Live Voice Processing</h3>
                <p>
                  For Gemini Live Voice sessions, audio input is captured temporarily via standard browser APIs solely to generate real-time Socratic dialogue.
                  Raw audio buffers are processed in memory and are not permanently archived or stored on disk.
                </p>

                <h3 className="legal-subsection-title">4. Educational Limitations &amp; Verification</h3>
                <p>
                  While our AI prompts are strictly grounded in official NTA JEE, NEET, CBSE, and State Board syllabi, generative models can occasionally make mistakes
                  or miscalculate complex multi-step numericals. Students are encouraged to use AI guidance as a Socratic study companion and verify critical derivations
                  with standard textbooks (e.g., NCERT) and official exam guidelines.
                </p>
              </div>
            </article>

            {/* Section 05: Data Storage, Firebase & Third-Party Service Providers */}
            <article id="sec-storage-providers" className="legal-section">
              <div className="legal-section-tag">05. INFRASTRUCTURE &amp; PARTNERS</div>
              <h2 className="legal-section-title">Data Storage, Firebase &amp; Third-Party Service Providers</h2>
              <div className="legal-prose">
                <p>
                  We rely on industry-standard cloud infrastructure providers who meet rigorous information security benchmarks.
                  These third parties process data strictly on our documented instructions as Data Processors:
                </p>

                <div className="legal-table-wrap">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th>Role &amp; Service</th>
                        <th>Data Handled</th>
                        <th>Security &amp; Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Google Cloud / Firebase</strong></td>
                        <td>Authentication &amp; Cloud Firestore Database</td>
                        <td>Encrypted user accounts, profiles, chat history, quiz logs, learning metrics</td>
                        <td>Encrypted at rest (AES-256) and in transit (TLS 1.3). Multi-region Google Cloud infrastructure.</td>
                      </tr>
                      <tr>
                        <td><strong>Google Gemini API</strong></td>
                        <td>AI Inference Engine (@google/genai)</td>
                        <td>Anonymised syllabus prompts, Socratic dialogue queries (PII stripped)</td>
                        <td>Enterprise API terms; zero training on developer inputs; encrypted TLS endpoints.</td>
                      </tr>
                      <tr>
                        <td><strong>Vercel Inc.</strong></td>
                        <td>Hosting, Edge Routing &amp; Performance Telemetry</td>
                        <td>IP addresses, server request logs, anonymous speed insights</td>
                        <td>Global edge deployment; SOC 2 Type 2 certified; DDoS protection.</td>
                      </tr>
                      <tr>
                        <td><strong>Brevo</strong></td>
                        <td>Transactional Email Gateway</td>
                        <td>Recipient email address for platform notifications &amp; waitlist requests</td>
                        <td>Encrypted API delivery; GDPR &amp; data privacy compliant.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>
                  We do not share your information with advertisers, credit reference agencies, or marketing companies.
                </p>
              </div>
            </article>

            {/* Section 06: Cookies, Analytics & Website Tracking */}
            <article id="sec-cookies-analytics" className="legal-section">
              <div className="legal-section-tag">06. COOKIES &amp; STORAGE</div>
              <h2 className="legal-section-title">Cookies, Analytics &amp; Website Tracking</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied maintains an extremely clean, tracker-free web environment:
                </p>
                <ul>
                  <li><strong>Essential Authentication Cookies:</strong> First-party session tokens issued by Firebase Authentication to keep you signed in securely as you navigate between study modules.</li>
                  <li><strong>Browser Local Storage:</strong> We use client-side <code>localStorage</code> to store your UI preferences (such as dark mode vs light mode via <code>learning-allied-theme</code>), your active study session drafts, and local UI state. This data resides solely on your device.</li>
                  <li><strong>Performance Analytics:</strong> We use privacy-preserving Vercel Analytics and Speed Insights to monitor page load times and core web vitals. These tools do not use invasive tracking cookies and do not track you across other websites.</li>
                </ul>
                <p>
                  <strong>Zero Third-Party Advertising Cookies:</strong> We do not deploy Google AdSense, Meta Pixel, or any third-party ad retargeting scripts.
                </p>
              </div>
            </article>

            {/* Section 07: Account Security & Data Protection */}
            <article id="sec-security" className="legal-section">
              <div className="legal-section-tag">07. DATA PROTECTION &amp; SAFEGUARDS</div>
              <h2 className="legal-section-title">Account Security &amp; Data Protection</h2>
              <div className="legal-prose">
                <p>
                  We implement robust technical and organisational security measures to protect student personal data against accidental loss,
                  unauthorised access, alteration, or disclosure:
                </p>
                <ul>
                  <li><strong>Strict Database Access Rules:</strong> Firestore Security Rules enforce strict user ownership. Users can only read and write their own documents (<code>auth.uid == userId</code>). No student can view another student&apos;s study sessions, notes, or quiz attempts.</li>
                  <li><strong>Transport Layer Security:</strong> All data transmitted between your browser and our servers is encrypted using modern TLS 1.3 protocol over HTTPS with HTTP Strict Transport Security (HSTS).</li>
                  <li><strong>Input Sanitisation &amp; Security Audits:</strong> Client and server inputs are sanitised to prevent cross-site scripting (XSS), SQL/NoSQL injection, and data tampering. Feedback attachments are strictly restricted to authenticated image types under 1.5MB.</li>
                  <li><strong>Administrative Isolation:</strong> Administrative portals and growth APIs require authenticated custom claims and are guarded from public indexing.</li>
                </ul>
              </div>
            </article>

            {/* Section 08: Data Retention & Account Deletion */}
            <article id="sec-retention-deletion" className="legal-section">
              <div className="legal-section-tag">08. RETENTION &amp; ERASURE</div>
              <h2 className="legal-section-title">Data Retention &amp; Account Deletion</h2>
              <div className="legal-prose">
                <p>
                  We retain your personal data and learning history for as long as your account remains active, enabling you to track your revision streaks,
                  weak topic logs, and syllabus completion across months of exam preparation.
                </p>

                <h3 className="legal-subsection-title">How to Delete Your Account &amp; Data</h3>
                <p>
                  You have the full right to delete your account and erase all associated personal data at any time. You can initiate this by:
                </p>
                <ol>
                  <li>Navigating to your <strong>Account Settings</strong> in the Learning Allied dashboard and selecting &ldquo;Delete Account&rdquo;, or</li>
                  <li>Sending an email directly to <a href="mailto:hello@learningallied.com">hello@learningallied.com</a> with the subject line <strong>&ldquo;Account Deletion Request&rdquo;</strong> from your registered email address.</li>
                </ol>
                <p>
                  Upon receiving your verified request, we will permanently purge your user profile, authentication credentials, chat history,
                  practice quizzes, and study logs from our active databases within <strong>30 days</strong>, retaining only aggregated,
                  non-identifiable metrics where required by law.
                </p>
              </div>
            </article>

            {/* Section 09: User Rights under Indian Law (DPDP Act, 2023) */}
            <article id="sec-user-rights" className="legal-section">
              <div className="legal-section-tag">09. LEGAL RIGHTS</div>
              <h2 className="legal-section-title">Your Rights under Indian Law (DPDP Act, 2023)</h2>
              <div className="legal-prose">
                <p>
                  In accordance with the <strong>Digital Personal Data Protection Act, 2023</strong>, every student and parent using Learning Allied enjoys specific statutory rights:
                </p>

                <div className="legal-cards-grid">
                  <div className="legal-info-card">
                    <h4>1. Right to Access &amp; Summary</h4>
                    <p>You can request a summary of the personal data we hold about you and the processing activities undertaken.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>2. Right to Correction &amp; Updation</h4>
                    <p>You can correct, complete, or update any inaccurate or outdated personal details in your profile at any time.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>3. Right to Erasure / Forgotten</h4>
                    <p>You have the right to request the permanent deletion of your personal data when it is no longer needed for study purposes.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>4. Right to Grievance Redressal</h4>
                    <p>You have the right to readily accessible grievance redressal regarding any data protection concern.</p>
                  </div>
                </div>

                <p>
                  To exercise any of these rights, simply email our dedicated privacy desk at{" "}
                  <a href="mailto:hello@learningallied.com">hello@learningallied.com</a>. We will acknowledge your request within 48 hours and resolve it within statutory timelines.
                </p>
              </div>
            </article>

            {/* Section 10: Children's & Student Privacy */}
            <article id="sec-children-privacy" className="legal-section">
              <div className="legal-section-tag">10. STUDENT WELFARE</div>
              <h2 className="legal-section-title">Children &amp; Student Privacy</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied is designed for students preparing for high school (Class 9–12) and competitive entrance exams (typically ages 14 and above).
                  Because many of our learners are minors under Indian law, we treat student protection with the utmost gravity:
                </p>
                <ul>
                  <li><strong>Parental Involvement:</strong> Students under the age of 18 are expected to register and use Learning Allied with the consent, guidance, and supervision of a parent or legal guardian.</li>
                  <li><strong>No Harmful Profiling:</strong> We strictly refrain from tracking student behavior for commercial profiling or serving targeted advertisements to children, in full alignment with Section 9 of the DPDP Act 2023.</li>
                  <li><strong>Academic Focus:</strong> AI tutor conversations are constrained by curriculum boundaries. Prompts seeking inappropriate or non-educational content are automatically intercepted and redirected to safe study topics.</li>
                </ul>
              </div>
            </article>

            {/* Section 11: Updates to the Privacy Policy */}
            <article id="sec-updates" className="legal-section">
              <div className="legal-section-tag">11. GOVERNANCE &amp; REVISIONS</div>
              <h2 className="legal-section-title">Updates to this Privacy Policy</h2>
              <div className="legal-prose">
                <p>
                  We may periodically update this Privacy Policy to reflect enhancements in our learning features, new regulatory guidelines
                  under Indian data protection rules, or changes in cloud infrastructure.
                </p>
                <p>
                  When changes are made, we will update the &ldquo;Last Updated&rdquo; date at the top of this page. For significant or material changes,
                  we will provide prominent notification through our platform banner or via email to registered account holders prior to the changes taking effect.
                </p>
              </div>
            </article>

            {/* Section 12: Contact Information & Grievance Officer */}
            <article id="sec-contact" className="legal-section">
              <div className="legal-section-tag">12. CONTACT &amp; REDRESSAL</div>
              <h2 className="legal-section-title">Contact Information &amp; Grievance Redressal</h2>
              <div className="legal-prose">
                <p>
                  If you have questions, feedback, or concerns regarding this Privacy Policy, your personal data, or our compliance with the DPDP Act 2023,
                  please reach out to us:
                </p>

                <div className="legal-callout highlight-blue">
                  <div className="legal-callout-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>Learning Allied Privacy &amp; Grievance Officer</span>
                  </div>
                  <p>
                    <strong>Platform:</strong> Learning Allied (Founded by Prem Jain)<br />
                    <strong>Primary Contact Email:</strong> <a href="mailto:hello@learningallied.com">hello@learningallied.com</a><br />
                    <strong>Official Domain:</strong> <a href="https://www.learningallied.world">https://www.learningallied.world</a><br />
                    <strong>Jurisdiction:</strong> Maharashtra, India<br />
                    <strong>Subject Line for Requests:</strong> &ldquo;Privacy &amp; Data Protection Request&rdquo; or &ldquo;Grievance Officer&rdquo;
                  </p>
                </div>

                <p>
                  Under Indian law, if any grievance raised with our team is not redressed within 30 days, you also have the statutory right
                  to escalate the matter to the <strong>Data Protection Board of India</strong> in accordance with the provisions of the DPDP Act 2023.
                </p>
              </div>
            </article>
          </LegalLayout>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
