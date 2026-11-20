// Gate "content": run on every post change. Each post is valid and unique, is built, is listed for the assistant
// and readable by it, and every internal link in the built site resolves.
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { CONFIG, DIST, ROOT, frontmatter, walk } from "../lib/config.mjs";

const DIR = join(ROOT, CONFIG.content.posts);
const posts = readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => {
  const fm = frontmatter(readFileSync(join(DIR, f), "utf8"));
  return { file: f, id: f.replace(/\.md$/, ""), ...(fm || { data: null, body: "" }) };
});
const published = posts.filter((p) => p.data && !p.data.draft);
const siteContent = JSON.parse(readFileSync(join(DIST, "site-content.json"), "utf8"));

test("every post has valid frontmatter", () => {
  const problems = [];
  for (const p of posts) {
    if (!p.data) { problems.push(`${p.file}: no frontmatter`); continue; }
    const d = p.data;
    if (!d.title) problems.push(`${p.file}: no title`);
    if (!d.excerpt) problems.push(`${p.file}: no excerpt`);
    else if (d.excerpt.length > CONFIG.content.excerpt_max) problems.push(`${p.file}: excerpt over ${CONFIG.content.excerpt_max} characters`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) problems.push(`${p.file}: date must be YYYY-MM-DD`);
    if (!Number.isInteger(d.issue) || d.issue < 1) problems.push(`${p.file}: issue must be a positive integer`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) problems.push(`${p.file}: file name must be a lower-case slug`);
    if (p.body.trim().length < 200) problems.push(`${p.file}: body is under 200 characters`);
  }
  assert.deepEqual(problems, []);
});

test("issue numbers and titles are unique", () => {
  const dup = (key) => published.map((p) => p.data[key]).filter((v, i, a) => a.indexOf(v) !== i);
  assert.deepEqual(dup("issue"), [], "two posts share an issue number");
  assert.deepEqual(dup("title"), [], "two posts share a title");
});

test("issue order follows date order (when the delivery config requires it)", (t) => {
  const byIssue = [...published].sort((a, b) => a.data.issue - b.data.issue);
  const out = byIssue.filter((p, i) => i > 0 && String(p.data.date) < String(byIssue[i - 1].data.date)).map((p) => `#${p.data.issue} ${p.id}`);
  if (!CONFIG.content.require_issue_order_matches_date_order) {
    if (out.length) t.diagnostic(`WARNING issues dated earlier than the issue before them: ${out.join(", ")}`);
    return;
  }
  assert.deepEqual(out, []);
});

test("every published post is built, and no draft is", () => {
  for (const p of published) assert.ok(existsSync(join(DIST, "posts", p.id, "index.html")), `${p.id} is not built`);
  for (const p of posts.filter((x) => x.data?.draft)) assert.ok(!existsSync(join(DIST, "posts", p.id)), `draft ${p.id} was built`);
});

test("the assistant lists exactly the published posts, with their text", () => {
  assert.deepEqual(siteContent.posts.map((p) => p.id).sort(), published.map((p) => p.id).sort());
  for (const p of siteContent.posts) {
    assert.ok(p.text.length >= 200, `${p.id}: the assistant gets almost no text`);
    assert.equal(p.url, new URL(`/posts/${p.id}/`, CONFIG.site.url).href);
  }
});

test("the home page lists every published post", () => {
  const home = readFileSync(join(DIST, "index.html"), "utf8");
  for (const p of published) assert.match(home, new RegExp(`href="/posts/${p.id}/?"`), `the home page does not link ${p.id}`);
});

test("every internal link in the built site resolves", () => {
  const files = new Set(walk(DIST));
  const broken = [];
  for (const page of [...files].filter((f) => f.endsWith(".html"))) {
    const html = readFileSync(join(DIST, page), "utf8");
    for (const [, href] of html.matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) {
      const path = href.replace(/^\//, "");
      const ok = files.has(path) || files.has(join(path, "index.html")) || files.has(path.replace(/\/$/, "") + "/index.html") || path === "";
      if (!ok) broken.push(`${page} -> ${href}`);
    }
  }
  assert.deepEqual([...new Set(broken)], []);
});
