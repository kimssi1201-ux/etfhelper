const NAVER_SEARCHAD_BASE_URL = "https://api.searchad.naver.com";
const KEYWORD_TOOL_PATH = "/keywordstool";
const KEYWORD_CACHE_SECONDS = 60 * 60;

type SearchAdFetchInit = RequestInit & {
  next?: { revalidate: number };
  cf?: { cacheEverything: boolean; cacheTtl: number };
};

type KeywordToolRow = {
  relKeyword?: unknown;
  monthlyPcQcCnt?: unknown;
  monthlyMobileQcCnt?: unknown;
  compIdx?: unknown;
  plAvgDepth?: unknown;
};

type KeywordToolResponse = {
  keywordList?: KeywordToolRow[];
};

export type KeywordMetric = {
  keyword: string;
  pc: number;
  mobile: number;
  total: number;
  mobileRate: number;
  competition: string;
  bid: number | null;
};

export type KeywordLookupResult = {
  keyword: string;
  results: KeywordMetric[];
  updatedAt: string;
  source: "NAVER_SEARCHAD";
};

export class NaverSearchAdError extends Error {
  constructor(
    public readonly code:
      | "NAVER_SEARCHAD_CONFIG_MISSING"
      | "NAVER_SEARCHAD_AUTH_ERROR"
      | "NAVER_SEARCHAD_RATE_LIMIT"
      | "NAVER_SEARCHAD_NO_DATA"
      | "NAVER_SEARCHAD_UPSTREAM_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "NaverSearchAdError";
  }
}

function getConfig() {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY?.trim();
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY?.trim();
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID?.trim();
  if (!apiKey || !secretKey || !customerId) {
    throw new NaverSearchAdError(
      "NAVER_SEARCHAD_CONFIG_MISSING",
      "서버에 네이버 검색광고 API 환경변수가 설정되지 않았습니다.",
    );
  }
  return { apiKey, secretKey, customerId };
}

function toBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function createSignature(timestamp: string, method: string, path: string, secretKey: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${method}.${path}`));
  return toBase64(signature);
}

function parseCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, "").trim();
  if (/^<\s*10$/.test(normalized)) return 9;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

function parseBid(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCompetition(value: unknown) {
  const normalized = text(value).toUpperCase();
  if (normalized === "HIGH") return "높음";
  if (normalized === "MID") return "중간";
  if (normalized === "LOW") return "낮음";
  return normalized || "-";
}

export async function lookupNaverKeywords(keyword: string): Promise<KeywordLookupResult> {
  const query = keyword.trim().replace(/\s+/g, " ");
  if (query.length < 1) throw new NaverSearchAdError("NAVER_SEARCHAD_NO_DATA", "검색어를 입력해 주세요.");

  const { apiKey, secretKey, customerId } = getConfig();
  const method = "GET";
  const timestamp = Date.now().toString();
  const signature = await createSignature(timestamp, method, KEYWORD_TOOL_PATH, secretKey);
  const url = new URL(KEYWORD_TOOL_PATH, NAVER_SEARCHAD_BASE_URL);
  url.searchParams.set("hintKeywords", query);
  url.searchParams.set("showDetail", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-Timestamp": timestamp,
        "X-API-KEY": apiKey,
        "X-Customer": customerId,
        "X-Signature": signature,
      },
      next: { revalidate: KEYWORD_CACHE_SECONDS },
      cf: { cacheEverything: true, cacheTtl: KEYWORD_CACHE_SECONDS },
    } as SearchAdFetchInit);
  } catch {
    throw new NaverSearchAdError("NAVER_SEARCHAD_UPSTREAM_ERROR", "네이버 검색광고 API에 연결하지 못했습니다.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new NaverSearchAdError("NAVER_SEARCHAD_AUTH_ERROR", "네이버 검색광고 API 인증에 실패했습니다.");
  }
  if (response.status === 429) {
    throw new NaverSearchAdError("NAVER_SEARCHAD_RATE_LIMIT", "네이버 검색광고 API 호출 한도를 초과했습니다.");
  }
  if (!response.ok) {
    throw new NaverSearchAdError("NAVER_SEARCHAD_UPSTREAM_ERROR", "네이버 검색광고 API 응답을 처리하지 못했습니다.");
  }

  let payload: KeywordToolResponse;
  try {
    payload = await response.json() as KeywordToolResponse;
  } catch {
    throw new NaverSearchAdError("NAVER_SEARCHAD_UPSTREAM_ERROR", "네이버 검색광고 API 응답 형식이 올바르지 않습니다.");
  }

  const rows = Array.isArray(payload.keywordList) ? payload.keywordList : [];
  const metrics = rows.flatMap((row): KeywordMetric[] => {
    const relKeyword = text(row.relKeyword);
    if (!relKeyword) return [];
    const pc = parseCount(row.monthlyPcQcCnt);
    const mobile = parseCount(row.monthlyMobileQcCnt);
    const total = pc + mobile;
    return [{
      keyword: relKeyword,
      pc,
      mobile,
      total,
      mobileRate: total > 0 ? Math.round((mobile / total) * 100) : 0,
      competition: normalizeCompetition(row.compIdx),
      bid: parseBid(row.plAvgDepth),
    }];
  });

  const normalizedQuery = query.replace(/\s+/g, "").toUpperCase();
  const relevantMetrics = metrics.filter((item) => item.keyword.replace(/\s+/g, "").toUpperCase().includes(normalizedQuery));
  const results = (relevantMetrics.length > 0 ? relevantMetrics : metrics)
    .sort((a, b) => b.total - a.total)
    .slice(0, 200);

  if (results.length === 0) {
    throw new NaverSearchAdError("NAVER_SEARCHAD_NO_DATA", "조회 가능한 키워드 데이터가 없습니다.");
  }

  return {
    keyword: query,
    results,
    updatedAt: new Date().toISOString(),
    source: "NAVER_SEARCHAD",
  };
}
