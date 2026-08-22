const NAVER_OPENAPI_BASE_URL = "https://openapi.naver.com";
const OPENAPI_CACHE_SECONDS = 60 * 60 * 6;

type NaverOpenApiFetchInit = RequestInit & {
  next?: { revalidate: number };
  cf?: { cacheEverything: boolean; cacheTtl: number };
};

type SearchTotalResponse = {
  total?: unknown;
};

type DatalabResponse = {
  results?: Array<{
    title?: unknown;
    keywords?: unknown;
    data?: Array<{
      period?: unknown;
      ratio?: unknown;
    }>;
  }>;
};

export type NaverDocumentStats = {
  blog: number | null;
  news: number | null;
  cafe: number | null;
  web: number | null;
  total: number | null;
  saturationIndex: number | null;
};

export type NaverTrendPoint = {
  period: string;
  ratio: number;
};

export type NaverOpenApiInsights = {
  availability: {
    status: "available" | "config-missing" | "auth-error" | "rate-limit" | "unavailable";
    message: string | null;
  };
  documentStats: NaverDocumentStats | null;
  trend: NaverTrendPoint[];
  updatedAt: string | null;
  source: "NAVER_OPENAPI";
};

class NaverOpenApiSoftError extends Error {
  constructor(
    public readonly status: NaverOpenApiInsights["availability"]["status"],
    message: string,
  ) {
    super(message);
    this.name = "NaverOpenApiSoftError";
  }
}

function getConfig() {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new NaverOpenApiSoftError(
      "config-missing",
      "네이버 개발자센터 API 키가 설정되지 않았습니다.",
    );
  }
  return { clientId, clientSecret };
}

function numberOrNull(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

function ratioOrNull(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function safePeriod(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$|^\d{4}-\d{2}$/.test(value) ? value : null;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function trendDateRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = addMonths(end, -11);
  start.setUTCDate(1);
  return { startDate: ymd(start), endDate: ymd(end) };
}

async function fetchOpenApiJson<T>(path: string, init: RequestInit = {}) {
  const { clientId, clientSecret } = getConfig();
  const response = await fetch(new URL(path, NAVER_OPENAPI_BASE_URL), {
    ...init,
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
      ...(init.headers ?? {}),
    },
    next: { revalidate: OPENAPI_CACHE_SECONDS },
    cf: { cacheEverything: true, cacheTtl: OPENAPI_CACHE_SECONDS },
  } as NaverOpenApiFetchInit);

  if (response.status === 401 || response.status === 403) {
    throw new NaverOpenApiSoftError("auth-error", "네이버 개발자센터 API 인증에 실패했습니다.");
  }
  if (response.status === 429) {
    throw new NaverOpenApiSoftError("rate-limit", "네이버 개발자센터 API 호출 한도를 초과했습니다.");
  }
  if (!response.ok) {
    throw new NaverOpenApiSoftError("unavailable", "네이버 개발자센터 API 응답을 처리하지 못했습니다.");
  }

  try {
    return await response.json() as T;
  } catch {
    throw new NaverOpenApiSoftError("unavailable", "네이버 개발자센터 API 응답 형식이 올바르지 않습니다.");
  }
}

async function fetchSearchTotal(endpoint: "blog" | "news" | "cafearticle" | "webkr", keyword: string) {
  const url = new URL(`/v1/search/${endpoint}.json`, NAVER_OPENAPI_BASE_URL);
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", "1");
  url.searchParams.set("start", "1");
  const payload = await fetchOpenApiJson<SearchTotalResponse>(`${url.pathname}${url.search}`);
  return numberOrNull(payload.total);
}

async function fetchDocumentStats(keyword: string, monthlySearchVolume: number): Promise<NaverDocumentStats> {
  const [blog, news, cafe, web] = await Promise.all([
    fetchSearchTotal("blog", keyword),
    fetchSearchTotal("news", keyword),
    fetchSearchTotal("cafearticle", keyword),
    fetchSearchTotal("webkr", keyword),
  ]);
  const total = [blog, news, cafe, web].every((value) => value === null)
    ? null
    : [blog, news, cafe, web].reduce((sum, value) => sum + (value ?? 0), 0);
  const saturationIndex = total !== null && monthlySearchVolume > 0
    ? Math.round((total / monthlySearchVolume) * 1000) / 10
    : null;

  return { blog, news, cafe, web, total, saturationIndex };
}

async function fetchTrend(keyword: string): Promise<NaverTrendPoint[]> {
  const { startDate, endDate } = trendDateRange();
  const payload = await fetchOpenApiJson<DatalabResponse>("/v1/datalab/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate,
      endDate,
      timeUnit: "month",
      keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    }),
  });
  const data = payload.results?.[0]?.data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((item): NaverTrendPoint[] => {
    const period = safePeriod(item.period);
    const ratio = ratioOrNull(item.ratio);
    return period && ratio !== null ? [{ period, ratio }] : [];
  });
}

export async function getNaverOpenApiInsights(keyword: string, monthlySearchVolume: number): Promise<NaverOpenApiInsights> {
  const query = keyword.trim().replace(/\s+/g, " ");
  if (!query) {
    return {
      availability: { status: "unavailable", message: "검색어가 없어 보조 분석을 건너뛰었습니다." },
      documentStats: null,
      trend: [],
      updatedAt: null,
      source: "NAVER_OPENAPI",
    };
  }

  try {
    const [documentStats, trend] = await Promise.all([
      fetchDocumentStats(query, monthlySearchVolume),
      fetchTrend(query),
    ]);
    return {
      availability: { status: "available", message: null },
      documentStats,
      trend,
      updatedAt: new Date().toISOString(),
      source: "NAVER_OPENAPI",
    };
  } catch (error) {
    if (error instanceof NaverOpenApiSoftError) {
      return {
        availability: { status: error.status, message: error.message },
        documentStats: null,
        trend: [],
        updatedAt: null,
        source: "NAVER_OPENAPI",
      };
    }
    return {
      availability: { status: "unavailable", message: "네이버 개발자센터 API에 연결하지 못했습니다." },
      documentStats: null,
      trend: [],
      updatedAt: null,
      source: "NAVER_OPENAPI",
    };
  }
}
