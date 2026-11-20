// Shared paths and the delivery config for the gates, the deploy and the live check.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const CONFIG = JSON.parse(readFileSync(join(ROOT, "deploy/delivery.json"), "utf8"));
export const DIST = join(ROOT, CONFIG.build.out);
// Public build values from the config, unless the environment sets them. Child processes inherit them.
for (const [name, value] of Object.entries(CONFIG.build.env || {})) if (!process.env[name]) process.env[name] = value;
export const REPORTS = join(ROOT, "reports");

/** Every file under dir, as paths relative to dir, sorted. */
export function walk(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out.sort();
}

/** The frontmatter of a Markdown file as a flat object (strings, numbers, booleans, [lists]). */
export function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else if (v === "true" || v === "false") v = v === "true";
    else if (/^-?\d+$/.test(v)) v = Number(v);
    data[kv[1]] = v;
  }
  return { data, body: text.slice(m[0].length) };
}
