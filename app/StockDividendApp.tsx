"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateAffordableShares,
  calculateDividendIncome,
  calculateTargetIncome,
  type DividendPoint,
  type StockApiError,
  type StockMarketData,
} from "@/lib/market-data";
import { stocks, type StockConfig } from "@/lib/stocks";

type CurrencyView = "KRW" | "USD";
type PriceRange = "1M" | "3M" | "6M" | "1Y" | "2Y" | "5Y";
type DividendRange = "1Y" | "2Y" | "5Y" | "ALL";

const investmentPresets = [10_000_000, 50_000_000, 100_000_000] as const;
const targetPresets = [2_000_000, 5_000_000, 10_000_000] as const;
const priceRangeDays: Record<PriceRange, number> = {
  "1M": 31,
  "3M": 92,
  "6M": 183,
  "1Y": 366,
  "2Y": 731,
  "5Y": 1827,
};
const dividendRangeDays: Record<Exclude<DividendRange, "ALL">, number> = {
  "1Y": 366,
  "2Y": 731,
  "5Y": 1827,
};
const stockKindLabels: Record<string, { group: string; label: string; search: string }> = {
  stock: { group: "미국 주식", label: "주식", search: "주식 stock" },
  etf: { group: "미국 ETF", label: "ETF", search: "etf 펀드" },
  security: { group: "기타 미국 종목", label: "종목", search: "종목 security" },
};
const payoutFrequencyLabels: Record<string, { compact: string; hero: string; search: string }> = {
  monthly: { compact: "월", hero: "월 분배", search: "월배당 월분배" },
  quarterly: { compact: "분기", hero: "분기 배당", search: "분기배당 분기분배" },
  weekly: { compact: "주", hero: "주간 배당", search: "주배당 주간배당" },
  variable: { compact: "변동", hero: "지급 주기 변동", search: "변동 수시" },
};

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatMoney(usd: number, fxRate: number | null, currency: CurrencyView) {
  if (!Number.isFinite(usd)) return "-";
  if (currency === "USD") return `$${decimal.format(usd)}`;
  return fxRate !== null && fxRate > 0 ? `${won.format(Math.round(usd * fxRate))}원` : "환율 입력 필요";
}

function formatCalculatedMoney(usd: number, krw: number, fxRate: number | null, currency: CurrencyView) {
  if (currency === "USD") return Number.isFinite(usd) ? `$${decimal.format(usd)}` : "-";
  if (fxRate === null || fxRate <= 0) return "환율 입력 필요";
  return Number.isFinite(krw) ? `${won.format(Math.round(krw))}원` : "-";
}

function formatNumber(value: number | null, compactMode = false) {
  if (value === null || !Number.isFinite(value)) return "정보 없음";
  return compactMode ? compact.format(value) : won.format(Math.round(value));
}

function rangeLabel(range: PriceRange | DividendRange) {
  const labels: Record<string, string> = {
    "1M": "1개월",
    "3M": "3개월",
    "6M": "6개월",
    "1Y": "1년",
    "2Y": "2년",
    "5Y": "5년",
    ALL: "전체",
  };
  return labels[range];
}

function SectionHeading({ eyebrow, title, description, id }: { eyebrow: string; title: string; description: string; id?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="mt-0.5 inline-flex min-h-7 min-w-7 items-center justify-center rounded-md bg-emerald-50 px-2 text-xs font-black text-emerald-700">
        {eyebrow}
      </span>
      <div>
        <h2 id={id} className="text-xl font-extrabold tracking-[-0.035em] text-zinc-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "up" | "down" }) {
  return (
    <div className="min-w-0 rounded-lg bg-zinc-50 p-4">
      <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
      <dd className="mt-2 break-words text-lg font-black tracking-[-0.025em] text-zinc-950">{value}</dd>
      {sub && <p className={`mt-1 text-xs font-semibold ${tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-zinc-500"}`}>{sub}</p>}
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="space-y-5" role="status" aria-label="FMP 데이터를 불러오는 중">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg bg-zinc-100" />)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-zinc-100" />)}
      </div>
      <span className="sr-only">데이터를 불러오고 있습니다.</span>
    </div>
  );
}

function StockSelector({ current }: { current: StockConfig }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectableStocks = stocks;
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const matches = useMemo(() => {
    if (!normalizedQuery) return selectableStocks;
    return selectableStocks.filter((stock) => {
      const payoutLabel = payoutFrequencyLabels[stock.payoutFrequency]?.search ?? "";
      const kindLabel = stockKindLabels[stock.kind]?.search ?? "종목 security";
      return `${stock.symbol} ${stock.nameKo} ${stock.nameEn} ${kindLabel} ${payoutLabel}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery);
    });
  }, [normalizedQuery, selectableStocks]);
  const groups = ["stock", "etf", "security"].map((kind) => ({
    key: kind,
    label: stockKindLabels[kind].group,
    items: matches.filter((stock) => stock.kind === kind),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !selectorRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        selectorRef.current?.querySelector<HTMLButtonElement>("[aria-controls='stock-selector-panel']")?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={selectorRef} className="relative w-[min(52vw,17rem)] sm:w-72">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="stock-selector-panel"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-left text-sm font-bold text-zinc-900 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-extrabold text-emerald-700">종목 선택</span>
          <span className="block truncate">{current.symbol}<span className="hidden font-medium text-zinc-500 sm:inline"> · {current.nameKo}</span></span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-zinc-500" aria-hidden="true">
          {selectableStocks.length}개
          <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
        <span className="sr-only">{open ? "종목 선택 메뉴 닫기" : "종목 선택 메뉴 열기"}</span>
      </button>

      {open && <div id="stock-selector-panel" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(92vw,24rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl" role="dialog" aria-label="종목 선택">
        <div className="border-b border-zinc-200 p-3">
          <label htmlFor="stock-selector-search" className="mb-2 block text-xs font-extrabold text-zinc-700">검증된 종목 5개 검색</label>
          <input
            ref={searchRef}
            id="stock-selector-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: AAPL 또는 애플"
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-950 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          <p className="mt-2 text-[11px] text-zinc-500" aria-live="polite">검증된 5개 중 {matches.length}개 종목</p>
        </div>

        <nav className="max-h-80 overflow-y-auto overscroll-contain p-2" aria-label="지원 종목 검색 결과">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`stock-group-${group.key}`}>
              <h2 id={`stock-group-${group.key}`} className="sticky top-0 z-10 bg-white/95 px-2 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-400 backdrop-blur">{group.label} · {group.items.length}</h2>
              <div className="space-y-1">
                {group.items.map((stock) => {
                  const active = stock.slug === current.slug;
                  return (
                    <Link
                      key={stock.slug}
                      href={`/${stock.slug}`}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      onClick={(event) => {
                        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                        event.preventDefault();
                        window.location.assign(`/${stock.slug}`);
                      }}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 no-underline ${active ? "bg-zinc-950 text-white" : "text-zinc-900 hover:bg-zinc-100"}`}
                    >
                      <span className="min-w-0">
                        <b className="block text-sm font-black">{stock.symbol}</b>
                        <small className={`block truncate text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>{stock.nameKo} · {stock.nameEn}</small>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500"}`}>{payoutFrequencyLabels[stock.payoutFrequency]?.compact ?? "기타"}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          {matches.length === 0 && <p className="px-4 py-10 text-center text-sm leading-6 text-zinc-500">일치하는 검증 종목이 없습니다.<br />XOM, CVX, AAPL, MSFT, KO 중에서 검색해 주세요.</p>}
        </nav>
      </div>}
    </div>
  );
}

function DataErrorPanel({ error, onRetry, onApplyManual, isEtf = false }: {
  error: StockApiError["error"];
  onRetry: () => void;
  onApplyManual: (values: { price: number; ttmDividend: number; fxRate: number }) => void;
  isEtf?: boolean;
}) {
  const [price, setPrice] = useState(0);
  const [ttmDividend, setTtmDividend] = useState(0);
  const [fxRate, setFxRate] = useState(0);
  const missingKey = error.code === "FMP_API_KEY_MISSING";
  const rateLimit = error.code === "FMP_RATE_LIMIT";
  const planRestricted = error.code === "FMP_PLAN_RESTRICTED";
  const heading = planRestricted
    ? isEtf ? "현재 FMP 플랜에서 ETF 데이터를 제공하지 않습니다" : "현재 FMP 플랜에서 이 데이터를 제공하지 않습니다"
    : missingKey
      ? "데이터 연결 설정이 필요합니다"
      : rateLimit
        ? "API 호출 한도를 초과했습니다"
        : "시장 데이터를 불러오지 못했습니다";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-black text-amber-800">!</span>
        <div>
          <h3 className="font-extrabold text-amber-950">{heading}</h3>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {planRestricted && isEtf
              ? "현재 연결된 FMP 플랜에는 이 ETF에 필요한 데이터 엔드포인트가 포함되어 있지 않습니다. 아래에서 현재가, TTM 배당금과 환율을 직접 입력해 계산할 수 있습니다."
              : error.message}
          </p>
          {planRestricted && isEtf && error.message && <p className="mt-2 text-xs leading-5 text-amber-800">FMP 응답: {error.message}</p>}
          {missingKey && (
            <p className="mt-2 text-sm leading-6 text-amber-900">
              프로젝트 루트의 <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code> 파일에서 <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">FMP_API_KEY=</code> 뒤에 값을 입력하고 개발 서버를 다시 시작하세요.
            </p>
          )}
          {!missingKey && !planRestricted && <button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-lg border border-amber-300 bg-white px-4 text-sm font-bold text-amber-950 hover:bg-amber-100">다시 시도</button>}
        </div>
      </div>

      <details className="mt-5 border-t border-amber-200 pt-4">
        <summary className="cursor-pointer text-sm font-extrabold text-amber-950">직접 입력으로 계산 계속하기</summary>
        <p className="mt-2 text-xs leading-5 text-amber-800">직접 입력값은 시세 정보가 아니며 현재 브라우저에서 계산할 때만 사용됩니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold text-amber-950">현재가 (USD)<input className="mt-2 h-11 w-full rounded-lg border border-amber-300 bg-white px-3 text-base text-zinc-950" type="number" min="0" step="any" inputMode="decimal" value={price || ""} onChange={(event) => setPrice(Number(event.target.value))} /></label>
          <label className="text-xs font-bold text-amber-950">TTM 주당 배당금 (USD)<input className="mt-2 h-11 w-full rounded-lg border border-amber-300 bg-white px-3 text-base text-zinc-950" type="number" min="0" step="any" inputMode="decimal" value={ttmDividend || ""} onChange={(event) => setTtmDividend(Number(event.target.value))} /></label>
          <label className="text-xs font-bold text-amber-950">USD/KRW 환율<input className="mt-2 h-11 w-full rounded-lg border border-amber-300 bg-white px-3 text-base text-zinc-950" type="number" min="0" step="any" inputMode="decimal" value={fxRate || ""} onChange={(event) => setFxRate(Number(event.target.value))} /></label>
        </div>
        <button type="button" disabled={price <= 0 || ttmDividend <= 0 || fxRate <= 0} onClick={() => onApplyManual({ price, ttmDividend, fxRate })} className="mt-3 min-h-11 rounded-lg bg-amber-900 px-4 text-sm font-bold text-white disabled:opacity-40">직접 계산 적용</button>
      </details>
    </div>
  );
}

function aggregateDividends(dividends: DividendPoint[]) {
  const monthly = new Map<string, number>();
  const yearly = new Map<string, number>();
  for (const item of dividends) {
    const month = item.date.slice(0, 7);
    const year = item.date.slice(0, 4);
    monthly.set(month, (monthly.get(month) ?? 0) + item.amount);
    yearly.set(year, (yearly.get(year) ?? 0) + item.amount);
  }
  return {
    monthly: [...monthly.entries()].map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
    yearly: [...yearly.entries()].map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export default function StockDividendApp({ config }: { config: StockConfig }) {
  const [data, setData] = useState<StockMarketData | null>(null);
  const [error, setError] = useState<StockApiError["error"] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refreshToken, setRefreshToken] = useState(0);
  const [currency, setCurrency] = useState<CurrencyView>("KRW");
  const [investmentKrw, setInvestmentKrw] = useState(10_000_000);
  const [shares, setShares] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [manual, setManual] = useState({ price: 0, ttmDividend: 0, fxRate: 0 });
  const [priceRange, setPriceRange] = useState<PriceRange>("1Y");
  const [dividendRange, setDividendRange] = useState<DividendRange>("2Y");
  const [targetMonthly, setTargetMonthly] = useState(2_000_000);
  const [showFxGuidance, setShowFxGuidance] = useState(false);
  const manualFxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/stocks/${config.symbol}`, { signal: controller.signal });
        const payload = await response.json() as StockMarketData | StockApiError;
        if (!response.ok || "error" in payload) {
          const nextError = "error" in payload ? payload.error : { code: "FMP_UPSTREAM_ERROR" as const, message: "시장 데이터 응답을 확인하지 못했습니다." };
          if (!controller.signal.aborted) {
            setData(null);
            setError(nextError);
            setStatus("error");
          }
          return;
        }
        if (!controller.signal.aborted) {
          const payloadFxRate = payload.availability.fx.status === "available" && typeof payload.fxRate === "number" && Number.isFinite(payload.fxRate) && payload.fxRate > 0
            ? payload.fxRate
            : null;
          setData(payload);
          setError(null);
          setManual((current) => ({
            price: payload.quote.price,
            ttmDividend: payload.ttmDividend,
            fxRate: payloadFxRate ?? current.fxRate,
          }));
          setPurchasePrice(payload.quote.price);
          setShares(payloadFxRate === null ? 0 : calculateAffordableShares(10_000_000, payloadFxRate, payload.quote.price));
          if (payloadFxRate === null) setCurrency("USD");
          setStatus("ready");
        }
      } catch {
        if (!controller.signal.aborted) {
          setData(null);
          setError({ code: "FMP_UPSTREAM_ERROR", message: "네트워크 상태를 확인한 뒤 다시 시도해 주세요." });
          setStatus("error");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [config.symbol, refreshToken]);

  const fxAvailability = data?.availability.fx ?? null;
  const apiFxRate = fxAvailability?.status === "available" && typeof data?.fxRate === "number" && Number.isFinite(data.fxRate) && data.fxRate > 0
    ? data.fxRate
    : null;
  const manualFxRate = Number.isFinite(manual.fxRate) && manual.fxRate > 0 ? manual.fxRate : null;
  const fxRate = apiFxRate ?? manualFxRate;
  const calculationFxRate = fxRate ?? 0;
  const hasFxRate = fxRate !== null;
  const usingManualFx = apiFxRate === null && manualFxRate !== null;
  const usingEcbFx = fxAvailability?.source === "European Central Bank" && apiFxRate !== null;
  const fxUnavailable = data !== null && apiFxRate === null;
  const fxPlanRestricted = fxAvailability?.status === "plan-restricted";
  const priceUsd = data?.quote.price ?? manual.price;
  const ttmDividendUsd = data?.ttmDividend ?? manual.ttmDividend;
  const canCalculate = priceUsd > 0 && ttmDividendUsd > 0 && shares > 0 && (currency === "USD" || hasFxRate);
  const income = useMemo(() => calculateDividendIncome(shares, ttmDividendUsd, calculationFxRate), [shares, ttmDividendUsd, calculationFxRate]);
  const target = useMemo(() => calculateTargetIncome(targetMonthly, ttmDividendUsd, priceUsd, calculationFxRate), [targetMonthly, ttmDividendUsd, priceUsd, calculationFxRate]);
  const purchaseTotalUsd = shares * purchasePrice;
  const purchaseTotalKrw = purchaseTotalUsd * calculationFxRate;
  const purchaseYield = purchasePrice > 0 ? ttmDividendUsd / purchasePrice * 100 : 0;

  const priceView = useMemo(() => {
    const all = data?.prices ?? [];
    if (all.length < 2) return null;
    const latest = Date.parse(`${all.at(-1)?.date}T00:00:00Z`);
    const cutoff = latest - priceRangeDays[priceRange] * 86_400_000;
    const points = all.filter((point) => Date.parse(`${point.date}T00:00:00Z`) >= cutoff);
    if (points.length < 2) return null;
    const closes = points.map((point) => point.close);
    const start = points[0].close;
    const end = points.at(-1)?.close ?? start;
    return {
      points,
      high: Math.max(...closes),
      low: Math.min(...closes),
      changePercent: start > 0 ? (end - start) / start * 100 : 0,
    };
  }, [data?.prices, priceRange]);

  const dividendView = useMemo(() => {
    const all = data?.dividends ?? [];
    if (all.length === 0) return { items: [], monthly: [], yearly: [], total: 0, average: 0 };
    const latest = Date.parse(`${all[0].date}T00:00:00Z`);
    const cutoff = dividendRange === "ALL" ? Number.NEGATIVE_INFINITY : latest - dividendRangeDays[dividendRange] * 86_400_000;
    const items = all.filter((item) => Date.parse(`${item.date}T00:00:00Z`) >= cutoff);
    const aggregate = aggregateDividends(items);
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return { items, ...aggregate, total, average: items.length ? total / items.length : 0 };
  }, [data?.dividends, dividendRange]);

  function applyInvestment(value: number) {
    const safe = Math.max(value, 0);
    setInvestmentKrw(safe);
    if (priceUsd <= 0) return;
    if (fxRate === null || fxRate <= 0) {
      focusManualFxRate();
      return;
    }
    setShares(calculateAffordableShares(safe, fxRate, priceUsd));
    setPurchasePrice(priceUsd);
  }

  function focusManualFxRate() {
    setShowFxGuidance(true);
    manualFxInputRef.current?.focus({ preventScroll: true });
    manualFxInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function updateManualFxRate(value: number) {
    const nextRate = Number.isFinite(value) && value > 0 ? value : 0;
    setManual((current) => ({ ...current, fxRate: nextRate }));
    if (nextRate <= 0) {
      setShowFxGuidance(true);
      setCurrency("USD");
      return;
    }
    setShowFxGuidance(false);
    setCurrency("KRW");
    if (priceUsd > 0 && investmentKrw > 0) {
      setShares(calculateAffordableShares(investmentKrw, nextRate, priceUsd));
      setPurchasePrice(priceUsd);
    }
  }

  function retry() {
    setData(null);
    setStatus("loading");
    setError(null);
    setRefreshToken((value) => value + 1);
  }

  function applyManual(values: { price: number; ttmDividend: number; fxRate: number }) {
    setData(null);
    setManual(values);
    setPurchasePrice(values.price);
    setShares(calculateAffordableShares(investmentKrw, values.fxRate, values.price));
  }

  const quoteChange = data?.quote.changePercent ?? null;
  const rangePosition = data?.quote.yearHigh && data.quote.yearLow && data.quote.yearHigh > data.quote.yearLow
    ? Math.min(100, Math.max(0, (data.quote.price - data.quote.yearLow) / (data.quote.yearHigh - data.quote.yearLow) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/xom" className="flex items-center gap-2.5 no-underline">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-950 text-sm font-black text-white">DL</span>
            <span><b className="block text-sm font-black tracking-[-0.02em]">배당렌즈</b><small className="block text-[10px] font-medium text-zinc-500">Dividend Lens</small></span>
          </Link>
          <StockSelector key={config.slug} current={config} />
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 pb-9 pt-14 text-center md:pt-20">
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">미국 {stockKindLabels[config.kind]?.label ?? "종목"} · {payoutFrequencyLabels[config.payoutFrequency]?.hero ?? "지급 주기 확인"}</span>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-zinc-950 md:text-5xl">{config.symbol} 배당금 계산기</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600 md:text-lg">{config.headline}</p>
        <p className="mt-2 text-sm text-zinc-500">FMP Stable API의 실제 시세·배당 이력을 사용합니다.</p>
      </section>

      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 pb-20 sm:px-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="calculator-heading">
          <div className="mb-7 flex flex-col items-center justify-between gap-4 border-b border-zinc-200 pb-6 sm:flex-row">
            <div>
              <p className="text-xs font-bold text-emerald-700">DIVIDEND CALCULATOR</p>
              <h2 id="calculator-heading" className="mt-1 text-2xl font-black tracking-[-0.04em]">{config.symbol} 예상 배당금 계산</h2>
            </div>
            <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-100 p-1" role="group" aria-label="표시 통화" aria-describedby={fxUnavailable ? "fx-plan-notice" : undefined}>
              {(["USD", "KRW"] as const).map((item) => {
                const needsFxRate = item === "KRW" && !hasFxRate;
                return <button key={item} type="button" aria-pressed={currency === item} onClick={() => needsFxRate ? focusManualFxRate() : setCurrency(item)} title={needsFxRate ? "USD/KRW 환율 입력란으로 이동합니다." : undefined} className={`min-h-9 min-w-14 rounded-full px-3 text-xs font-black ${currency === item ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-500"}`}>{item}</button>;
              })}
            </div>
          </div>

          {status === "loading" && <SkeletonPanel />}
          {status === "error" && error && <DataErrorPanel error={error} onRetry={retry} onApplyManual={applyManual} isEtf={config.kind === "etf"} />}

          {(status === "ready" || manual.price > 0) && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="text-lg font-black">{data?.name || config.nameEn}</h3><p className="mt-1 text-xs text-zinc-500">{config.symbol} · {data?.profile.exchange || "직접 입력"}</p></div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-500">USD/KRW 환율</p>
                  <p className="mt-1 text-sm font-black">{fxRate === null ? "자동 환율 없음" : `1 USD = ${decimal.format(fxRate)} KRW${usingManualFx ? " · 직접 입력" : ""}`}</p>
                  {!usingManualFx && fxAvailability?.source && (
                    <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                      {fxAvailability.source === "European Central Bank" ? "ECB 기준환율" : "FMP Stable API"}
                      {fxAvailability.asOf ? ` · ${fxAvailability.asOf}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {usingEcbFx && (
                <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-900" role="note">
                  {fxAvailability?.message ?? "유럽중앙은행(ECB)의 최근 영업일 기준환율을 참고용으로 자동 적용했습니다. 실제 거래 환율과 다를 수 있습니다."}
                </div>
              )}

              {fxUnavailable && (
                <div id="fx-plan-notice" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950" role="status">
                  <div>
                    <p className="text-sm font-extrabold">{fxPlanRestricted ? "현재 FMP 플랜에는 USD/KRW 환율이 포함되지 않습니다." : "USD/KRW 환율을 불러오지 못했습니다."}</p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">주가·기업 정보·차트·배당 이력은 USD로 계속 볼 수 있습니다. 투자 섹션에서 환율을 입력하면 KRW 투자금과 배당 계산이 활성화됩니다.</p>
                    {fxAvailability?.message && <p className="mt-1 text-xs leading-5 text-amber-800">{fxAvailability.message}</p>}
                    {usingManualFx && <p className="mt-1 text-xs font-bold text-emerald-700">직접 입력한 환율을 계산에 적용 중입니다.</p>}
                    {!usingManualFx && <button type="button" onClick={focusManualFxRate} className="mt-3 min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-xs font-extrabold text-amber-950 hover:bg-amber-100">환율 입력하기</button>}
                  </div>
                </div>
              )}
              {data?.delayed && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">시장 마감 또는 지연 가능 데이터입니다. 아래 최종 갱신 시각을 확인해 주세요.</div>}
              {!data && manual.price > 0 && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">직접 입력값으로 계산 중입니다. 시세·차트 데이터는 표시되지 않습니다.</div>}

              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="현재가" value={formatMoney(priceUsd, fxRate, currency)} sub={quoteChange === null ? "직접 입력" : `${quoteChange >= 0 ? "+" : ""}${decimal.format(data?.quote.change ?? 0)} (${quoteChange >= 0 ? "+" : ""}${decimal.format(quoteChange)}%)`} tone={quoteChange === null ? "neutral" : quoteChange >= 0 ? "up" : "down"} />
                <Metric label="TTM 배당수익률" value={`${decimal.format(priceUsd > 0 ? ttmDividendUsd / priceUsd * 100 : 0)}%`} sub={`연 주당 ${formatMoney(ttmDividendUsd, fxRate, currency)}`} />
                <Metric label="당일 고가 · 저가" value={data?.quote.dayHigh && data.quote.dayLow ? `${formatMoney(data.quote.dayLow, fxRate, currency)} – ${formatMoney(data.quote.dayHigh, fxRate, currency)}` : "정보 없음"} />
                <Metric label="시가총액" value={data?.quote.marketCap ? (currency === "KRW" && fxRate !== null ? `${compact.format(data.quote.marketCap * fxRate)}원` : `$${compact.format(data.quote.marketCap)}`) : "정보 없음"} />
              </dl>

              <dl className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-4"><dt className="text-xs font-semibold text-zinc-500">52주 범위</dt><dd className="mt-2 flex justify-between gap-2 text-sm font-black"><span>{data?.quote.yearLow ? formatMoney(data.quote.yearLow, fxRate, currency) : "-"}</span><span>{data?.quote.yearHigh ? formatMoney(data.quote.yearHigh, fxRate, currency) : "-"}</span></dd><div className="relative mt-3 h-1.5 rounded-full bg-zinc-200"><span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-zinc-950 shadow" style={{ left: `${rangePosition}%` }} /></div></div>
                <Metric label="거래량 · 평균 거래량" value={formatNumber(data?.quote.volume ?? null)} sub={`평균 ${formatNumber(data?.quote.averageVolume ?? null)}`} />
                <Metric label="데이터 최종 갱신" value={data ? dateTime.format(new Date(data.updatedAt)) : "직접 입력"} sub={data ? data.source : "시장 데이터 없음"} />
              </dl>

              <div className="my-8 h-px bg-zinc-200" />
              <SectionHeading eyebrow="01" title="투자금과 보유 수량" description="프리셋은 현재가 기준으로 매수 가능한 정수 수량을 계산합니다." />
              {fxUnavailable && (
                <div className={`mb-4 rounded-lg border p-4 ${showFxGuidance && !hasFxRate ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-zinc-50"}`}>
                  <label htmlFor="manual-usd-krw-rate" className="block text-sm font-extrabold text-zinc-900">USD/KRW 환율 직접 입력</label>
                  <p id="manual-fx-help" className="mt-1 text-xs leading-5 text-zinc-600">1달러당 원화 환율을 입력하면 선택한 투자금의 매수 가능 수량과 예상 배당금이 즉시 계산됩니다.</p>
                  <div className="relative mt-3 sm:max-w-xs">
                    <input ref={manualFxInputRef} id="manual-usd-krw-rate" aria-label="수동 USD/KRW 환율" aria-describedby="manual-fx-help manual-fx-status" aria-invalid={showFxGuidance && !hasFxRate} className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-3 pr-14 text-right text-base font-bold text-zinc-950 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200" type="number" min="1" step="any" inputMode="decimal" placeholder="환율 직접 입력" value={manual.fxRate || ""} onChange={(event) => updateManualFxRate(Number(event.target.value))} />
                    <b className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">KRW</b>
                  </div>
                  <p id="manual-fx-status" className={`mt-2 text-xs font-bold ${hasFxRate ? "text-emerald-700" : showFxGuidance ? "text-amber-800" : "text-zinc-500"}`} aria-live="polite">
                    {hasFxRate ? "입력한 환율을 계산에 적용했습니다." : showFxGuidance ? "원화 투자금 계산을 위해 환율을 입력해 주세요." : "FMP에서 환율을 제공하지 않아 직접 입력이 필요합니다."}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {investmentPresets.map((preset) => <button key={preset} type="button" aria-pressed={investmentKrw === preset} aria-describedby={!hasFxRate ? "manual-fx-help" : undefined} onClick={() => applyInvestment(preset)} className={`min-h-12 rounded-lg border px-3 text-sm font-extrabold ${investmentKrw === preset ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"}`}>{preset === 100_000_000 ? "1억원" : `${won.format(preset / 10_000)}만원`} 투자</button>)}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <label className="min-w-0 flex-1"><span className="mb-2 block text-xs font-bold text-zinc-600">커스텀 투자금액</span><div className="relative"><input aria-label="커스텀 투자금액" className="h-12 w-full rounded-lg border border-zinc-300 px-3 pr-10 text-right text-base font-bold" type="number" min="0" step="10000" inputMode="numeric" value={investmentKrw || ""} onChange={(event) => setInvestmentKrw(Number(event.target.value))} /><b className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">원</b></div></label>
                <button type="button" onClick={() => applyInvestment(investmentKrw)} disabled={priceUsd <= 0} aria-describedby={!hasFxRate ? "manual-fx-help" : undefined} className="min-h-12 self-end rounded-lg bg-zinc-950 px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">투자금 적용</button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label><span className="mb-2 block text-xs font-bold text-zinc-600">보유 수량</span><div className="relative"><input className="h-12 w-full rounded-lg border border-zinc-300 px-3 pr-10 text-right text-base font-bold" type="number" min="0" step="1" inputMode="numeric" value={shares || ""} onChange={(event) => setShares(Math.max(0, Number(event.target.value)))} /><b className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">주</b></div></label>
                <label><span className="mb-2 block text-xs font-bold text-zinc-600">매수 가격 (USD)</span><div className="relative"><input className="h-12 w-full rounded-lg border border-zinc-300 px-3 pr-12 text-right text-base font-bold" type="number" min="0" step="any" inputMode="decimal" value={purchasePrice || ""} onChange={(event) => setPurchasePrice(Math.max(0, Number(event.target.value)))} /><b className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">USD</b></div></label>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50" aria-live="polite">
                <div className="border-b border-zinc-200 p-5 sm:p-6"><p className="text-sm font-bold text-zinc-500">예상 세후 월평균 배당금</p><strong className="mt-2 block text-3xl font-black tracking-[-0.05em] sm:text-4xl">{canCalculate ? formatCalculatedMoney(income.monthlyNetUsd, income.monthlyNetKrw, fxRate, currency) : "계산 전"}</strong><p className="mt-2 text-xs text-zinc-500">미국 원천징수 15% 적용 · 세전 {canCalculate ? formatCalculatedMoney(income.monthlyGrossUsd, income.monthlyGrossKrw, fxRate, currency) : "-"}</p></div>
                <dl className="grid grid-cols-1 sm:grid-cols-2">
                  <div className="border-b border-zinc-200 p-4 sm:border-r"><dt className="text-xs text-zinc-500">{config.payoutFrequency === "quarterly" ? "예상 세후 분기 배당금" : "예상 세후 3개월 배당금"}</dt><dd className="mt-1 text-base font-black">{canCalculate ? formatCalculatedMoney(income.quarterlyNetUsd, income.quarterlyNetKrw, fxRate, currency) : "-"}</dd><p className="mt-1 text-xs text-zinc-500">세전 {canCalculate ? formatCalculatedMoney(income.quarterlyGrossUsd, income.quarterlyGrossKrw, fxRate, currency) : "-"}</p></div>
                  <div className="border-b border-zinc-200 p-4"><dt className="text-xs text-zinc-500">예상 세후 연간 배당금</dt><dd className="mt-1 text-base font-black">{canCalculate ? formatCalculatedMoney(income.annualNetUsd, income.annualNetKrw, fxRate, currency) : "-"}</dd></div>
                  <div className="border-b border-zinc-200 p-4 sm:border-b-0 sm:border-r"><dt className="text-xs text-zinc-500">예상 세전 연간 배당금</dt><dd className="mt-1 text-base font-black">{canCalculate ? formatCalculatedMoney(income.annualGrossUsd, income.annualGrossKrw, fxRate, currency) : "-"}</dd></div>
                  <div className="p-4"><dt className="text-xs text-zinc-500">총 매수금액 · 매수가 기준 수익률</dt><dd className="mt-1 text-base font-black">{canCalculate ? `${formatCalculatedMoney(purchaseTotalUsd, purchaseTotalKrw, fxRate, currency)} · ${decimal.format(purchaseYield)}%` : "-"}</dd></div>
                </dl>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="price-chart-title">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <SectionHeading id="price-chart-title" eyebrow="02" title="가격 차트" description={`${config.symbol}의 기간별 일봉 종가 흐름`} />
            <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="가격 차트 기간">
              {(["1M", "3M", "6M", "1Y", "2Y", "5Y"] as const).map((range) => <button type="button" key={range} aria-pressed={priceRange === range} onClick={() => setPriceRange(range)} className={`min-h-9 rounded-md px-2.5 text-xs font-bold ${priceRange === range ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}>{rangeLabel(range)}</button>)}
            </div>
          </div>
          {status === "loading" ? <div className="h-72 animate-pulse rounded-lg bg-zinc-100" /> : priceView ? (
            <>
              <div className="h-72 w-full" role="img" aria-label={`${rangeLabel(priceRange)} 가격 차트, 기간 수익률 ${decimal.format(priceView.changePercent)}퍼센트`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceView.points} margin={{ top: 12, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
                    <defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={priceView.changePercent >= 0 ? "#059669" : "#e11d48"} stopOpacity={0.3} /><stop offset="95%" stopColor={priceView.changePercent >= 0 ? "#059669" : "#e11d48"} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(2, 7).replace("-", ".")} minTickGap={35} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} tickFormatter={(value) => `$${decimal.format(Number(value))}`} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip labelFormatter={(value) => String(value)} formatter={(value) => [`$${decimal.format(Number(value))}`, "종가"]} contentStyle={{ borderRadius: 8, borderColor: "#e4e4e7", fontSize: 12 }} />
                    <Area type="monotone" dataKey="close" stroke={priceView.changePercent >= 0 ? "#059669" : "#e11d48"} strokeWidth={2} fill="url(#priceFill)" dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-4">
                <Metric label="현재가" value={formatMoney(priceView.points.at(-1)?.close ?? 0, fxRate, currency)} />
                <Metric label="기간 최고" value={formatMoney(priceView.high, fxRate, currency)} />
                <Metric label="기간 최저" value={formatMoney(priceView.low, fxRate, currency)} />
                <Metric label="수익률" value={`${priceView.changePercent >= 0 ? "+" : ""}${decimal.format(priceView.changePercent)}%`} tone={priceView.changePercent >= 0 ? "up" : "down"} />
              </dl>
            </>
          ) : <div className="rounded-lg bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">선택한 기간의 가격 데이터가 없습니다.</div>}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="dividend-chart-title">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <SectionHeading id="dividend-chart-title" eyebrow="03" title="배당 이력" description="실제 지급된 주당 배당금과 연도별 합계" />
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-1" role="group" aria-label="배당 이력 기간">
              {(["1Y", "2Y", "5Y", "ALL"] as const).map((range) => <button type="button" key={range} aria-pressed={dividendRange === range} onClick={() => setDividendRange(range)} className={`min-h-9 rounded-md px-3 text-xs font-bold ${dividendRange === range ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500"}`}>{rangeLabel(range)}</button>)}
            </div>
          </div>
          {status === "loading" ? <div className="h-80 animate-pulse rounded-lg bg-zinc-100" /> : dividendView.items.length > 0 ? (
            <>
              <h3 className="mb-3 text-sm font-extrabold">월별 주당 배당금</h3>
              <div className="h-72 w-full" role="img" aria-label={`${rangeLabel(dividendRange)} 배당 이력 ${dividendView.items.length}건`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendView.monthly} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
                    <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(2).replace("-", ".")} minTickGap={28} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `$${decimal.format(Number(value))}`} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip formatter={(value) => [`$${decimal.format(Number(value))}`, "주당 배당금"]} contentStyle={{ borderRadius: 8, borderColor: "#e4e4e7", fontSize: 12 }} />
                    <Bar dataKey="amount" fill="#18181b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {dividendView.yearly.length > 1 && <><h3 className="mb-3 mt-7 text-sm font-extrabold">연간 주당 배당금 합계</h3><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={dividendView.yearly} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} accessibilityLayer><CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `$${decimal.format(Number(value))}`} tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(value) => [`$${decimal.format(Number(value))}`, "연간 합계"]} contentStyle={{ borderRadius: 8, borderColor: "#e4e4e7", fontSize: 12 }} /><Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></>}
              <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-3">
                <Metric label="최근 주당 배당금" value={formatMoney(dividendView.items[0]?.amount ?? 0, fxRate, currency)} />
                <Metric label="회당 평균" value={formatMoney(dividendView.average, fxRate, currency)} />
                <Metric label="선택 기간 합계" value={formatMoney(dividendView.total, fxRate, currency)} />
              </dl>
              <details className="mt-4 border-t border-zinc-200 pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-bold text-zinc-600">지급 내역 전체 보기</summary><div className="divide-y divide-zinc-200">{dividendView.items.map((item) => <div key={`${item.date}-${item.amount}`} className="flex min-h-12 items-center justify-between gap-4 text-sm"><time dateTime={item.date} className="text-zinc-500">{item.date}</time><b>주당 {formatMoney(item.amount, fxRate, currency)}</b></div>)}</div></details>
            </>
          ) : <div className="rounded-lg bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">선택한 기간의 배당 데이터가 없습니다.</div>}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="target-heading">
          <SectionHeading id="target-heading" eyebrow="04" title="목표 월 배당금" description="세후 월평균 목표에 필요한 투자금과 정수 주식 수를 계산합니다." />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{targetPresets.map((preset) => <button key={preset} type="button" aria-pressed={targetMonthly === preset} onClick={() => setTargetMonthly(preset)} className={`min-h-12 rounded-lg border px-3 text-sm font-extrabold ${targetMonthly === preset ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-zinc-200 text-zinc-700"}`}>월 {won.format(preset / 10_000)}만원</button>)}</div>
          <label className="mt-4 block"><span className="mb-2 block text-xs font-bold text-zinc-600">목표 세후 월평균 배당금</span><div className="relative"><input className="h-12 w-full rounded-lg border border-zinc-300 px-3 pr-10 text-right text-base font-bold" type="number" min="0" step="10000" inputMode="numeric" value={targetMonthly || ""} onChange={(event) => setTargetMonthly(Math.max(0, Number(event.target.value)))} /><b className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">원</b></div></label>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2" aria-live="polite"><div className="bg-zinc-50 p-5"><dt className="text-xs font-bold text-zinc-500">필요 투자금</dt><dd className="mt-2 text-2xl font-black tracking-[-0.04em]">{!hasFxRate ? "환율 입력 필요" : target.investmentKrw > 0 ? formatCalculatedMoney(target.investmentUsd, target.investmentKrw, fxRate, currency) : "계산 불가"}</dd></div><div className="bg-zinc-50 p-5"><dt className="text-xs font-bold text-zinc-500">필요 주식 수</dt><dd className="mt-2 text-2xl font-black tracking-[-0.04em]">{target.shares > 0 ? `${won.format(target.shares)}주` : "-"}</dd></div></dl>
          <p className="mt-3 text-xs leading-5 text-zinc-500">현재가·현재 환율·최근 12개월 실제 배당금과 미국 원천징수 15%가 유지된다는 단순 가정입니다.</p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading eyebrow="05" title={`${config.nameKo} 알아보기`} description={`${config.symbol} 투자 전 확인할 핵심 정보`} />
          <p className="text-sm leading-7 text-zinc-700">{config.description}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-5"><h3 className="font-black text-emerald-950">주요 특징</h3><ul className="mt-3 space-y-3 text-sm leading-6 text-emerald-950">{config.features.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">✓</span><span>{item}</span></li>)}</ul></div>
            <div className="rounded-xl bg-rose-50 p-5"><h3 className="font-black text-rose-950">투자 유의사항</h3><ul className="mt-3 space-y-3 text-sm leading-6 text-rose-950">{config.cautions.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">!</span><span>{item}</span></li>)}</ul></div>
          </div>
          {data && <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><Metric label="구분" value={stockKindLabels[config.kind]?.label ?? "종목"} /><Metric label="섹터" value={data.profile.sector || "정보 없음"} /><Metric label="산업" value={data.profile.industry || "정보 없음"} /><Metric label="거래소" value={data.profile.exchange || "정보 없음"} /></dl>}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="faq-heading">
          <SectionHeading id="faq-heading" eyebrow="06" title="자주 묻는 질문" description={`${config.symbol} 배당 계산에 관한 기본 안내`} />
          <div className="divide-y divide-zinc-200 border-y border-zinc-200">{config.faqs.map((faq) => <details key={faq.question} className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-extrabold"><span>{faq.question}</span><span aria-hidden="true" className="text-lg text-zinc-400 group-open:rotate-45">＋</span></summary><p className="pb-5 pr-8 text-sm leading-7 text-zinc-600">{faq.answer}</p></details>)}</div>
        </section>

        <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600"><b className="text-zinc-950">안내</b><p className="mt-1">본 서비스의 정보와 계산 결과는 참고용이며 투자 권유가 아닙니다. 주가, 배당금, 환율 및 세금은 실제 거래 시점과 시장 상황에 따라 달라질 수 있습니다.</p></aside>
      </div>

      <footer className="border-t border-zinc-200 bg-zinc-50"><div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-8 text-xs leading-5 text-zinc-500 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-zinc-900">배당렌즈</b><p>미국 주식·ETF 배당 현금흐름 계산기</p></div><p className="sm:text-right">데이터: Financial Modeling Prep Stable API<br />최근 12개월 실제 배당금 합계 기준</p></div></footer>
    </main>
  );
}
