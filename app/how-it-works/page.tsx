import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "How Learning Allied Works: Socratic AI & Cognitive Architecture",
  description:
    "Explore the technology and cognitive psychology behind Learning Allied: Socratic dialogue, prerequisite knowledge graphs, active retrieval, and spaced repetition.",
  path: "/how-it-works",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    SHARED_JSONLD_GRAPH.softwareApplication,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/how-it-works#webpage`,
      url: `${SITE_URL}/how-it-works`,
      name: "How Learning Allied Works: Socratic AI & Cognitive Architecture",
      description:
        "Comprehensive architectural guide to Learning Allied's evidence-based learning technology.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const PILLARS = [
  {
    num: "01",
    title: "Socratic Cognitive Scaffolding",
    subtitle: "The Anti-Answer Engine",
    desc: "When a student submits a difficult homework problem or exam doubt, typical chatbots immediately output the full mathematical derivation and answer. This robs the brain of working memory consolidation. Learning Allied acts like an expert professor: it asks you to identify the governing physical law or definition first, validates your premise, and prompts you to derive the intermediate equations yourself.",
    tags: ["Active Recall", "First-Principles Thinking", "Cognitive Load Theory"],
  },
  {
    num: "02",
    title: "Prerequisite Knowledge Graph",
    subtitle: "Deep Root-Cause Misconception Diagnosis",
    desc: "Knowledge in STEM subjects is strictly hierarchical. If you struggle with Rotational Dynamics or Electromagnetic Induction, your underlying barrier is almost never the advanced chapter itself; it is an unaddressed gap in Vector Cross Products or Newton's Laws. Learning Allied traverses dependency trees to test and remediate foundational nodes before advancing.",
    tags: ["Graph Architecture", "Prerequisite Mapping", "Gap Remediation"],
  },
  {
    num: "03",
    title: "Active Retrieval Practice",
    subtitle: "Testing Effect Over Passive Re-reading",
    desc: "Decades of research by cognitive scientists confirm that highlighting notes or re-reading textbooks creates an illusion of competence with near-zero test-day retention. Learning Allied integrates continuous low-stakes diagnostic testing into every session, forcing your brain to retrieve knowledge from long-term memory under authentic exam marking conditions.",
    tags: ["Testing Effect", "NCERT Line-by-Line", "Board Marking Rubrics"],
  },
  {
    num: "04",
    title: "Calibrated Spaced Repetition",
    subtitle: "Beating the Ebbinghaus Forgetting Curve",
    desc: "Without systematic review, human memory decays exponentially within 48 hours of initial encoding. Learning Allied tracks your individual retention probability score across every chapter. Review micro-quizzes are automatically scheduled at optimal decay intervals (Day 1, Day 3, Day 7, Day 21) so you retain all 90 chapters effortlessly on exam day.",
    tags: ["Ebbinghaus Decay Model", "Automated Queue", "Exam Retention"],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="editorial-page">
        {/* Hero */}
        <section className="page-hero">
          <div className="wrap">
            <p className="ui-eyebrow">Product Architecture</p>
            <h1 className="ui-display page-hero-title">
              How Learning Allied Works
            </h1>
            <p className="ui-lede page-hero-lede">
              We replaced passive answer-dumping with cognitive science. Discover how our Socratic tutor, prerequisite knowledge graph, and spaced repetition engine work together to build true problem-solving mastery.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Experience it free
              </Link>
              <Link href="/about" className="btn btn-secondary btn-lg">
                About the company
              </Link>
            </div>
          </div>
        </section>

        {/* Pillars Section */}
        <section className="ui-section">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Core Principles</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">
                  The Four Pillars of Cognitive Mastery
                </h2>
                <p>
                  Most educational technology focuses on distribution: putting video lectures and PDFs on a screen. Learning Allied focuses on the cognitive transition inside the student&apos;s brain: how information moves from fragile working memory into permanent semantic storage.
                </p>

                <div className="how-pillars-list">
                  {PILLARS.map((p) => (
                    <div key={p.num} className="how-pillar-card">
                      <div className="how-pillar-header">
                        <span className="how-pillar-num">{p.num}</span>
                        <div>
                          <h3 className="how-pillar-title">{p.title}</h3>
                          <div className="how-pillar-sub">{p.subtitle}</div>
                        </div>
                      </div>
                      <p className="how-pillar-desc">{p.desc}</p>
                      <div className="how-pillar-tags">
                        {p.tags.map((t, i) => (
                          <span key={i} className="how-pillar-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Student Workflow */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Workflow</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">
                  A Typical Day on Learning Allied
                </h2>
                <div className="how-timeline">
                  <div className="how-timeline-step">
                    <div className="how-step-badge">1</div>
                    <div className="how-step-content">
                      <h4>Morning Spaced Review (15 Mins)</h4>
                      <p>
                        Open your daily retention queue. Complete 5–10 rapid-fire active recall questions on chapters you studied 3 and 7 days ago to interrupt memory decay before school or coaching begins.
                      </p>
                    </div>
                  </div>

                  <div className="how-timeline-step">
                    <div className="how-step-badge">2</div>
                    <div className="how-step-content">
                      <h4>Targeted Conceptual Study &amp; Practice</h4>
                      <p>
                        Work through high-yield chapters in JEE Physics, NEET Biology, CBSE, or Maharashtra Board. Encounter a difficult problem? Open the Socratic AI tutor for structured guidance.
                      </p>
                    </div>
                  </div>

                  <div className="how-timeline-step">
                    <div className="how-step-badge">3</div>
                    <div className="how-step-content">
                      <h4>Socratic Doubt Dissection</h4>
                      <p>
                        Instead of reading a copied solution, you converse with the AI tutor. It identifies whether your misconception is conceptual, mathematical, or a prerequisite gap, helping you derive the solution.
                      </p>
                    </div>
                  </div>

                  <div className="how-timeline-step">
                    <div className="how-step-badge">4</div>
                    <div className="how-step-content">
                      <h4>Automated Retention Logging</h4>
                      <p>
                        Your mastery score updates in real-time. Weak concepts are scheduled for review in upcoming study sessions, ensuring zero forgotten topics by exam day.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ui-section seo-cta-wrap">
          <div className="wrap">
            <div className="seo-cta-box">
              <div className="seo-cta-badge">Join Ambitious Students</div>
              <h2 className="seo-cta-heading">
                Ready to Learn Faster and Remember Longer?
              </h2>
              <p className="seo-cta-text">
                Start preparing for JEE, NEET, CBSE, or Maharashtra Board with our Socratic AI tutor. Free to get started.
              </p>
              <div className="seo-cta-buttons">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Create Free Account
                </Link>
                <Link href="/best-ai-study-tools" className="btn btn-secondary btn-lg">
                  Read AI Tools Comparison
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
