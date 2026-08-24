import type { MetadataRoute } from "next";
import { communities, samplePosts } from "@/lib/community-data";
import { loadKeywordPageData } from "@/app/keyword-page-data";
import { keywordPath, popularKeywords } from "@/lib/keyword-shared";
import { rankingCategories } from "@/lib/ranking-candidates";
import { getRankingResult, getSitemapKeywordEntries } from "@/lib/ranking-store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://fastincome.kr";
  const staticPages = ["dl", "about", "privacy", "terms", "contact"];
  const rankingResult = await getRankingResult({ limit: 1 });
  const rankingLastModified = rankingResult.collectedAt ? new Date(rankingResult.collectedAt) : new Date();
  const rankingPages = [
    "ranking",
    "ranking/rising",
    ...rankingCategories.map((category) => `ranking/${category.slug}`),
  ];
  const collectedKeywordEntries = await getSitemapKeywordEntries(300);
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

  const entries = [
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
    ...rankingPages.map((path) => ({
      url: `${base}/${path}`,
      lastModified: rankingLastModified,
      changeFrequency: "daily" as const,
      priority: path === "ranking" ? 0.8 : 0.7,
    })),
    ...collectedKeywordEntries.map((entry) => ({
      url: `${base}${keywordPath(entry.keyword)}`,
      lastModified: entry.lastModified,
      changeFrequency: "daily" as const,
      priority: 0.75,
    })),
    ...keywordEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  ];
  const seenUrls = new Set<string>();
  return entries.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}
