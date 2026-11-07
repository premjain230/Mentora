import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "About Learning Allied | Founded by Prem Jain",
  description:
    "Learn about Learning Allied, an AI study partner founded by Prem Jain to help students understand concepts, practise effectively and learn independently.",
  path: "/about",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: "About Learning Allied | Founded by Prem Jain",
      description:
        "Learn about Learning Allied, an AI study partner founded by Prem Jain to help students understand concepts, practise effectively and learn independently.",
      about: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

const PRINCIPLES = [
  {
    index: "01",
    title: "Socratic First, Never Answer Dumps",
    desc: "When a student asks a question, answering immediately rob them of the chance to encode the solution in long-term memory. Learning Allied prompts the student for the underlying premise, guiding them to derive the answer step-by-step.",
  },
  {
    index: "02",
    title: "Active Retrieval Over Re-reading",
    desc: "Cognitive science shows that re-reading textbooks provides an illusion of competence. Real retention requires effortful retrieval practice through diagnostic quizzes and conceptual challenges.",
  },
  {
    index: "03",
    title: "Spaced Repetition Calibrated to Decay",
    desc: "Instead of cramming before exams, memory strength is modelled algorithmically. Topics resurface in your study queue precisely when neural decay begins, cutting revision time by half.",
  },
  {
    index: "04",
    title: "Strict Syllabi Grounding",
    desc: "Every concept, formula, and question maps strictly to official NTA JEE, NEET, CBSE, and Maharashtra State Board curricula. Zero hallucinated topics or off-syllabus trivia.",
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="editorial-page">
        {/* Editorial Hero */}
        <section className="page-hero">
          <div className="wrap">
            <p className="ui-eyebrow">The Learning Allied Philosophy</p>
            <h1 id="about-heading" className="ui-display page-hero-title">
              Built to replace passive memorisation with genuine understanding.
            </h1>
            <p className="ui-lede page-hero-lede">
              AI shouldn&apos;t just be a shortcut to copy answers. Learning Allied was designed
              from first cognitive principles to help Indian students think deeply, master complex
              curricula, and build unshakeable confidence.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start learning free
              </Link>
              <Link href="/founder" className="btn btn-secondary btn-lg">
                Meet the founder
              </Link>
            </div>
            <p className="page-hero-byline">
              Founded by <Link href="/founder">Prem Jain</Link> · Independent &amp; student-first
            </p>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="ui-section">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Core Mission</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">
                  Why most exam prep fails under pressure
                </h2>
                <p>
                  In competitive exams like JEE and NEET, rote memorisation collapses the moment a problem
                  presents a novel boundary condition. When students rely on video solutions or instant AI answers,
                  they experience the &quot;fluency illusion&quot;—believing they know the material simply because
                  they watched someone else solve it.
                </p>
                <p>
                  Learning Allied was built to eliminate this trap. We combine modern large language models with
                  proven cognitive learning science: Socratic dialogue, generative problem solving, and Leitner
                  spaced review intervals.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Four Architectural Pillars */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Our Methodology</p>
              <h2 className="ui-display ui-section-title">
                The four tenets of deliberate practice
              </h2>
              <p className="ui-lede ui-section-lede">
                Every interaction in Learning Allied is structured to maximise long-term retention
                and conceptual independence.
              </p>
            </div>

            <div className="pillars-grid">
              {PRINCIPLES.map((p) => (
                <div key={p.index} className="pillar-card">
                  <span className="pillar-index">{p.index}</span>
                  <h3 className="pillar-title">{p.title}</h3>
                  <p className="pillar-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder Story Strip */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="ui-panel founder-feature-panel">
              <div className="founder-feature-copy">
                <p className="ui-eyebrow">The Story</p>
                <h2>A student building for students</h2>
                <p>
                  Learning Allied is independently created and maintained by Prem Jain. Having experienced
                  the pressure of Indian competitive exams firsthand, he set out to build the learning partner
                  he wished he had: patient, available 24/7, and focused on genuine mastery rather than rote drills.
                </p>
                <div className="founder-feature-links">
                  <Link href="/founder" className="btn btn-secondary">
                    Read Prem&apos;s story →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-panel home-cta">
              <h2>Master your syllabus today</h2>
              <p>
                Join thousands of students using Socratic AI and spaced retention to prepare for JEE, NEET, and Boards.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start learning free
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Student login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
