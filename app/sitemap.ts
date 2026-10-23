import type { MetadataRoute } from "next";

const origin = "https://grow-book.tjdtmdcjf1050.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ["", "daily", 1],
    ["/community", "hourly", 0.95],
    ["/rankings", "daily", 0.8],
    ["/challenges", "daily", 0.75],
    ["/events", "daily", 0.7],
    ["/impact", "weekly", 0.55],
    ["/about", "monthly", 0.5],
  ].map(([path, changeFrequency, priority]) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: Number(priority),
  }));
}
