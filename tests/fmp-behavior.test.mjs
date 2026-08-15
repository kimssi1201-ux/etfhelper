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
const TEST_API_KEY = "test-only-fmp-secret-never-bundle";
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const execFileAsync = promisify(execFile);
const FX_PLAN_MESSAGE = "현재 FMP 요금제에서는 USD/KRW 환율을 제공하지 않습니다. 원화 계산에는 직접 입력한 환율이 필요합니다.";
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

function createFmpStub({ fxStatus = 200, dividendsStatus = 200 } = {}) {
  const calls = [];
  const fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers = input instanceof Request ? input.headers : new Headers(init?.headers);
    calls.push({ url, apiKey: headers.get("apikey") });

    if (url.origin !== FMP_ORIGIN) throw new Error(`Unexpected upstream origin: ${url.origin}`);

    const symbol = url.searchParams.get("symbol");
    if (url.pathname === "/stable/quote" && symbol === "USDKRW") {
      if (fxStatus !== 200) return jsonResponse({ error: "upstream FX detail must remain private" }, fxStatus);
      return jsonResponse([{ price: 1_321.55 }]);
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

  return { calls, fetch };
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
  const stub = createFmpStub(options);
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

test("official dividend request has no unsupported limit parameter", async () => {
  const result = await requestWithFmpStub();
  assert.equal(result.status, 200);
  const dividendCall = result.calls.find((call) => call.url.pathname === "/stable/dividends");
  assert.ok(dividendCall, "the Stable dividends endpoint must be requested");
  assert.deepEqual([...dividendCall.url.searchParams.entries()], [["symbol", "XOM"]]);
  assert.equal(dividendCall.url.searchParams.has("limit"), false);
  assert.ok(result.calls.every((call) => call.apiKey === TEST_API_KEY));
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));

  const body = JSON.parse(result.text);
  assert.equal(body.fxRate, 1_321.55);
  assert.deepEqual(body.availability.fx, { status: "available", message: null });
});

test("FX-only 402 remains a successful payload with an honest null and warning", async () => {
  const result = await requestWithFmpStub({ fxStatus: 402 });
  assert.equal(result.status, 200);
  const body = JSON.parse(result.text);

  assert.equal(body.fxRate, null);
  assert.deepEqual(body.availability.fx, {
    status: "plan-restricted",
    message: FX_PLAN_MESSAGE,
  });
  assert.doesNotMatch(result.text, /upstream FX detail must remain private/i);
  assert.doesNotMatch(result.text, new RegExp(TEST_API_KEY));
});

test("generic FX failure is non-fatal and never replaced by an invented rate", async () => {
  const result = await requestWithFmpStub({ fxStatus: 503 });
  assert.equal(result.status, 200);
  const body = JSON.parse(result.text);

  assert.equal(body.fxRate, null);
  assert.deepEqual(body.availability.fx, {
    status: "unavailable",
    message: FX_UNAVAILABLE_MESSAGE,
  });
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
  const [marketSource, fmpSource, componentSource, clientBuild, serverBuild] = await Promise.all([
    readFile(new URL("../lib/market-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/fmp.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/StockDividendApp.tsx", import.meta.url), "utf8"),
    readTextTree(new URL("../dist/client/", import.meta.url)),
    readTextTree(new URL("../dist/server/", import.meta.url)),
  ]);

  assert.match(marketSource, /fxRate:\s*number\s*\|\s*null/);
  assert.match(marketSource, /status:\s*["']available["']\s*\|\s*["']plan-restricted["']\s*\|\s*["']unavailable["']/);
  assert.match(fmpSource, /response\.status\s*===\s*402[\s\S]{0,100}?FMP_PLAN_RESTRICTED/);
  assert.doesNotMatch(fmpSource, /\b(?:const|let|var)\s+apiKey\s*=\s*["'`][^"'`]+["'`]/);
  assert.doesNotMatch(clientBuild, /financialmodelingprep\.com\/stable/i);

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
