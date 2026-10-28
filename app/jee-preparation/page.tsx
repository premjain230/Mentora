import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "JEE Main & Advanced Preparation — Free Study Hub | Learning Allied",
  description:
    "Prepare for JEE Main and JEE Advanced with free practice quizzes, AI tutoring, study plans and chapter-wise resources from Learning Allied. Designed for Class 11 and 12 aspirants.",
  path: "/jee-preparation",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "JEE Main & Advanced Preparation — Learning Allied",
      "description":
        "Free JEE practice quizzes, AI tutoring, study plans and chapter-wise resources for Main and Advanced aspirants.",
      "url": `${SITE_URL}/jee-preparation`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "JEE Preparation", "item": `${SITE_URL}/jee-preparation` },
        ],
      },
    },
    {
      "@type": "Course",
      "name": "JEE Main & Advanced Preparation",
      "description":
        "Free JEE Main and JEE Advanced preparation with chapter-wise practice quizzes, AI tutoring, study plans and mastery tracking across Physics, Chemistry and Mathematics for Class 11 and 12 aspirants.",
      "provider": { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      "audience": { "@type": "EducationalAudience", "educationalLevel": "Senior Secondary" },
      "educationalLevel": "Class 11 & Class 12",
      "courseCode": "JEE-Main-Advanced",
      "url": `${SITE_URL}/jee-preparation`,
    },
  ],
};

const CHAPTERS = [
  { subject: "Physics", topics: ["Kinematics & Vectors", "Newton's Laws of Motion", "Work, Energy & Power", "Rotational Dynamics", "Gravitation", "Thermodynamics", "Electrostatics & Capacitance", "Current Electricity", "Magnetism & EMI", "Wave Optics & Modern Physics"] },
  { subject: "Chemistry", topics: ["Mole Concept & Stoichiometry", "Chemical Thermodynamics", "Chemical & Ionic Equilibrium", "Periodic Properties & Chemical Bonding", "Coordination Compounds", "General Organic Chemistry (GOC)", "Hydrocarbons", "Alcohols, Phenols & Ethers", "Aldehydes, Ketones & Carboxylic Acids", "Electrochemistry & Chemical Kinetics"] },
  { subject: "Mathematics", topics: ["Quadratic Equations & Complex Numbers", "Sequences & Series", "Matrices & Determinants", "Limits, Continuity & Differentiability", "Application of Derivatives", "Definite & Indefinite Integration", "Differential Equations", "Coordinate Geometry (Circles & Conics)", "Vectors & 3D Geometry", "Probability & Statistics"] },
];

export default function JeePrepPage() {
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
              JEE Main &amp; Advanced Preparation
            </h1>
            <p style={{ fontSize: 18, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              Free chapter-wise practice quizzes, AI tutoring and study plans for JEE Main and Advanced aspirants. Build your syllabus plan, practise with AI-generated questions and track your mastery across Physics, Chemistry and Mathematics.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start preparing free
              </Link>
              <Link href="/blog/how-to-make-a-jee-study-plan" className="btn btn-secondary btn-lg">
                Read JEE Study Guide
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              How Learning Allied helps JEE aspirants
            </h2>
            <p style={{ fontSize: 16, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, marginBottom: 36 }}>
              Learning Allied combines AI tutoring with spaced repetition and active recall to help you retain concepts longer and practise smarter.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Chapter-wise quizzes</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Practise JEE Main and Advanced chapters with AI-generated multiple-choice questions. Get instant feedback and explanations for every answer.</p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Adaptive Study planner</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Build a weekly study plan tied to your syllabus. Track which chapters you&apos;ve mastered and which need revision.</p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Socratic AI tutor</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Ask conceptual questions in plain language and get Socratic explanations that help you work out derivations yourself.</p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Mastery & Retention tracking</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>See your confidence level per chapter and topic. Know exactly what to revise before mock tests.</p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              JEE chapters you can practise
            </h2>
            <p style={{ fontSize: 16, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, marginBottom: 36 }}>
              Comprehensive coverage across all 3 subjects tested in JEE Main and Advanced.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {CHAPTERS.map((col, idx) => (
                <div key={idx} style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--la-accent, #ff8a1f)" }}>{col.subject}</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14, color: "var(--la-muted, #a1a1aa)" }}>
                    {col.topics.map((t, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#4ade80" }}>✓</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "40px 0 80px" }}>
          <div className="wrap">
            <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))", borderRadius: 24, padding: "48px 32px", textAlign: "center" }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--la-text)" }}>Ready to boost your JEE rank?</h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16, maxWidth: 440, margin: "0 auto 24px" }}>Start practising chapter-wise questions for free today.</p>
              <Link href="/signup" className="btn btn-primary btn-lg">Create Free JEE Account</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
