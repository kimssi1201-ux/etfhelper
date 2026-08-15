import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadMarketDataModule() {
  const source = await readFile(new URL("../lib/market-data.ts", import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

async function readSourceTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = await Promise.all(entries.map(async (entry) => {
    const location = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return readSourceTree(location);
    if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) return "";
    return readFile(location, "utf8");
  }));
  return sources.flat(Infinity).join("\n");
}

function readTtl(ttlBlock, name) {
  const match = ttlBlock.match(new RegExp(`\\b${name}:\\s*([\\d\\s*]+),`));
  assert.ok(match, `CACHE_TTL.${name} must be declared`);
  return match[1].split("*").reduce((product, factor) => product * Number(factor.trim()), 1);
}

test("affordable share count always floors to whole shares", async () => {
  const { calculateAffordableShares } = await loadMarketDataModule();

  assert.equal(calculateAffordableShares(1_000_000, 1_300, 75), 10);
  assert.equal(calculateAffordableShares(9_999_999, 1_000, 100), 99);
  assert.equal(calculateAffordableShares(10_000_000, 1_000, 100), 100);
  assert.equal(calculateAffordableShares(0, 1_300, 75), 0);
  assert.equal(calculateAffordableShares(1_000_000, Number.NaN, 75), 0);
  assert.equal(calculateAffordableShares(1_000_000, 1_300, -75), 0);
});

test("dividend income applies the 15% US withholding rate", async () => {
  const { calculateDividendIncome, US_WITHHOLDING_RATE } = await loadMarketDataModule();
  const income = calculateDividendIncome(10, 12, 1_250);

  assert.equal(US_WITHHOLDING_RATE, 0.15);
  assert.equal(income.annualGrossUsd, 120);
  assert.equal(income.annualGrossKrw, 150_000);
  assert.equal(income.annualNetUsd, 102);
  assert.equal(income.annualNetKrw, 127_500);
  assert.equal(income.quarterlyNetKrw, 31_875);
  assert.equal(income.monthlyNetKrw, 10_625);
  assert.equal(income.annualNetKrw / income.annualGrossKrw, 0.85);

  assert.equal(calculateDividendIncome(-1, 12, 1_250).annualNetKrw, 0);
  assert.equal(calculateDividendIncome(10, Number.NaN, 1_250).annualNetKrw, 0);
});

test("target calculator rounds required shares up so the net target is met", async () => {
  const { calculateDividendIncome, calculateTargetIncome } = await loadMarketDataModule();
  const monthlyTargetKrw = 100_000;
  const target = calculateTargetIncome(monthlyTargetKrw, 12, 100, 1_250);

  assert.deepEqual(target, {
    shares: 95,
    investmentUsd: 9_500,
    investmentKrw: 11_875_000,
  });
  assert.ok(calculateDividendIncome(target.shares - 1, 12, 1_250).monthlyNetKrw < monthlyTargetKrw);
  assert.ok(calculateDividendIncome(target.shares, 12, 1_250).monthlyNetKrw >= monthlyTargetKrw);
  assert.deepEqual(calculateTargetIncome(monthlyTargetKrw, 0, 100, 1_250), {
    shares: 0,
    investmentUsd: 0,
    investmentKrw: 0,
  });
});

test("market data uses only the official FMP Stable and ECB endpoints with private FMP authentication", async () => {
  const fmpSource = await readFile(new URL("../lib/fmp.ts", import.meta.url), "utf8");
  const implementationSource = await Promise.all([
    readSourceTree(new URL("../app/", import.meta.url)),
    readSourceTree(new URL("../lib/", import.meta.url)),
  ]).then((parts) => parts.join("\n"));

  assert.match(fmpSource, /const FMP_BASE_URL\s*=\s*["']https:\/\/financialmodelingprep\.com["']/);
  assert.match(fmpSource, /const ECB_[A-Z_]*URL\s*=\s*(?:\r?\n\s*)?["']https:\/\/data-api\.ecb\.europa\.eu\/service\/data\/EXR\/D\.USD(?:\+|%2B)KRW\.EUR\.SP00\.A/);
  assert.match(fmpSource, /lastNObservations(?:=|["']?\s*[:,]\s*["'])[2-9]\d*/);
  assert.match(fmpSource, /detail(?:=|["']?\s*[:,]\s*["'])dataonly/);
  assert.match(fmpSource, /format(?:=|["']?\s*[:,]\s*["'])csvdata/);
  const endpointPaths = [...fmpSource.matchAll(/fetchFmpArray\(\s*["'](\/stable\/[^"']+)["']/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(endpointPaths, [
    "/stable/dividends",
    "/stable/historical-price-eod/full",
    "/stable/profile",
    "/stable/quote",
    "/stable/quote",
  ].sort());
  assert.match(fmpSource, /headers:\s*\{\s*apikey:\s*apiKey\s*\}/);
  assert.doesNotMatch(fmpSource, /searchParams\.(?:set|append)\(\s*["']apikey["']/i);
  assert.doesNotMatch(fmpSource, /[?&]apikey=/i);
  assert.doesNotMatch(fmpSource, /data-api\.ecb\.europa\.eu[^\s"'`]*(?:apikey|api.?key|token|secret)/i);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/dividends["']\s*,\s*commonParams\s*,\s*CACHE_TTL\.dividends\s*\)/);
  assert.doesNotMatch(fmpSource, /fetchFmpArray\(\s*["']\/stable\/dividends["'][\s\S]{0,180}?\blimit\b/i);
  assert.doesNotMatch(implementationSource, /yahoo/i);
  assert.match(fmpSource, /date\s*>\s*today/);
  assert.match(fmpSource, /paymentDate\s*!==\s*null\s*&&\s*paymentDate\s*>\s*today/);
});

test("FMP and API response caches retain the intended TTL policy", async () => {
  const [fmpSource, routeSource] = await Promise.all([
    readFile(new URL("../lib/fmp.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/stocks/[symbol]/route.ts", import.meta.url), "utf8"),
  ]);
  const ttlBlock = fmpSource.match(/const CACHE_TTL\s*=\s*\{([\s\S]*?)\}\s*as const/)?.[1];
  assert.ok(ttlBlock, "CACHE_TTL must be declared as a constant policy");

  assert.deepEqual({
    quote: readTtl(ttlBlock, "quote"),
    fx: readTtl(ttlBlock, "fx"),
    prices: readTtl(ttlBlock, "prices"),
    dividends: readTtl(ttlBlock, "dividends"),
    profile: readTtl(ttlBlock, "profile"),
  }, {
    quote: 3_600,
    fx: 21_600,
    prices: 43_200,
    dividends: 86_400,
    profile: 86_400,
  });

  assert.match(fmpSource, /next:\s*\{\s*revalidate:\s*ttl\s*\}/);
  assert.match(fmpSource, /cf:\s*\{\s*cacheEverything:\s*true,\s*cacheTtl:\s*ttl\s*\}/);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/quote["']\s*,\s*commonParams\s*,\s*CACHE_TTL\.quote\s*\)/);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/profile["']\s*,\s*commonParams\s*,\s*CACHE_TTL\.profile\s*\)/);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/historical-price-eod\/full["'][\s\S]{0,300}?CACHE_TTL\.prices\s*,?\s*\)/);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/dividends["'][\s\S]{0,200}?CACHE_TTL\.dividends\s*\)/);
  assert.match(fmpSource, /fetchFmpArray\(\s*["']\/stable\/quote["'][\s\S]{0,150}?symbol:\s*["']USDKRW["'][\s\S]{0,100}?CACHE_TTL\.fx\s*\)/);
  assert.match(routeSource, /s-maxage=3600,\s*stale-while-revalidate=300/);
  assert.match(routeSource, /headers:\s*\{\s*["']Cache-Control["']:\s*["']no-store["']\s*\}/);
});

test("Cloudflare production build contains each required runtime flag exactly once", async () => {
  const wrangler = JSON.parse(await readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"));
  assert.deepEqual(wrangler.compatibility_flags, ["nodejs_compat", "global_fetch_strictly_public"]);
});
