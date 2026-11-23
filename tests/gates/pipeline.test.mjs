// Gate "pipeline": the delivery pipeline itself. It pins the change-type routing (AC-M1) and the shape of the GitHub
// workflow: the trigger, the go-live guard, the rollback paths and the drill. It reads files only; no network.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT } from "../lib/config.mjs";
import { planFor, typesFor } from "../lib/plan.mjs";

const plan = (files) => planFor(typesFor(files));
const LIVE_WF = join(ROOT, ".github/workflows/deliver.yml");
const STAGED_WF = join(ROOT, "deploy/ci/deliver.yml");
// Until the push token has the Workflows permission (FE-130), the workflow waits, staged, in deploy/ci/.
const WF = existsSync(LIVE_WF) ? LIVE_WF : STAGED_WF;

test("AC-M1: a content-only change runs the baseline, content and rendered gates, and nothing else", () => {
  assert.deepEqual(plan(["src/content/posts/new-post.md"]), ["hygiene", "dist", "contract", "content", "rendered"]);
});

test("routing for the other change types", () => {
  assert.deepEqual(plan(["dist/index.html"]), ["hygiene", "dist", "contract"], "dist/ alone is the baseline only");
  assert.deepEqual(plan(["src/styles/global.css"]), ["hygiene", "dist", "contract", "brand", "rendered"]);
  assert.deepEqual(plan(["capabilities/communications/newsletter/capability.yaml"]), ["hygiene", "dist", "contract", "newsletter"]);
  const pipeline = plan(["deploy/deploy.mjs"]);
  for (const g of ["pipeline", "content", "brand", "rendered", "chat"]) assert.ok(pipeline.includes(g), `pipeline changes run ${g}`);
  assert.ok(!pipeline.includes("newsletter"), "newsletter runs nightly, not on PRs (OQ-3)");
});

test("the workflow is live at .github/workflows and no staged copy remains", (t) => {
  if (!existsSync(LIVE_WF) && existsSync(STAGED_WF)) return t.skip("staged in deploy/ci/: awaiting the Workflows permission (FE-130)");
  assert.ok(existsSync(LIVE_WF), ".github/workflows/deliver.yml exists");
  assert.ok(!existsSync(STAGED_WF), "deploy/ci/deliver.yml was moved, not copied");
});

// Ratchet (FE-129 M1): the staged workflow had `with: { name: x-${{ github.sha }} }`, which is not valid YAML, so GitHub
// would have rejected the whole file. Every workflow must parse, and keep its jobs and dispatch inputs.
test("every workflow parses as YAML", () => {
  const dirs = [".github/workflows", "deploy/ci"].filter((d) => existsSync(join(ROOT, d)));
  for (const f of dirs.flatMap((d) => readdirSync(join(ROOT, d)).filter((n) => /\.ya?ml$/.test(n)).map((n) => join(d, n)))) {
    const doc = parse(readFileSync(join(ROOT, f), "utf8"));
    assert.ok(doc && doc.jobs && doc.on, `${f}: has on and jobs`);
  }
  const wf = parse(readFileSync(WF, "utf8"));
  assert.deepEqual(Object.keys(wf.jobs), ["verify", "deploy"]);
  assert.deepEqual(Object.keys(wf.on.workflow_dispatch.inputs), ["ref", "rollback_ref", "drill"]);
  assert.deepEqual(wf.on.push.branches, ["main"]);
});

test("the workflow deploys from main only, behind the go-live guard, and can roll back and drill", () => {
  const wf = readFileSync(WF, "utf8");
  assert.match(wf, /push:\s*\n\s*branches: \[main\]\n/, "push trigger is main only");
  assert.doesNotMatch(wf, /claude\/blog-launch/, "no trigger on the old branch");
  assert.match(wf, /vars\.AUTO_DEPLOY == 'true'/, "a push deploys only when AUTO_DEPLOY is true");
  for (const input of ["ref:", "rollback_ref:", "drill:"]) assert.ok(wf.includes(`      ${input}`), `dispatch input ${input}`);
  assert.match(wf, /github\.event\.before/, "push rollback restores the previous push");
  assert.match(wf, /inputs\.rollback_ref/, "manual rollback restores rollback_ref");
  assert.match(wf, /verify_live\.mjs[^\n]*--drill/, "the drill reaches verify_live");
});

test("verify_live --drill fails on purpose without touching the network", () => {
  const r = spawnSync("node", ["deploy/verify_live.mjs", "--drill", "--tries", "1"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 1, "the drill exits 1");
  assert.match(r.stderr, /drill: live check failed on purpose/);
});
