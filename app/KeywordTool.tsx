"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";

type KeywordMetric = {
  keyword: string;
  pc: number;
  mobile: number;
  total: number;
  mobileRate: number;
  competition: string;
  bid: number | null;
};

type KeywordApiResponse = {
  keyword: string;
  results: KeywordMetric[];
  updatedAt: string;
  source: "NAVER_SEARCHAD";
  openApi?: {
    availability: {
      status: "available" | "config-missing" | "auth-error" | "rate-limit" | "unavailable";
      message: string | null;
    };
    documentStats: {
      blog: number | null;
      news: number | null;
      cafe: number | null;
      web: number | null;
      total: number | null;
      saturationIndex: number | null;
    } | null;
    trend: Array<{ period: string; ratio: number }>;
    updatedAt: string | null;
    source: "NAVER_OPENAPI";
  };
};

const relatedSeedInputs: Array<Omit<KeywordMetric, "total" | "mobileRate">> = [
  { keyword: "부업", pc: 18400, mobile: 81200, competition: "높음", bid: 920 },
  { keyword: "재택 부업", pc: 6100, mobile: 28800, competition: "중간", bid: 760 },
  { keyword: "블로그 부업", pc: 4300, mobile: 17100, competition: "중간", bid: 640 },
  { keyword: "쿠팡파트너스", pc: 7200, mobile: 25100, competition: "높음", bid: 1180 },
  { keyword: "스마트스토어", pc: 12600, mobile: 43800, competition: "높음", bid: 1350 },
  { keyword: "전자책 판매", pc: 2100, mobile: 8600, competition: "낮음", bid: 410 },
];

const relatedSeeds: KeywordMetric[] = relatedSeedInputs.map((item) => ({
  ...item,
  total: item.pc + item.mobile,
  mobileRate: Math.round((item.mobile / (item.pc + item.mobile)) * 100),
}));

const recentKeywords = ["부업", "배당주", "스마트스토어", "블로그 수익", "키워드 검색량"];
const tablePageSize = 20;
const keywordFetchFailedMessage = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요";
const keywordLoadingMessage = "키워드 데이터를 조회 중입니다.";
const sampleFallbackEnabled = process.env.NODE_ENV !== "production";

type KeywordTabId = "summary" | "briefing" | "cards" | "ranking" | "related";

const keywordTabs: Array<{ id: KeywordTabId; label: string }> = [
  { id: "summary", label: "요약" },
  { id: "briefing", label: "AI 브리핑" },
  { id: "cards", label: "키워드 카드" },
  { id: "ranking", label: "상승 키워드" },
  { id: "related", label: "상세 표" },
];

const minVolumeOptions = [
  { label: "전체", value: 0 },
  { label: "100+", value: 100 },
  { label: "500+", value: 500 },
  { label: "1000+", value: 1000 },
];

function isKeywordTab(value: string | null): value is KeywordTabId {
  return keywordTabs.some((tab) => tab.id === value);
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "집계 준비 중";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${hours}:${minutes} 기준`;
}

function competitionScore(value: string) {
  if (value === "낮음") return 24;
  if (value === "중간") return 52;
  if (value === "높음") return 82;
  return 45;
}

function keywordScore(item: KeywordMetric) {
  const volume = Math.min(42, Math.round(Math.log10(Math.max(item.total, 10)) * 10));
  const mobile = Math.min(18, Math.round(item.mobileRate / 6));
  const competition = 40 - Math.round(competitionScore(item.competition) / 3);
  return Math.max(1, Math.min(100, volume + mobile + competition));
}

function keywordGrade(score: number) {
  if (score >= 82) return "S";
  if (score >= 68) return "A";
  if (score >= 52) return "B";
  if (score >= 36) return "C";
  return "D";
}

function gradeStep(grade: string) {
  return ({ S: 1, A: 2, B: 3, C: 4, D: 5 } as Record<string, number>)[grade] ?? 5;
}

function gradeTone(grade: string) {
  if (grade === "S" || grade === "A") return "easy";
  if (grade === "B" || grade === "C") return "mid";
  return "hard";
}

function gradeMessage(grade: string) {
  if (grade === "S") return "매우 수월함";
  if (grade === "A") return "진입 여지 있음";
  if (grade === "B") return "경쟁 보통";
  if (grade === "C") return "경쟁이 다소 치열함";
  return "경쟁 강함";
}

const gradeCriteria = [
  { grade: "S", label: "82점 이상", description: "검색량 대비 경쟁 부담이 매우 낮음" },
  { grade: "A", label: "68점 이상", description: "진입 여지가 충분함" },
  { grade: "B", label: "52점 이상", description: "경쟁 보통" },
  { grade: "C", label: "36점 이상", description: "경쟁이 다소 치열함" },
  { grade: "D", label: "36점 미만", description: "경쟁 강함" },
];

function gradeBadgeLabel(grade: string) {
  return `${grade}등급 · ${gradeMessage(grade)}`;
}

function competitionTone(value: string) {
  if (value === "낮음") return "easy";
  if (value === "중간") return "mid";
  return "hard";
}

function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function volumeBarWidth(volume: number, maxVolume: number) {
  if (volume <= 0 || maxVolume <= 0) return 0;
  const ratio = Math.log10(volume + 1) / Math.log10(maxVolume + 1);
  return Math.max(4, Math.round(ratio * 100));
}

export default function KeywordTool() {
  const [keyword, setKeyword] = useState("부업");
  const [submittedKeyword, setSubmittedKeyword] = useState("부업");
  const [sort, setSort] = useState<"volume" | "competition">("volume");
  const [activeTab, setActiveTab] = useState<KeywordTabId>(() => {
    if (typeof window === "undefined") return "summary";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return isKeywordTab(tab) ? tab : "summary";
  });
  const [filterText, setFilterText] = useState("");
  const [debouncedFilterText, setDebouncedFilterText] = useState("");
  const [minVolume, setMinVolume] = useState(0);
  const [visibleCount, setVisibleCount] = useState(tablePageSize);
  const [gradeGuideOpen, setGradeGuideOpen] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const [data, setData] = useState<KeywordApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const tabRefs = useRef<Record<KeywordTabId, HTMLButtonElement | null>>({
    summary: null,
    briefing: null,
    cards: null,
    ranking: null,
    related: null,
  });

  const hasLiveResults = Boolean(data?.results.length);
  const showingSampleData = !loading && !hasLiveResults && sampleFallbackEnabled;
  const baseResults = hasLiveResults ? data?.results ?? [] : showingSampleData ? relatedSeeds : [];
  const results = [...baseResults].sort((a, b) => sort === "volume"
    ? b.total - a.total
    : competitionScore(a.competition) - competitionScore(b.competition));
  const normalizedFilterText = debouncedFilterText.trim().toLocaleLowerCase("ko-KR");
  const filteredResults = results.filter((item) => (
    item.total >= minVolume
    && (normalizedFilterText.length === 0 || item.keyword.toLocaleLowerCase("ko-KR").includes(normalizedFilterText))
  ));
  const visibleResults = filteredResults.slice(0, visibleCount);
  const visibleResultCount = Math.min(visibleCount, filteredResults.length);

  const primary = results[0] ?? null;
  const totalVolume = results.reduce((sum, item) => sum + item.total, 0);
  const easyCount = results.filter((item) => item.competition === "낮음").length;
  const hardCount = results.filter((item) => item.competition === "높음").length;
  const averageMobileRate = Math.round(results.reduce((sum, item) => sum + item.mobileRate, 0) / Math.max(results.length, 1));
  const updatedAt = data ? formatUpdatedAt(data.updatedAt) : showingSampleData ? "개발용 샘플 데이터" : "집계 준비 중";
  const score = primary ? keywordScore(primary) : 0;
  const grade = keywordGrade(score);
  const gradeLevel = gradeStep(grade);
  const gradeToneName = gradeTone(grade);
  const forecast = primary ? Math.round(primary.total * 1.08) : 0;
  const adEfficiency = !primary ? "집계 준비 중" : primary.competition === "낮음" ? "좋음" : primary.competition === "중간" ? "보통" : "주의";
  const opportunity = score >= 68 ? "우선 검토" : score >= 52 ? "세부 키워드 검토" : "롱테일 권장";
  const topRelated = results.slice(0, 4);
  const volumeRankKeywords = results.slice(0, 5);
  const distributionKeywords = results.slice(0, 8);
  const distributionMaxVolume = Math.max(...distributionKeywords.map((item) => item.total), 1);
  const maxRelatedVolume = Math.max(...filteredResults.map((item) => item.total), 1);
  const documentStats = data?.openApi?.documentStats ?? null;
  const trend = data?.openApi?.trend ?? [];
  const hasDocumentTotal = hasNumber(documentStats?.total);
  const hasSaturationIndex = hasNumber(documentStats?.saturationIndex);
  const latestTrend = trend.at(-1);
  const previousTrend = trend.at(-2);
  const trendDelta = latestTrend && previousTrend ? Math.round((latestTrend.ratio - previousTrend.ratio) * 10) / 10 : null;
  const trendLabel = trendDelta === null ? "데이터 없음" : trendDelta >= 0 ? `+${trendDelta}` : `${trendDelta}`;
  const statusMessage = loading ? keywordLoadingMessage : error ?? keywordFetchFailedMessage;
  const statusRole = loading ? "status" : "alert";
  const summaryCards = primary ? [
    {
      key: "grade",
      className: `metric-card grade-card grade-${gradeToneName}`,
      content: (
        <>
          <div className="grade-head">
            <span>키워드 등급</span>
            <b>{grade} · {gradeMessage(grade)}</b>
          </div>
          <div
            className="grade-segments"
            role="img"
            aria-label={`5단계 중 ${gradeLevel}단계, ${grade}등급`}
          >
            {[1, 2, 3, 4, 5].map((step) => (
              <i key={step} className={step <= gradeLevel ? "active" : ""} />
            ))}
          </div>
          <div className="grade-labels" aria-hidden="true">
            <span>S 쉬움</span><span>A</span><span>B</span><span>C</span><span>D 어려움</span>
          </div>
        </>
      ),
    },
    {
      key: "ad",
      className: "metric-card",
      content: (
        <>
          <span>검색 광고 효율</span>
          <strong>{adEfficiency}</strong>
          <small>
            <em className={`competition-pill ${competitionTone(primary.competition)}`}>{primary.competition}</em>
            광고 깊이 {primary.bid === null ? "집계 준비 중" : primary.bid}
          </small>
        </>
      ),
    },
    {
      key: "related",
      className: "metric-card",
      content: (
        <>
          <span>연관 키워드</span>
          <strong className="metric-number">{formatNumber(results.length)}</strong>
          <small>{loading ? "조회 중" : `최종 갱신 · ${updatedAt}`}</small>
        </>
      ),
    },
    ...(hasDocumentTotal ? [{
      key: "documents",
      className: "metric-card",
      content: (
        <>
          <span>콘텐츠 문서 수</span>
          <strong className="metric-number">{formatNumber(documentStats.total)}</strong>
          <small>블로그·뉴스·카페·웹문서 합계</small>
        </>
      ),
    }] : []),
    ...(hasSaturationIndex ? [{
      key: "saturation",
      className: "metric-card",
      content: (
        <>
          <span>콘텐츠 포화도</span>
          <strong className="metric-number">{documentStats.saturationIndex}%</strong>
          <small>문서 수 ÷ 월간 검색량 기준</small>
        </>
      ),
    }] : []),
  ] : [];
  const aiMetrics = [
    { label: "기회 점수", value: score },
    { label: "낮은 경쟁", value: easyCount },
    { label: "높은 경쟁", value: hardCount },
    { label: "모바일 평균", value: `${averageMobileRate}%` },
    ...(trendDelta === null ? [] : [{ label: "트렌드", value: trendLabel }]),
    ...(hasDocumentTotal ? [{ label: "문서 합계", value: formatNumber(documentStats.total) }] : []),
  ];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedFilterText(filterText);
      setVisibleCount(tablePageSize);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [filterText]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab]);

  useEffect(() => {
    const updateTopButton = () => {
      setShowTopButton(window.scrollY > 400);
    };

    updateTopButton();
    window.addEventListener("scroll", updateTopButton, { passive: true });
    return () => window.removeEventListener("scroll", updateTopButton);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/keywords?keyword=${encodeURIComponent(submittedKeyword)}&mode=relevant`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as KeywordApiResponse | { error?: { code?: string; message?: string } } | null;
        if (!response.ok) throw new Error(body && "error" in body ? body.error?.message : "키워드 데이터를 불러오지 못했습니다.");
        return body as KeywordApiResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((fetchError: unknown) => {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          console.warn("Keyword data fetch failed", { error: fetchError, keyword: submittedKeyword });
          setData(null);
          setError(keywordFetchFailedMessage);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submittedKeyword, requestNonce]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitKeyword(keyword);
  }

  function submitKeyword(value: string) {
    const nextKeyword = value.trim() || "키워드";
    setKeyword(nextKeyword);
    setLoading(true);
    setError(null);
    setData(null);
    setVisibleCount(tablePageSize);
    setSubmittedKeyword(nextKeyword);
    setRequestNonce((nonce) => nonce + 1);
  }

  function submitOnEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitKeyword(keyword);
  }

  function selectKeyword(nextKeyword: string) {
    submitKeyword(nextKeyword);
  }

  function focusTab(tabId: KeywordTabId) {
    setActiveTab(tabId);
    window.setTimeout(() => tabRefs.current[tabId]?.focus(), 0);
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = keywordTabs.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = lastIndex;
    else return;

    event.preventDefault();
    focusTab(keywordTabs[nextIndex].id);
  }

  return (
    <main className="keyword-shell">
      <header className="keyword-header" id="search">
        <div className="keyword-header-top">
          <Link href="/" className="keyword-logo"><i aria-hidden="true">K</i> 키워드랩</Link>
          <button className="keyword-menu" type="button" aria-label="메뉴">☰</button>
        </div>
      </header>

      <section className="keyword-brief-hero">
        <p>AI 키워드 브리핑</p>
        <h1>AI 브리핑 키워드 대시보드</h1>
        <span>검색량·경쟁도·연관 키워드를 모바일에서 빠르게 확인합니다.</span>
        <form onSubmit={submit} className="keyword-search">
          <label htmlFor="keyword">키워드</label>
          <input
            id="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder="예: 부업, 배당주, 스마트스토어"
          />
          <button type="submit">검색</button>
        </form>
        <div className="keyword-recent" aria-label="최근 키워드">
          {recentKeywords.map((item) => (
            <button key={item} type="button" onClick={() => selectKeyword(item)}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <div className="keyword-tabs" role="tablist" aria-label="분석 메뉴">
        {keywordTabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => { tabRefs.current[tab.id] = node; }}
            id={`keyword-tab-${tab.id}`}
            type="button"
            role="tab"
            className={activeTab === tab.id ? "active" : ""}
            aria-selected={activeTab === tab.id}
            aria-controls={`keyword-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" && (
        <section
          className="keyword-tab-panel"
          id="keyword-panel-summary"
          role="tabpanel"
          aria-labelledby="keyword-tab-summary"
          tabIndex={0}
        >
          {primary ? (
            <section className="keyword-summary" aria-label="검색량 요약">
              <article className="metric-card metric-card-wide">
                <span>월간 검색량</span>
                <strong className="metric-number">{formatNumber(primary.total)}</strong>
                <small>PC {formatNumber(primary.pc)} · 모바일 {formatNumber(primary.mobile)}</small>
                <div className="volume-ratio" aria-label={`모바일 ${primary.mobileRate}%, PC ${100 - primary.mobileRate}%`}>
                  <span style={{ width: `${primary.mobileRate}%` }} />
                </div>
                <div className="volume-legend">
                  <span>Mobile {formatNumber(primary.mobile)}</span>
                  <span>PC {formatNumber(primary.pc)}</span>
                </div>
              </article>
              {summaryCards.map((card, index) => (
                <article
                  key={card.key}
                  className={`${card.className}${index === summaryCards.length - 1 && summaryCards.length % 2 === 1 ? " metric-card-fill" : ""}`}
                >
                  {card.content}
                </article>
              ))}
            </section>
          ) : (
            <section className="keyword-summary" aria-label="검색량 요약">
              <article className="metric-card metric-card-wide keyword-empty" role={statusRole}>
                {statusMessage}
              </article>
            </section>
          )}
          <div className="ad-slot keyword-summary-ad" data-slot="keyword-summary-after" aria-hidden="true" />
          {error && showingSampleData && <div className="keyword-alert" role="status">{error}. 개발 환경에서만 샘플 데이터를 표시합니다.</div>}

          {primary && (
            <section className="keyword-grid">
              <article id="distribution">
                <h2>검색량 분포</h2>
                <div className="keyword-chart keyword-distribution" aria-label="상위 8개 관련 키워드 검색량 분포">
                  {distributionKeywords.map((item) => (
                    <div className="distribution-row" key={item.keyword} title={`${item.keyword} ${formatNumber(item.total)}회`}>
                      <span className="distribution-label">{item.keyword}</span>
                      <span className="distribution-bar" aria-hidden="true">
                        <i style={{ width: `${volumeBarWidth(item.total, distributionMaxVolume)}%` }} />
                      </span>
                      <strong>{formatNumber(item.total)}</strong>
                    </div>
                  ))}
                </div>
              </article>
              <article id="trend">
                <h2>상황 분석</h2>
                <p>{submittedKeyword} 키워드는 현재 {formatNumber(primary.total)}회 규모의 월간 검색량을 보입니다. 경쟁도는 {primary.competition}이며, {opportunity} 대상으로 분류했습니다.</p>
                <dl>
                  <div><dt>대표 키워드</dt><dd>{primary.keyword}</dd></div>
                  <div><dt>모바일 비중</dt><dd>{primary.mobileRate}%</dd></div>
                  <div><dt>참고 예상치</dt><dd>{formatNumber(forecast)}</dd></div>
                  <div><dt>연관 총 검색량</dt><dd>{formatNumber(totalVolume)}</dd></div>
                  {hasDocumentTotal && <div><dt>문서 수</dt><dd>{formatNumber(documentStats.total)}</dd></div>}
                  {hasSaturationIndex && <div><dt>포화도</dt><dd>{documentStats.saturationIndex}%</dd></div>}
                  <div><dt>추천 확장어</dt><dd>{topRelated.slice(1, 4).map((item) => item.keyword).join(", ") || "-"}</dd></div>
                </dl>
              </article>
            </section>
          )}
        </section>
      )}

      {activeTab === "briefing" && (
      <section
        className="keyword-ai-card"
        id="keyword-panel-briefing"
        role="tabpanel"
        aria-labelledby="keyword-tab-briefing"
        tabIndex={0}
        aria-label="AI 브리핑"
      >
        <div className="keyword-panel-head">
          <div>
            <p>AI BRIEFING</p>
            <h2>AI 브리핑 리포트</h2>
          </div>
          <span>{submittedKeyword}</span>
        </div>
        {primary ? (
          <>
            <p>
              <b>{submittedKeyword}</b> 키워드는 월간 {formatNumber(primary.total)}회 규모이며 모바일 비중은 {primary.mobileRate}%입니다.
              경쟁도는 {primary.competition}이고, 현재는 <b>{opportunity}</b> 전략이 적합합니다.
            </p>
            <div className="keyword-ai-metrics">
              {aiMetrics.map((item) => (
                <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
              ))}
            </div>
          </>
        ) : (
          <div className="keyword-empty" role={statusRole}>{statusMessage}</div>
        )}
      </section>
      )}

      {activeTab === "cards" && (
      <section
        className="keyword-card-section"
        id="keyword-panel-cards"
        role="tabpanel"
        aria-labelledby="keyword-tab-cards"
        tabIndex={0}
        aria-label="추천 키워드 카드"
      >
        <div className="keyword-section-title">
          <p>추천 키워드 카드</p>
          <h2>관련 키워드</h2>
        </div>
        <div className="keyword-card-grid">
          {topRelated.length === 0 ? (
            <div className="keyword-empty" role={statusRole}>{statusMessage}</div>
          ) : topRelated.map((item) => {
            const itemScore = keywordScore(item);
            const itemGrade = keywordGrade(itemScore);
            const itemTone = gradeTone(itemGrade);
            const itemGradeLabel = gradeBadgeLabel(itemGrade);
            return (
              <button
                className="related-keyword-card"
                key={item.keyword}
                type="button"
                onClick={() => selectKeyword(item.keyword)}
              >
                <span><i aria-hidden="true">K</i>{item.keyword}</span>
                <strong>{formatNumber(item.total)}</strong>
                <small>PC {formatNumber(item.pc)} · Mobile {formatNumber(item.mobile)}</small>
                <em className={itemTone} title={itemGradeLabel} aria-label={itemGradeLabel}>{itemGrade}</em>
                <div className="volume-ratio" aria-hidden="true">
                  <span style={{ width: `${item.mobileRate}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
      )}

      {activeTab === "ranking" && (
      <section
        className="keyword-ranking"
        id="keyword-panel-ranking"
        role="tabpanel"
        aria-labelledby="keyword-tab-ranking"
        tabIndex={0}
        aria-label="검색량 상위 키워드"
      >
        <div className="keyword-section-title">
          <p>실시간 참고</p>
          <h2>검색량 상위 키워드</h2>
        </div>
        <div className="ranking-list">
          {volumeRankKeywords.length === 0 ? (
            <div className="keyword-empty" role={statusRole}>{statusMessage}</div>
          ) : volumeRankKeywords.map((item, index) => (
            <button
              key={item.keyword}
              type="button"
              onClick={() => selectKeyword(item.keyword)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{item.keyword}</b>
              <em>{formatNumber(item.total)}</em>
              <small>검색량</small>
            </button>
          ))}
        </div>
      </section>
      )}

      {activeTab === "related" && (
      <section
        className="keyword-panel"
        id="keyword-panel-related"
        role="tabpanel"
        aria-labelledby="keyword-tab-related"
        tabIndex={0}
      >
        <div className="keyword-panel-head">
          <div>
            <p>KEYWORD DETAIL</p>
            <h2>키워드 분석 표</h2>
          </div>
          <div className="keyword-actions">
            <button type="button" className={sort === "volume" ? "active" : ""} onClick={() => { setSort("volume"); setVisibleCount(tablePageSize); }}>검색량순</button>
            <button type="button" className={sort === "competition" ? "active" : ""} onClick={() => { setSort("competition"); setVisibleCount(tablePageSize); }}>경쟁도순</button>
            <button type="button">CSV</button>
            <div className="keyword-grade-guide">
              <button
                type="button"
                aria-expanded={gradeGuideOpen}
                aria-controls="keyword-grade-popover"
                onClick={() => setGradeGuideOpen((open) => !open)}
              >
                등급 기준
              </button>
              {gradeGuideOpen && (
                <div className="grade-popover" id="keyword-grade-popover" role="tooltip">
                  {gradeCriteria.map((item) => (
                    <p key={item.grade}><b>{item.grade}</b><span>{item.label}</span><small>{item.description}</small></p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="keyword-table-filters" aria-label="키워드 표 필터">
          <label>
            <span>키워드 검색</span>
            <input
              type="search"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="포함할 키워드"
            />
          </label>
          <label>
            <span>최소 검색량</span>
            <select value={minVolume} onChange={(event) => { setMinVolume(Number(event.target.value)); setVisibleCount(tablePageSize); }}>
              {minVolumeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="keyword-table-wrap">
          <div className="keyword-table">
            {filteredResults.length === 0 ? (
              <div className="keyword-empty" role={statusRole}>
                {primary || showingSampleData ? "조건에 맞는 키워드가 없습니다" : statusMessage}
              </div>
            ) : visibleResults.map((item, index) => {
              const itemScore = keywordScore(item);
              const itemGrade = keywordGrade(itemScore);
              const itemTone = gradeTone(itemGrade);
              const gradeLabel = gradeBadgeLabel(itemGrade);
              return (
                <Fragment key={item.keyword}>
                  <a className="keyword-row" href="#search" onClick={() => selectKeyword(item.keyword)}>
                    <span className="keyword-row-name">{item.keyword}</span>
                    <span className="keyword-row-bar" aria-hidden="true"><i style={{ width: `${volumeBarWidth(item.total, maxRelatedVolume)}%` }} /></span>
                    <span className="keyword-row-volume">{formatNumber(item.total)}</span>
                    <span className={`keyword-row-grade ${itemTone}`} title={gradeLabel} aria-label={gradeLabel}>{itemGrade}</span>
                  </a>
                  {(index + 1) % tablePageSize === 0 && (
                    <div className="ad-slot keyword-row-ad" data-slot={`keyword-table-${index + 1}`} aria-hidden="true" />
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
        <div className="keyword-table-footer">
          <span>{formatNumber(visibleResultCount)} / {formatNumber(filteredResults.length)}</span>
          {visibleResultCount < filteredResults.length && (
            <button type="button" onClick={() => setVisibleCount((count) => count + tablePageSize)}>
              더보기(+20)
            </button>
          )}
        </div>
      </section>
      )}

      <footer className="keyword-footer">
        <div>
          <span>키워드랩</span>
          <p>검색량 데이터는 광고 API 제공 범위와 지연 시간에 따라 달라질 수 있습니다.</p>
        </div>
        <nav aria-label="사이트 정책">
          <Link href="/about">소개</Link>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/contact">문의</Link>
        </nav>
      </footer>
      <button
        type="button"
        className={`scroll-top-button${showTopButton ? " visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        맨 위로
      </button>
    </main>
  );
}
