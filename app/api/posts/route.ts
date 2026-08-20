import { addPost, communities, listPosts } from "@/lib/community-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return Response.json(listPosts({ community: url.searchParams.get("community") ?? undefined, q: url.searchParams.get("q") ?? undefined, sort: url.searchParams.get("sort") === "latest" ? "latest" : "popular", page: Number(url.searchParams.get("page") || 1) }), { headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" } });
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected || request.headers.get("x-admin-key") !== expected) return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401, headers: { "cache-control": "no-store" } });
  const body = await request.json().catch(() => ({})) as { community?: string; title?: string; originalUrl?: string; summary?: string };
  if (!body.community || !communities.some((item) => item.slug === body.community) || !body.title?.trim() || !body.originalUrl?.startsWith("http") || !body.summary?.trim()) return Response.json({ error: "필수 항목을 확인하세요." }, { status: 400 });
  const community = communities.find((item) => item.slug === body.community)!;
  const originalUrl = new URL(body.originalUrl).toString();
  const externalId = `manual-${crypto.randomUUID()}`;
  const post = {
    id: externalId,
    communitySlug: community.slug,
    communityName: community.name,
    externalId,
    title: body.title.trim().slice(0, 240),
    originalUrl,
    thumbnailUrl: null,
    summary: body.summary.trim().slice(0, 500),
    authorName: null,
    views: null,
    likes: null,
    commentsCount: null,
    publishedAt: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    status: "published" as const,
  };
  const created = addPost(post);
  if (!created.ok) return Response.json({ error: "이미 등록된 원문입니다." }, { status: 409, headers: { "cache-control": "no-store" } });
  return Response.json({ ok: true, post: created.post, note: "현재는 런타임 저장입니다. Supabase 연결 후 영구 저장으로 전환하세요." }, { status: 201, headers: { "cache-control": "no-store" } });
}
