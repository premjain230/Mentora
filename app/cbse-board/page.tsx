import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "CBSE Board Classes 9–12 — Free Study Hub | Learning Allied",
  description:
    "Free CBSE Board study resources, practice quizzes and AI tutoring for Classes 9–12 across Science, Mathematics, Commerce and Humanities streams.",
  path: "/cbse-board",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "CBSE Board — Learning Allied",
      "description":
        "Free CBSE Board study resources, practice quizzes and AI tutoring for Classes 9–12.",
      "url": `${SITE_URL}/cbse-board`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "CBSE Board", "item": `${SITE_URL}/cbse-board` },
        ],
      },
    },
    {
      "@type": "Course",
      "name": "CBSE Board",
      "description":
        "Free CBSE Board study resources, practice quizzes and AI tutoring for Classes 9–12 across Science, Mathematics, Commerce and Humanities streams.",
      "provider": { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      "audience": { "@type": "EducationalAudience", "educationalLevel": "Secondary" },
      "educationalLevel": "Class 9 to Class 12",
      "courseCode": "CBSE",
      "url": `${SITE_URL}/cbse-board`,
    },
  ],
};

const CLASSES = [
  {
    grade: "Class 10",
    title: "CBSE Board Examination",
    desc: "NCERT-aligned Science (Physics, Chemistry, Biology), Mathematics (Standard & Basic), Social Science, and English with step-by-step problem walkthroughs.",
  },
  {
    grade: "Class 12",
    title: "Senior Secondary Board",
    desc: "Physics, Chemistry, Mathematics, Biology, and Computer Science. Master NCERT exemplars, derivations, and board-format long answers.",
  },
  {
    grade: "Class 11",
    title: "Conceptual Transition Track",
    desc: "Bridge the leap between secondary school and senior secondary science. Build the deep conceptual foundation that prevents Class 12 panic.",
  },
  {
    grade: "Class 9",
    title: "Fundamental Foundations",
    desc: "Master key algebra, geometry, and foundational science topics that underpin all higher-secondary curricula.",
  },
];

export default function CbseBoardPage() {
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
            <p className="ui-eyebrow">National Board Track</p>
            <h1 className="ui-display page-hero-title">
              CBSE Board Classes 9–12 Preparation
            </h1>
            <p className="ui-lede page-hero-lede">
              Comprehensive NCERT syllabus coverage for Class 9, 10, 11, and 12 CBSE examinations. Master definitions, derivations, chapter summaries, and official board question patterns with patient Socratic guidance.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start CBSE prep free
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                Student login
              </Link>
            </div>
          </div>
        </section>

        {/* Classes Supported */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Class Tiers</p>
              <h2 className="ui-display ui-section-title">
                Tailored for your specific academic year
              </h2>
              <p className="ui-lede ui-section-lede">
                Every grade level receives curriculum-calibrated explanations and appropriate question difficulty.
              </p>
            </div>

            <div className="curriculum-highlights-grid">
              {CLASSES.map((c, i) => (
                <div key={i} className="curriculum-highlight-card">
                  <span className="syllabus-badge">{c.grade}</span>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-panel home-cta">
              <h2>Targeting 95%+ in your CBSE Board?</h2>
              <p>
                Begin testing your recall with chapter-wise diagnostic quizzes and Socratic tutor explanations.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Create free CBSE account
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
