import type { Metadata } from "next";
import Link from "next/link";
import { getRequestOrigin } from "@/app/request-origin";
import { getGuideCategories, getGuidePosts, guidePath } from "@/lib/guide";

type GuidePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function guideCategoryHref(category: string | null) {
  if (!category) return "/guide";
  const params = new URLSearchParams({ category });
  return `/guide?${params.toString()}`;
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

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const title = "가이드 | 키워드랩";
  const description = "키워드 분석, 검색량 해석, 콘텐츠 전략 가이드를 마크다운으로 관리하는 가이드 허브입니다.";

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: new URL("/guide", origin).toString() },
    openGraph: {
      title,
      description,
      url: new URL("/guide", origin).toString(),
      type: "website",
      locale: "ko_KR",
      siteName: "키워드랩",
    },
  };
}

export default async function GuidePage({ searchParams }: GuidePageProps) {
  const params = await searchParams;
  const selectedCategory = firstParam(params?.category) ?? "";
  const posts = getGuidePosts();
  const categories = getGuideCategories();
  const filteredPosts = selectedCategory
    ? posts.filter((post) => post.category === selectedCategory)
    : posts;

  return (
    <main className="guide-shell">
      <header className="guide-header">
        <Link href="/" className="keyword-logo"><i aria-hidden="true">K</i> 키워드랩</Link>
        <nav aria-label="키워드랩 메뉴">
          <Link href="/dl">분석</Link>
          <Link href="/ranking">랭킹</Link>
          <Link href="/guide">가이드</Link>
        </nav>
      </header>

      <section className="guide-hero">
        <p>GUIDE</p>
        <h1>키워드 가이드</h1>
        <span>마크다운으로 작성한 가이드 글을 카테고리별로 관리합니다.</span>
      </section>

      <nav className="guide-filter" aria-label="가이드 카테고리">
        <Link className={!selectedCategory ? "active" : ""} href="/guide">전체</Link>
        {categories.map((category) => (
          <Link
            className={selectedCategory === category ? "active" : ""}
            href={guideCategoryHref(category)}
            key={category}
          >
            {category}
          </Link>
        ))}
      </nav>

      <section className="guide-card-grid" aria-label="가이드 글 목록">
        {filteredPosts.length === 0 ? (
          <div className="guide-empty">
            <p>아직 등록된 가이드 글이 없습니다</p>
          </div>
        ) : filteredPosts.map((post) => (
          <Link className="guide-list-card" href={guidePath(post.slug)} key={post.slug}>
            {post.thumbnail ? <img src={post.thumbnail} alt="" loading="lazy" /> : <span aria-hidden="true">Guide</span>}
            <div>
              <p>{post.category}</p>
              <h2>{post.title}</h2>
              <small>{formatGuideDate(post.date)}</small>
              {post.description && <strong>{post.description}</strong>}
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
