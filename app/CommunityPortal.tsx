"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { communities, listPosts } from "@/lib/community-data";
import type { PostSort } from "@/lib/community-types";

const numberFormat = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });
const timeFormat = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function Meta({ value, label }: { value: number | null; label: string }) {
  return <span>{label} {value === null ? "-" : numberFormat.format(value)}</span>;
}

function PostCard({ post }: { post: ReturnType<typeof listPosts>["posts"][number] }) {
  return <article className="community-post-card">
    <Link href={`/post/${post.communitySlug}/${post.externalId}`} className="community-thumb" aria-label={`${post.title} 상세 보기`}><span>{post.communityName.slice(0, 1)}</span></Link>
    <div className="community-post-content"><div className="community-post-top"><span className="community-source">{post.communityName}</span><time dateTime={post.publishedAt}>{timeFormat.format(new Date(post.publishedAt))}</time></div><Link href={`/post/${post.communitySlug}/${post.externalId}`} className="community-post-title">{post.title}</Link><p className="community-post-summary">{post.summary}</p><div className="community-post-meta"><Meta value={post.views} label="조회" /><Meta value={post.likes} label="추천" /><Meta value={post.commentsCount} label="댓글" /></div>{post.sample && <span className="sample-label">화면 예시</span>}</div>
  </article>;
}

export default function CommunityPortal({ initialCommunity }: { initialCommunity?: string }) {
  const [community, setCommunity] = useState(initialCommunity ?? "all");
  const [sort, setSort] = useState<PostSort>("popular");
  const [query, setQuery] = useState("");
  const result = useMemo(() => listPosts({ community: community === "all" ? undefined : community, sort, q: query }), [community, sort, query]);

  return <main className="community-shell">
    <header className="community-header"><div className="community-header-inner"><Link href="/" className="community-logo"><span className="community-logo-mark">모</span><span><b>모아봄</b><small>COMMUNITY BRIEF</small></span></Link><div className="community-search"><label htmlFor="community-search">게시글 검색</label><input id="community-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목이나 키워드 검색" /><span>⌕</span></div><button className="menu-button" type="button" aria-label="메뉴 열기">☰</button></div></header>
    <nav className="community-nav" aria-label="커뮤니티 메뉴"><div className="community-nav-inner"><Link href="/" className="active">오늘 인기글</Link><Link href="#feed">최신글</Link><Link href="#guides">이용 안내</Link><Link href="/admin">관리자</Link></div></nav>
    <div className="community-container">
      <section className="community-hero"><div><p className="community-eyebrow">ONE SCREEN, MANY VOICES</p><h1>여러 커뮤니티의<br /><em>인기 흐름</em>을 모아봅니다</h1><p>제목·작성시간·반응 수치와 직접 작성한 짧은 요약만 제공합니다.<br />원문은 출처 링크에서 확인하세요.</p></div><div className="community-hero-shape" aria-hidden="true"><i /><i /><i /><strong>오늘<br />인기</strong></div></section>
      <section className="community-notice"><span>ⓘ</span><p>현재는 화면 확인용 샘플 게시글을 보여주고 있습니다. 실제 수집은 각 커뮤니티의 공개 정책과 이용약관을 확인한 뒤 연결됩니다.</p></section>
      <section className="community-feed" id="feed"><div className="community-section-heading"><div><p className="community-eyebrow">TRENDING NOW</p><h2>오늘 인기글</h2></div><div className="sort-switch"><button type="button" className={sort === "popular" ? "active" : ""} onClick={() => setSort("popular")}>인기순</button><button type="button" className={sort === "latest" ? "active" : ""} onClick={() => setSort("latest")}>최신순</button></div></div>
        <div className="community-tabs" role="tablist" aria-label="커뮤니티 필터"><button type="button" className={community === "all" ? "active" : ""} onClick={() => setCommunity("all")}>전체</button>{communities.map((item) => <button type="button" key={item.slug} className={community === item.slug ? "active" : ""} onClick={() => setCommunity(item.slug)}>{item.name}</button>)}</div>
        <div className="community-post-list">{result.posts.map((post) => <PostCard key={post.id} post={post} />)}</div>{result.posts.length === 0 && <div className="community-empty"><strong>아직 표시할 게시글이 없습니다.</strong><p>수집기가 연결되면 공개 목록에서 확인 가능한 정보만 안전하게 표시합니다.</p></div>}
      </section>
      <section className="community-guides" id="guides"><div className="community-section-heading"><div><p className="community-eyebrow">HOW IT WORKS</p><h2>모아봄 이용 원칙</h2></div></div><div className="community-guide-grid"><article><span>01</span><h3>원문은 복제하지 않아요</h3><p>제목과 공개 메타데이터, 직접 쓴 짧은 요약만 보여주고 원문 링크를 제공합니다.</p></article><article><span>02</span><h3>출처를 분명하게 표시해요</h3><p>어느 커뮤니티에서 온 글인지 카드와 상세 화면에 항상 표시합니다.</p></article><article><span>03</span><h3>직접 관리할 수 있어요</h3><p>관리자는 게시글 숨김, 출처 차단, 요약 수정과 삭제 요청 처리를 할 수 있습니다.</p></article></div></section>
    </div>
    <footer className="community-footer"><div><Link href="/" className="community-footer-logo">모아봄</Link><p>여러 커뮤니티의 흐름을 한눈에 보는 커뮤니티 브리프</p></div><div><Link href="/admin">관리자</Link><Link href="#guides">수집·출처 원칙</Link></div><small>원문·댓글·이미지를 무단 복제하지 않으며, 모든 게시글은 출처 링크를 통해 확인할 수 있습니다.</small></footer>
    <nav className="community-bottom-nav" aria-label="모바일 하단 메뉴"><Link href="/" className="active"><span>⌂</span>홈</Link><Link href="#feed"><span>◉</span>인기글</Link><Link href="#community-search"><span>⌕</span>검색</Link><Link href="#guides"><span>ⓘ</span>안내</Link></nav>
  </main>;
}
