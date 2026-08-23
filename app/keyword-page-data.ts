import { cache } from "react";
import { getKeywordInsights } from "@/lib/keyword-data";
import { keywordNoDataMessage, normalizeKeyword } from "@/lib/keyword-shared";
import type { KeywordApiResponse } from "@/lib/keyword-shared";

export type KeywordPageLoad = {
  data: KeywordApiResponse | null;
  error: string | null;
};

export const loadKeywordPageData = cache(async (keyword: string): Promise<KeywordPageLoad> => {
  const query = normalizeKeyword(keyword);
  if (!query) return { data: null, error: keywordNoDataMessage };

  try {
    return { data: await getKeywordInsights(query), error: null };
  } catch (error) {
    console.warn("Keyword page data lookup failed", {
      keyword: query,
      message: error instanceof Error ? error.message : String(error),
    });
    return { data: null, error: keywordNoDataMessage };
  }
});
