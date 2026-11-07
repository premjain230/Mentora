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

      <main id="main" className="editorial-page">
        <article>
          {/* Hero */}
          <section className="page-hero">
            <div className="wrap">
              <p className="ui-eyebrow">Founder Profile</p>
              <h1 id="founder-title" className="ui-display page-hero-title">
                Prem Jain
              </h1>
              <p className="ui-lede page-hero-lede">
                Student entrepreneur and founder of Learning Allied. Dedicated to
                re-architecting how Indian students prepare for rigorous exams through
                active cognition, deliberate practice, and cognitive psychology.
              </p>
              <div className="page-hero-actions">
                <Link href="/" className="btn btn-primary btn-lg">
                  Visit Learning Allied
                </Link>
                <Link href="/about" className="btn btn-secondary btn-lg">
                  About the platform
                </Link>
              </div>
            </div>
          </section>

          {/* Narrative sections */}
          <section className="ui-section">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Origin &amp; Purpose</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">
                    Why I am building Learning Allied
                  </h2>
                  <p>
                    Every year in India, millions of students sit for competitive exams like JEE and NEET.
                    The standard regime is grueling: endless coaching lectures, massive question banks, and
                    hours spent copying down solutions. Yet despite studying 12 hours a day, students often
                    feel unprepared when faced with novel questions in the actual examination hall.
                  </p>
                  <p>
                    The issue isn&apos;t effort—it&apos;s cognitive encoding. When AI models were popularized,
                    most platforms simply built chatbots that immediately output answers to homework questions.
                    This made the problem worse by accelerating passive consumption.
                  </p>
                  <p>
                    I built Learning Allied on a strict premise: <strong>AI must never rob the student of the struggle to understand.</strong> By acting as a patient Socratic partner that prompts, guides, and tests retention, Learning Allied helps students build genuine problem-solving stamina.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="ui-section editorial-divider">
            <div className="wrap">
              <div className="editorial-grid">
                <div className="editorial-label">
                  <span className="ui-kicker">Background</span>
                </div>
                <div className="editorial-prose">
                  <h2 className="editorial-headline">
                    Independent, bootstrapped, and mission-aligned
                  </h2>
                  <p>
                    As an independent builder, I have total freedom to prioritize educational rigor over
                    superficial growth gimmicks. Learning Allied does not include random gaming gimmicks,
                    misleading statistics, or high-pressure countdowns. Every feature—from the adaptive
                    spaced review queue to the interactive physics simulations—is grounded in peer-reviewed
                    cognitive science.
                  </p>
                  <p>
                    I welcome thoughts, suggestions, and feedback from students, educators, and parents.
                    You can explore our methodology on the <Link href="/about" className="editorial-link">About page</Link> or start learning directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Call to action */}
          <section className="ui-section">
            <div className="wrap">
              <div className="ui-panel home-cta">
                <h2>Experience Socratic learning today</h2>
                <p>
                  Create an account, select your target exam, and begin your first guided study session.
                </p>
                <div className="hero-actions">
                  <Link href="/signup" className="btn btn-primary btn-lg">
                    Create free account
                  </Link>
                  <Link href="/login" className="btn btn-secondary btn-lg">
                    Student login
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>

      <PublicFooter />
    </>
  );
}
