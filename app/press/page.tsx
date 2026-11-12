import React from "react";
import Link from "next/link";
import { constructMetadata, SITE_URL, SHARED_JSONLD_GRAPH } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata = constructMetadata({
  title: "Press & Media Kit: About Learning Allied & Founder Prem Jain",
  description:
    "Official media kit, press releases, company boilerplate, brand assets, and founder background for journalists, educational publications, and edtech directories.",
  path: "/press",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    SHARED_JSONLD_GRAPH.organization,
    SHARED_JSONLD_GRAPH.founder,
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/press#webpage`,
      url: `${SITE_URL}/press`,
      name: "Learning Allied Press & Media Kit",
      description: "Official media assets, company background, and press contact information.",
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

const FAST_FACTS = [
  { label: "Founder", value: "Prem Jain" },
  { label: "Official URL", value: "https://learningallied.world" },
  { label: "Platform Category", value: "AI Study Partner / Socratic EdTech" },
  { label: "Curricula Supported", value: "JEE Main & Advanced, NEET UG, CBSE 9–12, Maharashtra SSC & HSC" },
  { label: "Core AI Architecture", value: "Socratic Cognitive Scaffolding + Prerequisite Knowledge Graphs" },
  { label: "Compliance & Safety", value: "DPDP Act 2023 Compliant, India Data Sovereignty" },
];

export default function PressPage() {
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
            <p className="ui-eyebrow">Newsroom &amp; Media</p>
            <h1 className="ui-display page-hero-title">
              Press &amp; Media Kit
            </h1>
            <p className="ui-lede page-hero-lede">
              Official resources for journalists, education researchers, student communities, and technology publications covering AI in education.
            </p>
            <div className="page-hero-actions">
              <a href="mailto:premjain230@gmail.com" className="btn btn-primary btn-lg">
                Media Inquiries
              </a>
              <Link href="/about" className="btn btn-secondary btn-lg">
                About Learning Allied
              </Link>
            </div>
          </div>
        </section>

        {/* Company Overview & Fast Facts */}
        <section className="ui-section">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">At A Glance</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">Company Fast Facts</h2>
                <div className="press-facts-grid">
                  {FAST_FACTS.map((f, i) => (
                    <div key={i} className="press-fact-card">
                      <div className="press-fact-label">{f.label}</div>
                      <div className="press-fact-val">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Official Boilerplate */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Boilerplate</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">Official Boilerplate</h2>
                <div className="press-boilerplate-box">
                  <p>
                    <strong>About Learning Allied:</strong> Learning Allied (https://learningallied.world) is an evidence-based AI study partner and adaptive learning platform founded by Prem Jain. Built specifically for students preparing for high-stakes competitive entrance examinations (JEE Main &amp; Advanced, NEET UG) and board examinations (CBSE Class 9–12, Maharashtra State Board SSC &amp; HSC), Learning Allied replaces passive AI answer dumping with Socratic cognitive scaffolding, prerequisite knowledge graph diagnosis, and algorithmically spaced retrieval practice. Headquartered in India and compliant with the Digital Personal Data Protection (DPDP) Act 2023, Learning Allied is dedicated to helping every student build genuine, independent problem-solving stamina.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Bio */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Leadership</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">Founder Bio: Prem Jain</h2>
                <p>
                  Prem Jain is the founder and lead architect of Learning Allied. Witnessing firsthand how generic AI chatbots encouraged students to copy homework answers without understanding the underlying science, Prem set out to engineer an AI that refuses to spoil the answer.
                </p>
                <p>
                  By marrying multimodal AI with decades of research in cognitive psychology (Cognitive Load Theory, the Testing Effect, and the Ebbinghaus forgetting curve), Prem created a system that diagnoses underlying conceptual blockers and prompts students to derive solutions independently.
                </p>
                <div className="press-social-links">
                  <a href="https://www.linkedin.com/in/prem-jain-603173426/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    LinkedIn Profile
                  </a>
                  <a href="https://teenfounders.in/user/learningallied" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    TeenFounders Profile
                  </a>
                  <a href="https://youtube.com/@learningalliedoffical?si=x677FCu-oWGE0aEY" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Official YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Assets */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Brand Assets</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">Official Logos &amp; Identity</h2>
                <p>
                  Download official high-resolution vector logos for use in editorial articles, media coverage, and partner directories.
                </p>
                <div className="press-assets-grid">
                  <div className="press-asset-card">
                    <div className="press-asset-preview dark-bg">
                      <img src="/learningallied-white.svg" alt="Learning Allied White Logo" width={48} height={48} />
                    </div>
                    <div className="press-asset-info">
                      <h4>White Vector Logo (Dark Backgrounds)</h4>
                      <p>SVG vector format for dark editorial layouts.</p>
                      <a href="/learningallied-white.svg" download className="press-download-link">
                        Download SVG &darr;
                      </a>
                    </div>
                  </div>

                  <div className="press-asset-card">
                    <div className="press-asset-preview light-bg">
                      <img src="/learningallied-black.svg" alt="Learning Allied Black Logo" width={48} height={48} />
                    </div>
                    <div className="press-asset-info">
                      <h4>Dark Vector Logo (Light Backgrounds)</h4>
                      <p>SVG vector format for light editorial layouts.</p>
                      <a href="/learningallied-black.svg" download className="press-download-link">
                        Download SVG &darr;
                      </a>
                    </div>
                  </div>
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
