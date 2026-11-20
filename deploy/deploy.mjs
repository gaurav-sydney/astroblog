#!/usr/bin/env node
// Deploy dist/ to Hostinger static hosting through the Hostinger API. No MCP connector, no zip binary.
//   HOSTINGER_API_TOKEN=… HOSTINGER_USERNAME=… node deploy/deploy.mjs [--ref <git-ref>] [--dry-run]
// --ref deploys dist/ as committed at that ref (rollback: the previous release). Default: the working dist/.
// Steps: zip → upload URL → TUS create + upload → deploy archive → purge cache. Writes reports/deploy.json.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG, DIST, REPORTS, ROOT, walk } from "../tests/lib/config.mjs";
import { zipDir } from "./lib/zip.mjs";

const args = process.argv.slice(2);
const ref = args.includes("--ref") ? args[args.indexOf("--ref") + 1] : null;
const dryRun = args.includes("--dry-run");
const { domain } = CONFIG.site;
const { api, archive } = CONFIG.hosting;
const token = process.env.HOSTINGER_API_TOKEN;
const username = process.env.HOSTINGER_USERNAME;
if (!dryRun && (!token || !username)) { console.error("set HOSTINGER_API_TOKEN and HOSTINGER_USERNAME (never in a file in this repo)"); process.exit(2); }

// 1. The release: dist/ now, or dist/ at a ref.
let dir = DIST, scratch = null;
if (ref) {
  scratch = mkdtempSync(join(tmpdir(), "release-"));
  execFileSync("sh", ["-c", `git archive "${ref}" ${CONFIG.build.out} | tar -x -C "${scratch}"`], { cwd: ROOT });
  dir = join(scratch, CONFIG.build.out);
}
const files = walk(dir);
if (!files.includes("index.html") || !files.includes(".htaccess")) throw new Error(`${dir} is not a site build (no index.html or .htaccess)`);
const zip = zipDir(dir, files);
const commit = execFileSync("git", ["rev-parse", ref || "HEAD"], { cwd: ROOT }).toString().trim();
const release = { domain, commit, ref: ref || "HEAD", files: files.length, bytes: zip.length,
  sha256: createHash("sha256").update(zip).digest("hex"), at: new Date().toISOString() };
console.log(`release ${commit.slice(0, 8)}: ${files.length} files, ${zip.length} bytes`);

async function call(method, path, body) {
  const res = await fetch(`${api}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (res.status === 409 && res.headers.get("retry-after")) {
    const wait = Number(res.headers.get("retry-after")) * 1000; console.log(`  busy, retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait)); return call(method, path, body);
  }
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

if (dryRun) { console.log("dry run: nothing uploaded"); console.log(JSON.stringify(release, null, 1)); process.exit(0); }
try {
  // 2. A short-lived upload URL and its keys. They stay in memory and are never printed.
  const up = await call("POST", "/api/hosting/v1/files/upload-urls", { username, domain });
  const target = `${up.url.replace(/\/$/, "")}/${archive}?override=true`;
  const tus = { "X-Auth": up.auth_key, "X-Auth-Rest": up.rest_auth_key, "Tus-Resumable": "1.0.0" };
  // 3. TUS: create, then send the bytes.
  const created = await fetch(target, { method: "POST", headers: { ...tus, "Upload-Length": String(zip.length), "Upload-Offset": "0" } });
  if (created.status !== 201) throw new Error(`TUS create: HTTP ${created.status}`);
  const sent = await fetch(target, { method: "PATCH", headers: { ...tus, "Content-Type": "application/offset+octet-stream", "Upload-Offset": "0" }, body: zip });
  if (sent.status !== 204 || Number(sent.headers.get("upload-offset")) !== zip.length) throw new Error(`TUS upload: HTTP ${sent.status}, offset ${sent.headers.get("upload-offset")} of ${zip.length}`);
  console.log("  uploaded");
  // 4. Deploy the archive (replaces the whole site), 5. purge the server and CDN cache.
  await call("POST", `/api/hosting/v1/accounts/${username}/websites/${domain}/deploy`, { archive_path: archive });
  console.log("  deployed");
  await call("DELETE", `/api/hosting/v1/accounts/${username}/websites/${domain}/cache/clear`);
  console.log("  cache cleared");
  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(REPORTS, "deploy.json"), JSON.stringify(release, null, 1) + "\n");
} finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); }
