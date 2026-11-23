import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "How Our AI Works: Global Socratic Architecture & Resilient Multi-Model Failover",
  description:
    "An architectural deep-dive into Learning Allied's AI tutoring engine: Gemini-to-Groq fallback, regional syllabus grounding across 15 countries, and Socratic anti-cheating scaffolding.",
  path: "/how-our-ai-works",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.softwareApplication,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/how-our-ai-works#webpage`,
      url: `${SITE_URL}/how-our-ai-works`,
      name: "How Our AI Works: Global Socratic Architecture & Resilient Multi-Model Failover",
      description:
        "Comprehensive architectural explanation of Learning Allied's dual-engine AI tutoring system and regional grounding.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const ARCH_FEATURES = [
  {
    num: "01",
    title: "Dual-Engine Multi-Provider Architecture",
    badge: "99.99% Availability",
    desc: "Learning Allied uses Google Gemini 2.5 Flash as its primary cognitive engine for rich pedagogical reasoning, multimodal diagram interpretation, and step-by-step Socratic scaffolding. When rate limits, network timeouts, or upstream outages occur, the system automatically falls back to Groq LLaMA 3.3 70B Versatile within milliseconds with zero lost context.",
  },
  {
    num: "02",
    title: "Authentic Regional Grounding",
    badge: "15 Countries Supported",
    desc: "Every AI tutoring turn dynamically injects the student's authentic national framework, regional conventions, and math terminology. Students in the US receive PEMDAS and US customary units where relevant; students in the UK and Australia receive BIDMAS, metric units, and British English; students in India receive BODMAS, NCERT/State Board alignments, and Lakh/Crore numbering conventions.",
  },
  {
    num: "03",
    title: "Strict Syllabus Scope Guardrails",
    badge: "Anti-Hallucination",
    desc: "Generic AI chatbots frequently answer high-school questions with graduate-level methods (e.g., solving basic kinematics using Lagrangian mechanics or multivariable calculus). Learning Allied constrains the tutor's conceptual scope strictly to the active qualification level (e.g., GCSE, AP, CBSE Class 10, or Leaving Cert).",
  },
  {
    num: "04",
    title: "Socratic Anti-Answer Protocol",
    badge: "Pedagogical Integrity",
    desc: "Direct answers deprive students of the cognitive struggle necessary to encode concepts into long-term memory. The AI decomposes complex problems into small, intuitive prompts, celebrates student breakthroughs, and guides learners to discover principles from first principles.",
  },
];

export default function HowOurAiWorksPage() {
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
              <span className="how-badge">AI Architecture</span>
              <h1 className="how-title" style={{ fontSize: "2.75rem", lineHeight: "1.2", margin: "16px 0 20px" }}>
                Inside the Personal AI Learning OS
              </h1>
              <p className="how-subtitle" style={{ fontSize: "1.15rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                Built on high-availability dual-provider AI, verified international curricula, and cognitive learning science.
              </p>
            </div>
          </div>
        </section>

        {/* System Architecture */}
        <section className="ui-section" style={{ padding: "40px 0 60px" }}>
          <div className="wrap" style={{ maxWidth: "860px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {ARCH_FEATURES.map((feat, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "32px",
                    borderRadius: "16px",
                    background: "var(--bg-card, #0A0A0A)",
                    border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent, #3b82f6)" }}>
                      PILLAR {feat.num}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "rgba(59, 130, 246, 0.1)",
                        color: "var(--accent, #3b82f6)",
                        fontWeight: 600,
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary, #FFF)", margin: "0 0 12px" }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: "0.98rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6", margin: 0 }}>
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Pipeline Diagram */}
            <div
              style={{
                marginTop: "48px",
                padding: "32px",
                borderRadius: "16px",
                background: "var(--bg-elevated, rgba(255, 255, 255, 0.02))",
                border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                textAlign: "center",
              }}
            >
              <h4 style={{ fontSize: "1.2rem", color: "var(--text-primary, #FFF)", marginBottom: "16px" }}>
                Request Lifecycle &amp; Fallback Resiliency
              </h4>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary, #A3A3A3)",
                }}
              >
                <div style={{ padding: "10px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }}>
                  1. Student Input
                </div>
                <span>→</span>
                <div style={{ padding: "10px 16px", borderRadius: "8px", background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                  2. Regional Taxonomy Injection
                </div>
                <span>→</span>
                <div style={{ padding: "10px 16px", borderRadius: "8px", background: "rgba(16,185,129,0.1)", color: "#34d399" }}>
                  3. Gemini 2.5 Flash
                </div>
                <span>⚡ (Auto-Failover) →</span>
                <div style={{ padding: "10px 16px", borderRadius: "8px", background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>
                  4. Groq LLaMA 3.3 70B
                </div>
                <span>→</span>
                <div style={{ padding: "10px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }}>
                  5. Socratic Response
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="ui-section seo-cta-wrap">
          <div className="wrap">
            <div className="seo-cta-box">
              <div className="seo-cta-badge">Experience Socratic AI</div>
              <h2 className="seo-cta-heading">
                Try Learning Allied in Your Native Curriculum
              </h2>
              <p className="seo-cta-text">
                Explore subjects across 15 countries with zero lock-in.
              </p>
              <div className="seo-cta-buttons">
                <Link href="/learning-hub" className="btn btn-primary btn-lg">
                  Explore Learning Hub
                </Link>
                <Link href="/for-parents" className="btn btn-secondary btn-lg">
                  Parent Information
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
