export type Market = "KR" | "US";
export type Currency = "KRW" | "USD";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  source: "auto" | "manual";
  price: number;
  shares: number;
  ttmDividend: number;
  lastDividend: number;
  frequency: number;
  taxRate: number;
  fxRate: number;
  lastUpdated?: string;
};

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateHolding(holding: Holding) {
  const fx = holding.currency === "USD" ? Math.max(holding.fxRate, 0) : 1;
  const shares = Math.max(holding.shares, 0);
  const price = Math.max(holding.price, 0);
  const ttmDividend = Math.max(holding.ttmDividend, 0);
  const forwardDividend = Math.max(holding.lastDividend, 0) * Math.max(holding.frequency, 0);
  const taxMultiplier = 1 - Math.min(Math.max(holding.taxRate, 0), 100) / 100;
  const valueKrw = shares * price * fx;
  const ttmGrossKrw = shares * ttmDividend * fx;
  const forwardGrossKrw = shares * forwardDividend * fx;

  return {
    valueKrw,
    ttmYield: price > 0 ? (ttmDividend / price) * 100 : 0,
    forwardYield: price > 0 && forwardDividend > 0 ? (forwardDividend / price) * 100 : 0,
    ttmGrossKrw,
    ttmNetKrw: ttmGrossKrw * taxMultiplier,
    forwardGrossKrw,
    forwardNetKrw: forwardGrossKrw * taxMultiplier,
  };
}

export function calculatePortfolio(holdings: Holding[]) {
  return holdings.reduce(
    (total, holding) => {
      const result = calculateHolding(holding);
      total.valueKrw += result.valueKrw;
      total.ttmGrossKrw += result.ttmGrossKrw;
      total.ttmNetKrw += result.ttmNetKrw;
      total.forwardGrossKrw += result.forwardGrossKrw;
      total.forwardNetKrw += result.forwardNetKrw;
      if (holding.market === "KR") total.krValue += result.valueKrw;
      else total.usValue += result.valueKrw;
      return total;
    },
    {
      valueKrw: 0,
      ttmGrossKrw: 0,
      ttmNetKrw: 0,
      forwardGrossKrw: 0,
      forwardNetKrw: 0,
      krValue: 0,
      usValue: 0,
    },
  );
}
