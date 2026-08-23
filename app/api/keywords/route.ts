import { getKeywordInsights } from "@/lib/keyword-data";
import { NaverSearchAdError } from "@/lib/naver-searchad";

const STATUS_BY_CODE: Record<NaverSearchAdError["code"], number> = {
  NAVER_SEARCHAD_CONFIG_MISSING: 503,
  NAVER_SEARCHAD_AUTH_ERROR: 401,
  NAVER_SEARCHAD_RATE_LIMIT: 429,
  NAVER_SEARCHAD_NO_DATA: 404,
  NAVER_SEARCHAD_UPSTREAM_ERROR: 502,
};
const KEYWORD_FETCH_FAILED_MESSAGE = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요";

function warnKeywordError(keyword: string, error: unknown) {
  if (error instanceof NaverSearchAdError) {
    console.warn("Naver SearchAd keyword lookup failed", {
      code: error.code,
      details: error.details,
      keyword,
      message: error.message,
    });
    return;
  }

  console.warn("Unexpected keyword lookup failure", {
    keyword,
    message: error instanceof Error ? error.message : String(error),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword") ?? "";

  try {
    const data = await getKeywordInsights(keyword);

    return Response.json(
      data,
      {
        headers: {
          "cache-control": "public, max-age=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    warnKeywordError(keyword, error);

    if (error instanceof NaverSearchAdError) {
      return Response.json(
        { error: { code: error.code, message: KEYWORD_FETCH_FAILED_MESSAGE } },
        {
          status: STATUS_BY_CODE[error.code],
          headers: { "cache-control": "no-store" },
        },
      );
    }

    return Response.json(
      { error: { code: "NAVER_SEARCHAD_UPSTREAM_ERROR", message: KEYWORD_FETCH_FAILED_MESSAGE } },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
