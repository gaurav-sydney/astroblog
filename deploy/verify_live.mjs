#!/usr/bin/env node
// Gate "live": after a deploy, the live site is the release. It retries for a while, because a deploy and a cache
// purge take a little time to show.
//   node deploy/verify_live.mjs [--ref <git-ref>] [--tries 10]
// 1. Headers: .mjs and .js as JavaScript, no-cache on the stable-name files.
// 2. The live files equal dist/ at the ref (every HTML page, the assistant's files, site-content.json).
// 3. The rendered gate against the live URL (SITE_URL), at every viewport.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG, REPORTS, ROOT } from "../tests/lib/config.mjs";

const args = process.argv.slice(2);
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : "HEAD";
const tries = Number(args.includes("--tries") ? args[args.indexOf("--tries") + 1] : 10);
const base = CONFIG.site.url;
const out = CONFIG.build.out;
const sha = (b) => createHash("sha256").update(b).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tracked = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, `${out}/`], { cwd: ROOT }).toString().split("\n").filter(Boolean)
  .map((f) => f.slice(out.length + 1));
const compare = tracked.filter((f) => /\.(html|js|mjs|json|hocon)$/.test(f) && !f.startsWith("runtime/") || f === "runtime/langchain-runner.mjs");
const urlFor = (f) => new URL(f.replace(/(^|\/)index\.html$/, "$1"), base).href;

async function check() {
  const problems = [];
  for (const [file, type] of [["runtime/langchain-runner.mjs", /javascript/], ["site.js", /javascript/]]) {
    const r = await fetch(urlFor(file), { method: "HEAD", cache: "no-store" });
    if (!type.test(r.headers.get("content-type") || "")) problems.push(`${file}: content-type ${r.headers.get("content-type")}`);
    if (!/no-cache/.test(r.headers.get("cache-control") || "")) problems.push(`${file}: cache-control ${r.headers.get("cache-control")}`);
  }
  for (const f of compare) {
    const want = sha(execFileSync("git", ["show", `${ref}:${out}/${f}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    const r = await fetch(urlFor(f) + `?v=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) { problems.push(`${f}: HTTP ${r.status}`); continue; }
    if (sha(Buffer.from(await r.arrayBuffer())) !== want) problems.push(`${f}: live content differs from the release`);
  }
  return problems;
}

let problems = [];
for (let i = 1; i <= tries; i++) {
  problems = await check();
  console.log(`try ${i}: ${problems.length ? `${problems.length} differences` : "the live files equal the release"}`);
  if (!problems.length) break;
  await sleep(15000);
}
let rendered = { status: null };
if (!problems.length) {
  rendered = spawnSync("node", ["--test", "tests/gates/rendered.test.mjs"], { cwd: ROOT, env: { ...process.env, SITE_URL: base }, encoding: "utf8" });
  if (rendered.status !== 0) problems.push(`rendered check against the live site failed:\n${(rendered.stdout + rendered.stderr).split("\n").filter((l) => /not ok|error/.test(l)).join("\n")}`);
}
mkdirSync(REPORTS, { recursive: true });
writeFileSync(join(REPORTS, "live.json"), JSON.stringify({ ref, base, compared: compare.length, problems, at: new Date().toISOString() }, null, 1) + "\n");
if (problems.length) { console.error(problems.slice(0, 30).join("\n")); process.exit(1); }
console.log(`live: ${compare.length} files match the release; rendered check passed`);
