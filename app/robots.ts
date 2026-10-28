import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/founder", "/blog/"],
      disallow: ["/api/", "/sidebar.html", "/admin"],
    },
    sitemap: "https://www.learningallied.world/sitemap.xml",
  };
}
