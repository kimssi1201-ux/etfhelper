"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateHolding, calculatePortfolio, type Holding, type Market } from "@/lib/calculations";

type SearchResult = { symbol: string; name: string; exchange: string; market: Market; currency: "KRW" | "USD" };
type Draft = Omit<Holding, "id" | "shares"> & { shares: number; inputMode: "shares" | "amount"; investment: number };

const STORAGE_KEY = "etf-flow-portfolio-v1";
const quickPicks = [
  { symbol: "SCHD", label: "SCHD", sub: "미국 배당성장" },
  { symbol: "JEPI", label: "JEPI", sub: "미국 월분배" },
  { symbol: "069500.KS", label: "KODEX 200", sub: "국내 대표지수" },
  { symbol: "458730.KS", label: "TIGER 미국배당다우존스", sub: "국내 배당형" },
];

const emptyDraft = (): Draft => ({
  symbol: "", name: "", market: "KR", currency: "KRW", source: "manual", price: 0,
  shares: 0, investment: 0, inputMode: "shares", ttmDividend: 0, lastDividend: 0,
  frequency: 4, taxRate: 15.4, fxRate: 1350,
});

const won = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });
const formatWon = (value: number) => `${won.format(Math.round(value || 0))}원`;
const formatLocal = (value: number, currency: "KRW" | "USD") => currency === "USD" ? `$${number.format(value || 0)}` : `${won.format(value || 0)}원`;

export default function DividendApp() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    } catch { /* Ignore malformed local data. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, holdings }));
  }, [holdings, hydrated]);

  const totals = useMemo(() => calculatePortfolio(holdings), [holdings]);
  const portfolioYield = totals.valueKrw > 0 ? (totals.ttmGrossKrw / totals.valueKrw) * 100 : 0;
  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  async function searchEtfs(event?: React.FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setMessage(""); setResults([]);
    try {
      const response = await fetch(`/api/etf/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      if (!data.results?.length) setMessage("지원되는 국내·미국 ETF를 찾지 못했습니다. 티커로 다시 검색해 보세요.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "검색 중 문제가 생겼습니다."); }
    finally { setLoading(false); }
  }

  async function loadQuote(symbol: string, fallbackName?: string) {
    setLoading(true); setMessage(""); setResults([]);
    try {
      const response = await fetch(`/api/etf/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDraft({
        ...emptyDraft(), symbol: data.symbol, name: data.name || fallbackName || data.symbol,
        market: data.market, currency: data.currency, source: "auto", price: data.price,
        ttmDividend: data.ttmDividend, lastDividend: data.lastDividend, frequency: data.frequency || 0,
        taxRate: data.market === "KR" ? 15.4 : 15, fxRate: data.fxRate || 1350, lastUpdated: data.updatedAt,
      });
      setMessage(data.dividendCount < 2 ? "분배 이력이 적어 연환산 예상치는 직접 확인해 주세요." : "최신 조회값을 불러왔습니다. 모든 값은 수정할 수 있어요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회 중 문제가 생겼습니다."); setMode("manual");
      setDraft((current) => ({ ...current, symbol, name: fallbackName || symbol, source: "manual" }));
    } finally { setLoading(false); }
  }

  function changeMarket(market: Market) {
    setDraft((current) => ({ ...current, market, currency: market === "KR" ? "KRW" : "USD", taxRate: market === "KR" ? 15.4 : 15 }));
  }

  function addHolding(event: React.FormEvent) {
    event.preventDefault();
    const fx = draft.currency === "USD" ? draft.fxRate : 1;
    const shares = draft.inputMode === "amount" && draft.price * fx > 0 ? draft.investment / (draft.price * fx) : draft.shares;
    if (!draft.name.trim() || draft.price <= 0 || shares <= 0) { setMessage("종목명, 현재가, 보유 수량(또는 투자금)을 확인해 주세요."); return; }
    const holding: Holding = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
      symbol: draft.symbol, name: draft.name, market: draft.market, currency: draft.currency,
      source: draft.source, price: draft.price, shares, ttmDividend: draft.ttmDividend,
      lastDividend: draft.lastDividend, frequency: draft.frequency, taxRate: draft.taxRate,
      fxRate: draft.fxRate, lastUpdated: draft.lastUpdated,
    };
    setHoldings((current) => [...current, holding]);
    setDraft(emptyDraft()); setQuery(""); setMessage("포트폴리오에 추가했습니다.");
  }

  const updateHolding = (id: string, patch: Partial<Holding>) => setHoldings((current) => current.map((holding) => holding.id === id ? { ...holding, ...patch } : holding));

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ETF Flow 홈"><span className="brand-mark">↗</span><span>ETF FLOW</span></a>
        <nav aria-label="주요 메뉴"><a href="#calculator">계산기</a><a href="#portfolio">내 포트폴리오</a></nav>
        <span className="local-save"><i /> 이 기기에 자동 저장</span>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>●</span> 국내 · 미국 ETF 배당 계산기</div>
        <h1>내 ETF 배당금,<br /><em>한눈에 계산하세요.</em></h1>
        <p>종목을 검색하거나 직접 입력하면 최근 배당률부터 세후 월평균 배당금까지 자동으로 계산해 드려요.</p>
        <div className="hero-proof"><span>✓ 최근 12개월 기준</span><span>✓ 세전·세후 비교</span><span>✓ 원화 자동 환산</span></div>
      </section>

      <section className="workspace" id="calculator">
        <div className="input-panel">
          <div className="section-heading"><span className="step">01</span><div><h2>ETF 추가하기</h2><p>자동 조회 후에도 모든 값을 수정할 수 있어요.</p></div></div>
          <div className="tabs" role="tablist" aria-label="입력 방식">
            <button className={mode === "auto" ? "active" : ""} onClick={() => setMode("auto")} role="tab">종목 자동조회</button>
            <button className={mode === "manual" ? "active" : ""} onClick={() => { setMode("manual"); setDraft((d) => ({ ...d, source: "manual" })); }} role="tab">직접 입력</button>
          </div>
          {mode === "auto" && <div className="search-area">
            <form className="search-box" onSubmit={searchEtfs}><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ETF 종목명 또는 티커 (예: SCHD)" aria-label="ETF 검색" /><button disabled={loading}>{loading ? "조회 중" : "검색"}</button></form>
            {results.length > 0 && <div className="search-results">{results.map((item) => <button key={item.symbol} onClick={() => loadQuote(item.symbol, item.name)}><span><strong>{item.name}</strong><small>{item.symbol} · {item.exchange}</small></span><b>선택</b></button>)}</div>}
            <p className="quick-label">빠른 선택</p><div className="quick-picks">{quickPicks.map((item) => <button key={item.symbol} onClick={() => loadQuote(item.symbol, item.label)} disabled={loading}><strong>{item.label}</strong><span>{item.sub}</span></button>)}</div>
          </div>}
          {message && <div className="notice" role="status"><span>i</span>{message}</div>}

          {(mode === "manual" || draft.name) && <form className="editor" onSubmit={addHolding}>
            <div className="editor-title"><h3>{draft.name ? "계산 정보" : "직접 입력"}</h3>{draft.source === "auto" && <span>자동 조회값</span>}</div>
            <div className="market-toggle"><button type="button" className={draft.market === "KR" ? "active" : ""} onClick={() => changeMarket("KR")}>🇰🇷 국내 ETF</button><button type="button" className={draft.market === "US" ? "active" : ""} onClick={() => changeMarket("US")}>🇺🇸 미국 ETF</button></div>
            <div className="field-grid">
              <label><span>종목명</span><input required value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} placeholder="예: KODEX 200" /></label>
              <label><span>티커</span><input value={draft.symbol} onChange={(e) => updateDraft("symbol", e.target.value.toUpperCase())} placeholder="선택 입력" /></label>
              <label><span>현재가 ({draft.currency})</span><input type="number" min="0" step="any" value={draft.price || ""} onChange={(e) => updateDraft("price", Number(e.target.value))} /></label>
              {draft.currency === "USD" && <label><span>USD/KRW 환율</span><input type="number" min="1" step="any" value={draft.fxRate || ""} onChange={(e) => updateDraft("fxRate", Number(e.target.value))} /></label>}
              <label><span>최근 12개월 주당 분배금</span><input type="number" min="0" step="any" value={draft.ttmDividend || ""} onChange={(e) => updateDraft("ttmDividend", Number(e.target.value))} /></label>
              <label><span>최근 주당 분배금</span><input type="number" min="0" step="any" value={draft.lastDividend || ""} onChange={(e) => updateDraft("lastDividend", Number(e.target.value))} /></label>
              <label><span>연간 지급 횟수</span><select value={draft.frequency} onChange={(e) => updateDraft("frequency", Number(e.target.value))}><option value="0">알 수 없음</option><option value="1">연 1회</option><option value="2">반기 2회</option><option value="4">분기 4회</option><option value="12">월 12회</option><option value="52">주 52회</option></select></label>
              <label><span>예상 배당 세율 (%)</span><input type="number" min="0" max="100" step="0.1" value={draft.taxRate} onChange={(e) => updateDraft("taxRate", Number(e.target.value))} /></label>
            </div>
            <div className="amount-choice"><div className="choice-tabs"><button type="button" className={draft.inputMode === "shares" ? "active" : ""} onClick={() => updateDraft("inputMode", "shares")}>보유 수량</button><button type="button" className={draft.inputMode === "amount" ? "active" : ""} onClick={() => updateDraft("inputMode", "amount")}>투자금으로 계산</button></div>{draft.inputMode === "shares" ? <label><span>보유 수량</span><input type="number" min="0" step="any" value={draft.shares || ""} onChange={(e) => updateDraft("shares", Number(e.target.value))} placeholder="0" /></label> : <label><span>투자금 (KRW)</span><input type="number" min="0" step="any" value={draft.investment || ""} onChange={(e) => updateDraft("investment", Number(e.target.value))} placeholder="0" /></label>}</div>
            <button className="add-button" type="submit">포트폴리오에 추가 <span>→</span></button>
          </form>}
        </div>

        <aside className="summary-panel">
          <div className="summary-top"><span className="step light">02</span><div><h2>예상 배당 요약</h2><p>최근 12개월 실제 분배금 기준</p></div></div>
          <div className="summary-main"><span>세후 월평균 배당금</span><strong>{formatWon(totals.ttmNetKrw / 12)}</strong><small>세전 {formatWon(totals.ttmGrossKrw / 12)} / 월</small></div>
          <div className="summary-grid"><div><span>세후 연간 배당금</span><b>{formatWon(totals.ttmNetKrw)}</b></div><div><span>포트폴리오 배당률</span><b>{number.format(portfolioYield)}%</b></div><div><span>총 평가금액</span><b>{formatWon(totals.valueKrw)}</b></div><div><span>연환산 예상 세후</span><b>{formatWon(totals.forwardNetKrw)}</b></div></div>
          <div className="allocation"><div><span>시장 비중</span><small>평가금액 기준</small></div><div className="bar"><i style={{ width: `${totals.valueKrw ? (totals.krValue / totals.valueKrw) * 100 : 0}%` }} /></div><div className="legend"><span><i className="kr" />국내 {totals.valueKrw ? Math.round((totals.krValue / totals.valueKrw) * 100) : 0}%</span><span><i className="us" />미국 {totals.valueKrw ? Math.round((totals.usValue / totals.valueKrw) * 100) : 0}%</span></div></div>
          <p className="summary-note">연환산 예상치는 최근 분배금 × 지급 주기로 계산한 참고값입니다.</p>
        </aside>
      </section>

      <section className="portfolio" id="portfolio">
        <div className="portfolio-head"><div><span className="step">03</span><div><h2>내 포트폴리오</h2><p>{holdings.length}개 ETF · 이 브라우저에 자동 저장</p></div></div>{holdings.length > 0 && <button onClick={() => { if (confirm("포트폴리오를 모두 삭제할까요?")) setHoldings([]); }}>전체 비우기</button>}</div>
        {holdings.length === 0 ? <div className="empty-state"><span>＋</span><h3>아직 추가한 ETF가 없어요</h3><p>위에서 종목을 검색하거나 직접 입력해 첫 배당 포트폴리오를 만들어 보세요.</p></div> : <div className="holding-list">{holdings.map((holding) => {
          const calc = calculateHolding(holding);
          return <article className="holding-card" key={holding.id}><div className="holding-identity"><span className={`market-badge ${holding.market.toLowerCase()}`}>{holding.market}</span><div><h3>{holding.name}</h3><p>{holding.symbol || "직접 입력"} · {holding.source === "auto" ? "자동 조회" : "직접 입력"}</p></div></div><div className="holding-metrics"><div><span>현재가</span><b>{formatLocal(holding.price, holding.currency)}</b></div><div><span>최근 12개월 배당률</span><b className="accent">{number.format(calc.ttmYield)}%</b></div><div><span>세후 월평균</span><b>{formatWon(calc.ttmNetKrw / 12)}</b></div></div><div className="holding-controls"><label><span>수량</span><input aria-label={`${holding.name} 보유 수량`} type="number" min="0" step="any" value={holding.shares} onChange={(e) => updateHolding(holding.id, { shares: Number(e.target.value) })} /></label><label><span>세율 %</span><input aria-label={`${holding.name} 세율`} type="number" min="0" max="100" step="0.1" value={holding.taxRate} onChange={(e) => updateHolding(holding.id, { taxRate: Number(e.target.value) })} /></label><button aria-label={`${holding.name} 삭제`} onClick={() => setHoldings((items) => items.filter((item) => item.id !== holding.id))}>삭제</button></div></article>;
        })}</div>}
      </section>

      <section className="explainers"><div><span>TTM</span><h3>최근 12개월 배당률</h3><p>지난 365일 동안 실제 지급된 주당 분배금 합계를 현재가로 나눈 값이에요.</p></div><div><span>FWD</span><h3>연환산 예상 배당률</h3><p>가장 최근 분배금과 지급 간격으로 앞으로 1년의 분배금을 추정한 값이에요.</p></div><div><span>TAX</span><h3>세후 예상 금액</h3><p>국내 15.4%, 미국 15%를 기본 적용하며 ETF별로 직접 바꿀 수 있어요.</p></div></section>
      <footer><div className="brand"><span className="brand-mark">↗</span><span>ETF FLOW</span></div><p>본 서비스의 계산 결과와 자동 조회 데이터는 참고용이며 투자 또는 세무 자문이 아닙니다.<br />데이터는 지연되거나 누락될 수 있고, 개인별 금융소득종합과세는 반영하지 않습니다.</p><span>기기 내 저장 · 가입 없음</span></footer>
    </main>
  );
}
