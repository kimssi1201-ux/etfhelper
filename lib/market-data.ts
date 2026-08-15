export type PricePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type DividendPoint = {
  date: string;
  paymentDate: string | null;
  amount: number;
};

export type FxAvailability = {
  status: "available" | "plan-restricted" | "unavailable";
  message: string | null;
};

export type StockMarketData = {
  symbol: string;
  name: string;
  currency: "USD";
  quote: {
    price: number;
    change: number | null;
    changePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    yearHigh: number | null;
    yearLow: number | null;
    volume: number | null;
    averageVolume: number | null;
    marketCap: number | null;
    timestamp: number | null;
  };
  profile: {
    companyName: string;
    description: string | null;
    sector: string | null;
    industry: string | null;
    exchange: string | null;
    website: string | null;
  };
  fxRate: number | null;
  availability: {
    fx: FxAvailability;
  };
  ttmDividend: number;
  dividendYield: number;
  prices: PricePoint[];
  dividends: DividendPoint[];
  updatedAt: string;
  delayed: boolean;
  source: "FMP Stable API";
};

export type StockApiErrorCode =
  | "FMP_API_KEY_MISSING"
  | "FMP_RATE_LIMIT"
  | "FMP_PLAN_RESTRICTED"
  | "FMP_AUTH_ERROR"
  | "FMP_NO_DATA"
  | "FMP_UPSTREAM_ERROR"
  | "UNSUPPORTED_SYMBOL";

export type StockApiError = {
  error: {
    code: StockApiErrorCode;
    message: string;
  };
};

export const US_WITHHOLDING_RATE = 0.15;

export function calculateAffordableShares(investmentKrw: number, fxRate: number, priceUsd: number) {
  if (![investmentKrw, fxRate, priceUsd].every(Number.isFinite) || investmentKrw <= 0 || fxRate <= 0 || priceUsd <= 0) {
    return 0;
  }
  return Math.floor(investmentKrw / fxRate / priceUsd);
}

export function calculateDividendIncome(shares: number, ttmDividendUsd: number, fxRate: number) {
  const safeShares = Number.isFinite(shares) ? Math.max(shares, 0) : 0;
  const safeTtm = Number.isFinite(ttmDividendUsd) ? Math.max(ttmDividendUsd, 0) : 0;
  const safeFx = Number.isFinite(fxRate) ? Math.max(fxRate, 0) : 0;
  const annualGrossUsd = safeShares * safeTtm;
  const annualGrossKrw = annualGrossUsd * safeFx;
  const taxMultiplier = 1 - US_WITHHOLDING_RATE;

  return {
    annualGrossUsd,
    annualGrossKrw,
    quarterlyGrossUsd: annualGrossUsd / 4,
    quarterlyGrossKrw: annualGrossKrw / 4,
    monthlyGrossUsd: annualGrossUsd / 12,
    monthlyGrossKrw: annualGrossKrw / 12,
    annualNetUsd: annualGrossUsd * taxMultiplier,
    annualNetKrw: annualGrossKrw * taxMultiplier,
    quarterlyNetUsd: annualGrossUsd * taxMultiplier / 4,
    quarterlyNetKrw: annualGrossKrw * taxMultiplier / 4,
    monthlyNetUsd: annualGrossUsd * taxMultiplier / 12,
    monthlyNetKrw: annualGrossKrw * taxMultiplier / 12,
  };
}

export function calculateTargetIncome(
  targetMonthlyNetKrw: number,
  ttmDividendUsd: number,
  priceUsd: number,
  fxRate: number,
) {
  const perShareAnnualNetKrw = Math.max(ttmDividendUsd, 0) * Math.max(fxRate, 0) * (1 - US_WITHHOLDING_RATE);
  if (!Number.isFinite(targetMonthlyNetKrw) || targetMonthlyNetKrw <= 0 || perShareAnnualNetKrw <= 0 || priceUsd <= 0) {
    return { shares: 0, investmentKrw: 0, investmentUsd: 0 };
  }
  const shares = Math.ceil(targetMonthlyNetKrw * 12 / perShareAnnualNetKrw);
  const investmentUsd = shares * priceUsd;
  return { shares, investmentUsd, investmentKrw: investmentUsd * fxRate };
}
