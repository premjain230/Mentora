import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../lib/seo";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import { FaqAccordion } from "../components/FaqAccordion";

export const metadata = constructMetadata({
  title: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
  description:
    "Learning Allied is an AI study partner for Indian students preparing for JEE, NEET and Board exams. AI tutor, spaced review, active recall, chapter-wise practice quizzes and personalized study plans.",
  path: "/",
});

const FAQ_ITEMS = [
  {
    q: "Is Learning Allied free to start?",
    a: "Yes. You can start chatting, build a study plan and join the community at no cost. No card is needed to begin.",
  },
  {
    q: "Does it replace my teacher?",
    a: "No. Think of it as a study partner that's available between classes. Always check important facts against your textbooks and coursework.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. It works in any modern browser on desktop or mobile, and there is an Android app you can download directly.",
  },
];

const FEATURES = [
  {
    title: "Socratic tutor",
    desc: "The tutor asks what you think before it explains. Working out an answer yourself helps it stick.",
    note: "Generation effect, Slamecka & Graf, 1978",
  },
  {
    title: "Spaced review",
    desc: "Revision is scheduled for just before you'd forget a topic, so you review less often and retain far more.",
    note: "Forgetting curve, Ebbinghaus, 1885",
  },
  {
    title: "Active recall",
    desc: "Quizzes and questions make you pull answers from memory, which strengthens neural pathways more than rereading.",
    note: "Retrieval practice, Roediger & Butler, 2011",
  },
  {
    title: "Memory strength",
    desc: "See exactly how well you remember each concept and which ones are fading, so you know what to revise today.",
    note: "Decay models & Leitner intervals",
  },
  {
    title: "Confidence calibration",
    desc: "Compare how confident you felt with your actual score. Closing this gap helps you focus on genuine blind spots.",
    note: "Metacognition calibration, Flavell, 1979",
  },
  {
    title: "Prerequisites first",
    desc: "Concepts are mapped into a dependency graph so you never build advanced topics on shaky foundations.",
    note: "Curriculum knowledge graph",
  },
];

const EXAMS = [
  {
    tag: "Engineering",
    title: "JEE Main & Advanced",
    href: "/jee-preparation",
    desc: "Physics, Chemistry and Mathematics structured for high percentile targets.",
  },
  {
    tag: "Medical",
    title: "NEET UG Medical",
    href: "/neet-preparation",
    desc: "High-yield NCERT Biology, Organic Chemistry, and numerical Physics mastery.",
  },
  {
    tag: "School",
    title: "CBSE Class 9–12",
    href: "/cbse-board",
    desc: "NCERT-aligned curriculum for science, mathematics and board examinations.",
  },
  {
    tag: "State board",
    title: "Maharashtra State Board",
    href: "/maharashtra-board",
    desc: "Complete textbook syllabus coverage for SSC and HSC state board students.",
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
      name: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
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

const APK_URL =
  "https://github.com/premjain230/Mentora/releases/download/v1.1.0/learningallied.apk";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8h9M8.8 4.3 12.5 8l-3.7 3.7"
        stroke="currentColor"
        strokeWidth="1.5"
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

      <main id="main">
        <section className="home-hero" aria-labelledby="hero-heading">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="hero-badge">
                <b>New</b>
                Adaptive revision that follows your memory
              </p>

              <h1 id="hero-heading" className="ui-display hero-title">
                Study less time.
                <br />
                Remember <span className="accent">more</span> of it.
              </h1>

              <p className="ui-lede hero-lede">
                Learning Allied is an AI study partner for JEE, NEET and Board
                exam students. It asks you questions, schedules your revision,
                and shows you what you&apos;re about to forget.
              </p>

              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start learning free
                </Link>
                <a href="#how" className="btn btn-secondary btn-lg">
                  See how it works
                </a>
              </div>

              <p className="hero-note">
                Free to start
                <span className="dot" aria-hidden="true" />
                No card required
                <span className="dot" aria-hidden="true" />
                Also on <a href={APK_URL}>Android</a>
              </p>

              <div className="hero-stats" aria-label="At a glance">
                <div className="hero-stat">
                  <strong>6 methods</strong>
                  <span>grounded in memory research</span>
                </div>
                <div className="hero-stat">
                  <strong>JEE · NEET</strong>
                  <span>plus CBSE &amp; state boards</span>
                </div>
                <div className="hero-stat">
                  <strong>24/7</strong>
                  <span>a tutor that never queues</span>
                </div>
              </div>
            </div>

            <div
              className="preview-shell"
              role="img"
              aria-label="Preview of an AI tutor study session with memory strength meters"
            >
              <div className="preview-bar">
                <span className="preview-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="preview-bar-title">Study session · Physics</span>
                <span className="preview-live">
                  <i aria-hidden="true" />
                  Live
                </span>
              </div>

              <div className="preview-body">
                <div className="preview-chat">
                  <p className="preview-label">Socratic tutor</p>
                  <div className="bubble bubble-user">
                    Why does a heavier object not fall faster in a vacuum?
                  </div>
                  <div className="bubble bubble-tutor">
                    <strong>Good question.</strong> Before I explain: what force
                    pulls on each object, and what role does mass play in
                    Newton&apos;s second law (F = ma)?
                  </div>
                  <div className="bubble bubble-tutor">
                    Try it in one sentence — I&apos;ll correct the reasoning, not
                    just the answer.
                  </div>
                </div>

                <div className="preview-side">
                  <p className="preview-label">Memory strength</p>

                  <div className="meter">
                    <div className="meter-head">
                      <span>Newton&apos;s Laws</span>
                      <b className="ok">88% strong</b>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill" style={{ width: "88%" }} />
                    </div>
                  </div>

                  <div className="meter">
                    <div className="meter-head">
                      <span>Rotational Dynamics</span>
                      <b className="warn">46% review</b>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill warn"
                        style={{ width: "46%" }}
                      />
                    </div>
                  </div>

                  <div className="meter">
                    <div className="meter-head">
                      <span>Thermodynamics</span>
                      <b className="ok">75% strong</b>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill" style={{ width: "75%" }} />
                    </div>
                  </div>

                  <div className="preview-foot">
                    <span>Today&apos;s review</span>
                    <b>4 topics · 18 min</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="ui-section" aria-labelledby="how-heading">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">How it works</p>
              <h2 id="how-heading" className="ui-display ui-section-title">
                Built around how memory actually works
              </h2>
              <p className="ui-lede ui-section-lede">
                Reading a chapter again feels productive, but it&apos;s a weak
                way to learn. Learning Allied uses methods with decades of
                cognitive neuroscience research behind them.
              </p>
            </div>

            <div className="feature-list">
              {FEATURES.map((feat, idx) => (
                <div key={feat.title} className="feature-item">
                  <span className="feature-index">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="feature-name">{feat.title}</h3>
                  <div className="feature-body">
                    <p>{feat.desc}</p>
                    <small>{feat.note}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="exams" className="ui-section" aria-labelledby="exams-heading">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Exam tracks</p>
              <h2 id="exams-heading" className="ui-display ui-section-title">
                Made for Indian exam preparation
              </h2>
              <p className="ui-lede ui-section-lede">
                Plan your syllabus, practise chapter-wise with quizzes, and
                master difficult formulas for JEE, NEET and Board exams.
              </p>
            </div>

            <div className="exam-grid">
              {EXAMS.map((exam) => (
                <Link key={exam.href} href={exam.href} className="exam-card">
                  <span className="exam-tag">{exam.tag}</span>
                  <div>
                    <h3>{exam.title}</h3>
                    <p>{exam.desc}</p>
                  </div>
                  <span className="exam-link">
                    View preparation guide
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="ui-section" aria-labelledby="about-heading">
          <div className="wrap">
            <div className="ui-panel founder-panel">
              <div className="founder-copy">
                <p className="ui-eyebrow">Independent &amp; student-first</p>
                <h2 id="about-heading">Who&apos;s behind Learning Allied</h2>
                <p>
                  Learning Allied is created and maintained by Prem Jain. Built
                  specifically to eliminate brute-force memorization and give
                  every student an affordable personal AI tutor.
                </p>
              </div>
              <div className="founder-actions">
                <Link href="/about" className="btn btn-primary">
                  About Learning Allied
                </Link>
                <Link href="/founder" className="btn btn-secondary">
                  Meet the Founder
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="ui-section" aria-labelledby="faq-heading">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">FAQ</p>
              <h2 id="faq-heading" className="ui-display ui-section-title">
                Questions, answered plainly
              </h2>
              <p className="ui-lede ui-section-lede">
                Everything you need to know about getting started with Learning
                Allied.
              </p>
            </div>
            <div className="ui-panel faq-panel">
              <FaqAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        <section className="ui-section" aria-labelledby="cta-heading">
          <div className="wrap">
            <div className="ui-panel home-cta">
              <h2 id="cta-heading">Start your first study session</h2>
              <p>
                Create a free account and ask your first question in under a
                minute. No card, no setup.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get started free
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Student login
                </Link>
                <a href={APK_URL} className="btn btn-secondary btn-lg">
                  Download APK
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
