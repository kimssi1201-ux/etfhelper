import rankingKeywordConfig from "@/data/ranking-keywords.json";
import { normalizeKeyword } from "@/lib/keyword-shared";

export type RankingCategory = {
  slug: string;
  name: string;
  keywords: string[];
};

type RankingKeywordConfig = {
  categories: RankingCategory[];
};

const config = rankingKeywordConfig as RankingKeywordConfig;

export const rankingCategories = config.categories.map((category) => ({
  ...category,
  keywords: [...new Set(category.keywords.map((keyword) => normalizeKeyword(keyword)).filter(Boolean))],
}));

export const rankingCategorySlugs = rankingCategories.map((category) => category.slug);

export const rankingKeywords = rankingCategories.flatMap((category) => (
  category.keywords.map((keyword) => ({
    keyword,
    category: category.name,
    categorySlug: category.slug,
  }))
));

export function getRankingCategoryBySlug(slug: string | null | undefined) {
  return rankingCategories.find((category) => category.slug === slug) ?? null;
}

export function getRankingCategoryByKeyword(keyword: string) {
  const normalized = normalizeKeyword(keyword);
  return rankingKeywords.find((item) => item.keyword === normalized) ?? null;
}
