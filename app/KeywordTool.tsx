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
    : a.competition.localeCompare(b.competition, "ko-KR"));

  const primary = results[0];
  const totalVolume = results.reduce((sum, item) => sum + item.total, 0);
  const updatedAt = data ? new Date(data.updatedAt).toLocaleString("ko-KR") : "샘플 데이터";

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
          <a href="#related">연관 키워드</a>
          <a href="#trend">추이</a>
        </nav>
      </header>

      <section className="keyword-hero" id="search">
        <p>포털 키워드 검색량 도구</p>
        <h1>키워드 검색량을 빠르게 확인합니다</h1>
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

      <section className="keyword-summary" aria-label="검색량 요약">
        <article>
          <span>대표 키워드</span>
          <strong>{submittedKeyword}</strong>
          <small>{loading ? "조회 중" : updatedAt}</small>
        </article>
        <article>
          <span>월 총 검색량</span>
          <strong>{formatNumber(primary.total)}</strong>
          <small>PC {formatNumber(primary.pc)} · 모바일 {formatNumber(primary.mobile)}</small>
        </article>
        <article>
          <span>모바일 비중</span>
          <strong>{primary.mobileRate}%</strong>
          <small>모바일 중심 콘텐츠 여부 판단</small>
        </article>
        <article>
          <span>연관 키워드 합계</span>
          <strong>{formatNumber(totalVolume)}</strong>
          <small>상위 {results.length}개 샘플 기준</small>
        </article>
      </section>
      {error && <div className="keyword-alert" role="status">{error} 현재는 샘플 구조를 표시합니다.</div>}

      <section className="keyword-panel" id="related">
        <div className="keyword-panel-head">
          <div>
            <p>연관 키워드</p>
            <h2>{submittedKeyword} 관련 후보</h2>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="keyword-grid">
        <article>
          <h2>월별 추이</h2>
          <div className="keyword-chart" aria-label="월별 검색량 샘플 차트">
            {[34, 48, 42, 57, 63, 71, 68, 82, 76, 88, 91, 100].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>
        <article id="trend">
          <h2>활용 메모</h2>
          <p>검색량이 높고 모바일 비중이 큰 키워드는 모바일 콘텐츠와 광고 소재를 먼저 검토하기 좋습니다. 경쟁도가 높은 키워드는 세부 조합어를 함께 비교하세요.</p>
          <dl>
            <div><dt>검색량</dt><dd>수요 확인</dd></div>
            <div><dt>모바일 비중</dt><dd>콘텐츠 형식 판단</dd></div>
            <div><dt>경쟁도</dt><dd>진입 난이도 참고</dd></div>
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
