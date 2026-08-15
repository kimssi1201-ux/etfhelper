import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const ORIGIN = "https://dividend.example";
const coreStocks = [
  { slug: "xom", symbol: "XOM", kind: "stock" },
  { slug: "jepi", symbol: "JEPI", kind: "etf" },
  { slug: "jepq", symbol: "JEPQ", kind: "etf" },
  { slug: "schd", symbol: "SCHD", kind: "etf" },
  { slug: "qqqi", symbol: "QQQI", kind: "etf" },
];
const coreSymbols = new Set(coreStocks.map((stock) => stock.symbol));
const referenceSymbols = [
  "JEPI", "QQQI", "QYLD", "DIVO", "JEPQ", "SPHD", "RYLD", "SDIV", "XYLD", "NUSI",
  "XYLG", "QYLG", "DIV", "SRET", "PFF", "PFFD", "BND", "AGG", "TLT", "VGIT", "SGOV",
  "SPYI", "IWMI", "IYRI", "GPIQ", "GPIX", "BITO", "TLTW", "ULTY", "TSLY", "NVDY",
  "CONY", "MSTY", "AMDY", "APLY", "GOOY", "AMZY", "FEPI", "YMAX", "LFGY", "PLTY",
  "QDTE", "CHPY", "PLTW", "SCHD", "SPYD", "VYM", "DGRO", "HDV", "ITA", "PPA", "DFEN",
  "FENY", "XLE", "VDE", "FDVV", "QQQ", "VOO", "QQQM", "SPY", "O", "ABBV", "MO", "T",
  "VZ", "KO", "PM", "JNJ", "PG", "PEP", "XOM", "NVDA", "AAPL", "MSFT", "AVGO",
];
let stocksModulePromise;
let workerPromise;

async function loadStocksModule() {
  if (!stocksModulePromise) {
    stocksModulePromise = readFile(new URL("../lib/stocks.ts", import.meta.url), "utf8").then((source) => {
      const javascript = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
    });
  }
  return stocksModulePromise;
}

async function render(path) {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("universe-test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);
  }
  const worker = await workerPromise;
  return worker.fetch(new Request(`${ORIGIN}${path}`, {
    headers: {
      accept: "text/html",
      "x-forwarded-host": "dividend.example",
      "x-forwarded-proto": "https",
    },
  }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

function displayName(stock) {
  return stock.nameKo.toUpperCase() === stock.symbol
    ? stock.symbol
    : `${stock.nameKo}(${stock.symbol})`;
}

test("supported universe contains at least 50 unique routes and retains the original five", async () => {
  const { stocks, stockSlugs, getStockBySlug, getStockBySymbol } = await loadStocksModule();
  const slugs = stocks.map((stock) => stock.slug);
  const symbols = stocks.map((stock) => stock.symbol);

  assert.ok(stocks.length >= 50, `expected at least 50 configured stocks, received ${stocks.length}`);
  assert.equal(new Set(slugs.map((slug) => slug.toLowerCase())).size, stocks.length, "configured slugs must be unique");
  assert.equal(new Set(symbols.map((symbol) => symbol.toUpperCase())).size, stocks.length, "configured symbols must be unique");
  assert.deepEqual(stockSlugs, slugs, "every configured stock must receive a generated route");

  for (const expected of coreStocks) {
    const configured = stocks.find((stock) => stock.symbol === expected.symbol);
    assert.ok(configured, `${expected.symbol} must remain supported`);
    assert.equal(configured.slug, expected.slug);
    assert.equal(configured.kind, expected.kind);
  }

  for (const symbol of referenceSymbols) {
    assert.ok(symbols.includes(symbol), `reference ticker ${symbol} must be configured`);
  }
  assert.equal(getStockBySymbol("FEPI")?.payoutFrequency, "weekly");

  for (const stock of stocks) {
    assert.match(stock.slug, /^[a-z0-9][a-z0-9.-]*$/);
    assert.equal(stock.symbol, stock.symbol.toUpperCase());
    assert.ok(stock.nameKo.trim() && stock.nameEn.trim());
    assert.ok(stock.headline.trim() && stock.description.trim());
    assert.equal(stock.faqs.length, 3);
    assert.equal(getStockBySlug(stock.slug)?.symbol, stock.symbol);
    assert.equal(getStockBySymbol(stock.symbol)?.slug, stock.slug);
  }
});

test("static params, SEO, and scalable selector all derive from shared stock config", async () => {
  const [pageSource, componentSource] = await Promise.all([
    readFile(new URL("../app/[symbol]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/StockDividendApp.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /import\s*\{[^}]*getStockBySlug[^}]*stockSlugs[^}]*\}\s*from\s*["']@\/lib\/stocks["']/s);
  assert.match(pageSource, /export const dynamicParams\s*=\s*true/);
  assert.match(pageSource, /return\s+stockSlugs\.map\(\s*\(symbol\)\s*=>\s*\(\{\s*symbol\s*\}\)\s*\)/);
  assert.ok((pageSource.match(/const config\s*=\s*getStockBySlug\(symbol\)/g) ?? []).length >= 2);
  assert.match(pageSource, /new URL\(`\/\$\{config\.slug\}`\s*,\s*origin\)/);
  assert.match(pageSource, /description:\s*config\.description/);
  assert.match(pageSource, /mainEntity:\s*config\.faqs\.map/);

  assert.match(componentSource, /import\s*\{\s*stocks\s*,\s*type StockConfig\s*\}\s*from\s*["']@\/lib\/stocks["']/);
  assert.match(componentSource, /selectableStocks\.filter\(/);
  assert.match(componentSource, /type=["']search["']/);
  assert.match(componentSource, /groups\.map\(/);
  assert.match(componentSource, /group\.items\.map\(/);
  assert.match(componentSource, /href=\{`\/\$\{stock\.slug\}`\}/);
  assert.match(componentSource, /aria-expanded=\{open\}/);
  assert.match(componentSource, /aria-controls=["']stock-selector-panel["']/);
  assert.match(componentSource, /id=["']stock-selector-panel["']/);
  assert.match(componentSource, /window\.location\.assign\(/);
  assert.match(componentSource, /영문 티커 1~10자를 입력해 주세요\./);
  assert.match(componentSource, /페이지를 열지 못했습니다\. 잠시 후 다시 시도해 주세요\./);
  const selectorLink = componentSource.match(/<Link\s+key=\{stock\.slug\}[\s\S]*?<\/Link>/)?.[0];
  assert.ok(selectorLink, "the selector must render a link for each configured stock");
  assert.match(selectorLink, /event\.preventDefault\(\)/, "the selector must bypass unreliable client navigation");
  assert.match(selectorLink, /window\.location\.assign\(`\/\$\{stock\.slug\}`\)/, "stock links must guarantee a full navigation");
  assert.doesNotMatch(selectorLink, /setOpen\(false\)|removeAttribute\(["']open["']\)/, "the selector must not unmount before navigation starts");
  assert.match(componentSource, /<StockSelector\s+key=\{config\.slug\}\s+current=\{config\}\s*\/>/);
});

test("representative expanded ETF and stock routes server-render config-derived SEO", async (t) => {
  const { stocks } = await loadStocksModule();
  const samples = [
    stocks.find((stock) => stock.kind === "etf" && !coreSymbols.has(stock.symbol)),
    stocks.find((stock) => stock.kind === "stock" && !coreSymbols.has(stock.symbol)),
  ];
  assert.ok(samples.every(Boolean), "expanded config must contain both an ETF and an individual stock");

  for (const stock of samples) {
    await t.test(`${stock.kind}: ${stock.symbol}`, async () => {
      const response = await render(`/${stock.slug}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

      const rawHtml = await response.text();
      const html = rawHtml.replace(/<!--[\s\S]*?-->/g, "");
      const name = displayName(stock);
      const canonicalUrl = `${ORIGIN}/${stock.slug}`;
      const title = `${name} 배당금 계산기 | 배당렌즈`;
      const description = `${name}의 현재가와 최근 12개월 실제 주당 배당금으로 월평균·분기·연간 예상 배당금과 목표 투자금을 계산하세요.`;

      assert.ok(html.includes(`<title>${title}</title>`));
      assert.ok(html.includes(`<meta name="description" content="${description}">`));
      assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl}">`));
      assert.ok(html.includes(`>${stock.symbol} 배당금 계산기</h1>`));
      assert.ok(html.includes(stock.headline));
      assert.ok(html.includes("종목 선택 메뉴 열기"));

      const jsonLdText = rawHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
      assert.ok(jsonLdText, "JSON-LD must be server-rendered");
      const jsonLd = JSON.parse(jsonLdText);
      const application = jsonLd["@graph"].find((item) => item["@type"] === "WebApplication");
      const faq = jsonLd["@graph"].find((item) => item["@type"] === "FAQPage");
      assert.equal(application.name, `${name} 배당금 계산기`);
      assert.equal(application.url, canonicalUrl);
      assert.equal(application.description, stock.description);
      assert.equal(faq.mainEntity.length, stock.faqs.length);
    });
  }
});

test("a syntactically valid unlisted ticker receives a dynamic calculator and SEO page", async () => {
  const symbol = "TEST123";
  const slug = symbol.toLowerCase();
  const response = await render(`/${slug}`);
  assert.equal(response.status, 200);

  const rawHtml = await response.text();
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(html.includes(`<title>${symbol} 배당금 계산기 | 배당렌즈</title>`));
  assert.ok(html.includes(`<link rel="canonical" href="${ORIGIN}/${slug}">`));
  assert.ok(html.includes(`>${symbol} 배당금 계산기</h1>`));
  assert.ok(html.includes(`${symbol}의 예상 배당 현금흐름을 간단히 계산해 보세요.`));

  const jsonLdText = rawHtml.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i)?.[1];
  assert.ok(jsonLdText);
  const jsonLd = JSON.parse(jsonLdText);
  const application = jsonLd["@graph"].find((item) => item["@type"] === "WebApplication");
  assert.equal(application.name, `${symbol} 배당금 계산기`);
  assert.equal(application.url, `${ORIGIN}/${slug}`);
});
