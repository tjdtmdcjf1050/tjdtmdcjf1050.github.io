import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/community/", "/writers/", "/events", "/rankings", "/challenges"],
      disallow: ["/admin", "/api/", "/write", "/studio", "/notifications"],
    },
    sitemap: "https://grow-book.tjdtmdcjf1050.chatgpt.site/sitemap.xml",
  };
}
