import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const ORIGIN = "https://dividend.example";
const FMP_ORIGIN = "https://financialmodelingprep.com";
const ECB_ORIGIN = "https://data-api.ecb.europa.eu";
const ECB_PATH = "/service/data/EXR/D.USD+KRW.EUR.SP00.A";
const TEST_API_KEY = "test-only-fmp-secret-never-bundle";
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const execFileAsync = promisify(execFile);
const FX_UNAVAILABLE_MESSAGE = "USD/KRW 환율 데이터를 불러오지 못했습니다. 원화 계산에는 직접 입력한 환율이 필요합니다.";
let workerPromise;

function dateBefore(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function defaultEcbRows() {
  const commonDate = dateBefore(2);
  return {
    commonDate,
    rows: [
      { currency: "KRW", date: dateBefore(1), value: 1_536 },
      { currency: "KRW", date: commonDate, value: 1_500 },
      { currency: "USD", date: commonDate, value: 1.2 },
      { currency: "USD", date: dateBefore(3), value: 1.1 },
    ],
  };
}

function csvResponse(rows, status = 200) {
  const header = "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE";
  const lines = rows.map(({ currency, date, value }) => (
    `EXR.D.${currency}.EUR.SP00.A,D,${currency},EUR,SP00,A,${date},${value}`
  ));
  return new Response([header, ...lines].join("\r\n"), {
    status,
    headers: { "content-type": "text/csv; charset=utf-8" },
  });
}

function createUpstreamStub({ fxStatus = 200, dividendsStatus = 200, ecbStatus = 200, ecbRows } = {}) {
  const calls = [];
  const ecbFixture = defaultEcbRows();
  const fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers = input instanceof Request ? input.headers : new Headers(init?.headers);
    calls.push({
      url,
      headers,
      apiKey: headers.get("apikey"),
      next: init?.next ?? null,
      cf: init?.cf ?? null,
    });

    if (url.origin === ECB_ORIGIN) {
      if (decodeURIComponent(url.pathname) !== ECB_PATH) {
        throw new Error(`Unexpected ECB request: ${url.pathname}?${url.searchParams}`);
      }
      if (ecbStatus !== 200) {
        return new Response("private ECB upstream detail must remain private", {
          status: ecbStatus,
          headers: { "content-type": "text/plain" },
        });
      }
      return csvResponse(ecbRows ?? ecbFixture.rows);
    }

    if (url.origin !== FMP_ORIGIN) throw new Error(`Unexpected upstream origin: ${url.origin}`);

    const symbol = url.searchParams.get("symbol");
    if (url.pathname === "/stable/quote" && symbol === "USDKRW") {
      if (fxStatus !== 200) return jsonResponse({ error: "upstream FX detail must remain private" }, fxStatus);
      return jsonResponse([{
        price: 1_321.55,
        timestamp: Math.floor(Date.parse(`${dateBefore(1)}T00:00:00Z`) / 1000),
      }]);
    }
    if (url.pathname === "/stable/quote" && symbol === "XOM") {
      return jsonResponse([{
        price: 100,
        previousClose: 99,
        timestamp: Math.floor(Date.now() / 1000),
      }]);
    }
    if (url.pathname === "/stable/profile" && symbol === "XOM") {
      return jsonResponse([{ companyName: "Exxon Test", exchange: "NYSE" }]);
    }
    if (url.pathname === "/stable/historical-price-eod/full" && symbol === "XOM") {
      return jsonResponse([{
        date: dateBefore(1),
        open: 99,
        high: 101,
        low: 98,
        close: 100,
        volume: 1_000,
      }]);
    }
    if (url.pathname === "/stable/dividends" && symbol === "XOM") {
      if (dividendsStatus !== 200) {
        return jsonResponse({ error: "private plan identifier", plan: "upstream-premium-only" }, dividendsStatus);
      }
      return jsonResponse([{
        date: dateBefore(30),
        paymentDate: dateBefore(20),
        dividend: 1,
      }]);
    }

    throw new Error(`Unexpected FMP request: ${url.pathname}?${url.searchParams}`);
  };

  return { calls, fetch, ecbCommonDate: ecbFixture.commonDate };
}

async function loadWorker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("fmp-contract", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);
  }
  return workerPromise;
}

async function requestWithFmpStub(options) {
  const originalFetch = globalThis.fetch;
  const hadApiKey = Object.hasOwn(process.env, "FMP_API_KEY");
  const originalApiKey = process.env.FMP_API_KEY;
  const stub = createUpstreamStub(options);
  globalThis.fetch = stub.fetch;
  process.env.FMP_API_KEY = TEST_API_KEY;

  try {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request(`${ORIGIN}/api/stocks/XOM`, {
      headers: { accept: "application/json" },
    }), {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    }, { waitUntil() {}, passThroughOnException() {} });
    return {
      status: response.status,
      headers: new Headers(response.headers),
      text: await response.text(),
      calls: stub.calls,
      ecbCommonDate: stub.ecbCommonDate,
    };
  } finally {
    globalThis.fetch = originalFetch;
    if (hadApiKey) process.env.FMP_API_KEY = originalApiKey;
    else delete process.env.FMP_API_KEY;
  }
}

async function readTextTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const chunks = await Promise.all(entries.map(async (entry) => {
    const location = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return readTextTree(location);
    if (!/\.(?:css|html|js|json|map|mjs|ts|tsx)$/.test(entry.name)) return "";
    return readFile(location, "utf8");
  }));
  return chunks.flat(Infinity).join("\n");
}

async function configuredApiKeys() {
  const candidates = [process.env.FMP_API_KEY?.trim()];
  try {
    const localEnv = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    const assignment = localEnv.match(/^\s*FMP_API_KEY\s*=\s*(.*?)\s*$/m)?.[1] ?? "";
    const unquoted = assignment.replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
    candidates.push(unquoted);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return [...new Set(candidates.filter((value) => typeof value === "string" && value.length > 0))];
}

async function buildFilesContainingSecrets(directory, secretBuffers) {
  const entries = await readdir(directory, { withFileTypes: true });
  const matches = await Promise.all(entries.map(async (entry) => {
    const location = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return buildFilesContainingSecrets(location, secretBuffers);
    const contents = await readFile(location);
    return secretBuffers.some((secret) => contents.includes(secret))
      ? [fileURLToPath(location)]
      : [];
  }));
  return matches.flat(Infinity);
}

async function trackedFilesContainingSecrets(trackedFiles, secretBuffers) {
  const matches = await Promise.all(trackedFiles.map(async (relativePath) => {
    const contents = await readFile(resolve(PROJECT_ROOT, relativePath));
    return secretBuffers.some((secret) => contents.includes(secret)) ? [relativePath] : [];
  }));
  return matches.flat();
}

function suspiciousFxLiterals(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  function visit(node) {
    if (ts.isNumericLiteral(node)) {
      const value = Number(node.text.replaceAll("_", ""));
      if (value >= 500 && value <= 2_500) {
        let context = node.parent;
        for (let depth = 0; context && depth < 6; depth += 1, context = context.parent) {
          if (/(?:fxRate|usd.?krw|exchange.?rate)/i.test(context.getText(sourceFile))) {
            findings.push(`${fileName}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
            break;
          }
          if (ts.isStatement(context)) break;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

test("FMP FX remains preferred and the official dividend request has no unsupported limit parameter", async () => {
  const result = await requestWithFmpStub();
  assert.equal(result.status, 200);
  const dividendCall = result.calls.find((call) => call.url.pathname === "/stable/dividends");
  assert.ok(dividendCall, "the Stable dividends endpoint must be requested");
  assert.deepEqual([...dividendCall.url.searchParams.entries()], [["symbol", "XOM"]]);
  assert.equal(dividendCall.url.searchParams.has("limit"), false);
  const fmpCalls = result.calls.filter((call) => call.url.origin === FMP_ORIGIN);
  assert.ok(fmpCalls.every((call) => call.apiKey === TEST_API_KEY));
  assert.equal(result.calls.some((call) => call.url.origin === ECB_ORIGIN), false, "ECB must not be called when FMP FX works");
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));

  const body = JSON.parse(result.text);
  assert.equal(body.fxRate, 1_321.55);
  assert.equal(body.availability.fx.status, "available");
  assert.equal(body.availability.fx.message, null);
  assert.equal(body.availability.fx.source, "FMP Stable API");
  assert.equal(typeof body.availability.fx.asOf, "string");
});

test("FMP FX 402 falls back to the latest common-date ECB cross-rate without sending the API key", async () => {
  const result = await requestWithFmpStub({ fxStatus: 402 });
  assert.equal(result.status, 200);
  const body = JSON.parse(result.text);

  assert.equal(body.fxRate, 1_250, "USD/KRW must equal same-date KRW/EUR divided by USD/EUR");
  assert.equal(body.availability.fx.status, "available");
  assert.match(body.availability.fx.message, /유럽중앙은행|ECB/);
  assert.match(body.availability.fx.message, /실제 거래 환율/);
  assert.equal(body.availability.fx.source, "European Central Bank");
  assert.equal(body.availability.fx.asOf, result.ecbCommonDate);

  const fmpFxCall = result.calls.find((call) => (
    call.url.origin === FMP_ORIGIN
    && call.url.pathname === "/stable/quote"
    && call.url.searchParams.get("symbol") === "USDKRW"
  ));
  assert.ok(fmpFxCall, "FMP FX must be attempted first");
  assert.equal(fmpFxCall.apiKey, TEST_API_KEY);

  const ecbCalls = result.calls.filter((call) => call.url.origin === ECB_ORIGIN);
  assert.equal(ecbCalls.length, 1);
  const [ecbCall] = ecbCalls;
  assert.equal(decodeURIComponent(ecbCall.url.pathname), ECB_PATH);
  assert.equal(ecbCall.url.searchParams.get("format"), "csvdata");
  assert.equal(ecbCall.url.searchParams.get("detail"), "dataonly");
  assert.ok(Number(ecbCall.url.searchParams.get("lastNObservations")) >= 2, "multiple observations are needed to find a common date");
  assert.equal(ecbCall.apiKey, null);
  assert.equal(ecbCall.headers.get("authorization"), null);
  assert.equal(
    [...ecbCall.url.searchParams.keys()].some((key) => /api.?key|token|secret/i.test(key)),
    false,
  );
  assert.doesNotMatch(ecbCall.url.href, new RegExp(TEST_API_KEY));
  assert.deepEqual(ecbCall.next, { revalidate: 21_600 });
  assert.equal(ecbCall.cf?.cacheEverything, true);
  assert.equal(ecbCall.cf?.cacheTtl, 21_600);

  assert.doesNotMatch(result.text, /upstream FX detail must remain private/i);
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));
});

test("FMP and ECB FX failures remain non-fatal and preserve the manual fallback", async () => {
  const result = await requestWithFmpStub({ fxStatus: 402, ecbStatus: 503 });
  assert.equal(result.status, 200);
  const body = JSON.parse(result.text);

  assert.equal(body.fxRate, null);
  assert.equal(body.availability.fx.status, "unavailable");
  assert.equal(body.availability.fx.message, FX_UNAVAILABLE_MESSAGE);
  assert.equal(body.availability.fx.source, null);
  assert.equal(body.availability.fx.asOf, null);
  assert.equal(result.calls.filter((call) => call.url.origin === ECB_ORIGIN).length, 1);
  assert.doesNotMatch(result.text, /upstream FX detail|private ECB upstream detail/i);
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));
});

test("402 for a required dataset returns a distinct safe plan error", async () => {
  const result = await requestWithFmpStub({ dividendsStatus: 402 });
  assert.equal(result.status, 402);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(JSON.parse(result.text), {
    error: {
      code: "FMP_PLAN_RESTRICTED",
      message: "현재 FMP 요금제에서 제공하지 않는 데이터입니다.",
    },
  });
  assert.doesNotMatch(result.text, /private plan identifier|upstream-premium-only/i);
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));
});

test("nullable FX contract and deployable files contain neither a secret nor a fabricated FX rate", async () => {
  const [marketSource, fmpSource, componentSource, clientBuild] = await Promise.all([
    readFile(new URL("../lib/market-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/fmp.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/StockDividendApp.tsx", import.meta.url), "utf8"),
    readTextTree(new URL("../dist/client/", import.meta.url)),
  ]);

  assert.match(marketSource, /fxRate:\s*number\s*\|\s*null/);
  assert.match(marketSource, /status:\s*["']available["']\s*\|\s*["']plan-restricted["']\s*\|\s*["']unavailable["']/);
  assert.match(marketSource, /source:\s*["']FMP Stable API["']\s*\|\s*["']European Central Bank["']\s*\|\s*null/);
  assert.match(marketSource, /asOf:\s*string\s*\|\s*null/);
  assert.match(fmpSource, /response\.status\s*===\s*402[\s\S]{0,100}?FMP_PLAN_RESTRICTED/);
  assert.doesNotMatch(fmpSource, /\b(?:const|let|var)\s+apiKey\s*=\s*["'`][^"'`]+["'`]/);
  assert.doesNotMatch(clientBuild, /financialmodelingprep\.com\/stable/i);
  assert.doesNotMatch(clientBuild, /data-api\.ecb\.europa\.eu/i);

  const suspiciousRates = [
    ...suspiciousFxLiterals(fmpSource, "lib/fmp.ts"),
    ...suspiciousFxLiterals(marketSource, "lib/market-data.ts"),
    ...suspiciousFxLiterals(componentSource, "app/StockDividendApp.tsx"),
  ];
  assert.deepEqual(suspiciousRates, [], "source must not contain a plausible hard-coded USD/KRW fallback");

  const apiKeys = await configuredApiKeys();
  const secretBuffers = apiKeys.map((apiKey) => Buffer.from(apiKey));
  const buildLeaks = await buildFilesContainingSecrets(new URL("../dist/", import.meta.url), secretBuffers);
  assert.deepEqual(buildLeaks, [], "no file under dist may contain a configured FMP API key");

  const { stdout: trackedOutput } = await execFileAsync("git", ["ls-files", "-z"], { cwd: PROJECT_ROOT });
  const trackedFiles = trackedOutput.split("\0").filter(Boolean);
  assert.equal(trackedFiles.includes(".env.local"), false, ".env.local must never be tracked");
  await assert.doesNotReject(
    execFileAsync("git", ["check-ignore", "--quiet", "--no-index", "--", ".env.local"], { cwd: PROJECT_ROOT }),
    ".env.local must remain covered by gitignore",
  );
  const trackedLeaks = await trackedFilesContainingSecrets(trackedFiles, secretBuffers);
  assert.deepEqual(trackedLeaks, [], "tracked files must not contain a configured FMP API key");
});
