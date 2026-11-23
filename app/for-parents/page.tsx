import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "For Parents: Safe, Supervised, and Socratic Learning AI",
  description:
    "Discover how Learning Allied empowers parents with academic integrity, child-safe AI, transparent mastery tracking, and zero answers-for-free cheating shortcuts.",
  path: "/for-parents",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.softwareApplication,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/for-parents#webpage`,
      url: `${SITE_URL}/for-parents`,
      name: "For Parents: Safe, Supervised, and Socratic Learning AI",
      description:
        "Information for parents regarding Learning Allied's safety standards, pedagogical principles, and privacy protections.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const PARENT_PILLARS = [
  {
    icon: "🛡️",
    title: "Anti-Cheating & Socratic Integrity",
    subtitle: "We never give direct answers to homework",
    desc: "Unlike standard chatbots that encourage academic dishonesty by writing out answers and essays instantly, Learning Allied uses strict Socratic scaffolding. It guides your child with leading questions, tests foundational concepts, and requires the student to do the actual problem solving.",
  },
  {
    icon: "🔒",
    title: "Child Privacy by Design",
    subtitle: "COPPA, UK AADC, and Global Compliance",
    desc: "We never display advertisements, sell student personal data to third parties, or use your child's queries to train public AI models. All data is strictly protected, encrypted at rest and in transit, and subject to parental oversight.",
  },
  {
    icon: "📊",
    title: "Real Mastery, Not False Confidence",
    subtitle: "Evidence-based spaced retrieval",
    desc: "Reading solutions creates an illusion of competence. Learning Allied tests active retrieval across concepts, tracking true retention curves so students enter school exams and high-stakes tests with genuine mastery.",
  },
  {
    icon: "🌍",
    title: "15 Global Curricula Supported",
    subtitle: "Authentic standards and terminology",
    desc: "Whether your child is studying CBSE in India, AP Calculus in the United States, GCSEs in the UK, Ontario curriculum in Canada, or NCEA in New Zealand, our AI adheres to official curriculum standards and authentic regional conventions.",
  },
];

export default function ForParentsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />

      <main className="how-it-works-page">
        {/* Hero */}
        <section className="ui-section how-hero">
          <div className="wrap">
            <div className="how-hero-content text-center" style={{ maxWidth: "800px", margin: "0 auto" }}>
              <span className="how-badge">Parent Trust &amp; Safety</span>
              <h1 className="how-title" style={{ fontSize: "2.75rem", lineHeight: "1.2", margin: "16px 0 20px" }}>
                An AI Tutor You Can Trust with Your Child&apos;s Education
              </h1>
              <p className="how-subtitle" style={{ fontSize: "1.15rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                Built from the ground up for academic rigor, safety, and honest learning.
                Learning Allied never does homework for students — it teaches them how to think for themselves.
              </p>
              <div style={{ marginTop: "28px", display: "flex", gap: "12px", justifyContent: "center" }}>
                <Link href="/child-privacy" className="btn btn-secondary">
                  Read Child Privacy Policy
                </Link>
                <Link href="/how-our-ai-works" className="btn btn-primary">
                  How Our AI Works
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="ui-section" style={{ padding: "40px 0 60px" }}>
          <div className="wrap">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "24px",
              }}
            >
              {PARENT_PILLARS.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "28px",
                    borderRadius: "16px",
                    background: "var(--bg-card, #0A0A0A)",
                    border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>{p.icon}</div>
                  <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px", color: "var(--text-primary, #FFF)" }}>
                    {p.title}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--accent, #3b82f6)", fontWeight: 600, marginBottom: "12px" }}>
                    {p.subtitle}
                  </div>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.55", margin: 0 }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supervision & Peace of Mind */}
        <section className="ui-section" style={{ background: "var(--bg-elevated, rgba(255, 255, 255, 0.02))", padding: "60px 0" }}>
          <div className="wrap" style={{ maxWidth: "800px" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "20px", color: "var(--text-primary, #FFF)" }}>
              Parent Control &amp; Self-Serve Assurance
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.65" }}>
              <p>
                We believe parents deserve complete clarity regarding what their children are using online.
                Learning Allied adheres to four core guarantees:
              </p>
              <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <li>
                  <strong style={{ color: "var(--text-primary, #FFF)" }}>Transparent Socratic Logs:</strong> Every question the AI asks is focused on eliciting the student&apos;s own thought process. Parents can review learning history at any time.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary, #FFF)" }}>No Commercial Dark Patterns:</strong> No predatory in-app purchases, loot boxes, or gamified addiction mechanics designed to keep students glued to the screen.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary, #FFF)" }}>Self-Serve One-Click Cancellation:</strong> All premium plans can be cancelled instantly with zero hurdles, retention traps, or cancellation phone calls.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary, #FFF)" }}>14-Day Money-Back Guarantee:</strong> Try Learning Allied risk-free. If it does not dramatically improve your child&apos;s study confidence, receive a full refund.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ui-section seo-cta-wrap">
          <div className="wrap">
            <div className="seo-cta-box">
              <div className="seo-cta-badge">Empower Your Learner</div>
              <h2 className="seo-cta-heading">
                Give Your Child a 24/7 Personal Socratic AI Mentor
              </h2>
              <p className="seo-cta-text">
                Free to start. No credit card required during Early Access.
              </p>
              <div className="seo-cta-buttons">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Get Started Free
                </Link>
                <Link href="/child-privacy" className="btn btn-secondary btn-lg">
                  Review Privacy Standards
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
