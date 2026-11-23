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
import { planFor, typesFor } from "./lib/plan.mjs";

const GATE_FILES = {
  hygiene: ["tests/gates/hygiene.test.mjs"],
  dist: ["tests/gates/dist.test.mjs"],
  contract: ["capabilities/experience/site-assistant/tests/agentified.test.mjs"],
  pipeline: ["tests/gates/pipeline.test.mjs"],
  content: ["tests/gates/content.test.mjs"],
  seo: ["capabilities/experience/seo/tests/seo.test.mjs"],
  brand: ["tests/gates/brand.test.mjs"],
  rendered: ["tests/gates/rendered.test.mjs"],
  chat: ["tests/gates/chat.test.mjs"],
  newsletter: ["tests/gates/newsletter.test.mjs"],
};
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
let types = opt("--type") ? opt("--type").split(",") : [], changed = [];
if (opt("--changed")) {
  changed = execFileSync("git", ["diff", "--name-only", `${opt("--changed")}...HEAD`], { cwd: ROOT }).toString().split("\n").filter(Boolean);
  types = typesFor(changed);
}
let plan;
try { plan = opt("--gates") ? opt("--gates").split(",") : planFor(types, { all: args.includes("--all") }); }
catch (e) { console.error(e.message); process.exit(2); }
const unknown = plan.filter((g) => !GATE_FILES[g]);
if (unknown.length) { console.error(`unknown gate ${unknown.join(", ")}`); process.exit(2); }

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
