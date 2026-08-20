"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { communities, listPosts } from "@/lib/community-data";
import type { PostSort } from "@/lib/community-types";

const timeFormat = new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

function HotPost({ post, rank }: { post: ReturnType<typeof listPosts>["posts"][number]; rank: number }) {
  const time = timeFormat.format(new Date(post.publishedAt)).replaceAll(".", "").replace(" ", "/");
  return <article className="hot-post-row">
    <span className="hot-rank">{String(rank).padStart(2, "0")}</span>
    <div className="hot-post-body">
      <Link href={`/post/${post.communitySlug}/${post.externalId}`} className="hot-post-title">{post.title} <b>+{post.likes ?? 0}</b> <small>[{post.commentsCount ?? 0}]</small></Link>
      <div className="hot-post-meta"><span>{post.authorName ?? "익명"}</span><span>{time}</span><span>조회 {post.views ?? 0}</span><Link href={`/community/${post.communitySlug}`}>{post.communityName}</Link></div>
    </div>
  </article>;
}

export default function CommunityPortal({ initialCommunity }: { initialCommunity?: string }) {
  const [community] = useState(initialCommunity ?? "all");
  const [sort, setSort] = useState<PostSort>("popular");
  const [query, setQuery] = useState("");
  const fallback = useMemo(() => listPosts({ community: community === "all" ? undefined : community, sort, q: query }), [community, sort, query]);
  const [remotePosts, setRemotePosts] = useState<typeof fallback.posts | null>(null);
  // The fallback list is intentionally excluded: only the selected source and sort trigger a network refresh.
  useEffect(() => {
    let cancelled = false;
    const slug = community === "all" ? "all" : community;
    fetch(`/api/community/${slug}?sort=${sort}`).then((response) => response.ok ? response.json() : null).then((data: { posts?: typeof fallback.posts } | null) => { if (!cancelled && data?.posts?.length) setRemotePosts(data.posts); }).catch(() => undefined);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community, sort]);
  const result = { ...fallback, posts: remotePosts ?? fallback.posts };

  return <main className="hot-shell" id="top">
    <header className="hot-header"><Link href="/" className="hot-brand"><span className="hot-brand-mark">핫</span><strong>핫게</strong><small>실시간 커뮤니티 인기글</small></Link><label className="hot-search"><span>검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목 검색" /></label></header>
    <nav className="hot-community-tabs" aria-label="커뮤니티 선택"><Link className={community === "all" ? "active" : ""} href="/">종합</Link>{communities.map((item) => <Link key={item.slug} className={community === item.slug ? "active" : ""} href={`/community/${item.slug}`}>{item.name.replace("드림", "")}</Link>)}</nav>
    <div className="hot-status"><strong>{community === "all" ? "종합" : communities.find((item) => item.slug === community)?.name}</strong><span className="hot-online">{community === "slr" ? "자동수집 대기" : "실시간 연결"}</span><span>원문 링크</span><div className="hot-sort"><button className={sort === "popular" ? "active" : ""} onClick={() => setSort("popular")}>베스트 보기⌄</button><button className={sort === "latest" ? "active" : ""} onClick={() => setSort("latest")}>최신순</button></div></div>
    <section className="hot-list" aria-label="인기 게시글">{result.posts.filter((post) => !query || `${post.title} ${post.summary}`.toLocaleLowerCase("ko-KR").includes(query.toLocaleLowerCase("ko-KR"))).map((post, index) => <HotPost key={post.id} post={post} rank={index + 1} />)}{!result.posts.length && <div className="hot-empty">검색 결과가 없습니다.</div>}</section>
    <section className="hot-notice"><strong>안내</strong><p>제목·작성시간·공개 반응 수치와 직접 작성한 짧은 요약만 제공합니다. 원문은 출처 링크에서 확인하세요.</p></section>
    <footer className="hot-footer"><Link href="/admin">관리자</Link><Link href="#top">맨 위로 ↑</Link><small>원문·댓글·이미지를 무단 복제하지 않으며 출처를 표시합니다.</small></footer>
  </main>;
}
