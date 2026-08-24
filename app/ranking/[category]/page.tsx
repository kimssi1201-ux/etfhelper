import type { Metadata } from "next";
import RankingView from "@/app/ranking/RankingView";
import { getRankingCategoryBySlug } from "@/lib/ranking-candidates";
import { getRankingResult } from "@/lib/ranking-store";

type CategoryRankingPageProps = {
  params: Promise<{ category: string }>;
};

export const dynamic = "force-dynamic";

async function getCategorySlug(params: CategoryRankingPageProps["params"]) {
  const { category } = await params;
  try {
    return decodeURIComponent(category);
  } catch {
    return category;
  }
}

export async function generateMetadata({ params }: CategoryRankingPageProps): Promise<Metadata> {
  const slug = await getCategorySlug(params);
  const category = getRankingCategoryBySlug(slug);
  const title = category ? `${category.name} 키워드 랭킹 | 키워드랩` : "키워드 랭킹 데이터 없음 | 키워드랩";
  const description = category
    ? `${category.name} 카테고리의 검색량 순위, 전일 대비 변화, 경쟁 등급을 매일 갱신합니다.`
    : "요청한 카테고리의 키워드 랭킹 데이터를 찾을 수 없습니다.";
  const url = `https://fastincome.kr/ranking/${encodeURIComponent(slug)}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "ko_KR",
      siteName: "키워드랩",
    },
  };
}

export default async function CategoryRankingPage({ params }: CategoryRankingPageProps) {
  const slug = await getCategorySlug(params);
  const category = getRankingCategoryBySlug(slug);
  const result = category
    ? await getRankingResult({ categorySlug: category.slug, limit: 100 })
    : { collectedAt: null, collectedDate: null, rows: [] };
  const url = `https://fastincome.kr/ranking/${encodeURIComponent(slug)}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: category ? `${category.name} 키워드 랭킹` : "키워드 랭킹 데이터 없음",
            url,
            inLanguage: "ko-KR",
          }).replace(/</g, "\\u003c"),
        }}
      />
      <RankingView
        title={category ? `${category.name} 키워드 랭킹` : "키워드 랭킹 데이터 없음"}
        description={category ? `${category.name} 후보 키워드를 검색량 순서로 정리했습니다.` : "요청한 카테고리를 찾을 수 없습니다."}
        result={result}
        activePath={`/ranking/${slug}`}
        emptyMessage={category ? "카테고리 랭킹 데이터 수집 중입니다" : "데이터를 찾을 수 없습니다"}
      />
    </>
  );
}
