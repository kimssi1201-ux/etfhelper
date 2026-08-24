import type { Metadata } from "next";
import RankingView from "@/app/ranking/RankingView";
import { getRankingResult } from "@/lib/ranking-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "키워드 랭킹 TOP 100 | 키워드랩" },
  description: "매일 새벽 갱신되는 전체 키워드 검색량 상위 100개와 전일 대비 변화, 경쟁 등급, 카테고리를 확인하세요.",
  alternates: { canonical: "https://fastincome.kr/ranking" },
  openGraph: {
    title: "키워드 랭킹 TOP 100 | 키워드랩",
    description: "매일 새벽 갱신되는 전체 키워드 검색량 상위 100개 랭킹입니다.",
    url: "https://fastincome.kr/ranking",
    type: "website",
    locale: "ko_KR",
    siteName: "키워드랩",
  },
};

export default async function RankingPage() {
  const result = await getRankingResult({ limit: 100 });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "키워드 랭킹 TOP 100",
            url: "https://fastincome.kr/ranking",
            inLanguage: "ko-KR",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <RankingView
        title="키워드 랭킹 TOP 100"
        description="전체 후보 키워드 중 검색량이 높은 순서로 정렬했습니다."
        result={result}
        activePath="/ranking"
      />
    </>
  );
}
