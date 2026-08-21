import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommunity, getPost, samplePosts } from "@/lib/community-data";
import { collectLivePostDetail } from "@/lib/community-live";
import type { CommunityPost } from "@/lib/community-types";

type PostPageParams = {
  community: string;
  externalId: string;
};

export function generateStaticParams() {
  return samplePosts.map((post) => ({
    community: post.communitySlug,
    externalId: post.externalId,
  }));
}

export const dynamicParams = true;

async function findPost(community: string, externalId: string): Promise<CommunityPost | undefined> {
  const savedPost = getPost(community, externalId);
  if (savedPost) return savedPost;

  return collectLivePostDetail(community, externalId).catch(() => undefined);
}

export async function generateMetadata({ params }: { params: Promise<PostPageParams> }): Promise<Metadata> {
  const { community, externalId } = await params;
  const post = await findPost(community, decodeURIComponent(externalId));
  if (!post) return {};

  return {
    title: `${post.title} | 모아봄`,
    description: post.summary,
    alternates: { canonical: `/post/${community}/${encodeURIComponent(post.externalId)}` },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
    },
  };
}

export default async function PostPage({ params }: { params: Promise<PostPageParams> }) {
  const { community, externalId } = await params;
  const source = getCommunity(community);
  const post = await findPost(community, decodeURIComponent(externalId));

  if (!post || !source) notFound();

  return (
    <main className="post-page">
      <header className="post-header">
        <Link href="/" className="community-logo">
          <span className="community-logo-mark">모</span>
          <span>
            <b>모아봄</b>
            <small>COMMUNITY BRIEF</small>
          </span>
        </Link>
        <Link href={`/community/${community}`} className="post-back">{source.name} 목록 →</Link>
      </header>
      <article className="post-article">
        <p className="community-eyebrow">{source.name} · 게시글 요약</p>
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span>{source.name}</span>
          <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleString("ko-KR")}</time>
          <span>조회 {post.views === null ? "-" : post.views.toLocaleString("ko-KR")}</span>
          <span>추천 {post.likes === null ? "-" : post.likes.toLocaleString("ko-KR")}</span>
          <span>댓글 {post.commentsCount === null ? "-" : post.commentsCount.toLocaleString("ko-KR")}</span>
        </div>
        <a className="post-source-link" href={post.originalUrl} target="_blank" rel="noreferrer noopener">
          {source.name} 원문링크 <span>{post.originalUrl}</span>
        </a>
        <div className="post-summary">
          <strong>{post.contentPreview ? "본문 미리보기" : "모아봄 요약"}</strong>
          <p>{post.contentPreview ?? post.summary}</p>
        </div>
        <div className="post-policy">
          원문 전체와 댓글은 저장하거나 복제하지 않습니다. 정확한 내용은 출처의 원문에서 확인해 주세요.
        </div>
        <a className="post-original-button" href={post.originalUrl} target="_blank" rel="noreferrer noopener">
          원문 보기 <span>↗</span>
        </a>
      </article>
      <footer className="community-footer">
        <p>모아봄은 원문을 대신하지 않습니다. 출처 링크로 이동해 전체 내용을 확인하세요.</p>
      </footer>
    </main>
  );
}
