import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { LearningHubMarkup } from "@/components/pages/learning-hub/LearningHubMarkup";
import { constructMetadata, SITE_URL } from "@/lib/seo";
import "@/css/learning-hub.css";

export const metadata: Metadata = constructMetadata({
  title: "AI Learning Hub — Adaptive Curriculum Intelligence | Learning Allied",
  description:
    "Master JEE, NEET, and Board exam concepts with the Learning Allied AI Learning Hub. Interactive concept roadmaps, step-by-step Socratic breakdowns, and adaptive practice.",
  path: "/learning-hub",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "AI Learning Hub — Learning Allied",
      description:
        "Adaptive curriculum intelligence, chapter roadmaps, and Socratic learning sessions for JEE, NEET, and Board exams.",
      url: `${SITE_URL}/learning-hub`,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Learning Hub", "item": `${SITE_URL}/learning-hub` },
        ],
      },
    },
    {
      "@type": "LearningResource",
      name: "Learning Allied AI Learning Hub",
      description:
        "Comprehensive chapter-wise concept roadmaps, AI diagnostics, and mastery tracking for Indian competitive and board exams.",
      educationalLevel: ["Class 11", "Class 12", "Competitive Exams"],
      learningResourceType: "Interactive Resource",
      provider: { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      url: `${SITE_URL}/learning-hub`,
    },
  ],
};

export default function LearningHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <VanillaPage page="learning-hub">
        <LearningHubMarkup />
      </VanillaPage>
    </>
  );
}
