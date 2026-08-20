import type { CommunityPost } from "./community-types";

const sourceUrls: Record<string, string> = {
  bobae: "https://www.bobaedream.co.kr/list?code=best",
  ruliweb: "https://bbs.ruliweb.com/best",
  todayhumor: "https://www.todayhumor.co.kr/board/list.php?table=humorbest",
};

function clean(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#x27;|&#39;/g, " ").replace(/&amp;/g, "&").replace(/&#x2F;|\//g, "/").replace(/\s+/g, " ").trim();
}

function absolute(href: string, base: string) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function extract(html: string, slug: string, base: string): CommunityPost[] {
  if (!sourceUrls[slug]) return [];
  const pattern = /<a\b[^>]*href\s*=\s*["']?([^"' >]+)["']?[^>]*>([\s\S]*?)<\/a>/gi;
  const posts: CommunityPost[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const href = match[1];
    const allowed = slug === "bobae" ? /\/view\?code=best&No=\d+/i.test(href) : slug === "ruliweb" ? /\/best\/board\//i.test(href) : /\/board\/view\.php\?table=humorbest&no=\d+/i.test(href);
    if (!allowed || /cmt=|comment/i.test(href)) continue;
    const url = absolute(href, base);
    const title = clean(match[2]);
    if (!url || title.length < 2 || title.length > 240 || seen.has(url)) continue;
    seen.add(url);
    const parsed = new URL(url);
    const externalId = parsed.searchParams.get("No") ?? parsed.searchParams.get("no") ?? parsed.pathname.split("/").filter(Boolean).pop() ?? `live-${posts.length}`;
    posts.push({ id: `${slug}:${externalId}`, communitySlug: slug, communityName: slug === "bobae" ? "보배드림" : slug === "ruliweb" ? "루리웹" : "오늘의유머", externalId, title, originalUrl: url, thumbnailUrl: null, summary: "공개 목록에서 확인한 제목과 원문 링크입니다.", authorName: null, views: null, likes: null, commentsCount: null, publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), status: "published" });
    if (posts.length >= 30) break;
  }
  return posts;
}

export async function collectLiveCommunity(slug: string): Promise<CommunityPost[]> {
  const url = sourceUrls[slug];
  if (!url || slug === "slr") return [];
  const response = await fetch(url, { headers: { "user-agent": "MoaBom/1.0 (+https://fastincome.kr; public metadata only)" }, signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
  if (!response.ok) return [];
  return extract(await response.text(), slug, url);
}
