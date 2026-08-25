import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideMarkdown from "@/app/guide/GuideMarkdown";
import { getRequestOrigin } from "@/app/request-origin";
import { formatNumber, keywordPath } from "@/lib/keyword-shared";
import { getGuidePost, getGuidePosts, guidePath } from "@/lib/guide";

type GuideArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatGuideDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "작성일 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function isoDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function generateStaticParams() {
  return getGuidePosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: GuideArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getGuidePost(decodeSlug(slug));
  const origin = await getRequestOrigin();
  if (!post) {
    return {
      title: { absolute: "가이드 글 없음 | 키워드랩" },
      description: "요청한 가이드 글을 찾을 수 없습니다.",
    };
  }

  const canonicalUrl = new URL(guidePath(post.slug), origin).toString();
  const image = new URL(post.thumbnail || "/og.png", origin).toString();

  return {
    title: { absolute: `${post.title} | 키워드랩 가이드` },
    description: post.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonicalUrl,
      type: "article",
      locale: "ko_KR",
      siteName: "키워드랩",
      publishedTime: isoDate(post.date),
      modifiedTime: isoDate(post.date),
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
  const { slug } = await params;
  const post = getGuidePost(decodeSlug(slug));
  const origin = await getRequestOrigin();

  if (!post) notFound();

  const canonicalUrl = new URL(guidePath(post.slug), origin).toString();
  const image = new URL(post.thumbnail || "/og.png", origin).toString();
  const relatedKeywords = post.keywords.slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: image,
    url: canonicalUrl,
    inLanguage: "ko-KR",
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.date),
    author: { "@type": "Organization", name: "키워드랩" },
    publisher: {
      "@type": "Organization",
      name: "키워드랩",
      logo: { "@type": "ImageObject", url: new URL("/og.png", origin).toString() },
    },
    keywords: post.keywords,
    articleSection: post.category,
  };

  return (
    <main className="guide-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="guide-header">
        <a href="/" className="keyword-logo"><i aria-hidden="true">K</i> 키워드랩</a>
        <nav aria-label="키워드랩 메뉴">
          <a href="/dl">분석</a>
          <a href="/ranking">랭킹</a>
          <a href="/guide">가이드</a>
        </nav>
      </header>

      <article className="guide-article">
        <header className="guide-article-hero">
          <a href="/guide">가이드 목록</a>
          <p>{post.category}</p>
          <h1>{post.title}</h1>
          {post.description && <span>{post.description}</span>}
          <dl>
            <div><dt>작성일</dt><dd>{formatGuideDate(post.date)}</dd></div>
            <div><dt>수정일</dt><dd>{formatGuideDate(post.date)}</dd></div>
          </dl>
          {post.thumbnail && <img src={post.thumbnail} alt="" />}
        </header>

        <div className="guide-layout">
          <aside className="guide-toc" aria-label="목차">
            <strong>목차</strong>
            {post.toc.length === 0 ? (
              <p>본문에 h2/h3 제목을 추가하면 목차가 표시됩니다.</p>
            ) : (
              <nav>
                {post.toc.map((item) => (
                  <a className={item.depth === 3 ? "depth-3" : ""} href={`#${item.id}`} key={item.id}>
                    {item.text}
                  </a>
                ))}
              </nav>
            )}
          </aside>

          <div>
            <GuideMarkdown blocks={post.blocks} />

            <section className="guide-related-keywords" aria-label="관련 키워드">
              <div className="guide-section-title">
                <p>RELATED KEYWORDS</p>
                <h2>관련 키워드</h2>
              </div>
              {relatedKeywords.length === 0 ? (
                <div className="guide-empty"><p>frontmatter keywords에 관련 키워드를 추가하세요</p></div>
              ) : (
                <div className="guide-keyword-card-grid">
                  {relatedKeywords.map((keyword, index) => (
                    <a href={keywordPath(keyword)} key={keyword}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{keyword}</strong>
                      <small>키워드 상세 보기</small>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <footer className="guide-article-footer">
              <span>{formatNumber(post.keywords.length)}개 키워드 연결</span>
              <a href="/guide">다른 가이드 보기</a>
            </footer>
          </div>
        </div>
      </article>
    </main>
  );
}
