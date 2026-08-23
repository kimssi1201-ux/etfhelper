import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const ORIGIN = "https://dividend.example";
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);
const stocksPromise = readFile(new URL("../lib/stocks.ts", import.meta.url), "utf8").then((source) => {
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
});

async function render(path, headers = {}) {
  const worker = await workerPromise;
  return worker.fetch(new Request(`${ORIGIN}${path}`, {
    headers: {
      accept: "text/html",
      "x-forwarded-host": "dividend.example",
      "x-forwarded-proto": "https",
      ...headers,
    },
  }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

async function fetchClientAsset(request) {
  const pathname = new URL(request.url).pathname;
  const mimeTypes = new Map([
    [".css", "text/css; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".woff2", "font/woff2"],
    [".png", "image/png"],
  ]);
  const extension = pathname.match(/\.[^.]+$/)?.[0] ?? "";

  try {
    const body = await readFile(new URL(`../dist/client${pathname}`, import.meta.url));
    return new Response(body, {
      headers: { "content-type": mimeTypes.get(extension) ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function escapePattern(value) {
  const specialCharacters = "\\^$.*+?()[]{}|";
  return [...value].map((character) => (
    specialCharacters.includes(character) ? `\\${character}` : character
  )).join("");
}

function tagHasAttributes(html, tagName, attributes) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  return tags.some((tag) => Object.entries(attributes).every(([name, value]) => (
    new RegExp(`\\b${name}=["']${escapePattern(value)}["']`, "i").test(tag)
  )));
}

function displayName(stock) {
  return stock.nameKo.toUpperCase() === stock.symbol
    ? stock.symbol
    : `${stock.nameKo}(${stock.symbol})`;
}

test("root renders the keyword briefing home", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /키워드랩/);
  assert.match(html, /AI 브리핑 키워드 대시보드/);
  assert.match(html, /검색량·경쟁도·연관 키워드/);
  assert.match(html, /keyword-search/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-controls="keyword-panel-related"/);
  assert.match(html, /키워드 데이터를 조회 중입니다\./);
  assert.match(html, /data-slot="keyword-summary-after"/);
  assert.doesNotMatch(html, /샘플 데이터/);
  assert.doesNotMatch(html, /네이버 OpenAPI 연결 대기|네이버 개발자센터 API 인증에 실패했습니다/);
});

test("/dl renders the keyword lab route", async () => {
  const response = await render("/dl");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /키워드랩/);
  assert.match(html, /AI 브리핑 키워드 대시보드/);
  assert.match(html, /keyword-tabs/);
});

test("Cloudflare Pages output includes the advanced-mode SSR worker", async () => {
  const [workerSource, serverEntrySource, assetsIgnore] = await Promise.all([
    readFile(new URL("../dist/client/_worker.js/index.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/_worker.js/server-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/.assetsignore", import.meta.url), "utf8"),
  ]);

  assert.match(workerSource, /export default/);
  assert.match(workerSource, /env\.ASSETS\.fetch\(request\)/);
  assert.match(serverEntrySource, /import\(`\.\/ssr\/index\.js`\)/);
  assert.match(assetsIgnore, /^_worker\.js$/m);
  assert.match(assetsIgnore, /^_worker\.js\/\*\*$/m);
});

test("Cloudflare Pages worker serves uploaded static assets before SSR", async () => {
  const manifest = await readFile(
    new URL("../dist/client/_worker.js/__vite_rsc_assets_manifest.js", import.meta.url),
    "utf8",
  );
  const cssPath = manifest.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
  assert.ok(cssPath, "server-rendered CSS asset should be discoverable");

  const workerUrl = new URL("../dist/client/_worker.js/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request(`${ORIGIN}${cssPath}`), {
    ASSETS: { fetch: fetchClientAsset },
  }, { waitUntil() {}, passThroughOnException() {} });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/css\b/i);
  assert.match(await response.text(), /keyword-shell/);
});

test("missing Naver SearchAd config returns a safe, non-cacheable keyword API error", async () => {
  const configKeys = [
    "NAVER_SEARCHAD_API_KEY",
    "NAVER_SEARCHAD_SECRET_KEY",
    "NAVER_SEARCHAD_CUSTOMER_ID",
  ];
  const originals = new Map(configKeys.map((key) => [key, process.env[key]]));

  for (const key of configKeys) delete process.env[key];

  try {
    const response = await render("/api/keywords?keyword=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90&mode=relevant", {
      accept: "application/json",
    });
    const responseText = await response.text();
    const body = JSON.parse(responseText);

    assert.equal(response.status, 503);
    assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.equal(body.error.code, "NAVER_SEARCHAD_CONFIG_MISSING");
    assert.equal(body.error.message, "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요");
    assert.doesNotMatch(responseText, /NAVER_SEARCHAD_API_KEY|NAVER_SEARCHAD_SECRET_KEY|NAVER_SEARCHAD_CUSTOMER_ID/);
    assert.doesNotMatch(responseText, /네이버 검색광고 API 환경변수|stack|node_modules|lib[\\/]naver-searchad/i);
  } finally {
    for (const [key, value] of originals) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("every stock in the shared verified universe server-renders content, SEO, structured data, and disclaimer", async (t) => {
  const { stocks } = await stocksPromise;

  for (const stock of stocks) {
    await t.test(stock.symbol, async () => {
      const response = await render(`/${stock.slug}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

      const rawHtml = await response.text();
      const html = rawHtml.replace(/<!--[\s\S]*?-->/g, "");
      const canonicalUrl = `${ORIGIN}/${stock.slug}`;
      const name = displayName(stock);
      const title = `${name} 배당금 계산기 | 배당계산기`;
      const description = `${name}의 현재가와 최근 12개월 실제 주당 배당금으로 월평균·분기·연간 예상 배당금과 목표 투자금을 계산하세요.`;

      assert.match(html, /<html\s+lang=["']ko["']/i);
      assert.ok(html.includes(`<title>${title}</title>`));
      assert.ok(tagHasAttributes(html, "meta", { name: "description", content: description }));
      assert.ok(tagHasAttributes(html, "link", { rel: "canonical", href: canonicalUrl }));
      assert.ok(tagHasAttributes(html, "meta", { name: "robots", content: "index, follow" }));
      assert.ok(tagHasAttributes(html, "meta", { property: "og:title", content: title }));
      assert.ok(tagHasAttributes(html, "meta", { property: "og:url", content: canonicalUrl }));
      assert.ok(tagHasAttributes(html, "meta", { property: "og:locale", content: "ko_KR" }));
      assert.ok(tagHasAttributes(html, "meta", { property: "og:site_name", content: "배당계산기" }));
      assert.ok(tagHasAttributes(html, "meta", { property: "og:image", content: `${ORIGIN}/og-dividend-calculator.png` }));
      assert.ok(tagHasAttributes(html, "meta", { name: "twitter:card", content: "summary_large_image" }));

      assert.ok(html.includes(`>${stock.symbol} 배당금 계산기</h1>`));
      assert.ok(html.includes(stock.headline));
      assert.ok(html.includes("FMP Stable API의 실제 시세·배당 이력을 사용합니다."));
      assert.ok(html.includes("목표 월 배당금"));
      assert.ok(html.includes("미국 원천징수 15%"));
      assert.ok(html.includes("본 서비스의 정보와 계산 결과는 참고용이며 투자 권유가 아닙니다."));
      assert.ok(html.includes("데이터: Financial Modeling Prep Stable API"));
      assert.doesNotMatch(html, /yahoo|ETF FLOW|codex-preview/i);

      const jsonLdText = rawHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
      assert.ok(jsonLdText, "JSON-LD must be server-rendered");
      const jsonLd = JSON.parse(jsonLdText);
      const application = jsonLd["@graph"].find((item) => item["@type"] === "WebApplication");
      const faq = jsonLd["@graph"].find((item) => item["@type"] === "FAQPage");
      assert.equal(application.name, `${name} 배당금 계산기`);
      assert.equal(application.url, canonicalUrl);
      assert.equal(application.description, stock.description);
      assert.equal(application.applicationCategory, "FinanceApplication");
      assert.equal(application.alternateName, "배당계산기");
      assert.equal(faq.mainEntity.length, stock.faqs.length);
      assert.ok(faq.mainEntity.every((item) => item["@type"] === "Question" && item.acceptedAnswer?.["@type"] === "Answer"));
      assert.doesNotMatch(rawHtml, /배당렌즈|Dividend Lens|배당한눈|Dividend at a Glance/);
    });
  }
});

test("missing FMP_API_KEY returns a safe, non-cacheable API error", async () => {
  const hadApiKey = Object.hasOwn(process.env, "FMP_API_KEY");
  const originalApiKey = process.env.FMP_API_KEY;
  delete process.env.FMP_API_KEY;

  try {
    const response = await render("/api/stocks/XOM", { accept: "application/json" });
    const responseText = await response.text();
    const body = JSON.parse(responseText);

    assert.equal(response.status, 503);
    assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.deepEqual(Object.keys(body.error).sort(), ["code", "message"]);
    assert.equal(body.error.code, "FMP_API_KEY_MISSING");
    assert.match(body.error.message, /FMP_API_KEY/);
    assert.doesNotMatch(responseText, /stack|node_modules|lib[\\/]fmp|undefined/i);
  } finally {
    if (hadApiKey) process.env.FMP_API_KEY = originalApiKey;
    else delete process.env.FMP_API_KEY;
  }
});
