import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "About Learning Allied | Founded by Prem Jain",
  description:
    "Learn about Learning Allied, an AI study partner founded by Prem Jain to help students understand concepts, practise effectively and learn independently.",
  path: "/about",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "AboutPage",
      "@id": `${SITE_URL}/about#webpage`,
      url: `${SITE_URL}/about`,
      name: "About Learning Allied | Founded by Prem Jain",
      description:
        "Learn about Learning Allied, an AI study partner founded by Prem Jain to help students understand concepts, practise effectively and learn independently.",
      about: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main">
        <section className="page-hero" style={{ padding: "120px 0 64px" }}>
          <div className="wrap">
            <h1
              id="about-heading"
              style={{
                fontSize: "clamp(34px, 4.5vw, 52px)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                marginBottom: 16,
                color: "var(--la-text)",
              }}
            >
              About Learning Allied
            </h1>
            <p
              style={{
                fontSize: 20,
                color: "var(--la-muted, #a1a1aa)",
                lineHeight: 1.6,
                maxWidth: 680,
                marginBottom: 16,
              }}
            >
              AI-powered learning designed to help students understand concepts, practise effectively, and become more independent learners.
            </p>
            <p style={{ fontSize: 15, color: "var(--la-faint, #71717a)", marginBottom: 32 }}>
              Founded by{" "}
              <Link href="/founder" style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 600 }}>
                Prem Jain
              </Link>
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start learning free
              </Link>
              <Link href="/founder" className="btn btn-secondary btn-lg">
                Meet the founder
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "48px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>
              Our mission
            </h2>
            <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720, marginBottom: 36 }}>
              <p style={{ marginBottom: 16 }}>
                Learning Allied aims to help students understand what they study, instead of relying only on memorisation.
              </p>
              <p>
                Memorised answers tend to fall apart when a question is asked in a new way. So the focus is on the understanding underneath: explaining concepts, giving students practice that makes them think, and showing where their understanding has gaps.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Concept explanations</h3>
                <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 14.5, lineHeight: 1.6 }}>
                  The tutor asks what you think before it explains, so you work towards an idea yourself instead of only reading an answer.
                </p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Practice & Recall</h3>
                <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 14.5, lineHeight: 1.6 }}>
                  Quizzes and active recall questions make you bring answers out of memory, which strengthens learning more than rereading.
                </p>
              </div>
              <div style={{ background: "var(--la-surface, #111113)", border: "1px solid var(--la-line, rgba(255,255,255,0.09))", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "var(--la-text)" }}>Identifying gaps</h3>
                <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 14.5, lineHeight: 1.6 }}>
                  Memory strength and confidence tracking show which topics are solid and which are fading, so you know what to revise next.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "48px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>
              Meet Prem Jain, Founder of Learning Allied
            </h2>
            <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720 }}>
              <p style={{ marginBottom: 16 }}>
                <strong>Prem Jain</strong> is a student entrepreneur building Learning Allied around one idea: AI should help students genuinely learn, rather than simply provide answers.
              </p>
              <p style={{ marginBottom: 20 }}>
                That idea shapes the product. The tutor asks questions, practice is built around recall, and progress is shown plainly so students can take charge of their own learning.
              </p>
              <Link href="/founder" style={{ color: "var(--la-accent, #ff8a1f)", fontWeight: 600 }}>
                Read the founder profile →
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "48px 0" }}>
          <div className="wrap">
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, color: "var(--la-text)" }}>
              Our vision
            </h2>
            <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720 }}>
              <p style={{ marginBottom: 16 }}>
                We want effective, understandable AI-assisted learning to be accessible to students, so more of them can learn with confidence and become independent learners.
              </p>
              <p>
                Learning Allied currently supports students preparing for JEE, NEET and Board exams.
              </p>
            </div>
          </div>
        </section>

        <section style={{ padding: "40px 0 80px" }}>
          <div className="wrap">
            <div
              style={{
                background: "var(--la-surface, #111113)",
                border: "1px solid var(--la-line-strong, rgba(255,255,255,0.16))",
                borderRadius: 24,
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: "var(--la-text)" }}>
                Try Learning Allied
              </h2>
              <p style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16, maxWidth: 440, margin: "0 auto 24px" }}>
                Create a free account and ask your first question in under a minute.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start learning free
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg">
                  Log in
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
