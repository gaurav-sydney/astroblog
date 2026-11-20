// Rendered check of the agentified site: boot, overflow, chips, one real read through the live engine, screenshots.
//   node site_check.mjs <url> [out-prefix] [width=1280] [height=900]     (width <= 480 emulates a phone)
// Exit code 1 when the assistant did not boot, the read failed, or the page scrolls sideways.
import { writeFile } from "node:fs/promises";
import { launch, sleep } from "./cdp.mjs";

const [, , url, out, width = "1280", height = "900"] = process.argv;
if (!url) { console.error("usage: node site_check.mjs <url> [out-prefix] [width] [height]"); process.exit(2); }
const b = await launch({ width: +width, height: +height, mobile: +width <= 480 });
await b.send("Page.navigate", { url }); await sleep(4000);
const report = await b.evaluate(`(() => ({
  innerWidth, scrollWidth: document.documentElement.scrollWidth,
  overflowing: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + '.' + e.className).slice(0, 8),
  booted: Boolean(window.__nsweb?.engine),
  status: document.querySelector('#assistant-status')?.textContent,
  chips: document.querySelectorAll('.assistant-chips button').length,
}))()`);
const read = await b.evaluate(`(async () => { if (!window.__nsweb) return null; const { engine } = window.__nsweb;
  const scope = { base: engine.top.base, network: engine.top.network.name };
  const e = engine.actions.catalog(scope).find((x) => x.name === 'search_posts' && x.effect === 'read');
  const r = await engine.actions.execute(engine.actions.prepare({ kind: 'action', action: e.ref, arguments: { query: 'back office agents' } }), Boolean, 'site-check');
  return { status: r[0].status, top: r[0].result.results[0]?.title }; })()`);
if (out) {
  const shot = async (name) => writeFile(`${out}-${name}.png`, Buffer.from((await b.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
  await shot("top"); await b.evaluate("document.querySelector('#assistant')?.scrollIntoView()"); await sleep(500); await shot("assistant");
}
console.log(JSON.stringify({ report, read, logs: b.logs.slice(0, 12) }, null, 1));
await b.close();
process.exit(report?.booted && read?.status === "succeeded" && report.scrollWidth <= report.innerWidth ? 0 : 1);
