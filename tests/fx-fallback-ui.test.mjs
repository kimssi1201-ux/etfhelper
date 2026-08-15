import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentSource = await readFile(
  new URL("../app/StockDividendApp.tsx", import.meta.url),
  "utf8",
);

test("KRW investment controls guide users to the manual FX input instead of disabling", () => {
  assert.match(componentSource, /const manualFxInputRef = useRef<HTMLInputElement>\(null\)/);
  assert.match(componentSource, /function focusManualFxRate\(\)[\s\S]*?manualFxInputRef\.current\?\.focus/);
  assert.match(componentSource, /manualFxInputRef\.current\?\.scrollIntoView/);

  const presetControls = componentSource.match(/investmentPresets\.map\([\s\S]*?<\/button>\)\}/)?.[0];
  assert.ok(presetControls, "investment preset controls must be rendered");
  assert.match(presetControls, /onClick=\{\(\) => applyInvestment\(preset\)\}/);
  assert.doesNotMatch(presetControls, /disabled=\{!hasFxRate\}/);

  const applyButton = componentSource.match(/<button[^>]*onClick=\{\(\) => applyInvestment\(investmentKrw\)\}[^>]*>/)?.[0];
  assert.ok(applyButton, "custom investment apply button must be rendered");
  assert.match(applyButton, /disabled=\{priceUsd <= 0\}/);
  assert.doesNotMatch(applyButton, /disabled=\{[^}]*!hasFxRate/);
});

test("manual FX input lives in the investment section and immediately recalculates", () => {
  const noticeStart = componentSource.indexOf('id="fx-plan-notice"');
  const investmentStart = componentSource.indexOf('<SectionHeading eyebrow="01" title="투자금과 보유 수량"');
  const presetStart = componentSource.indexOf("investmentPresets.map", investmentStart);
  assert.ok(noticeStart >= 0 && investmentStart > noticeStart && presetStart > investmentStart);

  const noticeSource = componentSource.slice(noticeStart, investmentStart);
  assert.doesNotMatch(noticeSource, /ref=\{manualFxInputRef\}/, "the FX notice must not duplicate the manual input");
  assert.match(noticeSource, /onClick=\{focusManualFxRate\}/);

  const investmentSource = componentSource.slice(investmentStart, presetStart);
  assert.match(investmentSource, /USD\/KRW 환율 직접 입력/);
  assert.match(investmentSource, /ref=\{manualFxInputRef\}/);
  assert.match(investmentSource, /aria-describedby="manual-fx-help manual-fx-status"/);
  assert.match(investmentSource, /aria-live="polite"/);

  const updateFx = componentSource.match(/function updateManualFxRate\(value: number\)[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(updateFx, "manual FX update handler must exist");
  assert.match(updateFx, /setCurrency\("KRW"\)/);
  assert.match(updateFx, /setShares\(calculateAffordableShares\(investmentKrw, nextRate, priceUsd\)\)/);
  assert.doesNotMatch(updateFx, /shares <= 0/);
});
