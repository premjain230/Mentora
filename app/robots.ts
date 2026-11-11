import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about",
        "/founder",
        "/blog/",
        "/jee-preparation",
        "/neet-preparation",
        "/cbse-board",
        "/maharashtra-board",
        "/learning-hub",
        "/arena",
        "/chat",
        "/privacy-policy",
        "/terms-of-use",
      ],
      disallow: ["/api/", "/sidebar.html", "/admin"],
    },
    sitemap: "https://www.learningallied.world/sitemap.xml",
  };
}
