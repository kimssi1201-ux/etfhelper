"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateHolding,
  calculatePortfolio,
  type DividendEvent,
  type EtfQuote,
  type Holding,
  type Market,
  type PriceHistoryPoint,
} from "@/lib/calculations";

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  market: Market;
  currency: "KRW" | "USD";
};

type Draft = Omit<Holding, "id" | "shares"> & {
  shares: number;
  inputMode: "shares" | "amount";
  investment: number;
  purchasePrice: number;
};

type PriceRange = "1M" | "3M" | "6M" | "1Y";

const STORAGE_KEY = "etf-flow-portfolio-v1";
const EMPTY_DIVIDENDS: DividendEvent[] = [];
const EMPTY_PRICES: PriceHistoryPoint[] = [];
const priceRangeDays: Record<PriceRange, number> = { "1M": 31, "3M": 92, "6M": 183, "1Y": 366 };

const quickPicks = [
  { symbol: "JEPI", label: "JEPI", sub: "미국 월분배" },
  { symbol: "JEPQ", label: "JEPQ", sub: "미국 월분배" },
  { symbol: "SCHD", label: "SCHD", sub: "미국 배당성장" },
  { symbol: "458730.KS", label: "TIGER 미국배당다우존스", sub: "국내 상장" },
  { symbol: "069500.KS", label: "KODEX 200", sub: "국내 대표지수" },
];

const investmentPresets = [
  { value: 10_000_000, label: "1,000만원 투자" },
  { value: 50_000_000, label: "5,000만원 투자" },
  { value: 100_000_000, label: "1억원 투자" },
];

const targetPresets = [
  { value: 2_000_000, label: "월 200만원" },
  { value: 5_000_000, label: "월 500만원" },
  { value: 10_000_000, label: "월 1,000만원" },
];

const emptyDraft = (): Draft => ({
  symbol: "",
  name: "",
  market: "KR",
  currency: "KRW",
  source: "manual",
  price: 0,
  purchasePrice: 0,
  shares: 0,
  investment: 10_000_000,
  inputMode: "amount",
  ttmDividend: 0,
  lastDividend: 0,
  frequency: 4,
  taxRate: 15.4,
  fxRate: 1350,
});

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" });
const formatWon = (value: number) => `${won.format(Math.round(value || 0))}원`;
const formatLocal = (value: number, currency: "KRW" | "USD") =>
  currency === "USD" ? `$${number.format(value || 0)}` : `${won.format(value || 0)}원`;
const formatPercent = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${number.format(value)}%` : "정보 없음";

function frequencyLabel(frequency: number) {
  if (frequency === 52) return "주배당";
  if (frequency === 12) return "월배당";
  if (frequency === 4) return "분기배당";
  if (frequency === 2) return "반기배당";
  if (frequency === 1) return "연배당";
  return "확인 필요";
}

export default function DividendApp() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [quote, setQuote] = useState<EtfQuote | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [targetMonthly, setTargetMonthly] = useState(2_000_000);
  const [displayCurrency, setDisplayCurrency] = useState<"KRW" | "USD">("KRW");
  const [priceRange, setPriceRange] = useState<PriceRange>("1Y");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const quoteRequestId = useRef(0);

  const loadQuote = useCallback(async (symbol: string, fallbackName?: string) => {
    const requestId = ++quoteRequestId.current;
    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(`/api/etf/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await response.json() as EtfQuote & { error?: string };
      if (requestId !== quoteRequestId.current) return;
      if (!response.ok) throw new Error(data.error);
      setDraft({
        ...emptyDraft(),
        symbol: data.symbol,
        name: data.name || fallbackName || data.symbol,
        market: data.market,
        currency: data.currency,
        source: "auto",
        price: data.price,
        purchasePrice: data.price,
        ttmDividend: data.ttmDividend,
        lastDividend: data.lastDividend,
        frequency: data.frequency || 0,
        taxRate: data.market === "KR" ? 15.4 : 15,
        fxRate: data.fxRate || 1350,
        lastUpdated: data.updatedAt,
      });
      setQuote(data);
      setDisplayCurrency("KRW");
      setPriceRange("1Y");
      setMode("auto");
      setMessage(data.dividendCount < 2
        ? "분배 이력이 적어 연환산 값은 직접 확인해 주세요."
        : "최신 시세와 분배 내역을 불러왔습니다.");
    } catch (error) {
      if (requestId !== quoteRequestId.current) return;
      const fallbackMarket: Market = /\.(KS|KQ)$/i.test(symbol) ? "KR" : "US";
      setQuote(null);
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 생겼습니다.");
      setMode("manual");
      setDraft({
        ...emptyDraft(),
        symbol,
        name: fallbackName || symbol,
        market: fallbackMarket,
        currency: fallbackMarket === "KR" ? "KRW" : "USD",
        taxRate: fallbackMarket === "KR" ? 15.4 : 15,
      });
    } finally {
      if (requestId === quoteRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { version?: number; holdings?: Holding[] };
        if (parsed.version === 1 && Array.isArray(parsed.holdings)) {
          // Restoring device-local state is intentionally performed after hydration.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHoldings(parsed.holdings);
        }
      }
    } catch {
      // Ignore malformed local data.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, holdings }));
  }, [holdings, hydrated]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuote("JEPI", "JPMorgan Equity Premium Income ETF");
    }, 0);
    return () => {
      window.clearTimeout(timer);
      quoteRequestId.current += 1;
    };
  }, [loadQuote]);

  const dividends = quote?.dividends ?? EMPTY_DIVIDENDS;
  const prices = quote?.priceHistory ?? EMPTY_PRICES;
  const fx = draft.currency === "USD" ? Math.max(draft.fxRate, 0) : 1;
  const previewShares = draft.inputMode === "amount" && draft.purchasePrice * fx > 0
    ? Math.floor(Math.max(draft.investment, 0) / (draft.purchasePrice * fx))
    : Math.max(draft.shares, 0);
  const actualInvestmentKrw = previewShares * Math.max(draft.purchasePrice, 0) * fx;
  const preview = useMemo(
    () => calculateHolding({
      id: "preview",
      symbol: draft.symbol,
      name: draft.name,
      market: draft.market,
      currency: draft.currency,
      source: draft.source,
      price: draft.price,
      shares: previewShares,
      ttmDividend: draft.ttmDividend,
      lastDividend: draft.lastDividend,
      frequency: draft.frequency,
      taxRate: draft.taxRate,
      fxRate: draft.fxRate,
      lastUpdated: draft.lastUpdated,
    }),
    [draft, previewShares],
  );
  const totals = useMemo(() => calculatePortfolio(holdings), [holdings]);
  const portfolioYield = totals.valueKrw > 0 ? (totals.ttmGrossKrw / totals.valueKrw) * 100 : 0;
  const netYield = Math.max(preview.ttmYield, 0) / 100 * (1 - Math.min(Math.max(draft.taxRate, 0), 100) / 100);
  const requiredInvestment = netYield > 0 ? (Math.max(targetMonthly, 0) * 12) / netYield : 0;
  const requiredShares = requiredInvestment > 0 && draft.price * fx > 0 ? requiredInvestment / (draft.price * fx) : 0;
  const requiredWholeShares = requiredShares > 0 ? Math.ceil(requiredShares) : 0;
  const requiredWholeInvestment = requiredWholeShares * draft.price * fx;
  const canCalculate = draft.name.trim().length > 0 && draft.price > 0 && previewShares > 0;

  const priceView = useMemo(() => {
    if (prices.length < 2) return null;
    const latestTime = Date.parse(`${prices.at(-1)?.date}T00:00:00Z`);
    const cutoff = latestTime - priceRangeDays[priceRange] * 86_400_000;
    const filtered = prices.filter((item) => Date.parse(`${item.date}T00:00:00Z`) >= cutoff);
    const points = filtered.length >= 2 ? filtered : prices;
    const closes = points.map((item) => item.close);
    const low = Math.min(...closes);
    const high = Math.max(...closes);
    const start = points[0].close;
    const end = points.at(-1)?.close ?? start;
    const change = start > 0 ? ((end - start) / start) * 100 : 0;
    const stride = Math.max(1, Math.ceil(points.length / 72));
    const sampled = points.filter((_, index) => index % stride === 0 || index === points.length - 1);
    const spread = high - low;
    const coordinates = sampled.map((point, index) => {
      const x = sampled.length === 1 ? 0 : (index / (sampled.length - 1)) * 100;
      const y = spread === 0 ? 50 : 8 + (1 - (point.close - low) / spread) * 84;
      return `${x.toFixed(2)}% ${y.toFixed(2)}%`;
    });
    return {
      points,
      low,
      high,
      start,
      end,
      change,
      polygon: `polygon(0 100%, ${coordinates.join(", ")}, 100% 100%)`,
    };
  }, [prices, priceRange]);

  const dividendView = useMemo(() => {
    const items = [...dividends].slice(0, 12).reverse();
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return {
      items,
      total,
      average: items.length ? total / items.length : 0,
      maximum: Math.max(0, ...items.map((item) => item.amount)),
    };
  }, [dividends]);

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const formatAssetValue = (value: number) =>
    draft.currency === "USD" && displayCurrency === "KRW" ? formatWon(value * fx) : formatLocal(value, draft.currency);
  const formatCashValue = (valueKrw: number) =>
    draft.currency === "USD" && displayCurrency === "USD" && fx > 0 ? `$${number.format(valueKrw / fx)}` : formatWon(valueKrw);

  async function searchEtfs(event?: React.FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(`/api/etf/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json() as { results?: SearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      if (!data.results?.length) setMessage("ETF를 찾지 못했습니다. 종목명이나 티커로 다시 검색해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검색 중 문제가 생겼습니다.");
    } finally {
      setLoading(false);
    }
  }

  function changeMarket(market: Market) {
    quoteRequestId.current += 1;
    setLoading(false);
    setQuote(null);
    setDisplayCurrency("KRW");
    setDraft((current) => ({
      ...current,
      market,
      currency: market === "KR" ? "KRW" : "USD",
      taxRate: market === "KR" ? 15.4 : 15,
    }));
  }

  function switchMode(nextMode: "auto" | "manual") {
    setMode(nextMode);
    setMessage("");
    setResults([]);
    if (nextMode === "manual") {
      quoteRequestId.current += 1;
      setLoading(false);
      setQuote(null);
      setDraft((current) => ({ ...current, source: "manual" }));
    }
  }

  function resetSelection() {
    quoteRequestId.current += 1;
    setLoading(false);
    setDraft(emptyDraft());
    setQuote(null);
    setResults([]);
    setQuery("");
    setMessage("");
    setDisplayCurrency("KRW");
  }

  function updateInvestment(value: number) {
    setDraft((current) => ({ ...current, investment: value, inputMode: "amount" }));
  }

  function updateShares(value: number) {
    setDraft((current) => ({
      ...current,
      shares: value,
      investment: value * Math.max(current.purchasePrice, 0) * (current.currency === "USD" ? Math.max(current.fxRate, 0) : 1),
      inputMode: "shares",
    }));
  }

  function updatePurchasePrice(value: number) {
    setDraft((current) => ({
      ...current,
      purchasePrice: value,
      investment: current.inputMode === "shares"
        ? current.shares * value * (current.currency === "USD" ? Math.max(current.fxRate, 0) : 1)
        : current.investment,
    }));
  }

  function updateFxRate(value: number) {
    setDraft((current) => ({
      ...current,
      fxRate: value,
      investment: current.inputMode === "shares"
        ? current.shares * Math.max(current.purchasePrice, 0) * Math.max(value, 0)
        : current.investment,
    }));
  }

  function updateCurrentPrice(value: number) {
    setDraft((current) => ({ ...current, price: value, purchasePrice: current.purchasePrice > 0 ? current.purchasePrice : value }));
  }

  function addHolding() {
    if (!draft.name.trim() || draft.price <= 0 || previewShares <= 0) {
      setMessage("종목, 현재가, 투자금 또는 보유 수량을 확인해 주세요.");
      return;
    }
    const holding: Holding = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
      symbol: draft.symbol,
      name: draft.name,
      market: draft.market,
      currency: draft.currency,
      source: draft.source,
      price: draft.price,
      shares: previewShares,
      ttmDividend: draft.ttmDividend,
      lastDividend: draft.lastDividend,
      frequency: draft.frequency,
      taxRate: draft.taxRate,
      fxRate: draft.fxRate,
      lastUpdated: draft.lastUpdated,
    };
    setHoldings((current) => [...current, holding]);
    setMessage("내 포트폴리오에 추가했습니다.");
  }

  const updateHolding = (id: string, patch: Partial<Holding>) =>
    setHoldings((current) => current.map((holding) => holding.id === id ? { ...holding, ...patch } : holding));

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ETF Flow 홈"><span className="brand-mark" aria-hidden="true">↗</span><span>ETF FLOW</span></a>
        <span className="local-save"><i aria-hidden="true" /> 가입 없이 이 기기에 저장</span>
      </header>

      <section className="page-intro" id="top">
        <span className="intro-badge">국내 · 미국 ETF 지원</span>
        <h1>ETF 배당금 계산기</h1>
        <p>JEPI·SCHD·JEPQ 등 ETF의 예상 배당금을 계산해 보세요.<br />시세와 분배 내역을 자동으로 불러옵니다.</p>
      </section>

      <div className="page-shell">
        <section className="calculator-card" aria-labelledby="calculator-title">
          <div className="card-heading">
            <div><span className="step-number">01</span><h2 id="calculator-title">ETF 선택</h2></div>
            <div className="mode-switch" role="group" aria-label="ETF 입력 방식">
              <button type="button" aria-pressed={mode === "auto"} className={mode === "auto" ? "active" : ""} onClick={() => switchMode("auto")}>자동 조회</button>
              <button type="button" aria-pressed={mode === "manual"} className={mode === "manual" ? "active" : ""} onClick={() => switchMode("manual")}>직접 입력</button>
            </div>
          </div>

          {mode === "auto" ? (
            <div className="picker" aria-busy={loading}>
              <form className="search-box" onSubmit={searchEtfs}>
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="종목명 또는 티커 (예: JEPI)" aria-label="ETF 검색" />
                <button disabled={loading}>{loading ? "조회 중" : "검색"}</button>
              </form>
              {results.length > 0 && (
                <div className="search-results" aria-live="polite">
                  {results.map((item) => (
                    <button type="button" key={item.symbol} onClick={() => void loadQuote(item.symbol, item.name)} disabled={loading}>
                      <span><strong>{item.name}</strong><small>{item.symbol} · {item.exchange}</small></span><b>선택</b>
                    </button>
                  ))}
                </div>
              )}
              <div className="quick-picks" aria-label="빠른 ETF 선택">
                {quickPicks.map((item) => (
                  <button type="button" key={item.symbol} onClick={() => void loadQuote(item.symbol, item.label)} disabled={loading}>
                    <strong>{item.label}</strong><span>{item.sub}</span>
                  </button>
                ))}
              </div>
              <p className="data-source">시세·분배 이력: Yahoo Finance 공개 데이터</p>
            </div>
          ) : (
            <div className="manual-fields">
              <div className="market-toggle" role="group" aria-label="ETF 상장 시장">
                <button type="button" aria-pressed={draft.market === "KR"} className={draft.market === "KR" ? "active" : ""} onClick={() => changeMarket("KR")}>국내 ETF</button>
                <button type="button" aria-pressed={draft.market === "US"} className={draft.market === "US" ? "active" : ""} onClick={() => changeMarket("US")}>미국 ETF</button>
              </div>
              <div className="field-grid">
                <label><span>종목명</span><input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="예: KODEX 200" /></label>
                <label><span>티커</span><input value={draft.symbol} onChange={(event) => updateDraft("symbol", event.target.value.toUpperCase())} placeholder="선택 입력" /></label>
                <label><span>현재가 ({draft.currency})</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.price || ""} onChange={(event) => updateCurrentPrice(Number(event.target.value))} /></label>
                <label><span>최근 12개월 주당 분배금</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.ttmDividend || ""} onChange={(event) => updateDraft("ttmDividend", Number(event.target.value))} /></label>
                <label><span>최근 주당 분배금</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.lastDividend || ""} onChange={(event) => updateDraft("lastDividend", Number(event.target.value))} /></label>
                <label><span>연간 지급 횟수</span><select value={draft.frequency} onChange={(event) => updateDraft("frequency", Number(event.target.value))}><option value="0">알 수 없음</option><option value="1">연 1회</option><option value="2">반기 2회</option><option value="4">분기 4회</option><option value="12">월 12회</option><option value="52">주 52회</option></select></label>
                <label><span>예상 배당 세율 (%)</span><input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={draft.taxRate} onChange={(event) => updateDraft("taxRate", Number(event.target.value))} /></label>
                {draft.currency === "USD" && <label><span>USD/KRW 환율</span><input type="number" inputMode="decimal" min="1" step="any" value={draft.fxRate || ""} onChange={(event) => updateFxRate(Number(event.target.value))} /></label>}
              </div>
            </div>
          )}

          {message && <div className="notice" role="status"><span aria-hidden="true">i</span>{message}</div>}

          {draft.name ? (
            <div className="selected-etf">
              <div className="product-title-row">
                <h2>{draft.symbol || draft.name} ETF 배당금 계산</h2>
                {draft.currency === "USD" && (
                  <div className="currency-switch" role="group" aria-label="표시 통화">
                    <button type="button" aria-pressed={displayCurrency === "USD"} className={displayCurrency === "USD" ? "active" : ""} onClick={() => setDisplayCurrency("USD")}>USD</button>
                    <button type="button" aria-pressed={displayCurrency === "KRW"} className={displayCurrency === "KRW" ? "active" : ""} onClick={() => setDisplayCurrency("KRW")}>KRW</button>
                  </div>
                )}
              </div>
              {draft.currency === "USD" && <p className="exchange-rate">환율: 1 USD = {number.format(draft.fxRate)} KRW</p>}

              <div className="selected-heading">
                <div><span className={`market-badge ${draft.market.toLowerCase()}`}>{draft.market}</span><div><h3>{draft.name}</h3><p>{draft.symbol || "직접 입력"} · {draft.source === "auto" ? "자동 조회" : "직접 입력"}</p></div></div>
                <button type="button" onClick={resetSelection}>다른 종목</button>
              </div>

              <div className="quote-metrics">
                <div><span>현재 가격</span><strong>{formatAssetValue(draft.price)}</strong><small className={typeof quote?.dayChangePercent === "number" ? (quote.dayChangePercent >= 0 ? "positive" : "negative") : undefined}>{formatPercent(quote?.dayChangePercent)}</small></div>
                <div><span>배당 수익률</span><strong>{number.format(preview.ttmYield)}%</strong><small>연 {formatAssetValue(draft.ttmDividend)} / 주</small></div>
                <div><span>올해 성과 (YTD)</span><strong className={typeof quote?.ytdPercent === "number" ? (quote.ytdPercent >= 0 ? "positive" : "negative") : undefined}>{formatPercent(quote?.ytdPercent)}</strong><small>시세 기준</small></div>
                <div><span>지급 주기</span><strong>{frequencyLabel(draft.frequency)}</strong><small>최근 지급 간격 기준</small></div>
              </div>
              <div className="market-strip">
                <div><span>52주 범위</span><b>{quote?.fiftyTwoWeekLow && quote?.fiftyTwoWeekHigh ? `${formatAssetValue(quote.fiftyTwoWeekLow)} – ${formatAssetValue(quote.fiftyTwoWeekHigh)}` : "정보 없음"}</b></div>
                <div><span>최근 주당 분배금</span><b>{formatAssetValue(draft.lastDividend)}</b></div>
              </div>

              <div className="divider" />
              <div className="section-title"><span className="step-number">02</span><div><h3>투자금액</h3><p>프리셋이나 보유 수량으로 바로 계산할 수 있습니다.</p></div></div>
              <div className="preset-row">
                {investmentPresets.map((preset) => (
                  <button type="button" key={preset.value} aria-pressed={draft.inputMode === "amount" && draft.investment === preset.value} className={draft.inputMode === "amount" && draft.investment === preset.value ? "active" : ""} onClick={() => updateInvestment(preset.value)}>{preset.label}</button>
                ))}
              </div>
              <label className="money-input"><span>커스텀 투자금액</span><div><input type="number" inputMode="numeric" min="0" step="10000" value={draft.investment || ""} onChange={(event) => updateInvestment(Number(event.target.value))} /><b>원</b></div></label>
              <div className="trade-inputs">
                <label><span>보유 수량</span><div><input type="number" inputMode="numeric" min="0" step="1" value={previewShares || ""} onChange={(event) => updateShares(Number(event.target.value))} /><b>주</b></div></label>
                <label><span>매수 가격 ({draft.currency})</span><div><input type="number" inputMode="decimal" min="0" step="any" value={draft.purchasePrice || ""} onChange={(event) => updatePurchasePrice(Number(event.target.value))} /><b>{draft.currency}</b></div></label>
              </div>

              <div className="result-block" aria-live="polite">
                <div className="result-primary"><span>예상 세후 월평균 배당금</span><strong>{canCalculate ? formatCashValue(preview.ttmNetKrw / 12) : "계산 전"}</strong><small>세전 {canCalculate ? formatCashValue(preview.ttmGrossKrw / 12) : "-"} · 예상 {number.format(previewShares)}주</small></div>
                <div className="result-grid">
                  <div><span>예상 세후 연간 배당금</span><b>{canCalculate ? formatCashValue(preview.ttmNetKrw) : "-"}</b></div>
                  <div><span>예상 세전 연간 배당금</span><b>{canCalculate ? formatCashValue(preview.ttmGrossKrw) : "-"}</b></div>
                  <div><span>예상 배당 수익률</span><b>{draft.price > 0 ? `${number.format(preview.ttmYield)}%` : "-"}</b></div>
                  <div><span>총 매수금액</span><b>{canCalculate ? formatCashValue(actualInvestmentKrw) : "-"}</b></div>
                </div>
              </div>

              <button className="save-button" type="button" onClick={addHolding} disabled={!canCalculate}>내 포트폴리오에 추가</button>

              {draft.source === "auto" && (
                <details className="advanced-settings">
                  <summary>조회값 직접 수정</summary>
                  <div className="field-grid">
                    <label><span>현재가 ({draft.currency})</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.price || ""} onChange={(event) => updateCurrentPrice(Number(event.target.value))} /></label>
                    <label><span>최근 12개월 주당 분배금</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.ttmDividend || ""} onChange={(event) => updateDraft("ttmDividend", Number(event.target.value))} /></label>
                    <label><span>최근 주당 분배금</span><input type="number" inputMode="decimal" min="0" step="any" value={draft.lastDividend || ""} onChange={(event) => updateDraft("lastDividend", Number(event.target.value))} /></label>
                    <label><span>연간 지급 횟수</span><select value={draft.frequency} onChange={(event) => updateDraft("frequency", Number(event.target.value))}><option value="0">알 수 없음</option><option value="1">연 1회</option><option value="2">반기 2회</option><option value="4">분기 4회</option><option value="12">월 12회</option><option value="52">주 52회</option></select></label>
                    <label><span>예상 배당 세율 (%)</span><input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={draft.taxRate} onChange={(event) => updateDraft("taxRate", Number(event.target.value))} /></label>
                    {draft.currency === "USD" && <label><span>USD/KRW 환율</span><input type="number" inputMode="decimal" min="1" step="any" value={draft.fxRate || ""} onChange={(event) => updateFxRate(Number(event.target.value))} /></label>}
                  </div>
                </details>
              )}
            </div>
          ) : loading ? (
            <div className="loading-state" role="status"><i aria-hidden="true" /><span>ETF 정보를 불러오는 중입니다.</span></div>
          ) : (
            <div className="selection-empty"><span aria-hidden="true">＋</span><p>검색하거나 빠른 선택에서 ETF를 골라 주세요.</p></div>
          )}
        </section>

        <section className="price-card" aria-labelledby="price-title">
          <div className="visual-heading">
            <div className="section-title"><span className="step-number">03</span><div><h2 id="price-title">가격 차트</h2><p>{draft.symbol || "ETF"}의 선택 기간 종가 흐름</p></div></div>
            <div className="chart-range" role="group" aria-label="가격 조회 기간">
              {(["1M", "3M", "6M", "1Y"] as const).map((range) => (
                <button type="button" key={range} aria-pressed={priceRange === range} className={priceRange === range ? "active" : ""} onClick={() => setPriceRange(range)}>{range === "1M" ? "1개월" : range === "3M" ? "3개월" : range === "6M" ? "6개월" : "1년"}</button>
              ))}
            </div>
          </div>
          {priceView ? (
            <>
              <p id="price-summary" className="sr-only">시작 가격 {formatAssetValue(priceView.start)}, 현재 가격 {formatAssetValue(priceView.end)}, 최저 가격 {formatAssetValue(priceView.low)}, 최고 가격 {formatAssetValue(priceView.high)}, 기간 수익률 {number.format(priceView.change)}퍼센트</p>
              <div className="price-plot" role="img" aria-labelledby="price-title" aria-describedby="price-summary"><div className={`price-area ${priceView.change >= 0 ? "up" : "down"}`} aria-hidden="true" style={{ clipPath: priceView.polygon }} /></div>
              <div className="chart-axis" aria-hidden="true"><span>{priceView.points[0].date.slice(2).replaceAll("-", ".")}</span><span>{priceView.points.at(-1)?.date.slice(2).replaceAll("-", ".")}</span></div>
              <dl className="chart-stats">
                <div><dt>현재가</dt><dd>{formatAssetValue(priceView.end)}</dd></div>
                <div><dt>기간 최고</dt><dd>{formatAssetValue(priceView.high)}</dd></div>
                <div><dt>기간 최저</dt><dd>{formatAssetValue(priceView.low)}</dd></div>
                <div><dt>수익률</dt><dd className={priceView.change >= 0 ? "positive" : "negative"}>{formatPercent(priceView.change)}</dd></div>
              </dl>
            </>
          ) : <p className="simple-empty">ETF를 선택하면 가격 추이가 표시됩니다.</p>}
        </section>

        <section className="history-card" aria-labelledby="history-title">
          <div className="section-title"><span className="step-number">04</span><div><h2 id="history-title">배당금 이력</h2><p>{draft.symbol || "ETF"}의 최근 분배금 지급 내역</p></div></div>
          {dividendView.items.length > 0 ? (
            <>
              <div className="dividend-plot" role="img" aria-label={`최근 ${dividendView.items.length}회 분배금. 평균 주당 ${formatAssetValue(dividendView.average)}, 합계 ${formatAssetValue(dividendView.total)}`}>
                {dividendView.items.map((item) => (
                  <div className="dividend-column" key={`${item.date}-${item.amount}`}><i aria-hidden="true" style={{ height: `${dividendView.maximum > 0 ? Math.max(6, (item.amount / dividendView.maximum) * 100) : 0}%` }} /><time dateTime={item.date} aria-hidden="true">{item.date.slice(2, 7).replace("-", ".")}</time></div>
                ))}
              </div>
              <dl className="chart-stats dividend-stats">
                <div><dt>최근 분배금</dt><dd>{formatAssetValue(dividends[0]?.amount ?? 0)}</dd></div>
                <div><dt>회당 평균</dt><dd>{formatAssetValue(dividendView.average)}</dd></div>
                <div><dt>조회 합계</dt><dd>{formatAssetValue(dividendView.total)}</dd></div>
              </dl>
              <details className="history-details">
                <summary>지급 내역 전체 보기</summary>
                <div className="dividend-list">{dividends.map((item) => <div key={`${item.date}-${item.amount}`}><time dateTime={item.date}>{dateFormat.format(new Date(`${item.date}T00:00:00`))}</time><span>주당 {formatAssetValue(item.amount)}</span></div>)}</div>
              </details>
            </>
          ) : <p className="simple-empty">자동 조회한 ETF의 분배 내역이 여기에 표시됩니다.</p>}
          {draft.lastUpdated && <p className="updated-at">최종 업데이트 {new Date(draft.lastUpdated).toLocaleString("ko-KR")}</p>}
        </section>

        <section className="target-card" aria-labelledby="target-title">
          <div className="section-title"><span className="step-number">05</span><div><h2 id="target-title">목표 배당금 계산기</h2><p>원하는 세후 월 배당금에 필요한 투자금을 역산합니다.</p></div></div>
          <div className="preset-row target-presets">{targetPresets.map((preset) => <button type="button" key={preset.value} aria-pressed={targetMonthly === preset.value} className={targetMonthly === preset.value ? "active" : ""} onClick={() => setTargetMonthly(preset.value)}>{preset.label}</button>)}</div>
          <label className="money-input"><span>목표 월 배당금</span><div><input type="number" inputMode="numeric" min="0" step="10000" value={targetMonthly || ""} onChange={(event) => setTargetMonthly(Number(event.target.value))} /><b>원</b></div></label>
          <div className="target-result" aria-live="polite"><div><span>필요 투자금</span><strong>{requiredWholeInvestment > 0 ? formatCashValue(requiredWholeInvestment) : "계산 불가"}</strong></div><div><span>필요 수량</span><b>{requiredWholeShares > 0 ? `${number.format(requiredWholeShares)}주` : "-"}</b></div></div>
          {requiredInvestment <= 0 && <p className="helper-text">ETF를 선택하고 최근 분배금이 확인되면 계산됩니다.</p>}
        </section>

        <section className="portfolio" id="portfolio" aria-labelledby="portfolio-title">
          <div className="portfolio-head"><div className="section-title"><span className="step-number">06</span><div><h2 id="portfolio-title">내 포트폴리오</h2><p>{holdings.length}개 ETF · 이 브라우저에 자동 저장</p></div></div>{holdings.length > 0 && <button type="button" onClick={() => { if (confirm("포트폴리오를 모두 삭제할까요?")) setHoldings([]); }}>전체 비우기</button>}</div>
          <div className="portfolio-summary"><div><span>세후 월평균</span><b>{formatWon(totals.ttmNetKrw / 12)}</b></div><div><span>세후 연 배당금</span><b>{formatWon(totals.ttmNetKrw)}</b></div><div><span>총 평가금액</span><b>{formatWon(totals.valueKrw)}</b></div><div><span>배당률</span><b>{number.format(portfolioYield)}%</b></div></div>
          {holdings.length === 0 ? <p className="simple-empty portfolio-empty">계산한 ETF를 추가하면 합산 결과를 볼 수 있습니다.</p> : (
            <div className="holding-list">{holdings.map((holding) => { const calculated = calculateHolding(holding); return (
              <article className="holding-card" key={holding.id}><div className="holding-main"><span className={`market-badge ${holding.market.toLowerCase()}`}>{holding.market}</span><div><h3>{holding.name}</h3><p>{holding.symbol || "직접 입력"} · {number.format(holding.shares)}주</p></div></div><div className="holding-values"><div><span>배당률</span><b>{number.format(calculated.ttmYield)}%</b></div><div><span>세후 월평균</span><b>{formatWon(calculated.ttmNetKrw / 12)}</b></div></div><div className="holding-controls"><label><span>수량</span><input aria-label={`${holding.name} 보유 수량`} type="number" inputMode="decimal" min="0" step="any" value={holding.shares} onChange={(event) => updateHolding(holding.id, { shares: Number(event.target.value) })} /></label><button type="button" aria-label={`${holding.name} 삭제`} onClick={() => setHoldings((items) => items.filter((item) => item.id !== holding.id))}>삭제</button></div></article>
            ); })}</div>
          )}
        </section>

        <aside className="disclaimer"><strong>계산 기준</strong><p>최근 365일 실제 분배금 합계를 현재가로 나눈 TTM 배당률을 사용합니다. 세율은 국내 15.4%, 미국 15%가 기본이며 개인별 과세는 다를 수 있습니다.</p></aside>
      </div>

      <footer><div className="brand"><span className="brand-mark" aria-hidden="true">↗</span><span>ETF FLOW</span></div><p>자동 조회 데이터와 계산 결과는 참고용이며 투자 또는 세무 자문이 아닙니다.</p><span>Yahoo Finance 공개 데이터 · 가입 없음</span></footer>
    </main>
  );
}
