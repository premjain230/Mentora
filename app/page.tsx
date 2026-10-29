import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../lib/seo";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";
import { FaqAccordion } from "../components/FaqAccordion";

export const metadata = constructMetadata({
  title: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
  description:
    "Learning Allied is an AI study partner for Indian students preparing for JEE, NEET and Board exams. AI tutor, spaced review, active recall, chapter-wise practice quizzes and personalized study plans.",
  path: "/",
});

const FAQ_ITEMS = [
  {
    q: "Is Learning Allied free to start?",
    a: "Yes. You can start chatting, build a study plan and join the community at no cost. No card is needed to begin.",
  },
  {
    q: "Does it replace my teacher?",
    a: "No. Think of it as a study partner that's available between classes. Always check important facts against your textbooks and coursework.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. It works in any modern browser on desktop or mobile, and there is an Android app you can download directly.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    SHARED_JSONLD_GRAPH.website,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: "Learning Allied — AI Study Partner for JEE, NEET & Board Exams",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ_ITEMS.map((item) => ({
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

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main">
        {/* Hero Section */}
        <section className="hero" aria-labelledby="hero-heading" style={{ padding: "120px 0 72px" }}>
          <div className="wrap hero-grid">
            <div>
              <h1
                id="hero-heading"
                style={{
                  fontSize: "clamp(38px, 5vw, 60px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.035em",
                  fontWeight: 800,
                  marginBottom: 22,
                  color: "var(--la-text)",
                }}
              >
                Study less time. Remember more of it.
              </h1>
              <p
                style={{
                  fontSize: 18,
                  color: "var(--la-muted, #a1a1aa)",
                  lineHeight: 1.6,
                  maxWidth: 480,
                  marginBottom: 32,
                }}
              >
                Learning Allied is an AI study partner for JEE, NEET and Board exam students. It asks you questions, schedules your revision, and shows you what you&apos;re about to forget.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start learning free
                </Link>
                <a href="#features" className="btn btn-secondary btn-lg">
                  See how it works
                </a>
              </div>
              <p style={{ marginTop: 18, fontSize: 13, color: "var(--la-faint, #71717a)" }}>
                Free to start. Also available on{" "}
                <a
                  href="https://github.com/premjain230/Mentora/releases/download/v1.1.0/learningallied.apk"
                  style={{ color: "var(--la-accent, #ff8a1f)", textDecoration: "underline" }}
                >
                  Android
                </a>.
              </p>
            </div>

            {/* Interactive Preview Mockup */}
            <div
              className="app"
              style={{
                background: "var(--la-surface, #111113)",
                border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 30px 60px -30px rgba(0,0,0,0.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--la-line, rgba(255,255,255,0.09))",
                  fontSize: 13,
                  color: "var(--la-faint, #71717a)",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--la-line-strong, #333)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--la-line-strong, #333)" }} />
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--la-line-strong, #333)" }} />
                </div>
                <span>Live Study Session Preview</span>
                <span />
              </div>

              <div className="app-preview-grid">
                <div style={{ padding: 18 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--la-muted, #a1a1aa)", marginBottom: 14, textTransform: "uppercase" }}>
                    AI Socratic Tutor
                  </h3>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      padding: "10px 12px",
                      borderRadius: 12,
                      marginBottom: 10,
                      background: "rgba(255, 138, 31, 0.12)",
                      borderBottomRightRadius: 4,
                      marginLeft: "auto",
                      maxWidth: "92%",
                    }}
                  >
                    Why does a heavier object not fall faster in a vacuum?
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                      padding: "10px 12px",
                      borderRadius: 12,
                      marginBottom: 10,
                      background: "var(--la-surface-2, #17171a)",
                      borderBottomLeftRadius: 4,
                    }}
                  >
                    Good question! Before I explain: what force pulls on each object, and what role does mass play in Newton&apos;s second law (F = ma)?
                  </div>
                </div>

                <div className="app-preview-right">
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--la-muted, #a1a1aa)", marginBottom: 14, textTransform: "uppercase" }}>
                    Memory Retention
                  </h3>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span>Newton&apos;s Laws</span>
                      <span style={{ color: "#4ade80" }}>88% Strong</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "var(--la-surface-2, #17171a)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "88%", background: "#4ade80", borderRadius: 99 }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span>Rotational Dynamics</span>
                      <span style={{ color: "#fbbf24" }}>46% Review</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "var(--la-surface-2, #17171a)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "46%", background: "#fbbf24", borderRadius: 99 }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span>Thermodynamics</span>
                      <span style={{ color: "#4ade80" }}>75% Strong</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: "var(--la-surface-2, #17171a)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "75%", background: "#4ade80", borderRadius: 99 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: "80px 0" }}>
          <div className="wrap">
            <div style={{ maxWidth: 640, marginBottom: 48 }}>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 14, color: "var(--la-text)" }}>
                Built around how memory actually works
              </h2>
              <p style={{ fontSize: 17, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.6 }}>
                Reading a chapter again feels productive, but it&apos;s a weak way to learn. Learning Allied uses methods with decades of cognitive neuroscience research behind them.
              </p>
            </div>

            <div style={{ borderTop: "1px solid var(--la-line, rgba(255,255,255,0.09))" }}>
              {[
                { title: "Socratic tutor", desc: "The tutor asks what you think before it explains. Working out an answer yourself helps it stick.", note: "Generation effect, Slamecka & Graf, 1978" },
                { title: "Spaced review", desc: "Revision is scheduled for just before you'd forget a topic, so you review less often and retain far more.", note: "Forgetting curve, Ebbinghaus, 1885" },
                { title: "Active recall", desc: "Quizzes and questions make you pull answers from memory, which strengthens neural pathways more than rereading.", note: "Retrieval practice, Roediger & Butler, 2011" },
                { title: "Memory strength", desc: "See exactly how well you remember each concept and which ones are fading, so you know what to revise today.", note: "Decay models & Leitner intervals" },
                { title: "Confidence calibration", desc: "Compare how confident you felt with your actual score. Closing this gap helps you focus on genuine blind spots.", note: "Metacognition calibration, Flavell, 1979" },
                { title: "Prerequisites first", desc: "Concepts are mapped into a dependency graph so you never build advanced topics on shaky foundations.", note: "Curriculum knowledge graph" },
              ].map((feat, idx) => (
                <div key={idx} className="feature-row">
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--la-text)" }}>{feat.title}</h3>
                  <div>
                    <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 15.5, lineHeight: 1.6, maxWidth: 640 }}>{feat.desc}</p>
                    <small style={{ display: "block", marginTop: 8, fontSize: 12.5, color: "var(--la-faint, #71717a)" }}>{feat.note}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exam Specific Sections */}
        <section id="exams" style={{ padding: "64px 0" }}>
          <div className="wrap">
            <div style={{ maxWidth: 640, marginBottom: 40 }}>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 14, color: "var(--la-text)" }}>
                Made for Indian exam preparation
              </h2>
              <p style={{ fontSize: 17, color: "var(--la-muted, #a1a1aa)" }}>
                Plan your syllabus, practise chapter-wise with quizzes, and master difficult formulas for JEE, NEET and Board exams.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
              {[
                { title: "JEE Main & Advanced", href: "/jee-preparation", desc: "Physics, Chemistry and Mathematics structured for high percentile targets." },
                { title: "NEET UG Medical", href: "/neet-preparation", desc: "High-yield NCERT Biology, Organic Chemistry, and numerical Physics mastery." },
                { title: "CBSE Class 9–12", href: "/cbse-board", desc: "NCERT-aligned curriculum for science, mathematics and board examinations." },
                { title: "Maharashtra State Board", href: "/maharashtra-board", desc: "Complete textbook syllabus coverage for SSC and HSC state board students." },
              ].map((exam, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--la-surface, #111113)",
                    border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
                    borderRadius: 16,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>{exam.title}</h3>
                    <p style={{ fontSize: 14, color: "var(--la-muted, #a1a1aa)", lineHeight: 1.5, marginBottom: 20 }}>{exam.desc}</p>
                  </div>
                  <Link
                    href={exam.href}
                    style={{
                      color: "var(--la-accent, #ff8a1f)",
                      fontSize: 14,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    View preparation guide →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder Card */}
        <section id="about" style={{ padding: "64px 0" }}>
          <div className="wrap">
            <div
              style={{
                background: "var(--la-surface, #111113)",
                border: "1px solid var(--la-line, rgba(255,255,255,0.09))",
                borderRadius: 20,
                padding: "40px 32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 24,
              }}
            >
              <div style={{ maxWidth: 560 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>
                  Who&apos;s behind Learning Allied
                </h2>
                <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 15.5, lineHeight: 1.6 }}>
                  Learning Allied is created and maintained by Prem Jain. Built specifically to eliminate brute-force memorization and give every student an affordable personal AI tutor.
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/about" className="btn btn-primary">
                  About Learning Allied
                </Link>
                <Link href="/founder" className="btn btn-secondary">
                  Meet the Founder
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" style={{ padding: "64px 0" }}>
          <div className="wrap">
            <div style={{ maxWidth: 640, marginBottom: 32 }}>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, color: "var(--la-text)", marginBottom: 12 }}>
                Questions, answered plainly
              </h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16 }}>
                Everything you need to know about getting started with Learning Allied.
              </p>
            </div>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* Call to action */}
        <section style={{ padding: "40px 0 80px" }}>
          <div className="wrap">
            <div
              style={{
                background: "var(--la-surface, #111113)",
                border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                borderRadius: 24,
                padding: "64px 32px",
                textAlign: "center",
              }}
            >
              <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 14, color: "var(--la-text)" }}>
                Start your first study session
              </h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 17, maxWidth: 460, margin: "0 auto 28px" }}>
                Create a free account and ask your first question in under a minute.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get started free
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Student Login
                </Link>
                <a
                  href="https://github.com/premjain230/Mentora/releases/download/v1.1.0/learningallied.apk"
                  className="btn btn-secondary btn-lg"
                >
                  Download APK
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}