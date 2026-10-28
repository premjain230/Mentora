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

export default function MaharashtraBoardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main">
        <section className="hero" style={{ padding: "120px 0 64px" }}>
          <div className="wrap">
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20, color: "var(--la-text)" }}>
              Maharashtra State Board (SSC &amp; HSC)
            </h1>
            <p style={{ fontSize: 18, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              Balbharati textbook-aligned learning for Class 10 (SSC) and Class 12 (HSC) state board exams. Clarify state board numericals, definitions, theorems, and exercise questions with AI assistance.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start state board prep free
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              Targeting Class 10 SSC &amp; Class 12 HSC
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 24 }}>
              {[
                { title: "Class 10 SSC Board", desc: "Science & Technology Part 1 & 2, Mathematics Part 1 (Algebra) & Part 2 (Geometry), Social Sciences." },
                { title: "Class 12 HSC Science", desc: "Physics, Chemistry, Mathematics & Statistics, and Biology strictly following Maharashtra State Board syllabus." },
                { title: "MHT-CET Bridge Support", desc: "Practise objective questions from your State Board textbook that frequently appear in MHT-CET engineering & pharmacy exams." },
              ].map((c, i) => (
                <div key={i} style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>{c.title}</h3>
                  <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "40px 0 80px" }}>
          <div className="wrap">
            <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))", borderRadius: 24, padding: "48px 32px", textAlign: "center" }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--la-text)" }}>Study Maharashtra Board with AI</h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16, maxWidth: 440, margin: "0 auto 24px" }}>Start your active recall and practice quizzes now.</p>
              <Link href="/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
