import { MetadataRoute } from "next";
import curriculumData from "@/lib/learning/curriculum/global-curriculum.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.learningallied.world";
  const now = new Date("2026-11-23");

  const staticPublicRoutes: {
    url: string;
    lastModified: Date;
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    priority: number;
  }[] = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/best-ai-study-tools`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/best-study-tools`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/learning-allied-vs-chatgpt`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/ai-study-tools-india`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${baseUrl}/jee-preparation`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/neet-preparation`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/cbse-board`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/maharashtra-board`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/best-jee-preparation-tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/best-neet-preparation-tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/study-tools-cbse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/study-tools-maharashtra-board`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/ai-study-assistant`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/best-ai-learning-platforms`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/learn-smarter-with-ai`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/learning-hub`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/arena`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/chat`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${baseUrl}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/how-our-ai-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/for-parents`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/child-privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-make-a-jee-study-plan`, lastModified: new Date("2026-08-13"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/how-to-study-smarter-using-ai`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/active-recall-spaced-repetition-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog/cbse-class-12-board-study-strategy`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/founder`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/press`, lastModified: now, changeFrequency: "monthly", priority: 0.65 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date("2026-11-11"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms-of-use`, lastModified: new Date("2026-11-11"), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamic Verified Curriculum Routes (Strict Anti-Thin-Content Gating)
  const dynamicCurriculumRoutes: MetadataRoute.Sitemap = [];

  for (const track of curriculumData.tracks) {
    const isVerified =
      track.verificationStatus === "officially_verified" ||
      track.verificationStatus === "partially_verified";
    const subjectCount = track.subjects?.length || 0;

    // Gating rule: Only index verified tracks that contain real subjects and chapters
    if (isVerified && subjectCount > 0 && track.countryCode && track.id) {
      dynamicCurriculumRoutes.push({
        url: `${baseUrl}/curriculum/${track.countryCode.toLowerCase()}/${track.id.toLowerCase()}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      });
    }
  }

  return [...staticPublicRoutes, ...dynamicCurriculumRoutes];
}
