import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StockDividendApp from "../StockDividendApp";
import { getStockBySlug, stockSlugs } from "@/lib/stocks";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return stockSlugs.map((symbol) => ({ symbol }));
}

async function getRequestOrigin() {
  const incoming = await headers();
  const forwardedHost = incoming.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || incoming.get("host") || "localhost:3000";
  const forwardedProtocol = incoming.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost")
      ? "http"
      : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

function getDisplayName(config: NonNullable<ReturnType<typeof getStockBySlug>>) {
  return config.nameKo.toUpperCase() === config.symbol
    ? config.symbol
    : `${config.nameKo}(${config.symbol})`;
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const { symbol } = await params;
  const config = getStockBySlug(symbol);

  if (!config) {
    return {};
  }

  const origin = await getRequestOrigin();
  const canonicalUrl = new URL(`/${config.slug}`, origin).toString();
  const socialImage = new URL("/og-dividend-lens.png", origin).toString();
  const displayName = getDisplayName(config);
  const title = `${displayName} 배당금 계산기 | 배당렌즈`;
  const description = `${displayName}의 현재가와 최근 12개월 실제 주당 배당금으로 월평균·분기·연간 예상 배당금과 목표 투자금을 계산하세요.`;

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
      siteName: "배당렌즈",
      images: [{
        url: socialImage,
        width: 1731,
        height: 909,
        alt: `${displayName} 배당금 계산기`,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol } = await params;
  const config = getStockBySlug(symbol);

  if (!config) {
    notFound();
  }

  const origin = await getRequestOrigin();
  const canonicalUrl = new URL(`/${config.slug}`, origin).toString();
  const displayName = getDisplayName(config);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${canonicalUrl}#application`,
        name: `${displayName} 배당금 계산기`,
        alternateName: "배당렌즈",
        url: canonicalUrl,
        description: config.description,
        applicationCategory: "FinanceApplication",
        applicationSubCategory: "Dividend calculator",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        inLanguage: "ko-KR",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        inLanguage: "ko-KR",
        mainEntity: config.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <StockDividendApp config={config} />
    </>
  );
}
