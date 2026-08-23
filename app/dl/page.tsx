import type { Metadata } from "next";
import KeywordTool from "../KeywordTool";
import { loadKeywordPageData } from "../keyword-page-data";
import { getRequestOrigin } from "../request-origin";
import {
  defaultKeyword,
  keywordMetadataDescription,
  keywordMetadataTitle,
  keywordPath,
  normalizeKeyword,
} from "@/lib/keyword-shared";

type KeywordLabPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function keywordFromSearchParams(searchParams?: KeywordLabPageProps["searchParams"]) {
  const params = await searchParams;
  return normalizeKeyword(firstParam(params?.q));
}

export async function generateMetadata({ searchParams }: KeywordLabPageProps): Promise<Metadata> {
  const keyword = await keywordFromSearchParams(searchParams);
  const origin = await getRequestOrigin();

  if (!keyword) {
    return {
      title: { absolute: "키워드랩 | 포털 키워드 검색량 도구" },
      description: "키워드 검색량, 모바일 비중, 연관 키워드와 경쟁도를 한 화면에서 확인하는 포털 키워드 분석 도구입니다.",
      alternates: { canonical: new URL("/dl", origin).toString() },
    };
  }

  const { data } = await loadKeywordPageData(keyword);
  const canonicalUrl = new URL(keywordPath(keyword), origin).toString();
  const socialImage = new URL("/og.png", origin).toString();
  const primary = data?.results[0];
  const title = primary ? keywordMetadataTitle(keyword, primary) : `${keyword} 키워드 데이터 없음 | 키워드랩`;
  const description = primary
    ? keywordMetadataDescription(keyword, primary)
    : `${keyword} 키워드 데이터를 찾을 수 없습니다. 키워드랩에서 인기 키워드와 관련 검색어를 다시 확인해 보세요.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
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

export default async function KeywordLabPage({ searchParams }: KeywordLabPageProps) {
  const keyword = await keywordFromSearchParams(searchParams);
  const loaded = keyword ? await loadKeywordPageData(keyword) : { data: null, error: null };

  return (
    <KeywordTool
      initialData={loaded.data}
      initialError={loaded.error}
      initialKeyword={keyword || defaultKeyword}
    />
  );
}
