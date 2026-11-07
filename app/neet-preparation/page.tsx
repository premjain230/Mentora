import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "NEET UG Preparation — Free High-Yield Study Hub | Learning Allied",
  description:
    "Free NEET practice quizzes, NCERT-focused AI tutoring, study plans and chapter-wise resources from Learning Allied. Designed for medical aspirants.",
  path: "/neet-preparation",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "name": "NEET UG Preparation — Learning Allied",
      "description":
        "Free NEET practice quizzes, NCERT-focused AI tutoring, study plans and chapter-wise resources for medical aspirants.",
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
      "name": "NEET UG Medical Preparation",
      "description":
        "Free NEET UG medical preparation with chapter-wise practice quizzes, NCERT line-by-line active recall, AI tutoring, and spaced revision across Biology, Chemistry, and Physics.",
      "provider": { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      "audience": { "@type": "EducationalAudience", "educationalLevel": "Senior Secondary" },
      "educationalLevel": "Class 11 & Class 12",
      "courseCode": "NEET-UG",
      "url": `${SITE_URL}/neet-preparation`,
    },
  ],
};

const CHAPTERS = [
  {
    subject: "Biology",
    topics: [
      "Diversity in the Living World",
      "Structural Organisation in Animals & Plants",
      "Cell Structure & Cell Division",
      "Plant Physiology (Photosynthesis, Respiration)",
      "Human Physiology (Circulation, Neural, Endocrine)",
      "Reproduction in Organisms & Humans",
      "Genetics & Principles of Inheritance",
      "Molecular Basis of Inheritance",
      "Biotechnology Principles & Applications",
      "Ecology, Environment & Biodiversity",
    ],
  },
  {
    subject: "Chemistry",
    topics: [
      "Atomic Structure & Periodic Classification",
      "Chemical Bonding & Molecular Structure",
      "States of Matter & Thermodynamics",
      "Equilibrium & Redox Reactions",
      "Coordination Compounds & d/f-Block Elements",
      "General Organic Chemistry (Purification, IUPAC)",
      "Hydrocarbons & Environmental Chemistry",
      "Haloalkanes, Alcohols, Phenols & Ethers",
      "Aldehydes, Ketones & Amines",
      "Biomolecules & Polymers",
    ],
  },
  {
    subject: "Physics",
    topics: [
      "Physical World & Units of Measurement",
      "Kinematics & Laws of Motion",
      "Work, Energy and Power",
      "System of Particles & Rotational Motion",
      "Gravitation & Properties of Bulk Matter",
      "Thermodynamics & Kinetic Theory of Gases",
      "Oscillations and Waves",
      "Electrostatics & Current Electricity",
      "Magnetic Effects of Current & EMI",
      "Optics & Modern Physics (Dual Nature, Atoms)",
    ],
  },
];

const HIGHLIGHTS = [
  {
    title: "100% NCERT Biology Alignment",
    desc: "Practise assertion-reason, diagram interpretation, and line-by-line NCERT questions crafted to mirror the NTA NEET pattern.",
  },
  {
    title: "Spaced Repetition for Anatomical Taxa",
    desc: "Memorising plant examples, taxonomic classifications, and hormone feedback loops requires timely recall reviews to prevent decay.",
  },
  {
    title: "Step-by-Step Numerical Physics",
    desc: "Overcome calculation anxiety with AI tutor breakdowns of numerical problems without giving away the answer upfront.",
  },
];

export default function NeetPrepPage() {
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
            <p className="ui-eyebrow">Medical Track</p>
            <h1 className="ui-display page-hero-title">
              NEET UG Medical Preparation
            </h1>
            <p className="ui-lede page-hero-lede">
              High-yield NCERT line-by-line active recall, AI Socratic tutoring, and spaced revision across Biology, Chemistry, and Physics. Designed to build the speed and precision required for 680+ scores.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start NEET prep free
              </Link>
              <a href="#chapters" className="btn btn-secondary btn-lg">
                Explore syllabus
              </a>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">High Yield</p>
              <h2 className="ui-display ui-section-title">
                Why medical aspirants rely on Learning Allied
              </h2>
              <p className="ui-lede ui-section-lede">
                Speed and precision determine your NEET rank. We combine rigorous retrieval practice with Socratic clarity.
              </p>
            </div>

            <div className="curriculum-highlights-grid">
              {HIGHLIGHTS.map((h, i) => (
                <div key={i} className="curriculum-highlight-card">
                  <h3>{h.title}</h3>
                  <p>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chapters */}
        <section id="chapters" className="ui-section editorial-divider">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Full Coverage</p>
              <h2 className="ui-display ui-section-title">
                NEET UG syllabus coverage
              </h2>
              <p className="ui-lede ui-section-lede">
                Every chapter structured for rapid diagnosis, active recall quizzes, and formula mastery.
              </p>
            </div>

            <div className="syllabus-grid">
              {CHAPTERS.map((col, idx) => (
                <div key={idx} className="syllabus-column">
                  <div className="syllabus-col-head">
                    <span className="syllabus-badge">{col.subject}</span>
                    <span className="syllabus-count">{col.topics.length} core units</span>
                  </div>
                  <ul className="syllabus-list">
                    {col.topics.map((t, i) => (
                      <li key={i} className="syllabus-item">
                        <span className="syllabus-check" aria-hidden="true">✓</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-panel home-cta">
              <h2>Targeting 680+ in NEET UG?</h2>
              <p>
                Begin active recall practice and master line-by-line NCERT Biology today.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Create free NEET account
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
