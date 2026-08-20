import type { Community, CommunityPost, PostQuery } from "./community-types";

export const communities: readonly Community[] = [
  { id: "bobae", slug: "bobae", name: "보배드림", baseUrl: "https://www.bobaedream.co.kr", enabled: true },
  { id: "ruliweb", slug: "ruliweb", name: "루리웹", baseUrl: "https://bbs.ruliweb.com", enabled: true },
  { id: "slr", slug: "slr", name: "SLR클럽", baseUrl: "https://www.slrclub.com", enabled: true },
  { id: "todayhumor", slug: "todayhumor", name: "오늘의유머", baseUrl: "https://www.todayhumor.co.kr", enabled: true },
];

// 실제 수집 데이터가 연결되기 전 화면 확인용 샘플입니다. 원문 본문과 이미지는 저장하지 않습니다.
export const samplePosts: readonly CommunityPost[] = [
  { id: "sample-1", communitySlug: "bobae", communityName: "보배드림", externalId: "preview-1", title: "[미리보기] 공개 게시글의 제목과 기본 정보만 모읍니다", originalUrl: "https://www.bobaedream.co.kr/", thumbnailUrl: null, summary: "원문 전체를 복제하지 않고 제목과 메타데이터, 서비스가 직접 작성한 짧은 요약만 보여주는 카드 예시입니다.", authorName: null, views: 12300, likes: 320, commentsCount: 85, publishedAt: "2026-08-20T12:30:00.000Z", collectedAt: "2026-08-20T12:35:00.000Z", status: "published", sample: true },
  { id: "sample-2", communitySlug: "ruliweb", communityName: "루리웹", externalId: "preview-2", title: "[미리보기] 커뮤니티별 인기글을 빠르게 비교하는 화면", originalUrl: "https://bbs.ruliweb.com/", thumbnailUrl: null, summary: "커뮤니티별 인기글을 한 화면에서 비교하고 원문으로 이동할 수 있도록 설계한 예시입니다.", authorName: null, views: 8200, likes: 190, commentsCount: 42, publishedAt: "2026-08-20T11:50:00.000Z", collectedAt: "2026-08-20T12:00:00.000Z", status: "published", sample: true },
  { id: "sample-3", communitySlug: "slr", communityName: "SLR클럽", externalId: "preview-3", title: "[미리보기] 날짜와 정렬을 바꿔 원하는 글만 찾기", originalUrl: "https://www.slrclub.com/", thumbnailUrl: null, summary: "최신순과 인기순, 커뮤니티 필터를 조합해 필요한 글을 빠르게 찾는 흐름입니다.", authorName: null, views: 5400, likes: 106, commentsCount: 18, publishedAt: "2026-08-20T10:15:00.000Z", collectedAt: "2026-08-20T10:20:00.000Z", status: "published", sample: true },
  { id: "sample-4", communitySlug: "todayhumor", communityName: "오늘의유머", externalId: "preview-4", title: "[미리보기] 원문 링크와 출처를 분명하게 표시합니다", originalUrl: "https://www.todayhumor.co.kr/", thumbnailUrl: null, summary: "출처 커뮤니티와 원문 보기 버튼을 명확히 표시해 방문자가 원문을 직접 확인할 수 있습니다.", authorName: null, views: 3100, likes: 78, commentsCount: 11, publishedAt: "2026-08-20T09:40:00.000Z", collectedAt: "2026-08-20T09:45:00.000Z", status: "published", sample: true },
];

// 1차 버전의 저장소 어댑터입니다. 영구 저장소를 연결하기 전에도 관리자 수동 등록 흐름을
// 검증할 수 있도록 프로세스 안에서만 유지합니다. 재배포/재시작 시 초기화됩니다.
let runtimePosts: CommunityPost[] = [...samplePosts];

export function getCommunity(slug: string) {
  return communities.find((community) => community.slug === slug);
}

export function getPost(communitySlug: string, externalId: string) {
  return runtimePosts.find((post) => post.communitySlug === communitySlug && post.externalId === externalId && post.status === "published");
}

export function addPost(post: CommunityPost) {
  const duplicate = runtimePosts.some((item) => item.communitySlug === post.communitySlug && (item.externalId === post.externalId || item.originalUrl === post.originalUrl));
  if (duplicate) return { ok: false as const, reason: "duplicate" as const };
  runtimePosts = [post, ...runtimePosts];
  return { ok: true as const, post };
}

export function listPosts(query: PostQuery = {}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
  const normalizedQuery = query.q?.trim().toLocaleLowerCase("ko-KR");
  const filtered = runtimePosts.filter((post) => {
    if (post.status !== "published") return false;
    if (query.community && post.communitySlug !== query.community) return false;
    if (normalizedQuery && !`${post.title} ${post.summary}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)) return false;
    return true;
  });
  filtered.sort((a, b) => query.sort === "latest"
    ? b.publishedAt.localeCompare(a.publishedAt)
    : ((b.likes ?? 0) + (b.commentsCount ?? 0) * 2 + (b.views ?? 0) / 100) - ((a.likes ?? 0) + (a.commentsCount ?? 0) * 2 + (a.views ?? 0) / 100));
  const start = (page - 1) * pageSize;
  return { posts: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize, hasMore: start + pageSize < filtered.length };
}
