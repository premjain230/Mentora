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

const SCHEDULE_ROWS = [
  { time: "06:30 – 07:00", activity: "Morning Routine & Wake-up", focus: "Light physical exercise, hydration" },
  { time: "07:00 – 09:30", activity: "Deep Study Block 1: Mathematics", focus: "Calculus / Algebra practice & formula retrieval" },
  { time: "09:30 – 10:30", activity: "Breakfast & Short Break", focus: "Step away from screens, recharge" },
  { time: "10:30 – 13:00", activity: "Deep Study Block 2: Physics", focus: "Mechanics / Electromagnetism numericals" },
  { time: "13:00 – 14:30", activity: "Lunch & Rest", focus: "Crucial for cognitive memory consolidation" },
  { time: "14:30 – 17:00", activity: "Deep Study Block 3: Chemistry", focus: "NCERT Organic mechanisms / Inorganic trends" },
  { time: "17:00 – 18:00", activity: "Outdoor Break", focus: "Exercise, fresh air, mental reset" },
  { time: "18:00 – 20:00", activity: "Timed Mock Quiz / PYQ Practice", focus: "Exam simulation, 30 questions in 60 mins" },
  { time: "20:00 – 21:00", activity: "Dinner & Family Time", focus: "Unwind completely" },
  { time: "21:00 – 22:30", activity: "Error Analysis & Spaced Revision", focus: "Review questions missed in tests, flashcards" },
];

export default function JeeStudyPlanBlogPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main" className="editorial-page">
        <article className="blog-article">
          <nav aria-label="Breadcrumb" className="blog-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/jee-preparation">JEE Preparation</Link>
            <span aria-hidden="true">/</span>
            <span>Study Plan Guide</span>
          </nav>

          <span className="hero-badge">
            <b>Guide</b>
            JEE Main &amp; Advanced Preparation
          </span>

          <h1 className="ui-display blog-title">
            JEE Study Plan: How to Make One (with a Timetable)
          </h1>

          <div className="blog-meta-bar">
            <div className="blog-author-avatar" aria-hidden="true">
              LA
            </div>
            <div>
              <strong>Learning Allied Academic Team</strong> · Published August 13, 2026 · 12 min read
            </div>
          </div>

          <p className="blog-lead">
            A high JEE percentile is rarely the result of studying 16 hours a day. It comes from having a structured, realistic study plan that balances new concept coverage, daily problem practice, and spaced revision before memory decays.
          </p>

          <div className="blog-rule-box">
            <h3>The 5 Golden Rules of a High-Yield JEE Timetable</h3>
            <ul>
              <li><strong>Prioritise high-weightage chapters first:</strong> Mechanics, Electrostatics, GOC, Coordination Chemistry, and Calculus.</li>
              <li><strong>Study all 3 subjects daily or in alternating blocks:</strong> Don&apos;t spend 3 weeks solely on Physics while letting Chemistry formula memory fade.</li>
              <li><strong>70% Problem Solving vs 30% Theory:</strong> Rereading notes gives an illusion of competence; solving unassisted PYQs builds exam temperament.</li>
              <li><strong>Maintain an Error Log:</strong> Re-test questions you got wrong within 48 hours and again at 7 days.</li>
              <li><strong>Weekly Full-Length Mock Tests:</strong> Minimum 3 hours testing + 3 hours diagnostic error analysis every Sunday.</li>
            </ul>
          </div>

          <h2 className="blog-h2">
            Sample Daily Timetable for JEE Aspirants (Non-School / Weekend Day)
          </h2>

          <div className="blog-table-container">
            <table className="blog-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Activity</th>
                  <th>Focus Area</th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE_ROWS.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.time}</strong></td>
                    <td>{row.activity}</td>
                    <td>{row.focus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="blog-h2">Frequently Asked Questions</h2>
          <FaqAccordion items={FAQ_ITEMS} />

          <div className="ui-panel home-cta" style={{ marginTop: 48 }}>
            <h2>Build Your Personalised JEE Study Schedule with AI</h2>
            <p>
              Input your target exam year, coaching schedule, and strongest/weakest topics. Learning Allied automatically generates your day-by-day practice schedule and reminds you when concepts need revision.
            </p>
            <div className="hero-actions">
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
