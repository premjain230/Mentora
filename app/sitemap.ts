import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.learningallied.world";
  const now = new Date("2026-11-12");

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

  return staticPublicRoutes;
}
