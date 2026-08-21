import type { MetadataRoute } from "next";
import { communities, samplePosts } from "@/lib/community-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://fastincome.kr";
  const staticPages = ["about", "privacy", "terms", "contact"];

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...staticPages.map((path) => ({
      url: `${base}/${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...communities.map((item) => ({
      url: `${base}/community/${item.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...samplePosts.map((post) => ({
      url: `${base}/post/${post.communitySlug}/${post.externalId}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
