import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "NEET UG Preparation — Free Study Hub | Learning Allied",
  description:
    "Prepare for NEET UG with free practice quizzes, AI tutoring, study plans and chapter-wise resources from Learning Allied. Designed for Class 11 and 12 Biology, Chemistry and Physics aspirants.",
  path: "/neet-preparation",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "NEET UG Preparation — Learning Allied",
      "description":
        "Free NEET practice quizzes, AI tutoring, study plans and chapter-wise resources for Biology, Chemistry and Physics aspirants.",
      "url": `${SITE_URL}/neet-preparation`,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "NEET Preparation", "item": `${SITE_URL}/neet-preparation` },
        ],
      },
    },
    {
      "@type": "Course",
      "name": "NEET UG Preparation",
      "description":
        "Free NEET UG preparation with chapter-wise practice quizzes, AI tutoring, study plans and mastery tracking across Physics, Chemistry and Biology (Botany and Zoology) for NCERT Class 11 and 12 aspirants.",
      "provider": { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      "audience": { "@type": "EducationalAudience", "educationalLevel": "Senior Secondary" },
      "educationalLevel": "Class 11 & Class 12",
      "courseCode": "NEET-UG",
      "url": `${SITE_URL}/neet-preparation`,
    },
  ],
};

const CHAPTERS = [
  { subject: "Biology (Botany & Zoology)", topics: ["Diversity in the Living World", "Structural Organisation in Animals & Plants", "Cell Structure & Function", "Plant Physiology & Photosynthesis", "Human Physiology & Neural Control", "Reproduction in Organisms & Humans", "Genetics & Molecular Basis of Inheritance", "Evolution & Ecology", "Biotechnology Principles & Processes"] },
  { subject: "Chemistry", topics: ["Basic Concepts of Chemistry", "Structure of Atom & Periodic Table", "Chemical Bonding & Molecular Structure", "Thermodynamics & Equilibrium", "Solutions & Electrochemistry", "Coordination Compounds & d-Block", "Hydrocarbons & Haloalkanes", "Oxygen & Nitrogen Organic Compounds", "Biomolecules & Principles of Practical Chem"] },
  { subject: "Physics", topics: ["Units, Dimensions & Error Analysis", "Laws of Motion & Work-Power-Energy", "System of Particles & Rotational Motion", "Thermodynamics & Kinetic Theory of Gases", "Oscillations & Waves", "Electrostatics & Current Electricity", "Magnetic Effects of Current & AC", "Ray & Wave Optics", "Dual Nature of Matter & Atoms/Nuclei", "Semiconductor Electronics"] },
];

export default function NeetPrepPage() {
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
              NEET UG Preparation
            </h1>
            <p style={{ fontSize: 18, color: "var(--la-muted, #a1a1aa)", maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              Free high-yield NEET practice quizzes, NCERT-focused AI tutoring and study schedules. Master line-by-line NCERT Biology, Organic Chemistry mechanisms and Physics numericals.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start NEET prep free
              </Link>
              <a href="#chapters" className="btn btn-secondary btn-lg">
                Explore Syllabus
              </a>
            </div>
          </div>
        </section>

        <section style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              Why NEET aspirants use Learning Allied
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 24 }}>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>100% NCERT Biology Alignment</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Practise assertion-reason, diagram-based, and line-by-line NCERT questions crafted to mirror the NTA NEET pattern.</p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Spaced Repetition for Taxa & Dates</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Memorising hundreds of plant examples, anatomical structures, and scientific names requires timely recall reviews.</p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Step-by-step Physics Guidance</h3>
                <p style={{ fontSize: 14.5, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>Overcome calculation anxiety with AI tutor breakdowns of numerical problems without giving away the answer upfront.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="chapters" style={{ padding: "64px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
              NEET UG syllabus coverage
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 24 }}>
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
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--la-text)" }}>Targeting 680+ in NEET UG?</h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16, maxWidth: 440, margin: "0 auto 24px" }}>Start your active recall practice sessions now.</p>
              <Link href="/signup" className="btn btn-primary btn-lg">Create Free NEET Account</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
