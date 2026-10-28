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

export default function CbseBoardPage() {
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
              CBSE Board Classes 9–12 Preparation
            </h1>
            <p style={{ fontSize: 18, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              Comprehensive NCERT syllabus coverage for Class 9, 10, 11 and 12 CBSE examinations. Master key definitions, derivations, chapter summaries, and board question patterns.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start CBSE prep free
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              Classes supported
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 24 }}>
              {[
                { title: "Class 10 CBSE Board", desc: "Science (Physics, Chem, Bio), Mathematics (Standard & Basic), Social Science, and English literature." },
                { title: "Class 12 CBSE Science", desc: "Physics, Chemistry, Mathematics, Biology, and Computer Science with step-by-step NCERT solutions." },
                { title: "Class 11 Foundation", desc: "Bridge the leap between secondary school and senior secondary science with conceptual foundation tools." },
                { title: "Class 9 Fundamentals", desc: "Master the foundational math and science concepts that support your Class 10 board readiness." },
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
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--la-text)" }}>Aiming for 95%+ in your CBSE Board?</h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16, maxWidth: 440, margin: "0 auto 24px" }}>Start practising chapter-wise board questions now.</p>
              <Link href="/signup" className="btn btn-primary btn-lg">Create Free Account</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
