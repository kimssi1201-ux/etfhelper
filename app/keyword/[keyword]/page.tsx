import type { Metadata } from "next";
import KeywordTool from "@/app/KeywordTool";
import { loadKeywordPageData } from "@/app/keyword-page-data";
import { getRequestOrigin } from "@/app/request-origin";
import {
  decodeKeywordParam,
  defaultKeyword,
  keywordMetadataDescription,
  keywordMetadataTitle,
  keywordPath,
  keywordScore,
  keywordGrade,
  normalizeKeyword,
} from "@/lib/keyword-shared";
import type { KeywordApiResponse } from "@/lib/keyword-shared";

type KeywordPageProps = {
  params: Promise<{ keyword: string }>;
};

export const dynamic = "force-dynamic";

async function getRouteKeyword(params: KeywordPageProps["params"]) {
  const { keyword } = await params;
  return decodeKeywordParam(keyword) || defaultKeyword;
}

function buildFallbackDescription(keyword: string) {
  return `${keyword} 키워드 데이터를 찾을 수 없습니다. 키워드랩에서 인기 키워드와 관련 검색어를 다시 확인해 보세요.`;
}

function buildKeywordJsonLd(keyword: string, data: KeywordApiResponse | null, canonicalUrl: string) {
  const primary = data?.results[0];
  const title = primary ? keywordMetadataTitle(keyword, primary) : `${keyword} 키워드 데이터 없음 | 키워드랩`;
  const description = primary ? keywordMetadataDescription(keyword, primary) : buildFallbackDescription(keyword);
  const siteUrl = new URL("/", canonicalUrl).toString();
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      inLanguage: "ko-KR",
      isPartOf: { "@id": `${siteUrl}#website` },
      ...(data ? { dateModified: data.updatedAt } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonicalUrl}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "키워드랩",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: keyword,
          item: canonicalUrl,
        },
      ],
    },
  ];

  if (primary && data) {
    graph.push({
      "@type": "Dataset",
      "@id": `${canonicalUrl}#dataset`,
      name: `${keyword} 검색량 데이터`,
      description,
      url: canonicalUrl,
      inLanguage: "ko-KR",
      dateModified: data.updatedAt,
      keywords: data.results.slice(0, 20).map((item) => item.keyword),
      variableMeasured: [
        { "@type": "PropertyValue", name: "월간 검색량", value: primary.total },
        { "@type": "PropertyValue", name: "PC 검색량", value: primary.pc },
        { "@type": "PropertyValue", name: "모바일 검색량", value: primary.mobile },
        { "@type": "PropertyValue", name: "모바일 비중", value: `${primary.mobileRate}%` },
        { "@type": "PropertyValue", name: "경쟁도", value: `${primary.competition} / ${keywordGrade(keywordScore(primary))}등급` },
      ],
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export async function generateMetadata({ params }: KeywordPageProps): Promise<Metadata> {
  const keyword = await getRouteKeyword(params);
  const origin = await getRequestOrigin();
  const { data } = await loadKeywordPageData(keyword);
  const canonicalUrl = new URL(keywordPath(keyword), origin).toString();
  const socialImage = new URL("/og.png", origin).toString();
  const primary = data?.results[0];
  const title = primary ? keywordMetadataTitle(keyword, primary) : `${keyword} 키워드 데이터 없음 | 키워드랩`;
  const description = primary ? keywordMetadataDescription(keyword, primary) : buildFallbackDescription(keyword);

  return {
    metadataBase: origin,
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: "ko_KR",
      siteName: "키워드랩",
      images: [{ url: socialImage, alt: `${keyword} 검색량` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function KeywordPage({ params }: KeywordPageProps) {
  const keyword = normalizeKeyword(await getRouteKeyword(params)) || defaultKeyword;
  const origin = await getRequestOrigin();
  const { data, error } = await loadKeywordPageData(keyword);
  const canonicalUrl = new URL(keywordPath(keyword), origin).toString();
  const jsonLd = buildKeywordJsonLd(keyword, data, canonicalUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <KeywordTool initialData={data} initialError={error} initialKeyword={keyword} />
    </>
  );
}
