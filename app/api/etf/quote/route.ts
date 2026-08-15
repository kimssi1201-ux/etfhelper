import { calculatePercentChange, type EtfQuote } from "@/lib/calculations";

type ChartResult = {
  meta?: Record<string, unknown>;
  timestamp?: Array<number | null>;
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
    }>;
  };
  events?: { dividends?: Record<string, { amount?: number; date?: number }> };
};

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function marketHistory(chart: ChartResult, yearAgo: number) {
  const timestamps = chart.timestamp ?? [];
  const quote = chart.indicators?.quote?.[0];
  const closes = quote?.close ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];

  return timestamps
    .map((timestamp, index) => ({
      timestamp: Number(timestamp ?? 0),
      close: positiveNumber(closes[index]),
      high: positiveNumber(highs[index]),
      low: positiveNumber(lows[index]),
    }))
    .filter(
      (point): point is { timestamp: number; close: number; high: number | null; low: number | null } =>
        point.timestamp >= yearAgo && point.close !== null,
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function getChart(symbol: string, events = false) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 400 * 24 * 60 * 60;
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("period1", String(start));
  url.searchParams.set("period2", String(end));
  url.searchParams.set("interval", "1d");
  if (events) url.searchParams.set("events", "div");
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 ETF-Flow/1.0" },
    cf: { cacheTtl: events ? 3600 : 600, cacheEverything: true },
  } as RequestInit);
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  const json = (await response.json()) as { chart?: { result?: ChartResult[]; error?: unknown } };
  const result = json.chart?.result?.[0];
  if (!result) throw new Error("missing chart");
  return result;
}

function inferFrequency(dates: number[]) {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a - b);
  const gaps = sorted.slice(1).map((date, index) => (date - sorted[index]) / 86400);
  const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  if (median <= 12) return 52;
  if (median <= 46) return 12;
  if (median <= 115) return 4;
  if (median <= 225) return 2;
  return 1;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.^=-]{1,20}$/.test(symbol)) {
    return Response.json({ error: "올바른 ETF 티커를 입력해 주세요." }, { status: 400 });
  }

  try {
    const chart = await getChart(symbol, true);
    const meta = chart.meta ?? {};
    const currency = String(meta.currency ?? (symbol.endsWith(".KS") ? "KRW" : "USD"));
    if (currency !== "KRW" && currency !== "USD") {
      return Response.json({ error: "현재는 원화와 미국 달러 ETF만 지원합니다." }, { status: 400 });
    }
    const fxChart = currency === "USD" ? await getChart("KRW=X").catch(() => null) : null;
    const dividends = Object.values(chart.events?.dividends ?? {})
      .map((item) => ({ date: Number(item.date ?? 0), amount: Number(item.amount ?? 0) }))
      .filter((item) => item.date > 0 && item.amount >= 0)
      .sort((a, b) => b.date - a.date);
    const yearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
    const ttmDividend = dividends.filter((item) => item.date >= yearAgo).reduce((sum, item) => sum + item.amount, 0);
    const history = marketHistory(chart, yearAgo);
    const latestClose = history.at(-1)?.close ?? null;
    const price = positiveNumber(meta.regularMarketPrice) ?? latestClose ?? positiveNumber(meta.previousClose) ?? 0;
    const previousClose = positiveNumber(meta.regularMarketPreviousClose)
      ?? positiveNumber(meta.previousClose)
      ?? history.at(-2)?.close
      ?? null;
    const observedLows = history.flatMap((point) => point.low === null ? [] : [point.low]);
    const observedHighs = history.flatMap((point) => point.high === null ? [] : [point.high]);
    const fiftyTwoWeekLow = positiveNumber(meta.fiftyTwoWeekLow)
      ?? (observedLows.length > 0 ? Math.min(...observedLows) : null);
    const fiftyTwoWeekHigh = positiveNumber(meta.fiftyTwoWeekHigh)
      ?? (observedHighs.length > 0 ? Math.max(...observedHighs) : null);
    const yearStart = Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000;
    const ytdBaseline = [...history].reverse().find((point) => point.timestamp < yearStart)?.close ?? null;
    const fxRate = Number(fxChart?.meta?.regularMarketPrice ?? fxChart?.meta?.previousClose ?? 0);
    const quote = {
      symbol,
      name: String(meta.longName ?? meta.shortName ?? symbol),
      market: currency === "KRW" ? "KR" : "US",
      currency,
      price,
      ttmDividend,
      lastDividend: dividends[0]?.amount ?? 0,
      frequency: inferFrequency(dividends.slice(0, 8).map((item) => item.date)),
      fxRate: fxRate || 1350,
      previousClose,
      dayChangePercent: previousClose === null ? null : calculatePercentChange(price, previousClose),
      fiftyTwoWeekLow,
      fiftyTwoWeekHigh,
      ytdPercent: ytdBaseline === null ? null : calculatePercentChange(price, ytdBaseline),
      priceHistory: history.map((point) => ({
        date: new Date(point.timestamp * 1000).toISOString().slice(0, 10),
        close: point.close,
      })),
      dividendCount: dividends.length,
      dividends: dividends.slice(0, 12).map((item) => ({
        date: new Date(item.date * 1000).toISOString().slice(0, 10),
        amount: item.amount,
      })),
      updatedAt: new Date().toISOString(),
    } satisfies EtfQuote;
    return Response.json(
      quote,
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  } catch {
    return Response.json(
      { error: "시세와 분배금 정보를 불러오지 못했습니다. 직접 입력으로 계속할 수 있습니다." },
      { status: 502 },
    );
  }
}
