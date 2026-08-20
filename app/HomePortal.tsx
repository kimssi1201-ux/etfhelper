import Link from "next/link";
import { stocks } from "@/lib/stocks";

const featured = [
  { symbol: "XOM", kicker: "분기 배당", title: "에너지 현금흐름을 계산해 보세요", tone: "lime" },
  { symbol: "CVX", kicker: "분기 배당", title: "배당 성장주를 한눈에 비교", tone: "sky" },
  { symbol: "KO", kicker: "분기 배당", title: "생활 속 브랜드의 배당 흐름", tone: "peach" },
  { symbol: "AAPL", kicker: "분기 배당", title: "성장과 배당을 함께 살펴보기", tone: "violet" },
  { symbol: "MSFT", kicker: "분기 배당", title: "장기 보유 시나리오 계산", tone: "blue" },
] as const;

const guides = [
  ["01", "배당금 계산법", "최근 12개월 실제 배당금으로 예상 현금흐름을 계산하는 방법"],
  ["02", "세후 배당금 이해하기", "미국 원천징수와 계좌별 차이를 계산 결과에서 읽는 법"],
  ["03", "배당주 체크리스트", "수익률 하나만 보지 않고 가격·지급 이력·변동성을 함께 보는 법"],
];

export default function HomePortal() {
  const allStocks = stocks.slice(0, 5);
  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner">
          <Link href="/" className="portal-logo" aria-label="배당계산기 홈">
            <span className="portal-logo-mark">배</span>
            <span><strong>배당계산기</strong><small>DIVIDEND CALCULATOR</small></span>
          </Link>
          <nav className="utility-nav" aria-label="보조 메뉴">
            <Link href="#guides">투자 가이드</Link>
            <Link href="#about">서비스 안내</Link>
            <Link href="#footer">문의</Link>
          </nav>
          <Link href="/xom" className="header-cta">계산 시작 <span>→</span></Link>
        </div>
      </header>

      <nav className="category-nav" aria-label="주요 메뉴">
        <div className="category-nav-inner">
          {[
            ["#today", "오늘의 배당"], ["#popular", "인기 종목"], ["#calendar", "배당 캘린더"], ["#guides", "투자 가이드"], ["#about", "서비스 안내"],
          ].map(([href, label], index) => <Link key={href} className={index === 0 ? "active" : ""} href={href}>{label}</Link>)}
        </div>
      </nav>

      <div className="portal-container">
        <section className="portal-hero" id="today">
          <div className="hero-copy">
            <p className="eyebrow"><span /> 오늘의 배당 흐름</p>
            <h1>내 배당금,<br /><em>한눈에</em> 계산하세요</h1>
            <p className="hero-description">현재가와 실제 배당 이력을 바탕으로<br className="mobile-break" /> 월평균·분기·연간 현금흐름을 빠르게 확인합니다.</p>
            <div className="hero-actions">
              <Link href="/xom" className="primary-button">내 배당금 계산하기 <span>→</span></Link>
              <Link href="#popular" className="text-button">지원 종목 둘러보기</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-card art-card-main"><span>예상 월평균</span><strong>계산 중</strong><small>실제 데이터 연결 후 표시</small></div>
            <div className="art-card art-card-mini"><b>TTM</b><span>최근 12개월</span></div>
            <div className="art-dot dot-one" /><div className="art-dot dot-two" /><div className="art-star">✦</div>
          </div>
        </section>

        <section className="notice-strip" aria-label="데이터 안내">
          <span className="notice-icon">i</span><span>시세와 배당금은 종목별 상세 페이지에서 최신 제공 여부를 확인할 수 있습니다.</span><Link href="/xom">데이터 기준 보기 →</Link>
        </section>

        <section className="portal-section" id="popular">
          <div className="section-heading"><div><p className="eyebrow">QUICK PICKS</p><h2>자주 찾는 배당 종목</h2></div><Link href="/xom">전체 보기 <span>→</span></Link></div>
          <div className="featured-grid">
            {featured.map((item) => <Link href={`/${item.symbol.toLowerCase()}`} className={`featured-card ${item.tone}`} key={item.symbol}>
              <div className="card-top"><span className="ticker-badge">{item.symbol}</span><span className="card-arrow">↗</span></div>
              <p>{item.kicker}</p><h3>{item.title}</h3><span className="card-link">계산기 열기 <b>→</b></span>
            </Link>)}
          </div>
        </section>

        <section className="portal-section split-section" id="calendar">
          <div className="section-heading"><div><p className="eyebrow">DIVIDEND MAP</p><h2>배당 주기별로 살펴보기</h2></div></div>
          <div className="frequency-grid">
            {[
              ["월", "월 배당", "규칙적인 현금흐름을 찾는다면", "monthly", "#dff7e7"],
              ["분기", "분기 배당", "가장 많은 배당주가 속한 주기", "quarterly", "#e4efff"],
              ["주", "주간 배당", "주간 분배 상품은 변동성을 함께 확인", "weekly", "#fff0d8"],
            ].map(([symbol, label, desc, frequency, color]) => {
              const count = stocks.filter((stock) => stock.payoutFrequency === frequency).length;
              return <div className="frequency-card" key={frequency} style={{ "--frequency-bg": color } as React.CSSProperties}><span className="frequency-mark">{symbol}</span><div><h3>{label}</h3><p>{desc}</p><b>{count}개 지원 종목 <span>→</span></b></div></div>;
            })}
          </div>
        </section>

        <section className="portal-section guide-section" id="guides">
          <div className="section-heading"><div><p className="eyebrow">MONEY NOTES</p><h2>배당 투자, 쉽게 읽기</h2></div><Link href="#about">더 알아보기 <span>→</span></Link></div>
          <div className="guide-grid">{guides.map(([number, title, description]) => <article className="guide-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p><Link href="#about" aria-label={`${title} 안내`}>읽어보기 →</Link></article>)}</div>
        </section>

        <section className="portal-section supported-section" id="about">
          <div className="supported-copy"><p className="eyebrow">VERIFIED DATA</p><h2>검증된 종목만<br />차분하게 담았습니다</h2><p>연결된 데이터가 확인된 종목부터 제공합니다. 종목을 추가할 때마다 가격, 배당 이력, 환율 상태를 함께 점검합니다.</p><Link href="/xom" className="outline-button">서비스 사용법 <span>→</span></Link></div>
          <div className="supported-list">{allStocks.map((stock, index) => <Link href={`/${stock.slug}`} key={stock.slug}><span className="list-index">0{index + 1}</span><span><b>{stock.symbol}</b><small>{stock.nameKo}</small></span><span className="list-frequency">{stock.payoutFrequency === "monthly" ? "월" : stock.payoutFrequency === "weekly" ? "주" : "분기"}</span><span className="list-arrow">↗</span></Link>)}</div>
        </section>
      </div>

      <footer className="portal-footer" id="footer"><div><Link href="/" className="footer-logo">배당계산기</Link><p>미국 배당주 수익과 현금흐름을<br />한 화면에서 확인하는 도구</p></div><div className="footer-links"><Link href="#about">서비스 안내</Link><Link href="#guides">투자 가이드</Link><Link href="/xom">계산기</Link></div><small>본 서비스의 정보와 계산 결과는 참고용이며 투자 권유가 아닙니다.</small></footer>
      <nav className="mobile-bottom-nav" aria-label="모바일 메뉴"><Link href="#today" className="selected"><span>⌂</span>홈</Link><Link href="#popular"><span>◌</span>종목</Link><Link href="/xom"><span className="bottom-main">배</span>계산하기</Link><Link href="#calendar"><span>◫</span>캘린더</Link><Link href="#guides"><span>☷</span>가이드</Link></nav>
    </main>
  );
}
