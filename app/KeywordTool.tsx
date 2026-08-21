"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const relatedSeeds = [
  { keyword: "부업", pc: 18400, mobile: 81200, competition: "높음", bid: 920 },
  { keyword: "재택 부업", pc: 6100, mobile: 28800, competition: "중간", bid: 760 },
  { keyword: "블로그 부업", pc: 4300, mobile: 17100, competition: "중간", bid: 640 },
  { keyword: "쿠팡파트너스", pc: 7200, mobile: 25100, competition: "높음", bid: 1180 },
  { keyword: "스마트스토어", pc: 12600, mobile: 43800, competition: "높음", bid: 1350 },
  { keyword: "전자책 판매", pc: 2100, mobile: 8600, competition: "낮음", bid: 410 },
];

const recentKeywords = ["부업", "배당주", "스마트스토어", "블로그 수익", "키워드 검색량"];

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function KeywordTool() {
  const [keyword, setKeyword] = useState("부업");
  const [submittedKeyword, setSubmittedKeyword] = useState("부업");
  const [sort, setSort] = useState<"volume" | "competition">("volume");

  const results = useMemo(() => {
    const normalized = submittedKeyword.trim() || "키워드";
    const base = relatedSeeds.map((item, index) => ({
      ...item,
      keyword: index === 0 ? normalized : `${normalized} ${item.keyword}`,
      total: item.pc + item.mobile,
      mobileRate: Math.round((item.mobile / (item.pc + item.mobile)) * 100),
    }));

    return [...base].sort((a, b) => sort === "volume"
      ? b.total - a.total
      : a.competition.localeCompare(b.competition, "ko-KR"));
  }, [submittedKeyword, sort]);

  const primary = results[0];
  const totalVolume = results.reduce((sum, item) => sum + item.total, 0);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(keyword.trim() || "키워드");
  }

  return (
    <main className="keyword-shell">
      <header className="keyword-header">
        <Link href="/" className="keyword-logo">키워드랩</Link>
        <nav aria-label="상단 메뉴">
          <a href="#search">검색</a>
          <a href="#related">연관 키워드</a>
          <a href="#setup">API 설정</a>
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
            <button key={item} type="button" onClick={() => { setKeyword(item); setSubmittedKeyword(item); }}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="keyword-summary" aria-label="검색량 요약">
        <article>
          <span>대표 키워드</span>
          <strong>{submittedKeyword}</strong>
          <small>현재는 화면 구조용 샘플 데이터입니다.</small>
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
                <th>예상 CPC</th>
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
                  <td>{formatNumber(item.bid)}원</td>
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
        <article id="setup">
          <h2>API 연결</h2>
          <p>실제 검색량은 네이버 검색광고 API 환경변수를 서버에 설정한 뒤 연결합니다. 키는 화면이나 클라이언트 코드에 노출하지 않습니다.</p>
          <dl>
            <div><dt>NAVER_SEARCHAD_API_KEY</dt><dd>서버 전용</dd></div>
            <div><dt>NAVER_SEARCHAD_SECRET_KEY</dt><dd>서버 전용</dd></div>
            <div><dt>NAVER_SEARCHAD_CUSTOMER_ID</dt><dd>서버 전용</dd></div>
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
