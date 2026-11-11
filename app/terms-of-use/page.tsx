import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";
import { LegalLayout, TocItem } from "../../components/legal/LegalLayout";

export const metadata = constructMetadata({
  title: "Terms of Use | Learning Allied",
  description:
    "Read the Learning Allied Terms of Use. Review platform rules, account eligibility, AI tutoring guidelines, and dispute resolution under Indian law.",
  path: "/terms-of-use",
});

const TERMS_TOC: TocItem[] = [
  { id: "sec-acceptance", num: "01", title: "Acceptance of Terms" },
  { id: "sec-eligibility", num: "02", title: "Eligibility & Student Accounts" },
  { id: "sec-registration", num: "03", title: "Registration & Account Security" },
  { id: "sec-features", num: "04", title: "Features & Educational Services" },
  { id: "sec-ai-limitations", num: "05", title: "AI Content & Accuracy Disclaimer" },
  { id: "sec-academic-integrity", num: "06", title: "Educational Purpose & Integrity" },
  { id: "sec-plans-subscriptions", num: "07", title: "Free & Pro Plans, Upgrades" },
  { id: "sec-intellectual-property", num: "08", title: "Intellectual Property Rights" },
  { id: "sec-acceptable-use", num: "09", title: "Acceptable Use & Prohibitions" },
  { id: "sec-termination", num: "10", title: "Suspension & Termination" },
  { id: "sec-availability", num: "11", title: "Service Availability & Changes" },
  { id: "sec-liability", num: "12", title: "Limitation of Liability" },
  { id: "sec-governing-law", num: "13", title: "Governing Law & Dispute Resolution" },
  { id: "sec-contact-terms", num: "14", title: "Contact & Legal Inquiries" },
];

const TERMS_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/terms-of-use#webpage`,
      url: `${SITE_URL}/terms-of-use`,
      name: "Terms of Use | Learning Allied",
      description:
        "Comprehensive Terms of Use for Learning Allied governing access, student eligibility, AI Socratic tutoring, acceptable conduct, and Indian jurisdiction.",
      isPartOf: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
      datePublished: "2026-08-01",
      dateModified: "2026-11-11",
    },
  ],
};

export default function TermsOfUsePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(TERMS_JSON_LD) }}
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
              <span>Terms of Use</span>
            </nav>

            <div className="legal-hero-switcher" role="tablist" aria-label="Legal documents">
              <Link href="/privacy-policy" className="legal-hero-tab" role="tab" aria-selected="false">
                Privacy Policy
              </Link>
              <Link href="/terms-of-use" className="legal-hero-tab active" role="tab" aria-selected="true">
                Terms of Use
              </Link>
            </div>

            <h1 className="legal-hero-title">
              Terms of Use
            </h1>

            <p className="legal-hero-lede">
              Please review these Terms of Use carefully. They outline the rights, responsibilities, and standards governing
              your access to and use of Learning Allied&rsquo;s educational platform, Socratic tutoring models, and study tools.
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
              <div className="legal-badge-pill">
                <span>Version 1.0</span>
              </div>
              <div className="legal-badge-pill">
                <span>Governing Law: Republic of India</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Section with Sticky Sidebar */}
        <section className="legal-main-section">
          <LegalLayout toc={TERMS_TOC} currentDoc="terms">
            {/* Section 01: Acceptance of Terms */}
            <article id="sec-acceptance" className="legal-section">
              <div className="legal-section-tag">01. BINDING AGREEMENT</div>
              <h2 className="legal-section-title">Acceptance of Terms</h2>
              <div className="legal-prose">
                <p>
                  These Terms of Use (&ldquo;<strong>Terms</strong>&rdquo;) constitute a legally binding agreement between you
                  (&ldquo;<strong>User</strong>&rdquo;, &ldquo;<strong>Student</strong>&rdquo;, or &ldquo;<strong>you</strong>&rdquo;) and
                  <strong>Learning Allied</strong> (&ldquo;<strong>Learning Allied</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>our</strong>&rdquo;, or &ldquo;<strong>us</strong>&rdquo;),
                  founded by Prem Jain, regarding your access to and use of our web platform (<a href={SITE_URL}>{SITE_URL}</a>),
                  interactive study dashboard, AI tutoring interfaces, adaptive quizzes, study planners, and associated services (collectively, the &ldquo;<strong>Service</strong>&rdquo;).
                </p>
                <p>
                  By checking the registration consent box, creating an account, or accessing the Service, you confirm that you have read,
                  understood, and agree to be bound by these Terms and our <Link href="/privacy-policy">Privacy Policy</Link>.
                  If you do not agree with any part of these Terms, you must immediately discontinue using the Service.
                </p>
              </div>
            </article>

            {/* Section 02: Eligibility & Student Accounts */}
            <article id="sec-eligibility" className="legal-section">
              <div className="legal-section-tag">02. ELIGIBILITY</div>
              <h2 className="legal-section-title">Eligibility &amp; Student Accounts</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied is built primarily for secondary school students (Class 9–12), college students, and aspirants preparing for competitive examinations such as JEE Main, JEE Advanced, and NEET UG in India.
                </p>
                <ul>
                  <li><strong>Age Requirement:</strong> You must be at least 13 years of age to access Learning Allied.</li>
                  <li><strong>Minor Students (Under 18 Years):</strong> Under the Indian Contract Act, 1872, individuals under the age of 18 are minors. If you are under 18 years old, you represent and warrant that your parent or legal guardian has reviewed and agreed to these Terms on your behalf and supervises your participation.</li>
                  <li><strong>Parental Responsibility:</strong> Parents or guardians who permit their children to use the platform accept full responsibility for supervising their child&apos;s use of the Service.</li>
                </ul>
              </div>
            </article>

            {/* Section 03: Account Registration & Responsibilities */}
            <article id="sec-registration" className="legal-section">
              <div className="legal-section-tag">03. ACCOUNTS</div>
              <h2 className="legal-section-title">Account Registration &amp; Responsibilities</h2>
              <div className="legal-prose">
                <p>
                  To unlock personalized study features, question tracking, and progress metrics, you must register for an account. When registering:
                </p>
                <ul>
                  <li><strong>Accurate Information:</strong> You agree to provide true, accurate, and current information regarding your identity, email address, and academic target.</li>
                  <li><strong>Account Security:</strong> You are responsible for safeguarding your login credentials (whether password or Google federated login). You must immediately notify us at <a href="mailto:hello@learningallied.com">hello@learningallied.com</a> of any unauthorized access to your account.</li>
                  <li><strong>Individual Use Only:</strong> Accounts are strictly individual. You may not share, sell, rent, or transfer your account credentials to any third party. Automated bot account creation is strictly forbidden.</li>
                </ul>
              </div>
            </article>

            {/* Section 04: Features & Educational Services */}
            <article id="sec-features" className="legal-section">
              <div className="legal-section-tag">04. PLATFORM SCOPE</div>
              <h2 className="legal-section-title">Learning Allied Features &amp; Services</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied provides educational tools grounded in cognitive science principles to help students master rigorous curricula:
                </p>

                <div className="legal-cards-grid">
                  <div className="legal-info-card">
                    <h4>Socratic AI Tutor</h4>
                    <p>Conversational assistant designed to guide you through complex physics, chemistry, and mathematics concepts with prompting questions rather than spoon-fed solutions.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Adaptive Practice &amp; Quizzes</h4>
                    <p>Chapter-wise diagnostic quizzes calibrated to difficulty levels, testing active recall under exam-realistic conditions.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Spaced Review &amp; Error Logs</h4>
                    <p>Algorithmic tracking of your missed questions and forgotten concepts to resurface topics right before memory decay occurs.</p>
                  </div>
                  <div className="legal-info-card">
                    <h4>Personalized Study Planner</h4>
                    <p>Dynamic scheduling tools to organize syllabus milestones and balance study blocks across Physics, Chemistry, and Mathematics/Biology.</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Section 05: AI-Generated Content Limitations & Accuracy */}
            <article id="sec-ai-limitations" className="legal-section">
              <div className="legal-section-tag">05. AI LIMITATIONS</div>
              <h2 className="legal-section-title">AI-Generated Content Limitations &amp; Accuracy</h2>
              <div className="legal-prose">
                <p>
                  Our platform utilizes advanced large language models (including the Google Gemini API). While we implement rigorous syllabi grounding
                  and guardrails mapped to official NCERT, NTA, CBSE, and Maharashtra Board curricula, you acknowledge and agree that:
                </p>
                <ul>
                  <li><strong>Probabilistic Nature:</strong> AI models generate responses probabilistically. While helpful for learning intuition and derivation steps, responses may occasionally contain numerical discrepancies, typographical mistakes, or scientific misinterpretations (&ldquo;hallucinations&rdquo;).</li>
                  <li><strong>Student Verification Duty:</strong> Learning Allied is an educational study companion, not an official examining authority. You remain responsible for cross-referencing critical scientific formulas, chemical equations, and examination notices against official textbooks (such as NCERT) and authorized board or testing agency publications.</li>
                  <li><strong>No Exam Guarantee:</strong> We do not warrant or guarantee that using Learning Allied will yield specific exam percentiles, marks, college admissions, or ranks. Performance in exams depends entirely on a student&apos;s independent dedication, practice, and examination temperament.</li>
                </ul>

                <div className="legal-callout highlight-blue">
                  <div className="legal-callout-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Not Professional Advice</span>
                  </div>
                  <p>
                    AI responses provided through Learning Allied do not constitute professional medical, legal, psychological, or official counselling advice.
                  </p>
                </div>
              </div>
            </article>

            {/* Section 06: Educational Purpose & Responsible AI Usage */}
            <article id="sec-academic-integrity" className="legal-section">
              <div className="legal-section-tag">06. ACADEMIC INTEGRITY</div>
              <h2 className="legal-section-title">Educational Purpose &amp; Responsible AI Usage</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied is built to develop real problem-solving stamina. We reject passive shortcuts and expect all students to uphold academic honesty:
                </p>
                <ul>
                  <li><strong>Prohibition on Cheating:</strong> You may not use Learning Allied to facilitate real-time cheating on live, invigilated school tests, board exams, or competitive entrance examinations.</li>
                  <li><strong>Socratic Engagement:</strong> You agree to engage with the AI tutor as an intellectual thinking partner. Using the platform to generate unoriginal essays, plagiarized homework dumps, or school assignment ghostwriting undermines your learning and violates our acceptable use standards.</li>
                  <li><strong>Adversarial Prompts:</strong> You may not attempt prompt injections, jailbreaks, or adversarial inputs designed to circumvent pedagogical safety filters or coax the AI into generating malicious or non-academic material.</li>
                </ul>
              </div>
            </article>

            {/* Section 07: Free and Pro Plans, Subscriptions and Payments */}
            <article id="sec-plans-subscriptions" className="legal-section">
              <div className="legal-section-tag">07. TIERS &amp; ACCESS</div>
              <h2 className="legal-section-title">Free and Pro Plans, Subscriptions and Payments</h2>
              <div className="legal-prose">
                <p>
                  Learning Allied offers both Free access and elevated Pro benefits:
                </p>
                <ul>
                  <li><strong>Free Plan:</strong> Every registered student receives daily complimentary quotas for Socratic AI chats, quiz analyses, and revision planner access, resetting automatically every 24 hours.</li>
                  <li><strong>Pro Plan:</strong> Pro tier unlocks unlimited daily AI conversations, prioritized response latency, in-depth error diagnostics, and early access to newly released experimental modules.</li>
                  <li><strong>Current Access Upgrade Process:</strong> Pro access is currently granted via promotional invitations, direct student requests via our contact form, email (<a href="mailto:hello@learningallied.com">hello@learningallied.com</a>), or through our official Discord community. No automated recurring credit card billing is currently deployed on the platform.</li>
                  <li><strong>Future Commercial Upgrades:</strong> Should Learning Allied introduce paid subscription tiers or payment gateway integrations in the future, clear pricing, billing cycles, tax details, and refund terms will be displayed explicitly prior to purchase.</li>
                </ul>
              </div>
            </article>

            {/* Section 08: Intellectual Property & Platform Ownership */}
            <article id="sec-intellectual-property" className="legal-section">
              <div className="legal-section-tag">08. PROPRIETARY RIGHTS</div>
              <h2 className="legal-section-title">Intellectual Property &amp; Platform Ownership</h2>
              <div className="legal-prose">
                <p>
                  <strong>Platform Ownership:</strong> All rights, title, and interest in and to Learning Allied—including software code, user interface designs, logos, graphics, curriculum taxonomies, pedagogical prompt frameworks, and visual styling—are the exclusive intellectual property of Prem Jain and Learning Allied, protected by Indian copyright and intellectual property laws.
                </p>
                <p>
                  <strong>Limited License:</strong> Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service strictly for your personal, non-commercial educational study.
                </p>
                <p>
                  <strong>User Content:</strong> You retain ownership of any original questions, notes, or study submissions you input. By submitting content to the platform, you grant Learning Allied a worldwide, royalty-free license to store, process, and display such content solely as required to provide, debug, and improve your learning experience, in accordance with our <Link href="/privacy-policy">Privacy Policy</Link>.
                </p>
              </div>
            </article>

            {/* Section 09: Acceptable Use & Prohibited Activities */}
            <article id="sec-acceptable-use" className="legal-section">
              <div className="legal-section-tag">09. CONDUCT GUIDELINES</div>
              <h2 className="legal-section-title">Acceptable Use &amp; Prohibited Activities</h2>
              <div className="legal-prose">
                <p>
                  To preserve a secure and productive learning environment for all students, you agree NOT to engage in any of the following prohibited activities:
                </p>
                <ul>
                  <li><strong>Platform Exploitation:</strong> Reverse engineering, decompiling, disassembling, or extracting the source code or proprietary algorithms of Learning Allied.</li>
                  <li><strong>Automated Scraping:</strong> Using scrapers, crawlers, spiders, or automated scripts to harvest content, questions, user data, or API outputs.</li>
                  <li><strong>Abuse of Quotas &amp; Limits:</strong> Bypassing or attempting to circumvent rate limits, daily usage quotas, or authentication checks.</li>
                  <li><strong>Harmful Code:</strong> Uploading or transmitting viruses, worms, malicious payloads, or corrupted files.</li>
                  <li><strong>Defamatory or Obscene Material:</strong> Submitting content that is unlawful, defamatory, sexually explicit, abusive, harassing, promoting hate speech, or violating the rights of any individual.</li>
                  <li><strong>Disruption:</strong> Interfering with network infrastructure, causing denial-of-service, or placing unreasonable load on our cloud servers.</li>
                </ul>
              </div>
            </article>

            {/* Section 10: Suspension and Account Termination */}
            <article id="sec-termination" className="legal-section">
              <div className="legal-section-tag">10. TERMINATION</div>
              <h2 className="legal-section-title">Suspension &amp; Account Termination</h2>
              <div className="legal-prose">
                <p>
                  <strong>By Learning Allied:</strong> We reserve the right to suspend or permanently terminate your account and access to the Service immediately, without prior notice or liability, if you violate these Terms, engage in fraudulent activity, attempt security breaches, or misuse AI resources.
                </p>
                <p>
                  <strong>By You:</strong> You may terminate your account at any time by selecting the account deletion option in your settings or emailing <a href="mailto:hello@learningallied.com">hello@learningallied.com</a>. Upon account termination, your right to use the Service ceases immediately, and your personal data will be erased in accordance with our data retention schedule.
                </p>
              </div>
            </article>

            {/* Section 11: Service Availability & Limitations */}
            <article id="sec-availability" className="legal-section">
              <div className="legal-section-tag">11. UPTIME &amp; CHANGES</div>
              <h2 className="legal-section-title">Service Availability &amp; Limitations</h2>
              <div className="legal-prose">
                <p>
                  We strive to maintain continuous platform availability. However, the Service is provided on an <strong>&ldquo;AS IS&rdquo;</strong> and <strong>&ldquo;AS AVAILABLE&rdquo;</strong> basis:
                </p>
                <ul>
                  <li>We may temporarily suspend access for scheduled maintenance, updates, or emergency security patches.</li>
                  <li>We reserve the right to modify, refine, or deprecate specific features, subjects, or AI models to improve pedagogical effectiveness.</li>
                  <li>We are not liable for disruptions resulting from internet service provider outages, cloud hosting failures, or circumstances beyond our reasonable control.</li>
                </ul>
              </div>
            </article>

            {/* Section 12: Limitation of Liability */}
            <article id="sec-liability" className="legal-section">
              <div className="legal-section-tag">12. LIABILITY DISCLAIMERS</div>
              <h2 className="legal-section-title">Limitation of Liability &amp; Disclaimers</h2>
              <div className="legal-prose">
                <p>
                  To the maximum extent permitted by applicable Indian law:
                </p>
                <ul>
                  <li>Learning Allied, its founder Prem Jain, contributors, and service partners expressly disclaim all warranties of any kind, whether express, statutory, or implied, including warranties of merchantability, fitness for a particular academic purpose, and non-infringement.</li>
                  <li>Under no circumstances shall Learning Allied be liable for any indirect, incidental, consequential, special, or punitive damages, including loss of data, missed examination deadlines, or academic outcomes, arising from your use of or inability to use the Service.</li>
                  <li>Our total aggregate liability for all claims arising out of or related to these Terms or the Service shall not exceed the total amount paid by you to Learning Allied in the preceding twelve (12) months, or INR 1,000 (Indian Rupees One Thousand), whichever is greater.</li>
                </ul>
              </div>
            </article>

            {/* Section 13: Governing Law & Dispute Resolution */}
            <article id="sec-governing-law" className="legal-section">
              <div className="legal-section-tag">13. JURISDICTION</div>
              <h2 className="legal-section-title">Governing Law &amp; Dispute Resolution under Indian Law</h2>
              <div className="legal-prose">
                <p>
                  These Terms, their interpretation, and any disputes arising out of or related to them shall be governed exclusively by the
                  <strong>laws of the Republic of India</strong>, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023,
                  and the Indian Contract Act, 1872, without giving effect to conflict of law principles.
                </p>
                <p>
                  <strong>Amicable Resolution:</strong> In the event of any dispute, claim, or difference, you and Learning Allied agree to first attempt
                  in good faith to resolve the dispute through friendly, informal discussions by writing to <a href="mailto:hello@learningallied.com">hello@learningallied.com</a> for a period of at least thirty (30) days.
                </p>
                <p>
                  <strong>Exclusive Jurisdiction:</strong> If a dispute cannot be resolved through informal negotiations, the competent courts situated in
                  <strong>Maharashtra, India</strong> shall have exclusive jurisdiction over all legal proceedings arising out of these Terms.
                </p>
              </div>
            </article>

            {/* Section 14: Contact Information */}
            <article id="sec-contact-terms" className="legal-section">
              <div className="legal-section-tag">14. LEGAL DESK</div>
              <h2 className="legal-section-title">Contact &amp; Legal Inquiries</h2>
              <div className="legal-prose">
                <p>
                  For any legal questions, notice delivery, or inquiries regarding these Terms of Use, please reach out directly:
                </p>

                <div className="legal-callout highlight-blue">
                  <div className="legal-callout-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span>Learning Allied Legal Desk</span>
                  </div>
                  <p>
                    <strong>Platform:</strong> Learning Allied (Founded by Prem Jain)<br />
                    <strong>Email:</strong> <a href="mailto:hello@learningallied.com">hello@learningallied.com</a><br />
                    <strong>Domain:</strong> <a href="https://www.learningallied.world">https://www.learningallied.world</a><br />
                    <strong>Jurisdiction:</strong> Maharashtra, India<br />
                    <strong>Inquiries:</strong> Account rules, terms interpretation, or platform governance
                  </p>
                </div>
              </div>
            </article>
          </LegalLayout>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
