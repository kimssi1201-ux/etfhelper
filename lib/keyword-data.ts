import { getNaverOpenApiInsights } from "@/lib/naver-openapi";
import { lookupNaverKeywords } from "@/lib/naver-searchad";
import type { KeywordApiResponse } from "@/lib/keyword-shared";

export async function getKeywordInsights(keyword: string): Promise<KeywordApiResponse> {
  const data = await lookupNaverKeywords(keyword);
  const primary = data.results[0];
  const openApi = await getNaverOpenApiInsights(data.keyword, primary?.total ?? 0);

  return {
    ...data,
    openApi,
  };
}
