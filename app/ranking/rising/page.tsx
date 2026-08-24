import type { Metadata } from "next";
import RankingView from "@/app/ranking/RankingView";
import { getRankingResult } from "@/lib/ranking-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "상승 키워드 랭킹 | 키워드랩" },
  description: "검색량 500회 이상 키워드 중 전일 대비 상승률이 높은 상위 30개 키워드를 매일 갱신합니다.",
  alternates: { canonical: "https://fastincome.kr/ranking/rising" },
  openGraph: {
    title: "상승 키워드 랭킹 | 키워드랩",
    description: "전일 대비 상승률 상위 30개 키워드 랭킹입니다.",
    url: "https://fastincome.kr/ranking/rising",
    type: "website",
    locale: "ko_KR",
    siteName: "키워드랩",
  },
};

export default async function RisingRankingPage() {
  const result = await getRankingResult({ rising: true, limit: 30 });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "상승 키워드 랭킹",
            url: "https://fastincome.kr/ranking/rising",
            inLanguage: "ko-KR",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <RankingView
        title="상승 키워드 랭킹"
        description="검색량 500회 이상 키워드 중 전일 대비 상승률이 높은 순서입니다."
        result={result}
        activePath="/ranking/rising"
        emptyMessage="전일 비교 데이터 수집 중입니다"
      />
    </>
  );
}
