#!/usr/bin/env node
// npm run build: the Astro build with the public build values from deploy/delivery.json (the environment overrides
// them), so a plain build always produces the release, never a site with the subscribe form missing.
import { spawnSync } from "node:child_process";
import { CONFIG, ROOT } from "../tests/lib/config.mjs";

const missing = CONFIG.build.required_env.filter((name) => !process.env[name]);
if (missing.length) { console.error(`missing build values: ${missing.join(", ")} (set them in deploy/delivery.json build.env)`); process.exit(2); }
const r = spawnSync("npx", ["astro", "build", ...process.argv.slice(2)], { cwd: ROOT, stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
