// Gate "dist": dist/ is committed as the release artifact: it is what goes live, and what a rollback redeploys.
// This gate rebuilds dist/ from the source and requires git to see no change in it, so what a PR shows is exactly
// what is deployed. Fix a failure with:  npm run build  and commit dist/.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { CONFIG, DIST, ROOT, walk } from "../lib/config.mjs";

const git = (...args) => execFileSync("git", args, { cwd: ROOT }).toString();

test("the build environment is set", () => {
  const missing = CONFIG.build.required_env.filter((name) => !process.env[name]);
  assert.deepEqual(missing, [], `set ${missing.join(", ")} (the Brevo form URL is public: the live page's form action)`);
});

test("the committed dist/ is exactly what the source builds", { timeout: 180000 }, () => {
  assert.ok(existsSync(DIST), "dist/ is missing: run npm run build and commit it");
  assert.ok(git("ls-files", "--", CONFIG.build.out).trim(), "dist/ is not tracked by git: commit it (it is the release artifact)");
  execFileSync("npm", ["run", "build", "--silent"], { cwd: ROOT, stdio: "pipe", env: process.env });
  const changed = git("status", "--porcelain", "--untracked-files=all", "--", CONFIG.build.out).trim();
  assert.equal(changed, "", `the build changed dist/ (commit the rebuilt dist/):\n${changed.split("\n").slice(0, 20).join("\n")}`);
});

test("dist/ carries the host rules the assistant needs", () => {
  const htaccess = readFileSync(join(DIST, ".htaccess"), "utf8");
  assert.match(htaccess, /AddType text\/javascript \.js \.mjs/, ".mjs must be served as JavaScript or the assistant never boots");
  assert.match(htaccess, /Cache-Control "no-cache"/, "stable-name files must revalidate or the CDN hides deploys");
  assert.ok(!walk(DIST).some((f) => f.endsWith(".map")), "no source maps in a public deploy");
});
