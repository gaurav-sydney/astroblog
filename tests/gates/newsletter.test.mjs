// Gate "newsletter": the n8n workflow files answer their fixtures on the Brevo twin. The twin, the adapter and the
// capability reference live in FRACTEDGE-platform, so this runs only where a checkout of it exists
// (FRACTEDGE_PLATFORM, default ~/fractedge) and pytest with the factory's Python environment is on PATH.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ROOT } from "../lib/config.mjs";

const platform = process.env.FRACTEDGE_PLATFORM || join(homedir(), "fractedge");
const ready = existsSync(join(platform, "factory/twins/brevo.py"));

test("the Brevo n8n workflows answer their fixtures on the twin", { skip: ready ? false : "needs a FRACTEDGE-platform checkout (FRACTEDGE_PLATFORM)", timeout: 120000 }, () => {
  const r = spawnSync("python", ["-m", "pytest", "-q", "capabilities/communications/newsletter/tests"],
    { cwd: ROOT, env: { ...process.env, FRACTEDGE_PLATFORM: platform }, encoding: "utf8" });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`.slice(-2000));
});
