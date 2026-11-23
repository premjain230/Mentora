import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "Child Privacy Policy & Global Minor Protection Standards",
  description:
    "Learning Allied's dedicated Child Privacy Policy. We comply with COPPA, UK AADC, GDPR-K, PIPEDA, and the DPDP Act. We never sell data, serve ads, or train external AI on student data.",
  path: "/child-privacy",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.softwareApplication,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/child-privacy#webpage`,
      url: `${SITE_URL}/child-privacy`,
      name: "Child Privacy Policy & Global Minor Protection Standards",
      description:
        "Learning Allied's comprehensive policies regarding student data protection and global minor privacy regulations.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const REGULATIONS = [
  {
    jurisdiction: "United States",
    name: "COPPA (Children's Online Privacy Protection Act)",
    desc: "We require verified parental consent for operators collecting data from children under 13. We do not condition a child's participation on disclosing more personal information than reasonably necessary.",
  },
  {
    jurisdiction: "United Kingdom",
    name: "UK Age Appropriate Design Code (Children's Code)",
    desc: "Designed with the best interests of the child as a primary consideration. High privacy settings by default, no nudge techniques or intrusive profiling.",
  },
  {
    jurisdiction: "European Union & Ireland",
    name: "GDPR (Article 8 — Child Consent)",
    desc: "Honors the age of digital consent (13–16 depending on member state). Provides parents and minors the right of erasure, access, and data portability.",
  },
  {
    jurisdiction: "India",
    name: "Digital Personal Data Protection Act (DPDP Act)",
    desc: "Requires verifiable parental consent prior to processing any personal data belonging to children under 18. Strictly prohibits targeted advertising or behavioral tracking of children.",
  },
  {
    jurisdiction: "Canada",
    name: "PIPEDA & Provincial Privacy Legislation",
    desc: "Strict principles of meaningful consent, limited collection, and purpose limitation for minors in all Canadian provinces.",
  },
  {
    jurisdiction: "Australia",
    name: "Australian Privacy Principles (Privacy Act 1988)",
    desc: "Safeguards sensitive information with child-focused clarity and direct parental redress channels.",
  },
];

export default function ChildPrivacyPage() {
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
              <span className="how-badge">Student Protection</span>
              <h1 className="how-title" style={{ fontSize: "2.75rem", lineHeight: "1.2", margin: "16px 0 20px" }}>
                Child &amp; Student Privacy Commitment
              </h1>
              <p className="how-subtitle" style={{ fontSize: "1.15rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                Education requires safety, trust, and total data integrity. Here is exactly how we protect children and minors across all 15 countries we serve.
              </p>
            </div>
          </div>
        </section>

        {/* Core Principles */}
        <section className="ui-section" style={{ padding: "40px 0 60px" }}>
          <div className="wrap" style={{ maxWidth: "860px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <div
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  background: "var(--bg-card, #0A0A0A)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                }}
              >
                <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary, #FFF)", marginBottom: "12px" }}>
                  1. Zero Advertising, Zero Data Brokers
                </h3>
                <p style={{ color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                  Learning Allied is an ad-free educational platform. We do not sell, rent, license, or monetize student personal information, learning records, or quiz interactions to third-party advertisers, data aggregators, or marketing networks.
                </p>
              </div>

              <div
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  background: "var(--bg-card, #0A0A0A)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                }}
              >
                <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary, #FFF)", marginBottom: "12px" }}>
                  2. No AI Training on Student Submissions
                </h3>
                <p style={{ color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                  Student conversations, homework questions, practice responses, and voice inputs are used exclusively in real-time to facilitate Socratic tutoring. They are never ingested into foundation model training corpora by Google Gemini, Groq, or external third parties.
                </p>
              </div>

              <div
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  background: "var(--bg-card, #0A0A0A)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                }}
              >
                <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary, #FFF)", marginBottom: "12px" }}>
                  3. Minimal Data Collection &amp; Encryption
                </h3>
                <p style={{ color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                  We collect only the minimum information necessary to maintain account identity and learning state (email address, display name, selected curriculum, and concept mastery scores). All communications and database records are encrypted with AES-256 at rest and TLS 1.3 in transit.
                </p>
              </div>

              <div
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  background: "var(--bg-card, #0A0A0A)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                }}
              >
                <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary, #FFF)", marginBottom: "12px" }}>
                  4. Parental Rights &amp; Immediate Data Deletion
                </h3>
                <p style={{ color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                  Parents and legal guardians have the unequivocal right to review personal data collected from their children, request that we delete such data, and refuse further collection. You can delete your account and associated data immediately in Settings or by emailing <a href="mailto:privacy@learningallied.com" style={{ color: "var(--accent, #3b82f6)" }}>privacy@learningallied.com</a>.
                </p>
              </div>
            </div>

            {/* Global Legal Compliance */}
            <div style={{ marginTop: "60px" }}>
              <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary, #FFF)", marginBottom: "24px" }}>
                Jurisdictional Standards
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
                {REGULATIONS.map((reg, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "20px",
                      borderRadius: "12px",
                      background: "var(--bg-elevated, rgba(255, 255, 255, 0.03))",
                      border: "1px solid var(--border, rgba(255, 255, 255, 0.06))",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", color: "var(--accent, #3b82f6)", fontWeight: 700, textTransform: "uppercase" }}>
                      {reg.jurisdiction}
                    </div>
                    <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary, #FFF)", margin: "6px 0 8px" }}>
                      {reg.name}
                    </h4>
                    <p style={{ fontSize: "0.88rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.5", margin: 0 }}>
                      {reg.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="ui-section" style={{ background: "var(--bg-elevated, rgba(255, 255, 255, 0.02))", padding: "40px 0 60px" }}>
          <div className="wrap text-center" style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h3 style={{ fontSize: "1.5rem", color: "var(--text-primary, #FFF)", marginBottom: "12px" }}>
              Questions from Parents or Educators?
            </h3>
            <p style={{ color: "var(--text-secondary, #A3A3A3)", marginBottom: "20px" }}>
              Our dedicated Data Protection and Child Safety Officer is available to assist you.
            </p>
            <a href="mailto:privacy@learningallied.com" className="btn btn-secondary">
              Contact privacy@learningallied.com
            </a>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
