import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../lib/seo";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import { HeroInteractiveDemo } from "../components/landing/HeroInteractiveDemo";
import { CognitiveCycleInteractive } from "../components/landing/CognitiveCycleInteractive";
import { RetentionSimulator } from "../components/landing/RetentionSimulator";

export const metadata = constructMetadata({
  title: "Learning Allied — Premium AI Study Partner for JEE, NEET & Board Exams",
  description:
    "Learning Allied is an AI study partner for Indian students preparing for JEE, NEET and Board exams. Socratic tutoring, active recall, prerequisite mapping, misconception diagnosis, and spaced revision.",
  path: "/",
});

const APK_URL =
  "https://github.com/premjain230/Mentora/releases/download/v1.1.0/learningallied.apk";

const EXAMS = [
  {
    tag: "Engineering",
    title: "JEE Main & Advanced",
    href: "/jee-preparation",
    desc: "Rigorous first-principles physics, physical chemistry, and multi-concept mathematics designed for high percentile targets.",
    topics: ["Newtonian Mechanics", "Electromagnetism", "Organic Mechanisms", "Calculus & Coordinate Geometry"],
  },
  {
    tag: "Medical",
    title: "NEET UG Medical",
    href: "/neet-preparation",
    desc: "High-yield NCERT line-by-line active recall, biological classifications, chemical equilibrium, and numerical physics precision.",
    topics: ["Human Physiology", "Genetics & Evolution", "Inorganic Coordination", "Kinematics & Optics"],
  },
  {
    tag: "National Board",
    title: "CBSE Class 9–12",
    href: "/cbse-board",
    desc: "NCERT-aligned curriculum for science and mathematics with step-by-step marking scheme rubrics and descriptive proofs.",
    topics: ["Class 9-10 Foundations", "Class 11-12 Core Science", "NCERT Exemplar Drills", "Board Pattern Practice"],
  },
  {
    tag: "State Board",
    title: "Maharashtra State Board",
    href: "/maharashtra-board",
    desc: "Balbharati textbook curriculum mapping for SSC Class 10 and HSC Science Class 12 state board examinations.",
    topics: ["Balbharati Syllabus", "SSC Board Question Bank", "HSC Physics & Chemistry", "Targeted State Pattern"],
  },
];

const CAPABILITIES = [
  {
    title: "Socratic Cognitive Scaffolding",
    desc: "Guides you through the premise and derivation rather than dumping final answers that ruin exam stamina.",
  },
  {
    title: "Prerequisite Knowledge Graph",
    desc: "Identifies whether an advanced struggle is caused by an unaddressed gap in foundational topics.",
  },
  {
    title: "Curriculum-Calibrated Question Bank",
    desc: "Every concept, formula, and practice challenge is grounded strictly in official NTA and NCERT syllabi.",
  },
  {
    title: "Deep Misconception Diagnosis",
    desc: "Distinguishes between a quick algebraic slip and a dangerous conceptual misunderstanding.",
  },
  {
    title: "Spaced Repetition Scheduler",
    desc: "Models individual memory decay curves to resurface topics right when neural retention drops below threshold.",
  },
  {
    title: "Metacognitive Calibration",
    desc: "Compares your subjective self-confidence with objective accuracy to eliminate dangerous blind spots.",
  },
];

const HONEST_LIMITATIONS = [
  {
    title: "Does not replace human teachers",
    desc: "Learning Allied is built as an always-available personal study partner between classes, not a substitute for school or coaching faculty.",
  },
  {
    title: "Requires genuine cognitive effort",
    desc: "If you are looking for an AI to complete your homework without you thinking, Learning Allied will purposefully refuse to spoon-feed answers.",
  },
  {
    title: "Always verify with core textbooks",
    desc: "While strictly grounded in curriculum data, competitive exam students should cross-verify nuanced edge cases with NCERT and Balbharati texts.",
  },
  {
    title: "Deliberate boundary on off-syllabus trivia",
    desc: "We deliberately constrain the AI away from college-level tangents that waste valuable preparation time for JEE and NEET.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is Learning Allied free to start?",
    a: "Yes. You can create an account, ask questions, explore interactive concepts, and build a personalized study schedule at zero cost. No credit card or payment method is required.",
  },
  {
    q: "How is Learning Allied fundamentally different from ChatGPT or other chatbots?",
    a: "Standard AI chatbots behave like homework-copying machines: they instantly dump the final calculation, depriving your brain of the struggle required to form long-term memory. Learning Allied uses Socratic questioning, prerequisite diagnosis, curriculum-grounded quizzes, and Ebbinghaus spaced revision to ensure you can solve problems independently under exam pressure.",
  },
  {
    q: "Does Learning Allied replace my teachers or coaching institute?",
    a: "No. Learning Allied is designed to be your 24/7 personal study partner for the hours between classes. It patiently answers late-night doubts, drills chapter-wise recall, and tracks memory decay. We advise students to continue attending classes and cross-referencing official textbooks.",
  },
  {
    q: "Which boards and competitive examinations are supported?",
    a: "We currently support NTA JEE (Main and Advanced), NEET UG (Medical), CBSE (Classes 9 to 12), and Maharashtra State Board (SSC Class 10 and HSC Science Class 12). All curricula follow official guidelines.",
  },
  {
    q: "How does the spaced repetition and memory decay engine work?",
    a: "Based on Hermann Ebbinghaus's forgetting curve research and modern retrieval practice science, the system tracks how long ago and how accurately you answered questions on each topic. When a concept's memory strength nears decay threshold (around 50-60%), it is automatically placed in your daily revision queue.",
  },
  {
    q: "Is my personal study data and question history kept private?",
    a: "Yes. Learning Allied is built with strict privacy standards compliant with India's DPDP Act 2023. We never sell student data, we do not host third-party advertisement trackers, and your queries remain private to your account.",
  },
  {
    q: "Can I use Learning Allied on Android and mobile phones?",
    a: "Yes. The platform is responsive across all mobile browsers, and you can also download the dedicated Learning Allied Android APK directly for native study sessions.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    SHARED_JSONLD_GRAPH.website,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: "Learning Allied — Premium AI Study Partner for JEE, NEET & Board Exams",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ],
};

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="prem-btn-icon" aria-hidden="true">
      <path
        d="M3.5 8h9M8.8 4.3 12.5 8l-3.7 3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="prem-trust-icon check" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InfoCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="prem-trust-icon info" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="landing-root">
        {/* ── HERO SECTION ────────────────────────────────────────────────────────── */}
        <section className="prem-hero" aria-labelledby="hero-heading">
          <div className="landing-wrap">
            <div className="prem-hero-intro">
              <div className="prem-badge">
                <span className="prem-badge-tag">Cognitive AI</span>
                <span>Designed from neuroscience for serious Indian exam prep</span>
              </div>

              <h1 id="hero-heading" className="prem-hero-title">
                Master the concept.
                <br />
                <span className="accent-blue">Not just the answer.</span>
              </h1>

              <p className="prem-hero-lede">
                Learning Allied is a Socratic AI study partner for JEE, NEET, and Board
                examinations. Instead of spoon-feeding answers, it prompts your reasoning,
                diagnoses misconceptions, and schedules recall before memory decays.
              </p>

              <div className="prem-hero-actions">
                <Link href="/signup" className="prem-btn prem-btn-primary">
                  <span>Start Learning Free</span>
                  <ArrowRightIcon />
                </Link>
                <a href="#platform-tour" className="prem-btn prem-btn-secondary">
                  <span>Explore the Platform</span>
                </a>
              </div>

              <div className="prem-hero-trust-bar">
                <span>Free to start</span>
                <i className="sep" aria-hidden="true" />
                <span>No credit card required</span>
                <i className="sep" aria-hidden="true" />
                <span>NTA JEE &amp; NEET aligned</span>
                <i className="sep" aria-hidden="true" />
                <span>Also on <a href={APK_URL}>Android</a></span>
              </div>
            </div>

            {/* Realistic Code-Built Hero Product Demonstration */}
            <HeroInteractiveDemo />
          </div>
        </section>

        {/* ── PRODUCT STORYTELLING: THE 6-STAGE COGNITIVE JOURNEY ────────────────── */}
        <section id="platform-tour" className="prem-section" aria-labelledby="story-heading">
          <div className="landing-wrap">
            <div className="prem-section-header">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>Cognitive Architecture</span>
              </div>
              <h2 id="story-heading" className="prem-heading">
                How students move from confusion to <span className="accent-blue">mastery</span>.
              </h2>
              <p className="prem-lede">
                Passive re-reading creates an illusion of competence. Learning Allied guides
                you through the complete cognitive cycle: from Socratic inquiry to permanent
                long-term memory consolidation.
              </p>
            </div>

            <CognitiveCycleInteractive />
          </div>
        </section>

        {/* ── EXAM TRACKS & CURRICULUM GROUNDING ─────────────────────────────────── */}
        <section id="exams" className="prem-section" aria-labelledby="exams-heading">
          <div className="landing-wrap">
            <div className="prem-section-header">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>Curriculum Precision</span>
              </div>
              <h2 id="exams-heading" className="prem-heading">
                Tailored for high-stakes Indian exams.
              </h2>
              <p className="prem-lede">
                Zero hallucinated topics or off-syllabus trivia. Every concept, formula, and
                diagnostic question is strictly calibrated to official board and NTA standards.
              </p>
            </div>

            <div className="prem-exams-grid">
              {EXAMS.map((exam) => (
                <Link key={exam.href} href={exam.href} className="prem-exam-card">
                  <div>
                    <div className="prem-exam-head">
                      <span className="prem-exam-badge">{exam.tag}</span>
                    </div>
                    <h3 className="prem-exam-title">{exam.title}</h3>
                    <p className="prem-exam-desc">{exam.desc}</p>
                    <div className="prem-exam-topics">
                      {exam.topics.map((t) => (
                        <span key={t} className="prem-exam-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="prem-exam-link">
                    <span>View exam preparation guide</span>
                    <ArrowRightIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── RETENTION SIMULATOR: MEMORY DECAY & SPACED REPETITION ──────────────── */}
        <section className="prem-section" aria-labelledby="retention-heading">
          <div className="landing-wrap">
            <div className="prem-section-header">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>Neuroscience in Action</span>
              </div>
              <h2 id="retention-heading" className="prem-heading">
                Study less time. Remember <span className="accent-cyan">more</span> of it.
              </h2>
              <p className="prem-lede">
                Cramming produces rapid forgetting. By scheduling targeted active-recall sessions
                at algorithmic decay intervals, Learning Allied preserves over 90% of your knowledge.
              </p>
            </div>

            <RetentionSimulator />
          </div>
        </section>

        {/* ── CAPABILITIES VS HONEST LIMITATIONS ──────────────────────────────────── */}
        <section className="prem-section" aria-labelledby="capabilities-heading">
          <div className="landing-wrap">
            <div className="prem-section-header">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>Honest Transparency</span>
              </div>
              <h2 id="capabilities-heading" className="prem-heading">
                What Learning Allied does — and what it does not.
              </h2>
              <p className="prem-lede">
                We believe in genuine trust over marketing hype. Here is an honest, plain-language
                breakdown of our platform capabilities and boundaries.
              </p>
            </div>

            <div className="prem-trust-grid">
              {/* What it does */}
              <div className="prem-trust-panel capabilities">
                <h3 className="prem-trust-panel-title ok">
                  <CheckmarkIcon />
                  <span>Platform Strengths</span>
                </h3>
                <p className="prem-trust-panel-sub">
                  Where Learning Allied provides an unfair cognitive advantage:
                </p>
                <ul className="prem-trust-list">
                  {CAPABILITIES.map((cap) => (
                    <li key={cap.title} className="prem-trust-item">
                      <CheckmarkIcon />
                      <div>
                        <strong>{cap.title}</strong>
                        <span> — {cap.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What it does not do */}
              <div className="prem-trust-panel limitations">
                <h3 className="prem-trust-panel-title neutral">
                  <InfoCircleIcon />
                  <span>Honest Limitations</span>
                </h3>
                <p className="prem-trust-panel-sub">
                  Clear boundaries on what our AI will never claim or attempt:
                </p>
                <ul className="prem-trust-list">
                  {HONEST_LIMITATIONS.map((lim) => (
                    <li key={lim.title} className="prem-trust-item">
                      <InfoCircleIcon />
                      <div>
                        <strong>{lim.title}</strong>
                        <span> — {lim.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Privacy & Security Guarantees */}
            <div className="prem-privacy-banner">
              <div className="prem-privacy-grid">
                <div className="prem-privacy-copy">
                  <div className="prem-eyebrow">
                    <span className="dot" />
                    <span>Data Ethics</span>
                  </div>
                  <h3>Student Privacy by Design</h3>
                  <p>
                    Your notes, study sessions, and mistakes are confidential.
                    We adhere strictly to modern data governance frameworks.
                  </p>
                </div>
                <div className="prem-privacy-features">
                  <div className="prem-priv-item">
                    <strong>DPDP Act 2023 Compliant</strong>
                    <span>Full compliance with India&apos;s Digital Personal Data Protection standards.</span>
                  </div>
                  <div className="prem-priv-item">
                    <strong>Zero Third-Party Data Selling</strong>
                    <span>We never monetize student behavior, question logs, or profiles.</span>
                  </div>
                  <div className="prem-priv-item">
                    <strong>No Intrusive Ad Tracking</strong>
                    <span>Clean study environment free from commercial advertising networks.</span>
                  </div>
                  <div className="prem-priv-item">
                    <strong>Encrypted Cloud Storage</strong>
                    <span>Bank-grade encryption in transit and at rest for all learning records.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOUNDER STORY & MISSION ────────────────────────────────────────────── */}
        <section id="founder" className="prem-section" aria-labelledby="founder-heading">
          <div className="landing-wrap">
            <div className="prem-founder-card">
              <div className="prem-founder-grid">
                <div>
                  <div className="prem-eyebrow">
                    <span className="dot" />
                    <span>Independent &amp; Student-First</span>
                  </div>
                  <blockquote className="prem-founder-quote" id="founder-heading">
                    &ldquo;AI should never rob a student of the struggle to understand.
                    Real mastery is earned through reasoning, not copy-pasting.&rdquo;
                  </blockquote>
                  <p className="prem-founder-body">
                    Learning Allied was created by Prem Jain to eliminate the monopoly of
                    rote-memorization coaching and generic AI answer-dump tools. Every feature
                    is built around cognitive science to give every student an affordable,
                    infinitely patient personal Socratic mentor.
                  </p>
                  <div className="prem-founder-author">
                    <div className="prem-founder-avatar">PJ</div>
                    <div className="prem-founder-meta">
                      <strong>Prem Jain</strong>
                      <span>Founder &amp; Student Entrepreneur, Learning Allied</span>
                    </div>
                  </div>
                </div>

                <div className="prem-founder-links">
                  <Link href="/founder" className="prem-founder-link-btn">
                    <span>Read the Founder Story</span>
                    <ArrowRightIcon />
                  </Link>
                  <Link href="/about" className="prem-founder-link-btn">
                    <span>Our Educational Philosophy</span>
                    <ArrowRightIcon />
                  </Link>
                  <Link href="/blog/how-to-make-a-jee-study-plan" className="prem-founder-link-btn">
                    <span>JEE Study Plan Strategy Guide</span>
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FREQUENTLY ASKED QUESTIONS ─────────────────────────────────────────── */}
        <section id="faq" className="prem-section" aria-labelledby="faq-heading">
          <div className="landing-wrap">
            <div className="prem-section-header">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>FAQ</span>
              </div>
              <h2 id="faq-heading" className="prem-heading">
                Questions, answered plainly.
              </h2>
              <p className="prem-lede">
                Everything you need to know about getting started, our cognitive pedagogy,
                and platform policies.
              </p>
            </div>

            <div className="prem-faq-panel">
              <div className="faq-list">
                {FAQ_ITEMS.map((item, idx) => (
                  <details key={idx} className="faq-item" style={{ padding: "16px 0", borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.08))" }}>
                    <summary
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: "pointer",
                        listStyle: "none",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "var(--la-text, #ffffff)",
                      }}
                    >
                      <span>{item.q}</span>
                      <span style={{ fontSize: 18, color: "var(--la-muted, #a1a1aa)", marginLeft: 12 }}>+</span>
                    </summary>
                    <p style={{ marginTop: 12, marginBottom: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--la-muted, #a1a1aa)" }}>
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL HIGH-CONVERSION CTA ───────────────────────────────────────────── */}
        <section className="prem-section" style={{ borderBottom: "none" }} aria-labelledby="cta-heading">
          <div className="landing-wrap">
            <div className="prem-final-cta">
              <div className="prem-eyebrow">
                <span className="dot" />
                <span>Begin Your Journey</span>
              </div>
              <h2 id="cta-heading" className="prem-final-cta-title">
                Start your first Socratic study session today.
              </h2>
              <p className="prem-final-cta-lede">
                Create a free account in under 30 seconds. Ask your most difficult physics,
                chemistry, or mathematics question and experience genuine understanding.
              </p>

              <div className="prem-final-cta-actions">
                <Link href="/signup" className="prem-btn prem-btn-primary">
                  <span>Start Learning Free</span>
                  <ArrowRightIcon />
                </Link>
                <Link href="/login" className="prem-btn prem-btn-secondary">
                  <span>Student Login</span>
                </Link>
                <a href={APK_URL} className="prem-btn prem-btn-secondary">
                  <span>Download Android APK</span>
                </a>
              </div>

              <div className="prem-final-cta-note">
                100% free to start · No card required · Instant access on web &amp; Android
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
