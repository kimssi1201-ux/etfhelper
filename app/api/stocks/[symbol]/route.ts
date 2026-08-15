import type { StockApiError, StockApiErrorCode } from "@/lib/market-data";
import { FmpDataError, getStockMarketData } from "@/lib/fmp";
import { getStockBySymbol } from "@/lib/stocks";

type RouteContext = {
  params: Promise<{ symbol: string }> | { symbol: string };
};

const ERROR_STATUS: Record<StockApiErrorCode, number> = {
  FMP_API_KEY_MISSING: 503,
  FMP_RATE_LIMIT: 429,
  FMP_AUTH_ERROR: 502,
  FMP_NO_DATA: 404,
  FMP_UPSTREAM_ERROR: 502,
  UNSUPPORTED_SYMBOL: 404,
};

function errorResponse(error: FmpDataError) {
  const body: StockApiError = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  return Response.json(body, {
    status: ERROR_STATUS[error.code],
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { symbol: routeSymbol } = await context.params;
  const symbol = routeSymbol.trim().toUpperCase();
  const stock = getStockBySymbol(symbol);

  if (!stock) {
    return errorResponse(new FmpDataError("UNSUPPORTED_SYMBOL", "지원하지 않는 종목입니다."));
  }

  try {
    const data = await getStockMarketData(stock.symbol);
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    if (error instanceof FmpDataError) return errorResponse(error);
    return errorResponse(new FmpDataError("FMP_UPSTREAM_ERROR", "시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."));
  }
}
