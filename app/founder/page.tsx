import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "../../lib/seo";
import { PublicNavbar } from "../../components/PublicNavbar";
import { PublicFooter } from "../../components/PublicFooter";

export const metadata = constructMetadata({
  title: "Prem Jain — Founder of Learning Allied",
  description:
    "Prem Jain is the founder of Learning Allied, an AI study platform built to help students genuinely learn instead of just getting answers.",
  path: "/founder",
  type: "article",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/founder#webpage`,
      url: `${SITE_URL}/founder`,
      name: "Prem Jain — Founder of Learning Allied",
      description:
        "Prem Jain is the founder of Learning Allied, an AI study platform built to help students genuinely learn instead of just getting answers.",
      mainEntity: { "@id": `${SITE_URL}/founder#person` },
      about: { "@id": `${SITE_URL}/founder#person` },
      isPartOf: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function FounderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main id="main">
        <article>
          <section className="page-hero" style={{ padding: "120px 0 64px" }}>
            <div className="wrap">
              <h1
                id="founder-title"
                style={{
                  fontSize: "clamp(34px, 4.5vw, 52px)",
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  marginBottom: 16,
                  color: "var(--la-text)",
                }}
              >
                Prem Jain — Founder of Learning Allied
              </h1>
              <p
                style={{
                  fontSize: 20,
                  color: "var(--la-muted, #a1a1aa)",
                  lineHeight: 1.6,
                  maxWidth: 720,
                  marginBottom: 32,
                }}
              >
                Prem Jain is the founder of Learning Allied, an AI-powered study platform for students preparing for JEE, NEET and Board exams. He is building it so that AI helps students genuinely understand what they study, rather than simply providing answers.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/" className="btn btn-primary btn-lg">
                  Visit Learning Allied
                </Link>
                <Link href="/about" className="btn btn-secondary btn-lg">
                  About Learning Allied
                </Link>
              </div>
            </div>
          </section>

          <section style={{ padding: "40px 0" }}>
            <div className="wrap">
              <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
                Role at Learning Allied
              </h2>
              <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720 }}>
                <p>
                  Prem Jain founded Learning Allied and is actively building the platform. Learning Allied helps students understand concepts, practise effectively, and become more independent learners.
                </p>
              </div>
            </div>
          </section>

          <section style={{ padding: "40px 0" }}>
            <div className="wrap">
              <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
                Why he is building it
              </h2>
              <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720 }}>
                <p style={{ marginBottom: 16 }}>
                  The idea behind Learning Allied is that AI should help students genuinely learn, not just hand them answers.
                </p>
                <p>
                  The product reflects that. The tutor asks questions before it explains, practice is built around active recall, and progress tracking shows which topics are strong and which need review.
                </p>
              </div>
            </div>
          </section>

          <section style={{ padding: "40px 0 80px" }}>
            <div className="wrap">
              <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 14, color: "var(--la-text)" }}>
                Biography
              </h2>
              <div style={{ color: "var(--la-muted, #a1a1aa)", fontSize: 16.5, lineHeight: 1.7, maxWidth: 720 }}>
                <p style={{ marginBottom: 16 }}>
                  Prem Jain is a student entrepreneur and the founder of Learning Allied. He is building the platform to help students understand what they study and learn more independently.
                </p>
                <p>
                  Read more about the platform on the{" "}
                  <Link href="/about" style={{ color: "var(--la-accent, #ff8a1f)" }}>
                    About Learning Allied
                  </Link>{" "}
                  page, or{" "}
                  <Link href="/signup" style={{ color: "var(--la-accent, #ff8a1f)" }}>
                    try it for free
                  </Link>.
                </p>
              </div>
            </div>
          </section>
        </article>
      </main>

      <PublicFooter />
    </>
  );
}
