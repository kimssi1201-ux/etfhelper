import { getNaverOpenApiInsights } from "@/lib/naver-openapi";
import { lookupNaverKeywords, NaverSearchAdError } from "@/lib/naver-searchad";

const STATUS_BY_CODE: Record<NaverSearchAdError["code"], number> = {
  NAVER_SEARCHAD_CONFIG_MISSING: 503,
  NAVER_SEARCHAD_AUTH_ERROR: 401,
  NAVER_SEARCHAD_RATE_LIMIT: 429,
  NAVER_SEARCHAD_NO_DATA: 404,
  NAVER_SEARCHAD_UPSTREAM_ERROR: 502,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword") ?? "";

  try {
    const data = await lookupNaverKeywords(keyword);
    const primary = data.results[0];
    const openApi = await getNaverOpenApiInsights(data.keyword, primary?.total ?? 0);

    return Response.json(
      {
        ...data,
        openApi,
      },
      {
        headers: {
          "cache-control": "public, max-age=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    if (error instanceof NaverSearchAdError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        {
          status: STATUS_BY_CODE[error.code],
          headers: { "cache-control": "no-store" },
        },
      );
    }

    return Response.json(
      { error: { code: "NAVER_SEARCHAD_UPSTREAM_ERROR", message: "키워드 데이터를 불러오지 못했습니다." } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
