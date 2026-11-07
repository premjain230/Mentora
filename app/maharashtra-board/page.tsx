import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "Maharashtra State Board (SSC & HSC) — Free Study Hub | Learning Allied",
  description:
    "Free Maharashtra Board study resources, practice quizzes and AI tutoring for Classes 9–12 across Science, Mathematics, Physics, Chemistry and Biology streams.",
  path: "/maharashtra-board",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "Maharashtra State Board — Learning Allied",
      "description":
        "Free Maharashtra Board study resources, practice quizzes and AI tutoring for Classes 9–12.",
      "url": `${SITE_URL}/maharashtra-board`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Maharashtra Board", "item": `${SITE_URL}/maharashtra-board` },
        ],
      },
    },
    {
      "@type": "Course",
      "name": "Maharashtra State Board (MSBSHSE)",
      "description":
        "Free Maharashtra State Board of Secondary and Higher Secondary Education study resources, practice quizzes and AI tutoring for Classes 9–12 across Science, Mathematics, Physics, Chemistry and Biology streams.",
      "provider": { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      "audience": { "@type": "EducationalAudience", "educationalLevel": "Secondary" },
      "educationalLevel": "Class 9 to Class 12",
      "courseCode": "MSBSHSE",
      "url": `${SITE_URL}/maharashtra-board`,
    },
  ],
};

const PROGRAMS = [
  {
    grade: "Class 10 SSC",
    title: "SSC State Board Examination",
    desc: "Science & Technology Part 1 & 2, Mathematics Part 1 (Algebra) & Part 2 (Geometry), and Social Sciences with Balbharati question patterns.",
  },
  {
    grade: "Class 12 HSC",
    title: "HSC Senior Secondary Science",
    desc: "Physics, Chemistry, Mathematics & Statistics, and Biology strictly adhering to Maharashtra State Board textbooks and board evaluation schemes.",
  },
  {
    grade: "MHT-CET Bridge",
    title: "Objective Entrance Practice",
    desc: "Master multiple-choice applications of state board theorems that frequently appear in MHT-CET engineering and pharmacy entrance exams.",
  },
];

export default function MaharashtraBoardPage() {
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
            <p className="ui-eyebrow">State Board Track</p>
            <h1 className="ui-display page-hero-title">
              Maharashtra State Board (SSC &amp; HSC)
            </h1>
            <p className="ui-lede page-hero-lede">
              Balbharati textbook-aligned learning for Class 10 (SSC) and Class 12 (HSC) state board exams. Clarify numericals, definitions, theorems, and end-of-chapter exercises with patient AI assistance.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start state board prep free
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                Student login
              </Link>
            </div>
          </div>
        </section>

        {/* Programs */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Curricula</p>
              <h2 className="ui-display ui-section-title">
                Targeting Class 10 SSC &amp; Class 12 HSC
              </h2>
              <p className="ui-lede ui-section-lede">
                Tailored for the exact format, terminology, and marking schemes of the Maharashtra State Board.
              </p>
            </div>

            <div className="curriculum-highlights-grid">
              {PROGRAMS.map((c, i) => (
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
              <h2>Study Maharashtra Board with AI</h2>
              <p>
                Begin testing your recall with Balbharati-aligned quizzes and Socratic tutor explanations.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get started free
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
