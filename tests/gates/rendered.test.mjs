// Gate "rendered": the built site in headless Chromium, served the way the host serves it, at each viewport of the
// delivery config. The assistant boots, the page never scrolls sideways, a real read works through the live engine,
// and screenshots go to reports/screenshots/ for the one human review. Set SITE_URL to check a deployed site instead.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { CONFIG, DIST, REPORTS, ROOT } from "../lib/config.mjs";
import { serve } from "../lib/serve.mjs";

const run = promisify(execFile);
const CHECK = join(ROOT, "capabilities/experience/site-assistant/tests/live/site_check.mjs");
const SHOTS = join(REPORTS, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const server = process.env.SITE_URL ? null : await serve(DIST);
const url = process.env.SITE_URL || server.url;
const label = process.env.SITE_URL ? "live" : "build";

for (const [width, height] of CONFIG.viewports) {
  test(`${label} at ${width}x${height}: boots, no sideways scroll, a real read`, { timeout: 90000 }, async (t) => {
    let out;
    try {
      ({ stdout: out } = await run("node", [CHECK, url, join(SHOTS, `${label}-${width}`), String(width), String(height)], { timeout: 80000 }));
    } catch (e) { out = e.stdout; if (!out) throw e; }
    const { report, read, logs } = JSON.parse(out);
    t.diagnostic(JSON.stringify({ report, read }));
    assert.ok(report.booted, `the assistant did not boot: ${logs.join(" | ")}`);
    assert.ok(report.scrollWidth <= report.innerWidth, `the page scrolls sideways: ${report.overflowing.join(", ")}`);
    assert.equal(read?.status, "succeeded", "a search_posts read through the live engine failed");
    assert.ok(report.chips > 0, "no suggestion chips");
    assert.deepEqual(logs.filter((l) => l.startsWith("exception")), [], "the page threw");
  });
}

test.after(() => server?.close());
