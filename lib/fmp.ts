import type {
  DividendPoint,
  PricePoint,
  StockApiErrorCode,
  StockMarketData,
} from "@/lib/market-data";
import { getStockBySymbol } from "@/lib/stocks";

const FMP_BASE_URL = "https://financialmodelingprep.com";

const CACHE_TTL = {
  quote: 60 * 60,
  fx: 6 * 60 * 60,
  prices: 12 * 60 * 60,
  dividends: 24 * 60 * 60,
  profile: 24 * 60 * 60,
} as const;

const QUOTE_DELAY_THRESHOLD_MS = 20 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

type FmpRecord = Record<string, unknown>;

type FmpFetchInit = RequestInit & {
  next?: { revalidate: number };
  cf?: { cacheEverything: boolean; cacheTtl: number };
};

export class FmpDataError extends Error {
  constructor(
    public readonly code: StockApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FmpDataError";
  }
}

function fixedError(code: StockApiErrorCode) {
  switch (code) {
    case "FMP_API_KEY_MISSING":
      return new FmpDataError(
        code,
        "서버에 FMP_API_KEY 환경변수가 설정되지 않았습니다. 프로젝트의 .env.local 또는 배포 환경변수에서 설정해 주세요.",
      );
    case "FMP_RATE_LIMIT":
      return new FmpDataError(code, "FMP API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.");
    case "FMP_AUTH_ERROR":
      return new FmpDataError(code, "FMP API 인증에 실패했습니다. 서버 환경변수 설정을 확인해 주세요.");
    case "FMP_NO_DATA":
      return new FmpDataError(code, "요청한 종목의 시장 데이터를 찾을 수 없습니다.");
    case "UNSUPPORTED_SYMBOL":
      return new FmpDataError(code, "지원하지 않는 종목입니다.");
    default:
      return new FmpDataError(code, "시장 데이터 제공사에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

function classifyPayloadError(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const text = Object.values(payload as FmpRecord)
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/limit|too many|quota|upgrade|subscription/.test(text)) return fixedError("FMP_RATE_LIMIT");
  if (/api[ _-]?key|unauthori[sz]ed|forbidden|authentication/.test(text)) return fixedError("FMP_AUTH_ERROR");
  return null;
}

async function fetchFmpArray(path: string, params: Record<string, string>, ttl: number) {
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!apiKey) throw fixedError("FMP_API_KEY_MISSING");

  const url = new URL(path, FMP_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { apikey: apiKey },
      next: { revalidate: ttl },
      cf: { cacheEverything: true, cacheTtl: ttl },
    } as FmpFetchInit);
  } catch {
    throw fixedError("FMP_UPSTREAM_ERROR");
  }

  if (response.status === 401 || response.status === 403) throw fixedError("FMP_AUTH_ERROR");
  if (response.status === 429) throw fixedError("FMP_RATE_LIMIT");
  if (response.status >= 500) throw fixedError("FMP_UPSTREAM_ERROR");
  if (!response.ok) throw fixedError("FMP_UPSTREAM_ERROR");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw fixedError("FMP_UPSTREAM_ERROR");
  }

  const payloadError = classifyPayloadError(payload);
  if (payloadError) throw payloadError;
  if (!Array.isArray(payload)) throw fixedError("FMP_UPSTREAM_ERROR");
  if (payload.length === 0) throw fixedError("FMP_NO_DATA");

  const records = payload.filter(
    (item): item is FmpRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
  if (records.length === 0) throw fixedError("FMP_NO_DATA");
  return records;
}

function finiteNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function positiveNumber(...values: unknown[]) {
  const number = finiteNumber(...values);
  return number !== null && number > 0 ? number : null;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function validDateKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ? value : null;
}

function epochSeconds(value: unknown) {
  const number = positiveNumber(value);
  if (number === null) return null;
  const seconds = number > 10_000_000_000 ? Math.floor(number / 1000) : Math.floor(number);
  const dateMs = seconds * 1000;
  return seconds > 0 && Number.isFinite(dateMs) && dateMs <= 8.64e15 ? seconds : null;
}

function isDelayed(timestamp: number | null, nowMs: number) {
  if (timestamp === null) return true;
  const quoteMs = timestamp * 1000;
  const age = nowMs - quoteMs;
  return age > QUOTE_DELAY_THRESHOLD_MS || age < -MAX_FUTURE_CLOCK_SKEW_MS;
}

function parsePrices(rows: FmpRecord[]) {
  const prices = rows.flatMap((row): PricePoint[] => {
    const date = validDateKey(row.date);
    const open = positiveNumber(row.open);
    const high = positiveNumber(row.high);
    const low = positiveNumber(row.low);
    const close = positiveNumber(row.close);
    const volume = finiteNumber(row.volume);
    if (!date || open === null || high === null || low === null || close === null || volume === null || volume < 0) return [];
    return [{ date, open, high, low, close, volume }];
  });

  if (prices.length === 0) throw fixedError("FMP_NO_DATA");
  return prices.sort((a, b) => a.date.localeCompare(b.date));
}

function parseDividends(rows: FmpRecord[], today: string) {
  const dividends = rows.flatMap((row): DividendPoint[] => {
    const date = validDateKey(row.date);
    const paymentDate = validDateKey(row.paymentDate);
    const adjusted = finiteNumber(row.adjDividend);
    const unadjusted = finiteNumber(row.dividend);
    const amount = adjusted !== null && adjusted >= 0 ? adjusted : unadjusted;
    if (!date || date > today || (paymentDate !== null && paymentDate > today) || amount === null || amount < 0) return [];

    return [{
      date,
      paymentDate,
      amount,
    }];
  });

  if (dividends.length === 0) throw fixedError("FMP_NO_DATA");
  return dividends.sort((a, b) => b.date.localeCompare(a.date));
}

function calculateTtmDividend(dividends: DividendPoint[], nowMs: number) {
  const cutoffMs = nowMs - 365 * 24 * 60 * 60 * 1000;
  return dividends.reduce((sum, dividend) => {
    const dividendMs = Date.parse(`${dividend.date}T00:00:00Z`);
    return dividendMs >= cutoffMs && dividendMs <= nowMs ? sum + dividend.amount : sum;
  }, 0);
}

function calculateChangePercent(price: number, previousClose: number | null) {
  if (previousClose === null || previousClose <= 0) return null;
  return ((price - previousClose) / previousClose) * 100;
}

export async function getStockMarketData(symbol: string): Promise<StockMarketData> {
  const stock = getStockBySymbol(symbol);
  if (!stock) throw fixedError("UNSUPPORTED_SYMBOL");

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 6, now.getUTCMonth(), now.getUTCDate()));
  const commonParams = { symbol: stock.symbol };

  const [quoteRows, profileRows, priceRows, dividendRows, fxRows] = await Promise.all([
    fetchFmpArray("/stable/quote", commonParams, CACHE_TTL.quote),
    fetchFmpArray("/stable/profile", commonParams, CACHE_TTL.profile),
    fetchFmpArray(
      "/stable/historical-price-eod/full",
      { ...commonParams, from: dateKey(from), to: dateKey(now) },
      CACHE_TTL.prices,
    ),
    fetchFmpArray("/stable/dividends", { ...commonParams, limit: "1000" }, CACHE_TTL.dividends),
    fetchFmpArray("/stable/quote", { symbol: "USDKRW" }, CACHE_TTL.fx),
  ]);

  const quote = quoteRows[0];
  const profile = profileRows[0];
  const fxQuote = fxRows[0];
  const price = positiveNumber(quote.price);
  const fxRate = positiveNumber(fxQuote.price);
  if (price === null || fxRate === null) throw fixedError("FMP_NO_DATA");

  const prices = parsePrices(priceRows);
  const dividends = parseDividends(dividendRows, dateKey(now));
  const nowMs = now.getTime();
  const ttmDividend = calculateTtmDividend(dividends, nowMs);
  const timestamp = epochSeconds(quote.timestamp);
  const previousClose = positiveNumber(quote.previousClose);
  const reportedChange = finiteNumber(quote.change);
  const reportedChangePercent = finiteNumber(quote.changePercentage, quote.changesPercentage);
  const companyName = nullableText(profile.companyName) ?? nullableText(quote.name) ?? stock.nameEn;

  return {
    symbol: stock.symbol,
    name: companyName,
    currency: "USD",
    quote: {
      price,
      change: reportedChange ?? (previousClose === null ? null : price - previousClose),
      changePercent: reportedChangePercent ?? calculateChangePercent(price, previousClose),
      dayHigh: positiveNumber(quote.dayHigh),
      dayLow: positiveNumber(quote.dayLow),
      yearHigh: positiveNumber(quote.yearHigh),
      yearLow: positiveNumber(quote.yearLow),
      volume: finiteNumber(quote.volume),
      averageVolume: finiteNumber(quote.averageVolume, quote.avgVolume, profile.averageVolume),
      marketCap: finiteNumber(quote.marketCap, profile.marketCap),
      timestamp,
    },
    profile: {
      companyName,
      description: nullableText(profile.description),
      sector: nullableText(profile.sector),
      industry: nullableText(profile.industry),
      exchange: nullableText(profile.exchangeFullName) ?? nullableText(profile.exchange),
      website: nullableText(profile.website),
    },
    fxRate,
    ttmDividend,
    dividendYield: price > 0 ? ttmDividend / price * 100 : 0,
    prices,
    dividends,
    updatedAt: timestamp === null ? now.toISOString() : new Date(timestamp * 1000).toISOString(),
    delayed: isDelayed(timestamp, nowMs),
    source: "FMP Stable API",
  };
}
