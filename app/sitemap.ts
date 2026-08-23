import type { MetadataRoute } from "next";
import { communities, samplePosts } from "@/lib/community-data";
import { loadKeywordPageData } from "@/app/keyword-page-data";
import { keywordPath, popularKeywords } from "@/lib/keyword-shared";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://fastincome.kr";
  const staticPages = ["dl", "about", "privacy", "terms", "contact"];
  const keywordEntries = await Promise.all(popularKeywords.map(async (keyword) => {
    const { data } = await loadKeywordPageData(keyword);
    if (!data?.results.length) return null;
    return {
      url: `${base}${keywordPath(keyword)}`,
      lastModified: new Date(data.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    };
  }));

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
    ...keywordEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  ];
}
