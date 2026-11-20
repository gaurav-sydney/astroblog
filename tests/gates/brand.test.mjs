// Gate "brand": run on every brand refresh. The CSS tokens match the brand file, the brand's fonts load, the chat
// uses the tokens rather than its own colours, and the brand's colour pairs pass contrast (WCAG 2.x ratios).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ROOT } from "../lib/config.mjs";

const brand = JSON.parse(readFileSync(join(ROOT, "capabilities/content/blog/design/brand.json"), "utf8"));
const css = readFileSync(join(ROOT, "src/styles/global.css"), "utf8");
const assistantCss = readFileSync(join(ROOT, "src/styles/assistant.css"), "utf8");
const layout = readFileSync(join(ROOT, "src/layouts/Base.astro"), "utf8");

function luminance(hex) {
  const [r, g, b] = hex.replace("#", "").match(/../g).map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test("the CSS colour tokens equal the brand file", () => {
  const wrong = [];
  for (const [name, hex] of Object.entries(brand.colors)) {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    if (!m) wrong.push(`--${name} is missing`);
    else if (m[1].toUpperCase() !== hex.toUpperCase()) wrong.push(`--${name} is ${m[1]}, the brand says ${hex}`);
  }
  assert.deepEqual(wrong, []);
});

test("the font tokens and the font stylesheet carry the brand's three families", () => {
  for (const [role, family] of Object.entries(brand.fonts)) {
    assert.match(css, new RegExp(`--${role}:\\s*'${family}'`), `--${role} is not '${family}'`);
    assert.ok(layout.includes(`family=${family.replace(/ /g, "+")}`), `${family} is not loaded in Base.astro`);
  }
});

test("the chat styles use only declared brand colours", () => {
  const hexes = [...new Set(assistantCss.match(/#[0-9A-Fa-f]{6}\b/g) || [])];
  const known = [...Object.values(brand.colors), ...Object.keys(brand.supporting || {})].map((c) => c.toUpperCase());
  const offBrand = hexes.filter((h) => !known.includes(h.toUpperCase()));
  assert.deepEqual(offBrand, [], "assistant.css has colours the brand does not declare: use var(--token) or add it to brand.json supporting");
  assert.ok(/var\(--(teal|charcoal|paper)/.test(assistantCss), "assistant.css does not use the brand tokens");
});

test("the brand's colour pairs pass contrast", (t) => {
  const failing = [];
  for (const pair of brand.contrast) {
    const r = ratio(brand.colors[pair.fg], brand.colors[pair.bg]);
    t.diagnostic(`${pair.fg} on ${pair.bg} (${pair.use}): ${r.toFixed(2)} (min ${pair.min})`);
    if (r < pair.min && pair.waiver) t.diagnostic(`WARNING waived: ${pair.fg} on ${pair.bg} ${r.toFixed(2)} < ${pair.min}: ${pair.waiver}`);
    else if (r < pair.min) failing.push(`${pair.fg} on ${pair.bg} for ${pair.use}: ${r.toFixed(2)} < ${pair.min}`);
  }
  assert.deepEqual(failing, []);
});
