import { collectLiveCommunity } from "@/lib/community-live";
import { listPosts } from "@/lib/community-data";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") === "latest" ? "latest" as const : "popular" as const;
  try {
    const live = slug === "all"
      ? (await Promise.all(["bobae", "ruliweb", "todayhumor"].map((item) => collectLiveCommunity(item)))).flat()
      : await collectLiveCommunity(slug);
    if (live.length) return Response.json({ posts: live, total: live.length, source: "live", notice: "공개 목록의 제목·링크만 표시합니다." }, { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=600" } });
  } catch {
    // 정책/네트워크 오류 시 샘플 또는 저장소 데이터로 안전하게 대체합니다.
  }
  return Response.json({ ...listPosts({ community: slug === "all" ? undefined : slug, sort }), source: "fallback", notice: "현재 공개 수집 결과가 없어 저장된 게시글을 표시합니다." }, { headers: { "cache-control": "public, max-age=60" } });
}
