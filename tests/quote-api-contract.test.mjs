import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadCalculations() {
  const source = await readFile(new URL("../lib/calculations.ts", import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

test("calculates safe percentage changes", async () => {
  const { calculatePercentChange } = await loadCalculations();
  assert.equal(calculatePercentChange(110, 100), 10);
  assert.equal(calculatePercentChange(90, 100), -10);
  assert.equal(calculatePercentChange(100, 0), null);
  assert.equal(calculatePercentChange(Number.NaN, 100), null);
});

test("quote API exposes only data-backed market metrics", async () => {
  const route = await readFile(new URL("../app/api/etf/quote/route.ts", import.meta.url), "utf8");
  assert.match(route, /priceHistory: history\.map/);
  assert.match(route, /previousClose/);
  assert.match(route, /dayChangePercent/);
  assert.match(route, /fiftyTwoWeekLow/);
  assert.match(route, /fiftyTwoWeekHigh/);
  assert.match(route, /ytdBaseline/);
  assert.doesNotMatch(route, /expenseRatio|averageVolume/);
});
