import React from "react";
import Link from "next/link";
import { constructMetadata } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "Educational Resources, Study Guides & Learning Science | Learning Allied",
  description:
    "Evidence-based study guides, exam preparation blueprints, and cognitive learning techniques for JEE, NEET, CBSE, and Maharashtra State Board students.",
  path: "/blog",
});

const ARTICLES = [
  {
    slug: "how-to-make-a-jee-study-plan",
    title: "JEE Study Plan: How to Make One (with a Timetable)",
    category: "Exam Preparation",
    readTime: "9 min read",
    desc: "Step-by-step guide to building a realistic JEE Main and Advanced timetable with high-weightage chapters, mock test frequency, and revision intervals.",
    date: "August 2026",
  },
  {
    slug: "how-to-study-smarter-using-ai",
    title: "How to Study Smarter Using AI: 7 Cognitive Rules for Students",
    category: "AI in Education",
    readTime: "8 min read",
    desc: "Why copying homework answers from ChatGPT degrades exam problem-solving stamina, and how to use Socratic AI to build permanent conceptual mastery.",
    date: "November 2026",
  },
  {
    slug: "active-recall-spaced-repetition-guide",
    title: "Active Recall & Spaced Repetition: The Science of Exam Retention",
    category: "Study Techniques",
    readTime: "10 min read",
    desc: "How the Testing Effect and the Ebbinghaus forgetting curve can cut your revision time in half while doubling test-day recall in Physics and Biology.",
    date: "November 2026",
  },
  {
    slug: "cbse-class-12-board-study-strategy",
    title: "CBSE Class 12 Board Strategy: Balancing NCERT with Competitive Prep",
    category: "Exam Preparation",
    readTime: "11 min read",
    desc: "How to master CBSE 5-mark derivation rubrics, NCERT exemplars, and competitive numerical speed simultaneously without burning out.",
    date: "November 2026",
  },
];

const CATEGORIES = [
  "All Articles",
  "Study Techniques",
  "AI in Education",
  "Exam Preparation",
  "Learning Science",
];

export default function BlogHubPage() {
  return (
    <>
      <PublicNavbar />

      <main id="main" className="editorial-page">
        {/* Hero */}
        <section className="page-hero">
          <div className="wrap">
            <p className="ui-eyebrow">Learning Allied Knowledge Hub</p>
            <h1 className="ui-display page-hero-title">
              Educational Guides &amp; Learning Science
            </h1>
            <p className="ui-lede page-hero-lede">
              Practical, evidence-based blueprints to help ambitious students study smarter, understand difficult concepts from first principles, and retain knowledge under exam pressure.
            </p>
          </div>
        </section>

        {/* Categories Bar */}
        <section className="blog-cats-section">
          <div className="wrap">
            <div className="blog-cats-bar">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={i}
                  type="button"
                  className={`blog-cat-btn ${i === 0 ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="ui-section">
          <div className="wrap">
            <div className="blog-articles-grid">
              {ARTICLES.map((art) => (
                <article key={art.slug} className="blog-card">
                  <div className="blog-card-meta">
                    <span className="blog-card-cat">{art.category}</span>
                    <span className="blog-card-dot" aria-hidden="true">·</span>
                    <span className="blog-card-time">{art.readTime}</span>
                  </div>
                  <h2 className="blog-card-title">
                    <Link href={`/blog/${art.slug}`}>{art.title}</Link>
                  </h2>
                  <p className="blog-card-desc">{art.desc}</p>
                  <div className="blog-card-footer">
                    <span className="blog-card-date">{art.date}</span>
                    <Link href={`/blog/${art.slug}`} className="blog-card-link">
                      Read Guide &rarr;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Dedicated Landing Pages Callout */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Curricular Deep Dives</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">
                  Specialized Exam Preparation Hubs
                </h2>
                <div className="blog-hubs-grid">
                  <Link href="/jee-preparation" className="blog-hub-card">
                    <h3>JEE Main &amp; Advanced</h3>
                    <p>Physics, Chemistry, and Math chapter-wise practice and AI tutoring.</p>
                    <span className="blog-hub-arrow">Open JEE Hub &rarr;</span>
                  </Link>
                  <Link href="/neet-preparation" className="blog-hub-card">
                    <h3>NEET UG Medical</h3>
                    <p>NCERT Biology line-by-line active recall and physics numerical drills.</p>
                    <span className="blog-hub-arrow">Open NEET Hub &rarr;</span>
                  </Link>
                  <Link href="/cbse-board" className="blog-hub-card">
                    <h3>CBSE Class 9–12</h3>
                    <p>NCERT-aligned practice, derivations, and board marking schemes.</p>
                    <span className="blog-hub-arrow">Open CBSE Hub &rarr;</span>
                  </Link>
                  <Link href="/maharashtra-board" className="blog-hub-card">
                    <h3>Maharashtra State Board</h3>
                    <p>Balbharati textbook aligned practice for SSC and HSC Science.</p>
                    <span className="blog-hub-arrow">Open State Board Hub &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
