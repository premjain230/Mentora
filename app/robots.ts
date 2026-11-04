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
      ],
      disallow: ["/api/", "/sidebar.html", "/admin"],
    },
    sitemap: "https://www.learningallied.world/sitemap.xml",
  };
}
