import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { constructMetadata, createBreadcrumbsJsonLd, createCourseJsonLd, createProgramJsonLd } from "@/lib/seo";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

// Read statically bundled curriculum catalog
import curriculumData from "@/lib/learning/curriculum/global-curriculum.json";

interface PageProps {
  params: {
    country: string;
    track: string;
  };
}

export function generateStaticParams() {
  const params: { country: string; track: string }[] = [];
  for (const track of curriculumData.tracks) {
    if (track.countryCode && track.id) {
      params.push({
        country: track.countryCode.toLowerCase(),
        track: track.id.toLowerCase(),
      });
    }
  }
  return params;
}

export function generateMetadata({ params }: PageProps) {
  const countryCode = params.country.toUpperCase();
  const trackId = params.track.toLowerCase();

  const country = curriculumData.countries.find(
    (c) => c.code.toUpperCase() === countryCode || c.slug.toLowerCase() === params.country.toLowerCase()
  );

  const track = curriculumData.tracks.find(
    (t) =>
      t.id.toLowerCase() === trackId &&
      (!country || t.countryCode.toUpperCase() === country.code.toUpperCase())
  );

  if (!track || !country) {
    return constructMetadata({
      title: "Curriculum Track Not Found",
      description: "The requested curriculum track is not available in our verified catalog.",
      path: `/curriculum/${params.country}/${params.track}`,
      noIndex: true,
    });
  }

  const isVerified =
    track.verificationStatus === "officially_verified" ||
    track.verificationStatus === "partially_verified";

  // Anti-thin-content gating: Apply noindex unless track meets verified content standards
  const subjectCount = track.subjects?.length || 0;
  const isThin = subjectCount === 0 || !isVerified;

  const pageTitle = `${track.name} Syllabus (${track.academicYear || "2026-2027"}) — Socratic AI Tutoring | ${country.name}`;
  const pageDesc = `Comprehensive ${track.name} curriculum standards for ${country.name}. Official syllabus specifications, authentic regional conventions, chapters, and Socratic AI study tutor.`;

  return constructMetadata({
    title: pageTitle,
    description: pageDesc,
    path: `/curriculum/${country.code.toLowerCase()}/${track.id.toLowerCase()}`,
    noIndex: isThin,
    keywords: [
      `${track.name} syllabus 2026-27`,
      `${country.name} ${track.name} study guide`,
      `${track.name} AI tutor`,
      `${track.name} past papers and concepts`,
      "socratic learning AI",
    ],
  });
}

export default function CurriculumTrackPage({ params }: PageProps) {
  const countryCode = params.country.toUpperCase();
  const trackId = params.track.toLowerCase();

  const country = curriculumData.countries.find(
    (c) => c.code.toUpperCase() === countryCode || c.slug.toLowerCase() === params.country.toLowerCase()
  );

  const track = curriculumData.tracks.find(
    (t) =>
      t.id.toLowerCase() === trackId &&
      (!country || t.countryCode.toUpperCase() === country.code.toUpperCase())
  );

  if (!track || !country) {
    notFound();
  }

  const path = `/curriculum/${country.code.toLowerCase()}/${track.id.toLowerCase()}`;
  const isVerified =
    track.verificationStatus === "officially_verified" ||
    track.verificationStatus === "partially_verified";

  const breadcrumbsJsonLd = createBreadcrumbsJsonLd([
    { name: "Home", path: "/" },
    { name: "Learning Hub", path: "/learning-hub" },
    { name: country.name, path: `/learning-hub?country=${country.code}` },
    { name: track.name, path },
  ]);

  const courseJsonLd = createCourseJsonLd({
    name: `${track.name} (${track.academicYear || "2026-2027"})`,
    description: `Official ${track.name} syllabus specifications and interactive Socratic AI tutor for ${country.name}.`,
    path,
    provider: track.authorityType || country.name,
    educationalCredentialAwarded: track.shortName || track.name,
    academicYear: track.academicYear || "2026-2027",
  });

  const programJsonLd = createProgramJsonLd({
    name: track.name,
    description: `Verified educational curriculum pathway for ${track.name} in ${country.name}.`,
    path,
    educationalCredentialAwarded: track.shortName || track.name,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(programJsonLd) }}
      />
      <PublicNavbar />

      <main className="how-it-works-page">
        {/* Track Header */}
        <section className="ui-section how-hero">
          <div className="wrap">
            <div className="how-hero-content text-center" style={{ maxWidth: "860px", margin: "0 auto" }}>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>{country.flagEmoji}</span>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary, #A3A3A3)", fontWeight: 600 }}>
                  {country.name} · {country.region}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: isVerified ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: isVerified ? "#34d399" : "#fbbf24",
                  }}
                >
                  {track.verificationStatus.replace("_", " ")}
                </span>
              </div>

              <h1 className="how-title" style={{ fontSize: "2.5rem", lineHeight: "1.2", margin: "0 0 16px" }}>
                {track.name}
              </h1>

              <p className="how-subtitle" style={{ fontSize: "1.1rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.6" }}>
                Authority Type: <strong style={{ color: "var(--text-primary, #FFF)" }}>{track.authorityType?.replace(/_/g, " ")}</strong> · Academic Cycle: <strong style={{ color: "var(--text-primary, #FFF)" }}>{track.academicYear || "2026-2027"}</strong>
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
                {track.regionalConventions?.mathTerminology && (
                  <span style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary, #A3A3A3)" }}>
                    Math Acronym: <strong style={{ color: "#FFF" }}>{track.regionalConventions.mathTerminology.divisionOfOperations}</strong>
                  </span>
                )}
                {track.regionalConventions && (
                  <span style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", color: "var(--text-secondary, #A3A3A3)" }}>
                    Spelling: <strong style={{ color: "#FFF" }}>{track.regionalConventions.spellingVariant}</strong>
                  </span>
                )}
                {track.officialUrl && (
                  <a
                    href={track.officialUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ fontSize: "0.82rem", padding: "4px 12px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.15)", color: "var(--accent, #3b82f6)", textDecoration: "none" }}
                  >
                    Official Board Portal ↗
                  </a>
                )}
              </div>

              <div style={{ marginTop: "28px" }}>
                <Link
                  href={`/learning-hub?country=${country.code}&track=${track.id}`}
                  className="btn btn-primary btn-lg"
                >
                  Explore in Learning Hub
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Subjects & Units */}
        <section className="ui-section" style={{ padding: "40px 0 60px" }}>
          <div className="wrap" style={{ maxWidth: "860px" }}>
            <h2 style={{ fontSize: "1.85rem", color: "var(--text-primary, #FFF)", marginBottom: "24px" }}>
              Curriculum Subjects &amp; Syllabus Specifications
            </h2>

            {track.subjects && track.subjects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {track.subjects.map((sub: any) => (
                  <div
                    key={sub.id}
                    style={{
                      padding: "28px",
                      borderRadius: "16px",
                      background: "var(--bg-card, #0A0A0A)",
                      border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <h3 style={{ fontSize: "1.35rem", color: "var(--text-primary, #FFF)", margin: 0 }}>
                        {sub.name}
                      </h3>
                      {sub.gradeLevel && (
                        <span style={{ fontSize: "0.8rem", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", color: "#A3A3A3" }}>
                          Grade / Level {sub.gradeLevel}
                        </span>
                      )}
                    </div>
                    {sub.description && (
                      <p style={{ fontSize: "0.92rem", color: "var(--text-secondary, #A3A3A3)", lineHeight: "1.5", margin: "0 0 16px" }}>
                        {sub.description}
                      </p>
                    )}

                    {sub.chapters && sub.chapters.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent, #3b82f6)", marginBottom: "8px", textTransform: "uppercase" }}>
                          Chapters &amp; Units ({sub.chapters.length})
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px" }}>
                          {sub.chapters.map((ch: any) => (
                            <div
                              key={ch.id}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                background: "var(--bg-elevated, rgba(255, 255, 255, 0.03))",
                                border: "1px solid var(--border, rgba(255, 255, 255, 0.05))",
                                fontSize: "0.86rem",
                                color: "var(--text-primary, #FFF)",
                              }}
                            >
                              {ch.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "32px",
                  borderRadius: "14px",
                  background: "var(--bg-card, #0A0A0A)",
                  border: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
                  textAlign: "center",
                  color: "var(--text-secondary, #A3A3A3)",
                }}
              >
                Subject details are being verified with official educational board publications.
              </div>
            )}
          </div>
        </section>

        {/* Call to Action */}
        <section className="ui-section seo-cta-wrap">
          <div className="wrap">
            <div className="seo-cta-box">
              <div className="seo-cta-badge">Socratic AI Mastery</div>
              <h2 className="seo-cta-heading">
                Ready to Master {track.name}?
              </h2>
              <p className="seo-cta-text">
                Start interactive Socratic tutoring sessions and challenge yourself in the Arena.
              </p>
              <div className="seo-cta-buttons">
                <Link
                  href={`/learning-hub?country=${country.code}&track=${track.id}`}
                  className="btn btn-primary btn-lg"
                >
                  Start Studying Now
                </Link>
                <Link href="/for-parents" className="btn btn-secondary btn-lg">
                  Parent Assurance
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
