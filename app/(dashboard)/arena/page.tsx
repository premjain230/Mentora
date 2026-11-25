import type { Metadata } from "next";
import { VanillaPage } from "@/components/vanilla/VanillaPage";
import { ArenaMarkup } from "@/components/pages/arena/ArenaMarkup";
import { constructMetadata, SITE_URL } from "@/lib/seo";
import "@/css/pages/arena.css";

export const metadata: Metadata = constructMetadata({
  title: "Arena — Syllabus Battles & Adaptive Quiz Arena | Learning Allied",
  description:
    "Test your recall, conquer chapters, and battle through syllabus challenges tailored to your selected curriculum in the Learning Allied Arena.",
  path: "/arena",
});

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Arena — Learning Allied",
      description:
        "Turn your syllabus into a battlefield. Defeat chapters, conquer subjects, and test your mastery in timed quiz battles.",
      url: `${SITE_URL}/arena`,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Arena", "item": `${SITE_URL}/arena` },
        ],
      },
    },
    {
      "@type": "LearningResource",
      name: "Learning Allied Quiz Arena",
      description:
        "Gamified syllabus mastery platform featuring chapter battles, speed challenges, and adaptive quizzes across global curricula.",
      educationalLevel: ["Secondary", "High School", "University Prep"],
      learningResourceType: "Quiz / Assessment",
      provider: { "@type": "Organization", "name": "Learning Allied", "url": `${SITE_URL}/` },
      url: `${SITE_URL}/arena`,
    },
  ],
};

export default function ArenaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <VanillaPage page="arena">
        <ArenaMarkup />
      </VanillaPage>
    </>
  );
}
