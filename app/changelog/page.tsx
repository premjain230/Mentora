import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "Learning Allied Changelog: New Features, Upgrades & Syllabus Updates",
  description:
    "Follow the latest updates, AI model upgrades, new syllabus chapters, and feature releases from the Learning Allied engineering team.",
  path: "/changelog",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/changelog#webpage`,
      url: `${SITE_URL}/changelog`,
      name: "Learning Allied Changelog",
      description: "Public release history and engineering log of Learning Allied.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const RELEASES = [
  {
    version: "v1.4.0",
    date: "November 2026",
    title: "Global Socratic AI Upgrade & GEO Discoverability Engine",
    highlights: [
      "Upgraded Socratic guidance engine: enhanced mathematical multi-step scaffolding for JEE Advanced numericals.",
      "Expanded Maharashtra State Board syllabus: added comprehensive Balbharati exercise mappings for SSC Class 10 and HSC Science Class 12.",
      "Launched full GEO (Generative Engine Optimization) standard support: added /llms.txt and /llms-full.txt machine-readable manifests.",
      "Automated IndexNow protocol integration for instant Bing/Yandex search index synchronization.",
      "Enhanced Core Web Vitals and SSR pre-rendering performance across all public learning hubs.",
    ],
  },
  {
    version: "v1.3.0",
    date: "October 2026",
    title: "NCERT Biology Active Recall & Next.js App Router Migration",
    highlights: [
      "Completed migration to Next.js 14 App Router for sub-100ms client route transitions.",
      "Launched NCERT line-by-line active recall engine for NEET UG medical aspirants.",
      "Integrated Ebbinghaus spaced retention decay algorithm directly into the student study dashboard.",
      "Added high-resolution dark/light theme persistence and accessible color tokens.",
    ],
  },
  {
    version: "v1.2.0",
    date: "September 2026",
    title: "Prerequisite Knowledge Graph & Diagnostic Remediator",
    highlights: [
      "Introduced multi-concept dependency trees mapping 1,200+ prerequisite links between Class 9–11 foundations and Class 12 exam chapters.",
      "Implemented automated misconception diagnosis for Organic Chemistry reaction pathways.",
      "Introduced CBSE Board 3-mark and 5-mark step-by-step marking rubrics.",
    ],
  },
  {
    version: "v1.1.0",
    date: "August 2026",
    title: "Official Android APK & Gemini Live Voice Mode",
    highlights: [
      "Released official Learning Allied Android APK (v1.1.0) on GitHub for mobile study on phones and tablets.",
      "Integrated ultra-low latency voice mode powered by Gemini Live for conversational Socratic tutoring.",
      "Enhanced offline support for practice quiz reviews.",
    ],
  },
  {
    version: "v1.0.0",
    date: "July 2026",
    title: "Initial Public Launch of Learning Allied",
    highlights: [
      "Initial launch by founder Prem Jain to help Indian students learn with Socratic AI rather than answer dumping.",
      "Core AI tutor, adaptive study planner, and initial JEE & CBSE practice modules.",
      "India DPDP Act 2023 compliant data protection and secure Firebase authentication.",
    ],
  },
];

export default function ChangelogPage() {
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
            <p className="ui-eyebrow">Product Releases</p>
            <h1 className="ui-display page-hero-title">Changelog</h1>
            <p className="ui-lede page-hero-lede">
              Transparent, rapid iteration. See what we are building, upgrading, and shipping every month to help students learn with genuine cognitive depth.
            </p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Try latest version free
              </Link>
              <Link href="/press" className="btn btn-secondary btn-lg">
                Press &amp; Media Kit
              </Link>
            </div>
          </div>
        </section>

        {/* Releases Section */}
        <section className="ui-section">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Release History</span>
              </div>
              <div className="editorial-prose">
                <div className="changelog-list">
                  {RELEASES.map((rel) => (
                    <article key={rel.version} className="changelog-entry">
                      <div className="changelog-meta">
                        <span className="changelog-ver">{rel.version}</span>
                        <span className="changelog-date">{rel.date}</span>
                      </div>
                      <h2 className="changelog-heading">{rel.title}</h2>
                      <ul className="changelog-highlights">
                        {rel.highlights.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
