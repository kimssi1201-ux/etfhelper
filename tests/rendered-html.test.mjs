import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the ETF dividend calculator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /ETF FLOW/);
  assert.match(html, /국내 · 미국 ETF 지원/);
  assert.match(html, /ETF 배당금 계산기/);
  assert.match(html, /가격 차트/);
  assert.match(html, /배당금 이력/);
  assert.match(html, /목표 배당금 계산기/);
  assert.match(html, /목표 월 배당금/);
  assert.match(html, /월 200만원/);
  assert.match(html, /JEPI/);
  assert.match(html, /TIGER 미국배당다우존스/);
  assert.match(html, /세후 월평균/);
  assert.match(html, /내 포트폴리오/);
  assert.match(html, /Yahoo Finance 공개 데이터/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /summary_large_image/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("includes calculator logic and public data adapters", async () => {
  const [component, calculations, searchRoute, quoteRoute, layout] = await Promise.all([
    readFile(new URL("../app/DividendApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/calculations.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/etf/search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/etf/quote/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(component, /etf-flow-portfolio-v1/);
  assert.match(component, /loadQuote\("JEPI", "JPMorgan Equity Premium Income ETF"\)/);
  assert.match(component, /1,000만원 투자/);
  assert.match(component, /월 200만원/);
  assert.match(component, /USD\/KRW 환율/);
  assert.match(component, />USD<\/button>/);
  assert.match(component, />KRW<\/button>/);
  assert.match(component, /가격 차트/);
  assert.match(component, /배당금 이력/);
  assert.match(component, /목표 월 배당금/);
  assert.match(component, /quote\?\.priceHistory/);
  assert.match(component, /Math\.floor\(Math\.max\(draft\.investment/);
  assert.match(component, /taxRate: 15\.4/);
  assert.match(component, /taxRate: 15/);
  assert.match(component, /netYield > 0/);
  assert.match(calculations, /priceHistory\?: PriceHistoryPoint\[\]/);
  assert.match(calculations, /ttmDividend \/ price/);
  assert.match(calculations, /taxMultiplier/);
  assert.match(searchRoute, /quoteType === "ETF"/);
  assert.match(quoteRoute, /KRW=X/);
  assert.match(quoteRoute, /365 \* 24 \* 60 \* 60/);
  assert.match(quoteRoute, /priceHistory: history\.map/);
  assert.match(quoteRoute, /dividends: dividends\.slice\(0, 12\)/);
  assert.match(layout, /width: 1731, height: 909/);
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
