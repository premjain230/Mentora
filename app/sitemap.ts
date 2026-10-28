import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.learningallied.world";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date("2026-10-27"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/founder`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/how-to-make-a-jee-study-plan`,
      lastModified: new Date("2026-08-13"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jee-preparation`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/neet-preparation`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/maharashtra-board`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/cbse-board`,
      lastModified: new Date("2026-10-21"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
