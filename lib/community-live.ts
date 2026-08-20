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
  const patterns: Record<string, RegExp> = {
    bobae: /<tr[^>]*>\s*(?:.|\n)*?<a[^>]+href="([^"]*\/board\/[^"#]+|[^"]*\/view[^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ruliweb: /<a[^>]+href="([^"]*\/best\/board\/[^"#]+)"[^>]*>[\s\S]*?<\/span>\s*([\s\S]*?)<\/a>/gi,
    todayhumor: /<a[^>]+href="([^"]*\/board\/view\.php\?table=humorbest&no=\d+[^"#]*)"[^>]*>([\s\S]*?)<\/a>/gi,
  };
  const pattern = patterns[slug];
  if (!pattern) return [];
  const posts: CommunityPost[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const url = absolute(match[1], base);
    const title = clean(match[2]);
    if (!url || title.length < 2 || title.length > 240 || seen.has(url)) continue;
    seen.add(url);
    const externalId = url.split(/[/?=&]/).filter(Boolean).pop() ?? `live-${posts.length}`;
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
