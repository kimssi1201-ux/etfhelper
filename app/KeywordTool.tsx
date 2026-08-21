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
  if (score >= 82) return "A";
  if (score >= 68) return "B";
  if (score >= 52) return "C";
  if (score >= 36) return "D";
  return "E";
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
  const totalVolume = results.reduce((sum, item) => sum + item.total, 0);
  const updatedAt = data ? new Date(data.updatedAt).toLocaleString("ko-KR") : "샘플 데이터";
  const score = keywordScore(primary);
  const grade = keywordGrade(score);
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
      <header className="keyword-header">
        <Link href="/" className="keyword-logo">키워드랩</Link>
        <nav aria-label="상단 메뉴">
          <a href="#search">검색</a>
          <a href="#overview">분석</a>
          <a href="#related">연관 키워드</a>
          <a href="#trend">추이</a>
        </nav>
      </header>

      <section className="keyword-hero" id="search">
        <p>NAVER KEYWORD DASHBOARD</p>
        <h1>검색량과 경쟁도를 한 화면에서 봅니다</h1>
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
      </section>

      <section className="keyword-tabs" aria-label="분석 메뉴">
        <a className="active" href="#overview">기본 정보</a>
        <a href="#related">연관 키워드</a>
        <a href="#distribution">검색량 분포</a>
        <a href="#trend">성향 분석</a>
      </section>

      <section className="keyword-summary" id="overview" aria-label="검색량 요약">
        <article>
          <span>키워드 등급</span>
          <strong>{grade}</strong>
          <small>{score}점 · {opportunity}</small>
        </article>
        <article>
          <span>월간 검색량</span>
          <strong>{formatNumber(primary.total)}</strong>
          <small>PC {formatNumber(primary.pc)} · 모바일 {formatNumber(primary.mobile)}</small>
        </article>
        <article>
          <span>검색 광고 효율</span>
          <strong>{adEfficiency}</strong>
          <small>경쟁도 {primary.competition} · 광고 깊이 {primary.bid ?? "-"}</small>
        </article>
        <article>
          <span>참고 예상치</span>
          <strong>{formatNumber(forecast)}</strong>
          <small>{loading ? "조회 중" : `내부 계산 · ${updatedAt}`}</small>
        </article>
      </section>
      {error && <div className="keyword-alert" role="status">{error} 현재는 샘플 구조를 표시합니다.</div>}

      <section className="keyword-metric-grid" aria-label="상세 지표">
        <article className="metric-card">
          <div className="metric-head"><h2>월간 검색량</h2><span>Total</span></div>
          <div className="metric-split">
            <div><b>{formatNumber(primary.pc)}</b><small>PC</small></div>
            <div><b>{formatNumber(primary.mobile)}</b><small>Mobile</small></div>
            <div><b>{formatNumber(primary.total)}</b><small>Total</small></div>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-head"><h2>기회 점수</h2><span>{opportunity}</span></div>
          <div className="score-ring"><strong>{score}</strong><small>/ 100</small></div>
          <p>검색량, 모바일 비중, 경쟁도를 합산한 내부 참고 지표입니다.</p>
        </article>
        <article className="metric-card">
          <div className="metric-head"><h2>모바일 성향</h2><span>{primary.mobileRate}%</span></div>
          <div className="horizontal-meter"><span style={{ width: `${primary.mobileRate}%` }} /></div>
          <p>모바일 검색 비중이 높을수록 짧은 제목과 빠른 정보 구조가 유리합니다.</p>
        </article>
        <article className="metric-card">
          <div className="metric-head"><h2>연관 키워드</h2><span>{results.length}개</span></div>
          <strong className="metric-total">{formatNumber(totalVolume)}</strong>
          <p>현재 검색어가 포함된 관련 후보만 우선 표시합니다.</p>
        </article>
      </section>

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
          <table className="keyword-table">
            <thead>
              <tr>
                <th>키워드</th>
                <th>PC</th>
                <th>모바일</th>
                <th>합계</th>
                <th>모바일</th>
                <th>경쟁도</th>
                <th>광고 깊이</th>
                <th>기회</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr key={item.keyword}>
                  <td>{item.keyword}</td>
                  <td>{formatNumber(item.pc)}</td>
                  <td>{formatNumber(item.mobile)}</td>
                  <td>{formatNumber(item.total)}</td>
                  <td>{item.mobileRate}%</td>
                  <td>{item.competition}</td>
                  <td>{item.bid === null ? "-" : formatNumber(item.bid)}</td>
                  <td>{keywordScore(item)}점</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <span>키워드랩</span>
        <p>검색량 데이터는 광고 API 제공 범위와 지연 시간에 따라 달라질 수 있습니다.</p>
      </footer>
    </main>
  );
}
