import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../lib/seo";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import { HeroProductDeck } from "../components/landing/HeroProductDeck";
import { ProductShowcase } from "../components/landing/ProductShowcase";

export const metadata = constructMetadata({
  title: "Learning Allied — Global AI Study Partner for Every Curriculum",
  description:
    "Learning Allied is a global AI study partner for students worldwide. Socratic tutoring, visual concept models, misconception diagnosis, adaptive practice, and spaced revision.",
  path: "/",
});

const APK_URL =
  "https://github.com/premjain230/Mentora/releases/download/v1.1.0/learningallied.apk";

const CURRICULA_TRACKS = [
  {
    region: "United States",
    title: "AP, SAT & High School",
    href: "/curriculum/us/us_ap",
    linkLabel: "View AP curriculum track",
    desc: "College Board AP Physics, Calculus, Chemistry, Digital SAT reasoning, and NGSS sciences.",
    chips: ["AP Physics", "AP Calculus", "Digital SAT", "CCSS & NGSS"],
  },
  {
    region: "United Kingdom",
    title: "GCSE & GCE A-Levels",
    href: "/curriculum/gb/gb_gcse",
    linkLabel: "View GCSE curriculum track",
    desc: "AQA, Edexcel, OCR, and Scotland SQA revision structured around mark-scheme reasoning.",
    chips: ["GCSE Science & Maths", "A-Level Physics", "A-Level Chemistry", "SQA Highers"],
  },
  {
    region: "India",
    title: "CBSE, State Boards, JEE & NEET",
    href: "/jee-preparation",
    linkLabel: "View JEE & Indian tracks",
    desc: "NCERT-aligned CBSE (Classes 9–12), Maharashtra Board (Balbharati), JEE Main & Advanced, and NEET UG.",
    chips: ["CBSE Class 9–12", "Maharashtra Board", "JEE Main & Adv", "NEET UG"],
  },
  {
    region: "Global & Commonwealth",
    title: "Canada, Australia, Singapore & More",
    href: "/curriculum/sg/sg_secondary",
    linkLabel: "View Singapore & global tracks",
    desc: "Ontario OSSD, BC, Australian VCE & ACARA, Singapore MOE O-Levels, New Zealand NCEA, Ireland, UAE, South Africa & Nigeria.",
    chips: ["Singapore MOE", "Ontario OSSD", "Australia VCE", "NZ NCEA"],
  },
];

const CHATBOT_LIMITS = [
  {
    title: "Dumps final answers immediately",
    desc: "Creates an illusion of understanding that disappears during closed-book exams.",
  },
  {
    title: "Ignores prerequisite gaps",
    desc: "Skips over missing foundational concepts in vectors, algebra, or basic mechanics.",
  },
  {
    title: "Generic off-syllabus explanations",
    desc: "Blends college-level notation with high school topics without curriculum boundaries.",
  },
  {
    title: "No memory or revision schedule",
    desc: "Treats every question as isolated with zero tracking of what you will forget next week.",
  },
];

const ALLIED_APPROACH = [
  {
    title: "Socratic step-by-step scaffolding",
    desc: "Prompts your reasoning from first principles so your brain builds durable recall.",
  },
  {
    title: "Prerequisite knowledge mapping",
    desc: "Detects whether a struggle in a hard chapter comes from an unmastered foundation.",
  },
  {
    title: "Root-cause misconception diagnosis",
    desc: "Separates quick calculation slips from conceptual misunderstandings and drills the gap.",
  },
  {
    title: "Adaptive planner & spaced revision",
    desc: "Schedules short active-recall reviews before memory decays toward exam day.",
  },
];

const PLATFORM_STRENGTHS = [
  {
    title: "Guided understanding",
    desc: "Walks through derivations step by step and adapts explanations to your current level.",
  },
  {
    title: "Visual concept models",
    desc: "Interactive 2D/3D scenes, vector diagrams, and step-by-step derivations.",
  },
  {
    title: "Curriculum-calibrated practice",
    desc: "Timed questions and rubrics aligned to official board and entrance exam patterns.",
  },
  {
    title: "Scheduled memory retention",
    desc: "Tracks topic strength and places fading concepts into your daily review queue.",
  },
];

const HONEST_BOUNDARIES = [
  {
    title: "Does not replace human teachers",
    desc: "Built as a calm 24/7 study partner between classes, not a substitute for school or faculty.",
  },
  {
    title: "Refuses to spoon-feed homework",
    desc: "Designed to prompt genuine thinking rather than letting you copy-paste finished answers.",
  },
  {
    title: "Always verify with official textbooks",
    desc: "Cross-check nuanced syllabus edge cases with your prescribed textbooks and board guides.",
  },
  {
    title: "Stays within your syllabus scope",
    desc: "Keeps explanations calibrated to your grade and curriculum rather than college trivia.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is Learning Allied free to start?",
    a: "Yes. You can create an account, ask questions, explore visual lessons, practice quizzes, and build a study schedule at zero cost with no credit card required.",
  },
  {
    q: "How is Learning Allied different from ChatGPT or standard AI chatbots?",
    a: "Standard chatbots act as answer-dumping machines: they hand over the final calculation immediately, robbing your brain of active recall. Learning Allied uses Socratic questioning, prerequisite mapping, misconception diagnosis, and spaced revision so you can solve unfamiliar problems on your own.",
  },
  {
    q: "Does Learning Allied replace my teachers or school?",
    a: "No. Learning Allied supports you during self-study hours between classes — answering late-night doubts, visualizing tough concepts, and keeping your revision organized alongside your classes and textbooks.",
  },
  {
    q: "Which countries, boards, and exams are supported?",
    a: "Learning Allied supports 15 countries and 26 curriculum pathways including US AP, SAT & NGSS, UK GCSE & A-Levels, Canada OSSD/BC, Australia VCE/ACARA, Singapore MOE, New Zealand NCEA, Ireland Leaving Cert, and India CBSE, Maharashtra Board, CISCE, JEE & NEET.",
  },
  {
    q: "How does spaced revision and memory tracking work?",
    a: "Based on forgetting-curve and retrieval-practice research, Learning Allied tracks how recently and accurately you practiced each concept. When retention begins to drop, the topic is automatically scheduled into your daily Review queue and Study Planner.",
  },
  {
    q: "Is student data kept private?",
    a: "Yes. Learning Allied never sells student data, runs no third-party ad trackers, and encrypts learning records in transit and at rest in alignment with DPDP Act 2023 privacy standards.",
  },
  {
    q: "Can I use Learning Allied on mobile and Android?",
    a: "Yes. Learning Allied works across desktop, tablet, and mobile browsers, and you can also install the dedicated Android APK.",
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
      name: "Learning Allied — Global AI Study Partner for Every Curriculum",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
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

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="land-btn-icon" aria-hidden="true">
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="landing-root">
        {/* ── GALLERY HERO ──────────────────────────────────────────────────────── */}
        <section className="land-hero" aria-labelledby="hero-heading">
          <div className="landing-wrap">
            <div className="land-hero-header">
              <h1 id="hero-heading" className="land-hero-title">
                Understand every concept.
                <br />
                Remember it when it counts.
              </h1>
            </div>

            {/* Signature Interactive Product Deck */}
            <HeroProductDeck />

            {/* Supporting Value & Pill CTAs */}
            <div className="land-hero-sub-wrap">
              <p className="land-hero-lede">
                A Socratic AI study partner calibrated to your curriculum. Build real intuition,
                visualize difficult ideas, diagnose misconceptions, and revise before memory fades.
              </p>

              <div className="land-hero-actions">
                <Link href="/signup" className="land-btn land-btn-primary">
                  <span>Start Learning Free</span>
                  <ArrowIcon />
                </Link>
                <a href="#workspace" className="land-btn land-btn-secondary">
                  <span>Explore the Platform</span>
                </a>
              </div>

              <div className="land-hero-meta">
                <span>Free to start</span>
                <i className="dot-sep" aria-hidden="true" />
                <span>No credit card required</span>
                <i className="dot-sep" aria-hidden="true" />
                <span>15 countries &amp; 26 curricula</span>
                <i className="dot-sep" aria-hidden="true" />
                <span>
                  Also on <a href={APK_URL}>Android</a>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── UNIFIED INTERACTIVE PRODUCT WORKBENCH ─────────────────────────────── */}
        <ProductShowcase />

        {/* ── WHY SOCRATIC LEARNING MATTERS ─────────────────────────────────────── */}
        <section id="compare" className="land-section" aria-labelledby="compare-heading">
          <div className="landing-wrap">
            <div className="land-section-head">
              <div className="land-eyebrow">Built for Real Mastery</div>
              <h2 id="compare-heading" className="land-heading">
                More than an AI chatbot. A structured learning system.
              </h2>
              <p className="land-lede">
                Generic AI tools optimize for finishing homework fast. Learning Allied is engineered
                so you can solve unfamiliar problems independently under exam pressure.
              </p>
            </div>

            <div className="compare-grid">
              <div className="compare-card">
                <div className="compare-head">
                  <h3>Standard AI Chatbots</h3>
                  <span className="compare-badge muted">Passive</span>
                </div>
                <ul className="compare-list">
                  {CHATBOT_LIMITS.map((item) => (
                    <li key={item.title}>
                      <span className="compare-mark no" aria-hidden="true">✕</span>
                      <div>
                        <strong>{item.title}</strong> — {item.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="compare-card allied">
                <div className="compare-head">
                  <h3>Learning Allied</h3>
                  <span className="compare-badge accent">Active Mastery</span>
                </div>
                <ul className="compare-list">
                  {ALLIED_APPROACH.map((item) => (
                    <li key={item.title}>
                      <span className="compare-mark yes" aria-hidden="true">✓</span>
                      <div>
                        <strong>{item.title}</strong> — {item.desc}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── GLOBAL CURRICULA & EXAM TRACKS ────────────────────────────────────── */}
        <section id="curricula" className="land-section" aria-labelledby="curricula-heading">
          <div className="landing-wrap">
            <div className="land-section-head">
              <div className="land-eyebrow">Curriculum Grounding</div>
              <h2 id="curricula-heading" className="land-heading">
                Calibrated to your board, syllabus, and exam pattern.
              </h2>
              <p className="land-lede">
                Select your country and academic pathway during onboarding so explanations,
                conventions, and practice questions match your exact syllabus.
              </p>
            </div>

            <div className="curr-grid">
              {CURRICULA_TRACKS.map((track) => (
                <Link key={track.title} href={track.href} className="curr-card">
                  <div>
                    <span className="curr-region">{track.region}</span>
                    <h3 className="curr-title">{track.title}</h3>
                    <p className="curr-desc">{track.desc}</p>
                    <div className="curr-chips">
                      {track.chips.map((chip) => (
                        <span key={chip} className="curr-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="curr-link-row">
                    <span>{track.linkLabel}</span>
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── HONEST TRANSPARENCY, PRIVACY & FOUNDER MISSION ───────────────────── */}
        <section id="trust" className="land-section" aria-labelledby="trust-heading">
          <div className="landing-wrap">
            <div className="land-section-head">
              <div className="land-eyebrow">Transparency &amp; Trust</div>
              <h2 id="trust-heading" className="land-heading">
                Clear boundaries, private by design.
              </h2>
              <p className="land-lede">
                Students and parents deserve plain facts about what an AI learning platform does,
                where human teachers remain essential, and how personal data is protected.
              </p>
            </div>

            <div className="trust-split">
              <div className="trust-panel">
                <h3 className="trust-panel-head">What Learning Allied does</h3>
                <ul className="trust-panel-list">
                  {PLATFORM_STRENGTHS.map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong> — {item.desc}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="trust-panel boundaries">
                <h3 className="trust-panel-head">Honest boundaries</h3>
                <ul className="trust-panel-list">
                  {HONEST_BOUNDARIES.map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong> — {item.desc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="privacy-strip">
              <div className="privacy-item">
                <strong>DPDP Act 2023 Aligned</strong>
                <span>Built around strict student data protection standards.</span>
              </div>
              <div className="privacy-item">
                <strong>Zero Data Selling</strong>
                <span>We never monetize student profiles, logs, or mistakes.</span>
              </div>
              <div className="privacy-item">
                <strong>No Ad Trackers</strong>
                <span>Distraction-free study space with zero ad networks.</span>
              </div>
              <div className="privacy-item">
                <strong>Encrypted Records</strong>
                <span>Learning progress protected in transit and at rest.</span>
              </div>
            </div>

            <div className="founder-card">
              <div>
                <blockquote className="founder-quote">
                  &ldquo;AI should never rob a student of the struggle to understand. Real mastery is
                  earned through reasoning, not copy-pasting.&rdquo;
                </blockquote>
                <p className="founder-note">
                  Learning Allied was built by Prem Jain so every student can access a patient,
                  affordable Socratic study partner grounded in cognitive science.
                </p>
                <div className="founder-byline">
                  <div className="founder-avatar" aria-hidden="true">PJ</div>
                  <div>
                    <strong>Prem Jain</strong>
                    <span>Founder, Learning Allied</span>
                  </div>
                </div>
              </div>

              <div className="founder-links">
                <Link href="/founder" className="founder-link">
                  <span>Read the Founder Story</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/for-parents" className="founder-link">
                  <span>Guide for Parents &amp; Educators</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/about" className="founder-link">
                  <span>Our Educational Philosophy</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
        <section id="faq" className="land-section" aria-labelledby="faq-heading">
          <div className="landing-wrap">
            <div className="land-section-head">
              <div className="land-eyebrow">FAQ</div>
              <h2 id="faq-heading" className="land-heading">
                Common questions, answered plainly.
              </h2>
            </div>

            <div className="land-faq-box">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="land-faq-item">
                  <summary className="land-faq-summary">
                    <span>{item.q}</span>
                    <span className="land-faq-plus" aria-hidden="true">+</span>
                  </summary>
                  <p className="land-faq-answer">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CONVERSION CTA ──────────────────────────────────────────────── */}
        <section className="land-section" aria-labelledby="cta-heading">
          <div className="landing-wrap">
            <div className="land-final-cta">
              <div className="land-eyebrow">Begin Today</div>
              <h2 id="cta-heading" className="land-final-title">
                Start your first Socratic study session.
              </h2>
              <p className="land-final-lede">
                Create a free account in under 30 seconds, bring your toughest concept, and
                experience structured understanding.
              </p>

              <div className="land-final-actions">
                <Link href="/signup" className="land-btn land-btn-primary">
                  <span>Start Learning Free</span>
                  <ArrowIcon />
                </Link>
                <Link href="/login" className="land-btn land-btn-secondary">
                  <span>Student Login</span>
                </Link>
              </div>

              <div className="land-final-note">
                100% free to start · No card required · Also available as an{" "}
                <a href={APK_URL}>Android APK</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
