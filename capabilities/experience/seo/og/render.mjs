#!/usr/bin/env node
// Render the default share card (card.html) to public/og/default.png at 1200x630, with the same headless Chromium the
// gates use. Run it when the card or the brand changes, then rebuild and commit dist/ as usual. It is not on the build
// path: the PNG is committed, so a build needs no browser.
//   node capabilities/experience/seo/og/render.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch, sleep } from "../../site-assistant/tests/live/cdp.mjs";

const card = fileURLToPath(new URL("card.html", import.meta.url));
const out = fileURLToPath(new URL("../../../../public/og/default.png", import.meta.url));
const b = await launch({ width: 1200, height: 630 });
try {
  await b.send("Page.navigate", { url: pathToFileURL(card).href });
  for (let i = 0; i < 50 && !(await b.evaluate("document.readyState === 'complete' && document.fonts.status === 'loaded'")); i++) await sleep(200);
  const fonts = await b.evaluate("[...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).join(', ')");
  const shot = await b.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(`wrote ${out} (fonts loaded: ${fonts || "none, fallback used"})`);
} finally { await b.close(); }
