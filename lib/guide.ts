import { normalizeKeyword } from "@/lib/keyword-shared";

type GuideRawModuleMap = Record<string, string>;

export type GuideFrontmatter = {
  title: string;
  description: string;
  date: string;
  category: string;
  thumbnail: string;
  keywords: string[];
};

export type GuideTocItem = {
  id: string;
  depth: 2 | 3;
  text: string;
};

export type GuideBlock =
  | { type: "heading"; depth: number; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; language: string; code: string };

export type GuidePost = GuideFrontmatter & {
  slug: string;
  body: string;
  blocks: GuideBlock[];
  toc: GuideTocItem[];
};

const guideModules = import.meta.glob<string>("../content/guide/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
}) as GuideRawModuleMap;

function slugFromPath(path: string) {
  return path.split("/").pop()?.replace(/\.md$/, "") ?? "";
}

function cleanValue(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseInlineArray(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [];
  return trimmed.slice(1, -1).split(",").map((item) => cleanValue(item)).filter(Boolean);
}

function parseFrontmatter(raw: string, slug: string): { frontmatter: GuideFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fields = new Map<string, string | string[]>();
  let body = raw;

  if (match) {
    body = raw.slice(match[0].length);
    const lines = match[1].split(/\r?\n/);
    let currentArrayKey = "";

    for (const line of lines) {
      const arrayItem = line.match(/^\s*-\s+(.+)$/);
      if (arrayItem && currentArrayKey) {
        const previous = fields.get(currentArrayKey);
        fields.set(currentArrayKey, [...(Array.isArray(previous) ? previous : []), cleanValue(arrayItem[1])]);
        continue;
      }

      const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!field) continue;
      const [, key, value] = field;
      currentArrayKey = "";

      if (!value.trim()) {
        currentArrayKey = key;
        fields.set(key, []);
      } else if (value.trim().startsWith("[")) {
        fields.set(key, parseInlineArray(value));
      } else {
        fields.set(key, cleanValue(value));
      }
    }
  }

  const keywords = fields.get("keywords");

  return {
    frontmatter: {
      title: String(fields.get("title") || slug),
      description: String(fields.get("description") || ""),
      date: String(fields.get("date") || ""),
      category: String(fields.get("category") || "가이드"),
      thumbnail: String(fields.get("thumbnail") || ""),
      keywords: Array.isArray(keywords) ? keywords.map(normalizeKeyword).filter(Boolean) : [],
    },
    body: body.trim(),
  };
}

function stripInlineMarkup(value: string) {
  return value
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function headingId(index: number) {
  return `section-${index + 1}`;
}

export function parseGuideMarkdown(markdown: string): { blocks: GuideBlock[]; toc: GuideTocItem[] } {
  const lines = markdown.split(/\r?\n/);
  const blocks: GuideBlock[] = [];
  const toc: GuideTocItem[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { language: string; lines: string[] } | null = null;
  let headingIndex = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  }

  function flushQuote() {
    if (!quote.length) return;
    blocks.push({ type: "blockquote", text: quote.join(" ").trim() });
    quote = [];
  }

  function flushFlow() {
    flushParagraph();
    flushList();
    flushQuote();
  }

  for (const line of lines) {
    const codeFence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (code) {
      if (codeFence) {
        blocks.push({ type: "code", language: code.language, code: code.lines.join("\n") });
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    if (codeFence) {
      flushFlow();
      code = { language: codeFence[1] ?? "", lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushFlow();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushFlow();
      const depth = heading[1].length;
      const text = stripInlineMarkup(heading[2]);
      const id = headingId(headingIndex);
      headingIndex += 1;
      blocks.push({ type: "heading", depth, id, text });
      if (depth === 2 || depth === 3) toc.push({ id, depth, text });
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (ordered || unordered) {
      flushParagraph();
      flushQuote();
      const nextOrdered = Boolean(ordered);
      if (!list || list.ordered !== nextOrdered) flushList();
      list = list ?? { ordered: nextOrdered, items: [] };
      list.items.push((ordered?.[1] ?? unordered?.[1] ?? "").trim());
      continue;
    }

    const blockquote = line.match(/^\s*>\s?(.+)$/);
    if (blockquote) {
      flushParagraph();
      flushList();
      quote.push(blockquote[1].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  if (code) blocks.push({ type: "code", language: code.language, code: code.lines.join("\n") });
  flushFlow();

  return { blocks, toc };
}

function buildGuidePost(path: string, raw: string): GuidePost {
  const slug = slugFromPath(path);
  const { frontmatter, body } = parseFrontmatter(raw, slug);
  const parsed = parseGuideMarkdown(body);

  return {
    ...frontmatter,
    slug,
    body,
    blocks: parsed.blocks,
    toc: parsed.toc,
  };
}

export function guidePath(slug: string) {
  return `/guide/${encodeURIComponent(slug)}`;
}

export function getGuidePosts() {
  return Object.entries(guideModules)
    .map(([path, raw]) => buildGuidePost(path, raw))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function getGuidePost(slug: string) {
  return getGuidePosts().find((post) => post.slug === slug) ?? null;
}

export function getGuideCategories() {
  return [...new Set(getGuidePosts().map((post) => post.category).filter(Boolean))];
}
