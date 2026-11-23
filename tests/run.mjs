#!/usr/bin/env node
// One entry point for verification. It picks the gates for a change from deploy/delivery.json and runs them.
//   node tests/run.mjs --changed <base-ref>     gates for the files changed since base (a PR, or before a deploy)
//   node tests/run.mjs --type content,brand     gates for named change types
//   node tests/run.mjs --gates rendered,chat    exactly these gates
//   node tests/run.mjs --all                    every gate
// The baseline gates (hygiene, dist, contract) always run. It writes reports/summary.md and exits 1 if any gate fails.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG, REPORTS, ROOT } from "./lib/config.mjs";

const GATE_FILES = {
  hygiene: ["tests/gates/hygiene.test.mjs"],
  dist: ["tests/gates/dist.test.mjs"],
  contract: ["capabilities/experience/site-assistant/tests/agentified.test.mjs"],
  content: ["tests/gates/content.test.mjs"],
  brand: ["tests/gates/brand.test.mjs"],
  rendered: ["tests/gates/rendered.test.mjs"],
  chat: ["tests/gates/chat.test.mjs"],
  newsletter: ["tests/gates/newsletter.test.mjs"],
};
// dist rebuilds dist/, so it runs before every gate that reads dist/.
const ORDER = ["hygiene", "dist", "contract", "content", "brand", "rendered", "chat", "newsletter"];

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
let types = [], gates = new Set(CONFIG.baseline_gates), changed = [];

if (args.includes("--all")) Object.keys(GATE_FILES).forEach((g) => gates.add(g));
if (opt("--gates")) gates = new Set(opt("--gates").split(","));
if (opt("--type")) types = opt("--type").split(",");
if (opt("--changed")) {
  changed = execFileSync("git", ["diff", "--name-only", `${opt("--changed")}...HEAD`], { cwd: ROOT }).toString().split("\n").filter(Boolean);
  const src = changed.filter((f) => !f.startsWith(`${CONFIG.build.out}/`));
  types = CONFIG.change_types.filter((ct) => src.some((f) => ct.paths.some((p) => f.startsWith(p)))).map((ct) => ct.type);
}
for (const t of types) {
  const ct = CONFIG.change_types.find((c) => c.type === t);
  if (!ct) { console.error(`unknown change type ${t}`); process.exit(2); }
  ct.gates.forEach((g) => gates.add(g));
}

const plan = ORDER.filter((g) => gates.has(g));
console.log(`change types: ${types.join(", ") || "(none detected: baseline only)"}`);
console.log(`gates: ${plan.join(" → ")}\n`);
const results = [];
for (const gate of plan) {
  const started = Date.now();
  const r = spawnSync("node", ["--test", "--test-reporter=spec", ...GATE_FILES[gate]], { cwd: ROOT, env: process.env, encoding: "utf8" });
  const out = `${r.stdout}${r.stderr}`;
  const warnings = [...out.matchAll(/WARNING[^\n]*/g)].map((m) => m[0]);
  const onlySkipped = /ℹ skipped [1-9]/.test(out) && /ℹ pass 0\b/.test(out);
  const status = r.status !== 0 ? "FAILED" : onlySkipped ? "skipped" : "passed";
  results.push({ gate, status, seconds: Math.round((Date.now() - started) / 1000), warnings, why: CONFIG.gates[gate] });
  console.log(`${status === "FAILED" ? "✗" : status === "skipped" ? "–" : "✓"} ${gate} (${results.at(-1).seconds}s) ${CONFIG.gates[gate]}`);
  for (const w of warnings) console.log(`    ${w}`);
  if (status === "FAILED") console.log(out.split("\n").filter((l) => /✖|not ok|Error|error:|expected|actual|^\s+[+-] /.test(l)).slice(0, 40).map((l) => "    " + l).join("\n"));
}

mkdirSync(REPORTS, { recursive: true });
const md = [`# Verification: ${results.every((r) => r.status !== "FAILED") ? "passed" : "FAILED"}`, "",
  `Change types: ${types.join(", ") || "baseline only"}${changed.length ? ` (${changed.length} files changed)` : ""}`, "",
  "| Gate | Result | Time | Checks |", "| --- | --- | --- | --- |",
  ...results.map((r) => `| ${r.gate} | ${r.status} | ${r.seconds}s | ${r.why} |`), "",
  ...(results.some((r) => r.warnings.length) ? ["**Warnings**", "", ...results.flatMap((r) => r.warnings.map((w) => `- ${r.gate}: ${w.replace(/^WARNING\s*/, "")}`)), ""] : []),
  "Screenshots, when the rendered gate ran: `reports/screenshots/`."].join("\n");
writeFileSync(join(REPORTS, "summary.md"), md + "\n");
process.exit(results.some((r) => r.status === "FAILED") ? 1 : 0);
