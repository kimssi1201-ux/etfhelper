import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const ORIGIN = "https://dividend.example";
const verifiedStocks = [
  { slug: "xom", symbol: "XOM", kind: "stock" },
  { slug: "cvx", symbol: "CVX", kind: "stock" },
  { slug: "aapl", symbol: "AAPL", kind: "stock" },
  { slug: "msft", symbol: "MSFT", kind: "stock" },
  { slug: "ko", symbol: "KO", kind: "stock" },
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

async function render(path, headers = {}) {
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
      ...headers,
    },
  }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("supported universe contains exactly the five symbols verified against the active FMP plan", async () => {
  const { stocks, stockSlugs, getStockBySlug, getStockBySymbol } = await loadStocksModule();
  const slugs = stocks.map((stock) => stock.slug);
  const symbols = stocks.map((stock) => stock.symbol);

  assert.deepEqual([...symbols].sort(), verifiedStocks.map((stock) => stock.symbol).sort());
  assert.deepEqual([...slugs].sort(), verifiedStocks.map((stock) => stock.slug).sort());
  assert.equal(new Set(slugs.map((slug) => slug.toLowerCase())).size, stocks.length, "configured slugs must be unique");
  assert.equal(new Set(symbols.map((symbol) => symbol.toUpperCase())).size, stocks.length, "configured symbols must be unique");
  assert.deepEqual(stockSlugs, slugs, "every configured stock must receive a generated route");

  for (const expected of verifiedStocks) {
    const configured = stocks.find((stock) => stock.symbol === expected.symbol);
    assert.ok(configured, `${expected.symbol} must remain in the verified universe`);
    assert.equal(configured.slug, expected.slug);
    assert.equal(configured.kind, expected.kind);
  }

  for (const stock of stocks) {
    assert.match(stock.slug, /^[a-z0-9][a-z0-9.-]*$/);
    assert.equal(stock.symbol, stock.symbol.toUpperCase());
    assert.ok(stock.nameKo.trim() && stock.nameEn.trim());
    assert.ok(stock.headline.trim() && stock.description.trim());
    assert.equal(stock.faqs.length, 3);
    assert.equal(getStockBySlug(stock.slug)?.symbol, stock.symbol);
    assert.equal(getStockBySymbol(stock.symbol)?.slug, stock.slug);
  }

  for (const unsupportedSymbol of ["MCD", "TEST123"]) {
    assert.equal(getStockBySlug(unsupportedSymbol.toLowerCase()), undefined);
    assert.equal(getStockBySymbol(unsupportedSymbol), undefined);
  }
});

test("static params, SEO, and scalable selector all derive from shared stock config", async () => {
  const [pageSource, componentSource] = await Promise.all([
    readFile(new URL("../app/[symbol]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/StockDividendApp.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(pageSource, /import\s*\{[^}]*getStockBySlug[^}]*stockSlugs[^}]*\}\s*from\s*["']@\/lib\/stocks["']/s);
  assert.match(pageSource, /export const dynamicParams\s*=\s*false/);
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
  assert.doesNotMatch(componentSource, /curated\?\.slug\s*\?\?|ticker\.toLowerCase\(\)/, "unlisted ticker text must never become a route");
  assert.doesNotMatch(componentSource, /openTicker|티커 바로 열기|바로 이동/, "the selector must only filter and link the verified universe");
  const selectorLink = componentSource.match(/<Link\s+key=\{stock\.slug\}[\s\S]*?<\/Link>/)?.[0];
  assert.ok(selectorLink, "the selector must render a link for each configured stock");
  assert.match(selectorLink, /event\.preventDefault\(\)/, "the selector must bypass unreliable client navigation");
  assert.match(selectorLink, /window\.location\.assign\(`\/\$\{stock\.slug\}`\)/, "stock links must guarantee a full navigation");
  assert.doesNotMatch(selectorLink, /setOpen\(false\)|removeAttribute\(["']open["']\)/, "the selector must not unmount before navigation starts");
  assert.match(componentSource, /<StockSelector\s+key=\{config\.slug\}\s+current=\{config\}\s*\/>/);
});

test("unverified page and API routes return 404 without contacting an upstream provider", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    throw new Error("unsupported routes must be rejected before an upstream request");
  };

  try {
    for (const symbol of ["MCD", "TEST123"]) {
      const pageResponse = await render(`/${symbol.toLowerCase()}`);
      const pageHtml = await pageResponse.text();
      assert.equal(pageResponse.status, 404);
      assert.doesNotMatch(pageHtml, new RegExp(`${symbol} 배당금 계산기`));
      assert.doesNotMatch(pageHtml, /application\/ld\+json/i);

      const apiResponse = await render(`/api/stocks/${symbol}`, { accept: "application/json" });
      assert.equal(apiResponse.status, 404);
      assert.equal(apiResponse.headers.get("cache-control"), "no-store");
      assert.deepEqual(await apiResponse.json(), {
        error: {
          code: "UNSUPPORTED_SYMBOL",
          message: "지원하지 않는 종목입니다.",
        },
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(upstreamCalls, 0);
});
