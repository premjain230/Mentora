import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL } from "../../../lib/seo";
import { PublicNavbar } from "../../../components/PublicNavbar";
import { PublicFooter } from "../../../components/PublicFooter";
import { FaqAccordion } from "../../../components/FaqAccordion";

export const metadata = constructMetadata({
  title: "JEE Study Plan: How to Make One (with a Timetable)",
  description:
    "Learn how to make a JEE study plan that actually works. Step-by-step guide with a sample daily timetable, subject weightage, mock tests, and revision tips.",
  path: "/blog/how-to-make-a-jee-study-plan",
  ogImage: `${SITE_URL}/blog/og-how-to-make-a-jee-study-plan.svg`,
  type: "article",
});

const FAQ_ITEMS = [
  {
    q: "How many hours should a JEE aspirant study per day?",
    a: "Most serious JEE aspirants aim for 6 to 8 hours of focused study a day outside school, split into shorter blocks of 45 to 90 minutes with breaks. Consistency and practice matter more than the total number of hours. Sleep for at least 7 hours and schedule a weekly rest slot.",
  },
  {
    q: "How do I make a study timetable for JEE preparation?",
    a: "Audit your syllabus and deadline, set a target score, divide topics by subject weightage and difficulty, then build a weekly timetable that covers all three subjects every day or every alternate day. Reserve fixed slots for practice problems, revision, and one mock test a week, and review the timetable every Sunday.",
  },
  {
    q: "Which topics should I cover first for JEE Main?",
    a: "Start with high-weightage topics that appear every year and don't depend heavily on other chapters: Mechanics and Electrostatics in Physics; Periodic Table, Chemical Bonding, Coordination Compounds, and GOC in Chemistry; and Coordinate Geometry, Matrices & Determinants, and Vector Algebra in Mathematics.",
  },
  {
    q: "How many mock tests should I take before JEE?",
    a: "Aim for 20 to 30 full-length mock tests before the actual exam, starting 2 to 3 months out. Spend at least as much time analysing each test as you took writing it, and log every mistake in an error notebook.",
  },
  {
    q: "How do I balance JEE preparation with Board exam study?",
    a: "Your Class 12 CBSE or state board syllabus overlaps heavily with JEE Main. Focus on NCERT textbooks for Chemistry, Physics derivations, and standard Mathematics proofs. Spend weekdays on concept understanding and board writing, and reserve weekends for JEE-level numericals and timed mocks.",
  },
];

const ARTICLE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "JEE Study Plan: How to Make One (with a Timetable)",
      "description":
        "Learn how to make a JEE study plan that actually works. Step-by-step guide with a sample daily timetable, subject weightage, mock tests, and revision tips.",
      "inLanguage": "en-IN",
      "datePublished": "2026-08-13",
      "dateModified": "2026-08-13",
      "image": `${SITE_URL}/blog/og-how-to-make-a-jee-study-plan.svg`,
      "author": { "@type": "Organization", "name": "Learning Allied" },
      "publisher": {
        "@type": "Organization",
        "name": "Learning Allied",
        "logo": { "@type": "ImageObject", "url": `${SITE_URL}/learningallied-white.svg` },
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${SITE_URL}/blog/how-to-make-a-jee-study-plan`,
      },
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "JEE Study Plan: How to Make One (with a Timetable)",
          "item": `${SITE_URL}/blog/how-to-make-a-jee-study-plan`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "mainEntity": FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ],
};

export default function JeeStudyPlanBlogPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" style={{ padding: "80px 0" }}>
        <article className="wrap" style={{ maxWidth: 780, margin: "0 auto", padding: "0 22px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--la-muted, #a1a1aa)", marginBottom: 16 }}>
            <Link href="/" style={{ color: "var(--la-muted, #a1a1aa)" }}>Home</Link>
            {" / "}
            <span style={{ color: "var(--la-text)" }}>JEE Study Plan Guide</span>
          </nav>

          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "var(--la-accent, #ff8a1f)",
              border: "1px solid rgba(255,138,31,0.25)",
              background: "rgba(255,138,31,0.08)",
              padding: "4px 10px",
              borderRadius: 999,
              marginBottom: 14,
            }}
          >
            JEE Preparation Guide
          </span>

          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              lineHeight: 1.2,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 16,
              color: "var(--la-text)",
            }}
          >
            JEE Study Plan: How to Make One (with a Timetable)
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              color: "var(--la-muted, #a1a1aa)",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--la-accent, #ff8a1f)",
                color: "#000",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              LA
            </div>
            <div>
              <b>Learning Allied Academic Team</b> · Published August 13, 2026 · 12 min read
            </div>
          </div>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              color: "var(--la-text)",
              borderLeft: "3px solid var(--la-accent, #ff8a1f)",
              paddingLeft: 18,
              marginBottom: 32,
            }}
          >
            A high JEE percentile is rarely the result of studying 16 hours a day. It comes from having a structured, realistic study plan that balances new concept coverage, daily problem practice, and spaced revision before memory decays.
          </p>

          <div
            style={{
              background: "var(--la-surface, #111113)",
              border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
              borderRadius: 16,
              padding: "24px 28px",
              marginBottom: 36,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--la-accent, #ff8a1f)" }}>
              The 5 Golden Rules of a High-Yield JEE Timetable
            </h3>
            <ul style={{ paddingLeft: 20, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.8, fontSize: 15 }}>
              <li><strong>Prioritise high-weightage chapters first:</strong> Mechanics, Electrostatics, GOC, Coordination Chemistry, and Calculus.</li>
              <li><strong>Study all 3 subjects daily or in alternating blocks:</strong> Don&apos;t spend 3 weeks solely on Physics while letting Chemistry formula memory fade.</li>
              <li><strong>70% Problem Solving vs 30% Theory:</strong> Rereading notes gives an illusion of competence; solving unassisted PYQs builds exam temperament.</li>
              <li><strong>Maintain an Error Log:</strong> Re-test questions you got wrong within 48 hours and again at 7 days.</li>
              <li><strong>Weekly Full-Length Mock Tests:</strong> Minimum 3 hours testing + 3 hours diagnostic error analysis every Sunday.</li>
            </ul>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 40, marginBottom: 16, color: "var(--la-text)" }}>
            Sample Daily Timetable for JEE Aspirants (Non-School / Weekend Day)
          </h2>

          <div style={{ overflowX: "auto", marginBottom: 32 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "var(--la-surface, #111113)",
                border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "var(--la-surface-2, #17171a)", borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--la-text)" }}>Time Slot</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--la-text)" }}>Activity</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--la-text)" }}>Focus Area</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--la-muted, #a1a1aa)" }}>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>06:30 – 07:00</td>
                  <td style={{ padding: "12px 16px" }}>Morning Routine & Wake-up</td>
                  <td style={{ padding: "12px 16px" }}>Light physical exercise, hydration</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>07:00 – 09:30</td>
                  <td style={{ padding: "12px 16px" }}>Deep Study Block 1: Mathematics</td>
                  <td style={{ padding: "12px 16px" }}>Calculus / Algebra practice & formula retrieval</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>09:30 – 10:30</td>
                  <td style={{ padding: "12px 16px" }}>Breakfast & Short Break</td>
                  <td style={{ padding: "12px 16px" }}>Step away from screens, recharge</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>10:30 – 13:00</td>
                  <td style={{ padding: "12px 16px" }}>Deep Study Block 2: Physics</td>
                  <td style={{ padding: "12px 16px" }}>Mechanics / Electromagnetism numericals</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>13:00 – 14:30</td>
                  <td style={{ padding: "12px 16px" }}>Lunch & Power Nap</td>
                  <td style={{ padding: "12px 16px" }}>Crucial for memory consolidation</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>14:30 – 17:00</td>
                  <td style={{ padding: "12px 16px" }}>Deep Study Block 3: Chemistry</td>
                  <td style={{ padding: "12px 16px" }}>NCERT Organic reaction mechanisms / Inorganic facts</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>17:00 – 18:00</td>
                  <td style={{ padding: "12px 16px" }}>Outdoor Activity / Free time</td>
                  <td style={{ padding: "12px 16px" }}>Exercise, fresh air, mental reset</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>18:00 – 20:00</td>
                  <td style={{ padding: "12px 16px" }}>Timed Mock Quiz / PYQ Practice</td>
                  <td style={{ padding: "12px 16px" }}>Exam simulation, 30 questions in 60 mins</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>20:00 – 21:00</td>
                  <td style={{ padding: "12px 16px" }}>Dinner & Family Time</td>
                  <td style={{ padding: "12px 16px" }}>Unwind completely</td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--la-text)" }}>21:00 – 22:30</td>
                  <td style={{ padding: "12px 16px" }}>Error Analysis & Spaced Revision</td>
                  <td style={{ padding: "12px 16px" }}>Flashcards, reviewing questions missed in tests</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 40, marginBottom: 16, color: "var(--la-text)" }}>
            Frequently Asked Questions
          </h2>
          <FaqAccordion items={FAQ_ITEMS} />

          <div
            style={{
              marginTop: 48,
              background: "var(--la-surface, #111113)",
              border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
              borderRadius: 20,
              padding: "40px 28px",
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "var(--la-text)" }}>
              Build Your Personalized JEE Study Schedule with AI
            </h3>
            <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 15.5, maxWidth: 480, margin: "0 auto 24px" }}>
              Input your target exam year, coaching schedule, and strongest/weakest topics. Learning Allied automatically generates your day-by-day practice schedule and reminds you when concepts need revision.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Create Free JEE Study Plan
              </Link>
              <Link href="/jee-preparation" className="btn btn-secondary btn-lg">
                View JEE Curriculum Breakdown
              </Link>
            </div>
          </div>
        </article>
      </main>

      <PublicFooter />
    </>
  );
}
