import type { ReactNode } from "react";
import { formatNumber, gradeBadgeLabel, keywordPath } from "@/lib/keyword-shared";
import { rankingCategories } from "@/lib/ranking-candidates";
import { formatRankingBasisTime } from "@/lib/ranking-store";
import type { RankingResult, RankingRow } from "@/lib/ranking-store";

type RankingViewProps = {
  title: string;
  description: string;
  result: RankingResult;
  activePath: string;
  emptyMessage?: string;
};

function formatChange(value: number | null) {
  if (value === null) return "-";
  const prefix = value > 0 ? "+" : "";
  const fixed = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${prefix}${fixed}%`;
}

function rankMovement(row: RankingRow) {
  if (!row.rankChange) return "-";
  return row.rankChange > 0 ? `▲${row.rankChange}` : `▼${Math.abs(row.rankChange)}`;
}

function trendTone(value: number | null) {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

function NavigationLink({ href, activePath, children }: {
  href: string;
  activePath: string;
  children: ReactNode;
}) {
  return (
    <a className={activePath === href ? "active" : ""} href={href}>
      {children}
    </a>
  );
}

export default function RankingView({
  title,
  description,
  result,
  activePath,
  emptyMessage = "랭킹 데이터 수집 중입니다",
}: RankingViewProps) {
  const basisTime = formatRankingBasisTime(result.collectedAt);

  return (
    <main className="ranking-shell">
      <header className="ranking-header">
        <a href="/" className="keyword-logo"><i aria-hidden="true">K</i> 키워드랩</a>
        <nav aria-label="키워드랩 메뉴">
          <a href="/dl">분석</a>
          <a href="/ranking">랭킹</a>
        </nav>
      </header>

      <section className="ranking-hero">
        <p>{basisTime}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </section>

      <nav className="ranking-nav" aria-label="랭킹 분류">
        <NavigationLink href="/ranking" activePath={activePath}>전체</NavigationLink>
        <NavigationLink href="/ranking/rising" activePath={activePath}>상승</NavigationLink>
        {rankingCategories.map((category) => (
          <NavigationLink key={category.slug} href={`/ranking/${category.slug}`} activePath={activePath}>
            {category.name}
          </NavigationLink>
        ))}
      </nav>

      <section className="ranking-panel" aria-label={title}>
        {result.rows.length === 0 ? (
          <div className="ranking-empty">
            <p>{emptyMessage}</p>
            <div>
              <a href={keywordPath("부업")}>부업</a>
              <a href={keywordPath("다이어트")}>다이어트</a>
              <a href={keywordPath("일본여행")}>일본여행</a>
            </div>
          </div>
        ) : (
          <div className="ranking-table" role="table" aria-label={title}>
            <div className="ranking-row ranking-row-head" role="row">
              <span role="columnheader">순위</span>
              <span role="columnheader">키워드</span>
              <span role="columnheader">검색량</span>
              <span role="columnheader">전일 대비</span>
              <span role="columnheader">등급</span>
              <span role="columnheader">카테고리</span>
            </div>
            {result.rows.map((row) => {
              const movement = rankMovement(row);
              return (
                <a className="ranking-row" href={keywordPath(row.keyword)} key={row.keyword} role="row">
                  <span className="ranking-rank" role="cell">
                    {row.rank}
                    <em className={trendTone(row.rankChange)}>{movement}</em>
                  </span>
                  <strong role="cell">{row.keyword}</strong>
                  <span className="ranking-volume" role="cell">{formatNumber(row.totalVolume)}</span>
                  <span className={`ranking-change ${trendTone(row.dailyChangePct)}`} role="cell">
                    {formatChange(row.dailyChangePct)}
                  </span>
                  <span className="ranking-grade" role="cell" title={gradeBadgeLabel(row.competitionGrade)} aria-label={gradeBadgeLabel(row.competitionGrade)}>
                    {row.competitionGrade}
                  </span>
                  <span className="ranking-category" role="cell">{row.category}</span>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
