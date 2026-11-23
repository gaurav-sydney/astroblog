// Gate "seo" (FE-129 M2): the built site is discoverable and share-ready, and its SEO output stays coherent with the
// posts. It asserts on dist/, plus one fixture build that adds a post and a draft (AC-M2). No network.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CONFIG, DIST, ROOT, frontmatter } from "../../../../tests/lib/config.mjs";
import { planFor, typesFor } from "../../../../tests/lib/plan.mjs";

const SITE = CONFIG.site.url.replace(/\/$/, "");
const POSTS_DIR = join(ROOT, CONFIG.content.posts);

/** The non-draft posts of a content folder: [{ id, title, date }], newest first. */
function published(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".md"))
    .map((f) => ({ id: f.replace(/\.md$/, ""), ...frontmatter(readFileSync(join(dir, f), "utf8")).data }))
    .filter((p) => p.draft !== true)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}
const read = (out, f) => readFileSync(join(out, f), "utf8");
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const meta = (html, key) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${key.replace(":", "\\:")}"[^>]*content="([^"]*)"`)) ||
    html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]*(?:property|name)="${key.replace(":", "\\:")}"`));
  return m ? m[1] : null;
};
const jsonld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((m) => { const d = JSON.parse(m[1]); return Array.isArray(d) ? d : d["@graph"] || [d]; });
const canonical = (html) => (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
const postUrl = (id) => `${SITE}/posts/${id}/`;

/** Every check on one build output, against the posts it was built from. Returns nothing; asserts. */
function checkOutput(out, posts) {
  // robots.txt
  const robots = read(out, "robots.txt");
  assert.match(robots, /User-agent: \*/);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m, "robots.txt does not block the site");
  assert.ok(robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`), "robots.txt names the sitemap index");

  // sitemap: exactly home, about and the published posts
  assert.ok(locs(read(out, "sitemap-index.xml")).includes(`${SITE}/sitemap-0.xml`), "the index points at sitemap-0.xml");
  const urls = locs(read(out, "sitemap-0.xml")).sort();
  assert.deepEqual(urls, [`${SITE}/`, `${SITE}/about/`, ...posts.map((p) => postUrl(p.id))].sort(), "sitemap = home, about and the non-draft posts");

  // RSS: exactly the published posts, newest first
  const rss = read(out, "rss.xml");
  assert.match(rss, /<rss[^>]+version="2\.0"/);
  const links = [...rss.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  assert.deepEqual(links, posts.map((p) => postUrl(p.id)), "rss items = the non-draft posts, newest first");

  // every post page
  for (const p of posts) {
    const html = read(out, `posts/${p.id}/index.html`);
    const url = postUrl(p.id);
    assert.equal(canonical(html), url, `${p.id}: canonical`);
    const bp = jsonld(html).filter((d) => d["@type"] === "BlogPosting");
    assert.equal(bp.length, 1, `${p.id}: one BlogPosting`);
    assert.equal(bp[0].headline, p.title, `${p.id}: headline`);
    assert.equal(bp[0].datePublished.slice(0, 10), new Date(p.date).toISOString().slice(0, 10), `${p.id}: datePublished`);
    assert.equal(bp[0].url, url, `${p.id}: url`);
    assert.ok(bp[0].author?.name && bp[0].publisher?.name, `${p.id}: author and publisher`);
    assert.ok(bp[0].image, `${p.id}: BlogPosting image`);
    assert.equal(meta(html, "og:type"), "article", `${p.id}: og:type`);
    for (const k of ["og:title", "og:description", "og:url", "og:image", "twitter:title", "twitter:image"]) assert.ok(meta(html, k), `${p.id}: ${k}`);
    assert.equal(meta(html, "twitter:card"), "summary_large_image", `${p.id}: twitter:card`);
    const img = meta(html, "og:image");
    assert.ok(img.startsWith(`${SITE}/`), `${p.id}: og:image is absolute on the site`);
    assert.ok(existsSync(join(out, new URL(img).pathname)), `${p.id}: og:image file ${new URL(img).pathname} is in the build`);
  }

  // indexable pages carry the site-wide data; non-content pages say noindex
  for (const f of ["index.html", "about/index.html", ...posts.map((p) => `posts/${p.id}/index.html`)]) {
    const html = read(out, f);
    assert.ok(jsonld(html).some((d) => d["@type"] === "Organization"), `${f}: Organization JSON-LD`);
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]+href="[^"]*\/rss\.xml"/, `${f}: RSS alternate link`);
    assert.ok(canonical(html), `${f}: canonical`);
    assert.doesNotMatch(html, /name="robots" content="noindex/, `${f}: indexable`);
  }
  for (const f of ["subscribed/index.html", "404.html"]) assert.match(read(out, f), /<meta name="robots" content="noindex/, `${f}: noindex`);
}

test("the built dist/ is discoverable, share-ready and coherent with the posts", () => {
  checkOutput(DIST, published(POSTS_DIR));
});

test("AC-M2: adding a post (and a draft) regenerates the sitemap, RSS and JSON-LD to the non-draft set", () => {
  const tmp = mkdtempSync(join(tmpdir(), "seo-fixture-"));
  try {
    for (const f of ["src", "public", "astro.config.mjs", "package.json", "tsconfig.json"]) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(tmp, f), { recursive: true });
    symlinkSync(join(ROOT, "node_modules"), join(tmp, "node_modules"), "dir");
    const posts = join(tmp, CONFIG.content.posts);
    writeFileSync(join(posts, "zz-seo-fixture.md"), `---\ntitle: "SEO fixture post"\nexcerpt: "A post added by the seo gate's fixture."\ndate: 2099-01-01\nissue: 9001\ntags: [fixture]\n---\n\nFixture body.\n`);
    writeFileSync(join(posts, "zz-seo-draft.md"), `---\ntitle: "SEO fixture draft"\nexcerpt: "A draft that must not be listed."\ndate: 2099-01-02\nissue: 9002\ndraft: true\n---\n\nDraft body.\n`);
    execFileSync("npx", ["astro", "build", "--silent"], { cwd: tmp, env: process.env, stdio: "pipe", timeout: 180000 });
    const out = join(tmp, "dist");
    const pub = published(posts);
    assert.ok(pub.some((p) => p.id === "zz-seo-fixture") && !pub.some((p) => p.id === "zz-seo-draft"));
    checkOutput(out, pub);
    assert.ok(!existsSync(join(out, "posts/zz-seo-draft/index.html")), "the draft is not built");
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test("the seo change type routes to the seo gate", () => {
  const ct = CONFIG.change_types.find((c) => c.type === "seo");
  assert.ok(ct, "delivery.json has an seo change type");
  assert.ok(planFor(typesFor(["capabilities/experience/seo/capability.yaml"])).includes("seo"));
  assert.ok(planFor(typesFor(["src/components/Seo.astro"])).includes("seo"));
});
