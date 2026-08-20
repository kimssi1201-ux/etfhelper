import type { Community, CommunityPost } from "@/lib/community-types";
import type { CommunityCollector, RawCollectedPost } from "./types";

// 연결 전에는 빈 결과를 반환합니다. robots.txt·이용약관·공개 API 확인 뒤 이 어댑터만 활성화하세요.
const adapter: CommunityCollector = {
  async collectPosts() { return []; },
  async collectPostDetail() { return null; },
  normalizePost(community: Community, post: RawCollectedPost): CommunityPost {
    return {
      id: `${community.id}:${post.externalId}`,
      communitySlug: community.slug,
      communityName: community.name,
      externalId: post.externalId,
      title: post.title,
      originalUrl: post.originalUrl,
      thumbnailUrl: null,
      summary: post.summary ?? "수집된 게시글의 제목과 공개 메타데이터를 바탕으로 작성한 요약입니다.",
      authorName: post.authorName ?? null,
      views: post.views ?? null,
      likes: post.likes ?? null,
      commentsCount: post.commentsCount ?? null,
      publishedAt: post.publishedAt,
      collectedAt: new Date().toISOString(),
      status: "published",
    };
  },
};

export default adapter;
