const ALLOWED_EXCHANGES = new Set([
  "NYQ",
  "NMS",
  "NGM",
  "NCM",
  "PCX",
  "BTS",
  "ASE",
  "KSC",
  "KOE",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  if (!query || query.length > 60) {
    return Response.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
  }

  try {
    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", query);
    url.searchParams.set("quotesCount", "12");
    url.searchParams.set("newsCount", "0");
    url.searchParams.set("listsCount", "0");
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 ETF-Flow/1.0" },
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit);
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const data = (await response.json()) as { quotes?: Array<Record<string, unknown>> };
    const results = (data.quotes ?? [])
      .filter((quote) => {
        const symbol = String(quote.symbol ?? "");
        const exchange = String(quote.exchange ?? "");
        return quote.quoteType === "ETF" && (symbol.endsWith(".KS") || symbol.endsWith(".KQ") || ALLOWED_EXCHANGES.has(exchange));
      })
      .map((quote) => {
        const symbol = String(quote.symbol ?? "");
        const market = symbol.endsWith(".KS") || symbol.endsWith(".KQ") ? "KR" : "US";
        return {
          symbol,
          name: String(quote.longname ?? quote.shortname ?? symbol),
          exchange: String(quote.exchDisp ?? quote.exchange ?? ""),
          market,
          currency: market === "KR" ? "KRW" : "USD",
        };
      });
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json(
      { error: "자동 검색이 잠시 원활하지 않습니다. 티커로 다시 시도하거나 직접 입력해 주세요." },
      { status: 502 },
    );
  }
}
