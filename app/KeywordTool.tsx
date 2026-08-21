"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
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

function competitionTone(value: string) {
  if (value === "낮음") return "easy";
  if (value === "중간") return "mid";
  return "hard";
}

export default function KeywordTool() {
  const [keyword, setKeyword] = useState("부업");
  const [submittedKeyword, setSubmittedKeyword] = useState("부업");
  const [sort, setSort] = useState<"volume" | "competition">("volume");
  const [data, setData] = useState<KeywordApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseResults = data?.results.length ? data.results : relatedSeeds;
  const results = [...baseResults].sort((a, b) => sort === "volume"
    ? b.total - a.total
    : competitionScore(a.competition) - competitionScore(b.competition));

  const primary = results[0];
  const updatedAt = data ? new Date(data.updatedAt).toLocaleString("ko-KR") : "샘플 데이터";
  const score = keywordScore(primary);
  const grade = keywordGrade(score);
  const gradeLevel = gradeStep(grade);
  const gradeToneName = gradeTone(grade);
  const forecast = Math.round(primary.total * 1.08);
  const adEfficiency = primary.competition === "낮음" ? "좋음" : primary.competition === "중간" ? "보통" : "주의";
  const opportunity = score >= 68 ? "우선 검토" : score >= 52 ? "세부 키워드 검토" : "롱테일 권장";
  const topRelated = results.slice(0, 8);
  const maxRelatedVolume = Math.max(...topRelated.map((item) => item.total), 1);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/keywords?keyword=${encodeURIComponent(submittedKeyword)}&mode=relevant`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as KeywordApiResponse | { error?: { message?: string } } | null;
        if (!response.ok) throw new Error(body && "error" in body ? body.error?.message : "키워드 데이터를 불러오지 못했습니다.");
        return body as KeywordApiResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((fetchError: unknown) => {
        if (!cancelled && !(fetchError instanceof DOMException && fetchError.name === "AbortError")) {
          setData(null);
          setError(fetchError instanceof Error ? fetchError.message : "키워드 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [submittedKeyword]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSubmittedKeyword(keyword.trim() || "키워드");
  }

  return (
    <main className="keyword-shell">
      <header className="keyword-header" id="search">
        <div className="keyword-header-top">
          <Link href="/" className="keyword-logo">키워드랩</Link>
          <span>NAVER KEYWORD</span>
        </div>
        <form onSubmit={submit} className="keyword-search">
          <label htmlFor="keyword">키워드</label>
          <input
            id="keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 부업, 배당주, 스마트스토어"
          />
          <button type="submit">검색</button>
        </form>
        <div className="keyword-recent" aria-label="최근 키워드">
          {recentKeywords.map((item) => (
            <button key={item} type="button" onClick={() => { setKeyword(item); setLoading(true); setError(null); setSubmittedKeyword(item); }}>
              {item}
            </button>
          ))}
        </div>
      </header>

      <div className="keyword-tabs" role="tablist" aria-label="분석 메뉴">
        <a className="active" href="#overview" role="tab" aria-selected="true">기본 정보</a>
        <a href="#related" role="tab" aria-selected="false">연관 키워드</a>
        <a href="#distribution" role="tab" aria-selected="false">검색량 분포</a>
        <a href="#trend" role="tab" aria-selected="false">성향 분석</a>
      </div>

      <section className="keyword-summary" id="overview" aria-label="검색량 요약">
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
        <article className={`metric-card grade-card grade-${gradeToneName}`}>
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
        </article>
        <article className="metric-card">
          <span>검색 광고 효율</span>
          <strong>{adEfficiency}</strong>
          <small>
            <em className={`competition-pill ${competitionTone(primary.competition)}`}>{primary.competition}</em>
            광고 깊이 {primary.bid ?? "-"}
          </small>
        </article>
        <article className="metric-card">
          <span>참고 예상치</span>
          <strong className="metric-number">{formatNumber(forecast)}</strong>
          <small>{loading ? "조회 중" : `내부 계산 · ${updatedAt}`}</small>
        </article>
      </section>
      {error && <div className="keyword-alert" role="status">{error} 현재는 샘플 구조를 표시합니다.</div>}

      <section className="keyword-panel" id="related">
        <div className="keyword-panel-head">
          <div>
            <p>RELATION KEYWORDS</p>
            <h2>{submittedKeyword} 관련 키워드</h2>
          </div>
          <div className="keyword-actions">
            <button type="button" className={sort === "volume" ? "active" : ""} onClick={() => setSort("volume")}>검색량순</button>
            <button type="button" className={sort === "competition" ? "active" : ""} onClick={() => setSort("competition")}>경쟁도순</button>
            <button type="button">CSV</button>
          </div>
        </div>

        <div className="keyword-table-wrap">
          <div className="keyword-table">
            {results.map((item) => {
              const itemScore = keywordScore(item);
              const itemGrade = keywordGrade(itemScore);
              const itemTone = gradeTone(itemGrade);
              return (
                <a className="keyword-row" href="#search" key={item.keyword} onClick={() => { setKeyword(item.keyword); setLoading(true); setError(null); setSubmittedKeyword(item.keyword); }}>
                  <span className="keyword-row-name">{item.keyword}</span>
                  <span className="keyword-row-bar" aria-hidden="true"><i style={{ width: `${Math.max(6, Math.round((item.total / maxRelatedVolume) * 100))}%` }} /></span>
                  <span className="keyword-row-volume">{formatNumber(item.total)}</span>
                  <span className={`keyword-row-grade ${itemTone}`}>{itemGrade}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="keyword-grid">
        <article id="distribution">
          <h2>검색량 분포</h2>
          <div className="keyword-chart keyword-distribution" aria-label="관련 키워드 검색량 분포">
            {topRelated.map((item) => (
              <span
                key={item.keyword}
                title={`${item.keyword} ${formatNumber(item.total)}회`}
                style={{ height: `${Math.max(12, Math.round((item.total / maxRelatedVolume) * 100))}%` }}
              >
                <b>{item.keyword}</b>
              </span>
            ))}
          </div>
        </article>
        <article id="trend">
          <h2>상황 분석</h2>
          <p>{submittedKeyword} 키워드는 현재 {formatNumber(primary.total)}회 규모의 월간 검색량을 보입니다. 경쟁도는 {primary.competition}이며, {opportunity} 대상으로 분류했습니다.</p>
          <dl>
            <div><dt>대표 키워드</dt><dd>{primary.keyword}</dd></div>
            <div><dt>모바일 비중</dt><dd>{primary.mobileRate}%</dd></div>
            <div><dt>추천 확장어</dt><dd>{topRelated.slice(1, 4).map((item) => item.keyword).join(", ") || "-"}</dd></div>
          </dl>
        </article>
      </section>

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
    </main>
  );
}
