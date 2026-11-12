import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { FaqAccordion } from "@/components/FaqAccordion";
import {
  SITE_URL,
  SHARED_JSONLD_GRAPH,
  createBreadcrumbsJsonLd,
  createFaqJsonLd,
} from "@/lib/seo";

export interface SeoLandingPageProps {
  eyebrow: string;
  title: string;
  lede: string;
  path: string;
  badge?: string;
  lastUpdated?: string;
  tableOfContents?: { id: string; label: string }[];
  overviewSection: {
    headline: string;
    paragraphs: string[];
    callout?: { title: string; text: string };
  };
  comparisonTable?: {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: { feature: string; learningAllied: string; others: string; verdict: string }[];
  };
  featuresGrid?: {
    title: string;
    subtitle?: string;
    items: {
      tag?: string;
      title: string;
      description: string;
      bullets?: string[];
    }[];
  };
  syllabusCoverage?: {
    title: string;
    subtitle?: string;
    categories: {
      name: string;
      topics: string[];
    }[];
  };
  deepDiveSections?: {
    id: string;
    heading: string;
    subheading?: string;
    content: string[];
    quote?: string;
    stats?: { label: string; value: string }[];
  }[];
  faqs: { q: string; a: string }[];
  relatedPages?: { label: string; href: string; desc: string }[];
}

export function SeoLandingPage({
  eyebrow,
  title,
  lede,
  path,
  badge = "Evidence-Based AI Pedagogy",
  lastUpdated = "November 2026",
  tableOfContents,
  overviewSection,
  comparisonTable,
  featuresGrid,
  syllabusCoverage,
  deepDiveSections,
  faqs,
  relatedPages,
}: SeoLandingPageProps) {
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: title, path },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      SHARED_JSONLD_GRAPH.organization,
      SHARED_JSONLD_GRAPH.founder,
      SHARED_JSONLD_GRAPH.website,
      SHARED_JSONLD_GRAPH.softwareApplication,
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${path}#webpage`,
        url: `${SITE_URL}${path}`,
        name: title,
        description: lede,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: createBreadcrumbsJsonLd(breadcrumbItems),
      },
      createFaqJsonLd(faqs),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicNavbar />

      <main id="main" className="editorial-page seo-landing">
        {/* Breadcrumb Bar */}
        <div className="seo-breadcrumb-bar">
          <div className="wrap">
            <nav aria-label="Breadcrumb">
              <ol className="seo-breadcrumbs">
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{eyebrow}</li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Hero Section */}
        <section className="page-hero">
          <div className="wrap">
            <div className="seo-badge-row">
              <span className="ui-eyebrow">{eyebrow}</span>
              <span className="seo-pill">{badge}</span>
              <span className="seo-updated">Updated: {lastUpdated}</span>
            </div>
            <h1 className="ui-display page-hero-title">{title}</h1>
            <p className="ui-lede page-hero-lede">{lede}</p>
            <div className="page-hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Try Learning Allied Free
              </Link>
              <Link href="/about" className="btn btn-secondary btn-lg">
                How Our Socratic AI Works
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Feature Banner / Product Highlight */}
        <section className="ui-section">
          <div className="wrap">
            <div className="seo-product-banner">
              <div className="seo-banner-badge">Verified Socratic Framework</div>
              <h2 className="seo-banner-title">
                The AI Study Partner Built for True Conceptual Understanding
              </h2>
              <p className="seo-banner-desc">
                Most students use AI as a shortcut to get homework answers. Learning
                Allied flips the paradigm: our Socratic tutor asks clarifying questions,
                isolates the exact premise you are struggling with, and prompts you to
                derive the solution yourself.
              </p>
              <div className="seo-banner-stats">
                <div className="seo-stat-item">
                  <div className="seo-stat-val">100%</div>
                  <div className="seo-stat-label">Syllabus Grounded</div>
                </div>
                <div className="seo-stat-item">
                  <div className="seo-stat-val">0</div>
                  <div className="seo-stat-label">Answer Dumps</div>
                </div>
                <div className="seo-stat-item">
                  <div className="seo-stat-val">Ebbinghaus</div>
                  <div className="seo-stat-label">Decay-Calibrated Review</div>
                </div>
                <div className="seo-stat-item">
                  <div className="seo-stat-val">Free</div>
                  <div className="seo-stat-label">To Get Started</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview Section */}
        <section className="ui-section">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Core Foundation</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">{overviewSection.headline}</h2>
                {overviewSection.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}

                {overviewSection.callout && (
                  <div className="seo-callout-box">
                    <div className="seo-callout-title">
                      {overviewSection.callout.title}
                    </div>
                    <p className="seo-callout-text">
                      {overviewSection.callout.text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Deep Dive Sections */}
        {deepDiveSections &&
          deepDiveSections.map((sec, idx) => (
            <section
              key={sec.id}
              id={sec.id}
              className={`ui-section ${idx > 0 ? "editorial-divider" : ""}`}
            >
              <div className="wrap">
                <div className="editorial-grid">
                  <div className="editorial-label">
                    <span className="ui-kicker">
                      Section {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="editorial-prose">
                    <h2 className="editorial-headline">{sec.heading}</h2>
                    {sec.subheading && (
                      <p className="seo-subheading">{sec.subheading}</p>
                    )}
                    {sec.content.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                    {sec.quote && (
                      <blockquote className="seo-quote">
                        &ldquo;{sec.quote}&rdquo;
                      </blockquote>
                    )}
                    {sec.stats && (
                      <div className="seo-mini-stats">
                        {sec.stats.map((st, stIdx) => (
                          <div key={stIdx} className="seo-mini-stat-card">
                            <div className="seo-mini-stat-num">{st.value}</div>
                            <div className="seo-mini-stat-label">{st.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}

        {/* Comparison Table */}
        {comparisonTable && (
          <section className="ui-section editorial-divider">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Side-by-Side</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">{comparisonTable.title}</h2>
                  {comparisonTable.subtitle && (
                    <p className="seo-subheading">{comparisonTable.subtitle}</p>
                  )}
                  <div className="seo-table-container">
                    <table className="seo-comparison-table">
                      <thead>
                        <tr>
                          {comparisonTable.headers.map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonTable.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td className="seo-table-feat">{row.feature}</td>
                            <td className="seo-table-la">{row.learningAllied}</td>
                            <td className="seo-table-oth">{row.others}</td>
                            <td className="seo-table-verdict">{row.verdict}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Features Grid */}
        {featuresGrid && (
          <section className="ui-section editorial-divider">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Key Advantages</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">{featuresGrid.title}</h2>
                  {featuresGrid.subtitle && (
                    <p className="seo-subheading">{featuresGrid.subtitle}</p>
                  )}
                  <div className="seo-cards-grid">
                    {featuresGrid.items.map((item, idx) => (
                      <div key={idx} className="seo-card">
                        {item.tag && (
                          <span className="seo-card-tag">{item.tag}</span>
                        )}
                        <h3 className="seo-card-title">{item.title}</h3>
                        <p className="seo-card-desc">{item.description}</p>
                        {item.bullets && item.bullets.length > 0 && (
                          <ul className="seo-card-bullets">
                            {item.bullets.map((b, bIdx) => (
                              <li key={bIdx}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Syllabus / Curricular Breakdown */}
        {syllabusCoverage && (
          <section className="ui-section editorial-divider">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Curricular Alignment</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">{syllabusCoverage.title}</h2>
                  {syllabusCoverage.subtitle && (
                    <p className="seo-subheading">{syllabusCoverage.subtitle}</p>
                  )}
                  <div className="seo-syllabus-grid">
                    {syllabusCoverage.categories.map((cat, cIdx) => (
                      <div key={cIdx} className="seo-syllabus-col">
                        <h3 className="seo-syllabus-title">{cat.name}</h3>
                        <ul className="seo-syllabus-list">
                          {cat.topics.map((t, tIdx) => (
                            <li key={tIdx}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        <section className="ui-section editorial-divider">
          <div className="wrap">
            <div className="editorial-grid">
              <div className="editorial-label">
                <span className="ui-kicker">Frequently Asked</span>
              </div>
              <div className="editorial-prose">
                <h2 className="editorial-headline">
                  Common Questions About {title}
                </h2>
                <p className="seo-subheading">
                  Clear, factual answers to help you choose the best study methodology.
                </p>
                <FaqAccordion items={faqs} />
              </div>
            </div>
          </div>
        </section>

        {/* Related Pages & Internal Links */}
        {relatedPages && relatedPages.length > 0 && (
          <section className="ui-section editorial-divider">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Explore Further</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">
                    Related Study Guides &amp; Resources
                  </h2>
                  <div className="seo-related-grid">
                    {relatedPages.map((rel, rIdx) => (
                      <Link key={rIdx} href={rel.href} className="seo-related-card">
                        <div className="seo-related-title">{rel.label}</div>
                        <div className="seo-related-desc">{rel.desc}</div>
                        <span className="seo-related-arrow">Read guide &rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Conversion CTA Banner */}
        <section className="ui-section seo-cta-wrap">
          <div className="wrap">
            <div className="seo-cta-box">
              <div className="seo-cta-badge">Zero Cost to Start</div>
              <h2 className="seo-cta-heading">
                Ready to Experience True Socratic Learning?
              </h2>
              <p className="seo-cta-text">
                Join ambitious students preparing for JEE, NEET, CBSE, and Maharashtra
                Board exams with Learning Allied&apos;s adaptive AI tutor.
              </p>
              <div className="seo-cta-buttons">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Start Free Account
                </Link>
                <Link href="/about" className="btn btn-secondary btn-lg">
                  Learn More About Prem Jain&apos;s Vision
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
