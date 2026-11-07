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
  {
    subject: "Physics",
    topics: [
      "Kinematics & Vectors",
      "Newton's Laws of Motion",
      "Work, Energy & Power",
      "Rotational Dynamics",
      "Gravitation",
      "Thermodynamics",
      "Electrostatics & Capacitance",
      "Current Electricity",
      "Magnetism & EMI",
      "Wave Optics & Modern Physics",
    ],
  },
  {
    subject: "Chemistry",
    topics: [
      "Mole Concept & Stoichiometry",
      "Chemical Thermodynamics",
      "Chemical & Ionic Equilibrium",
      "Periodic Properties & Chemical Bonding",
      "Coordination Compounds",
      "General Organic Chemistry (GOC)",
      "Hydrocarbons",
      "Alcohols, Phenols & Ethers",
      "Aldehydes, Ketones & Carboxylic Acids",
      "Electrochemistry & Chemical Kinetics",
    ],
  },
  {
    subject: "Mathematics",
    topics: [
      "Quadratic Equations & Complex Numbers",
      "Sequences & Series",
      "Matrices & Determinants",
      "Limits, Continuity & Differentiability",
      "Application of Derivatives",
      "Definite & Indefinite Integration",
      "Differential Equations",
      "Coordinate Geometry (Circles & Conics)",
      "Vectors & 3D Geometry",
      "Probability & Statistics",
    ],
  },
];

const HIGHLIGHTS = [
  {
    title: "Socratic Problem Breakdowns",
    desc: "Stuck on multi-concept JEE numericals? The AI tutor guides you step-by-step through free-body diagrams, calculus substitutions, and reaction mechanisms without spoiling the final answer.",
  },
  {
    title: "Spaced Retention for Inorganic Chemistry",
    desc: "Inorganic trends and coordination isomerism require regular retrieval practice. Automated decay algorithms schedule targeted revision slots right before memory fades.",
  },
  {
    title: "Targeted Mock Analytics",
    desc: "Discover whether mistakes in Mathematics were conceptual gaps, calculation errors, or time mismanagement so you can refine your exam strategy.",
  },
];

export default function JeePrepPage() {
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
            <p className="ui-eyebrow">Engineering Track</p>
            <h1 className="ui-display page-hero-title">
              JEE Main &amp; Advanced Preparation
            </h1>
            <p className="ui-lede page-hero-lede">
              Deliberate practice, AI Socratic guidance, and spaced memory revision across Physics, Chemistry, and Mathematics. Built specifically for Class 11 and 12 aspirants targeting top percentiles.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start preparing free
              </Link>
              <Link href="/blog/how-to-make-a-jee-study-plan" className="btn btn-secondary btn-lg">
                Read JEE Study Guide
              </Link>
            </div>
          </div>
        </section>

        {/* Why Learning Allied */}
        <section className="ui-section">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Pedagogy</p>
              <h2 className="ui-display ui-section-title">
                Engineered for JEE numerical mastery
              </h2>
              <p className="ui-lede ui-section-lede">
                Standard coaching gives thousands of questions without diagnostics. We focus on deep conceptual models and cognitive stamina.
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

        {/* Syllabus Matrix */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="ui-section-head">
              <p className="ui-eyebrow">Curriculum Coverage</p>
              <h2 className="ui-display ui-section-title">
                High-yield chapters &amp; core concepts
              </h2>
              <p className="ui-lede ui-section-lede">
                Mapped against the official NTA JEE syllabus and previous ten years of question patterns.
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
              <h2>Aiming for IIT JEE?</h2>
              <p>
                Build your personalised syllabus timetable and start testing your recall today. No card required.
              </p>
              <div className="hero-actions">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start JEE practice free
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
