# SEO capability (FE-129 M2)

Makes automationworker.io discoverable and share-ready, and keeps that coherent with the posts.

| Piece | File | Notes |
| --- | --- | --- |
| Head metadata | `src/components/Seo.astro` (rendered by `src/layouts/Base.astro`) | canonical, Open Graph, Twitter `summary_large_image`, RSS alternate, `noindex` for `/404` and `/subscribed/` |
| Structured data | `src/lib/seo.ts` | JSON-LD `@graph`: Organization and WebSite on every page, BlogPosting on posts |
| Sitemap | `@astrojs/sitemap` in `astro.config.mjs` | `sitemap-index.xml` and `sitemap-0.xml`; `.htaccess` 301-redirects `/sitemap.xml` to the index |
| RSS | `src/pages/rss.xml.js` (`@astrojs/rss`) | published posts, newest first |
| robots.txt | `public/robots.txt` | allow all; names the sitemap index |
| Share card | `og/card.html`, rendered to `public/og/default.png` by `og/render.mjs` | 1200×630, brand colours and fonts. A post can set `image: /og/<name>.png` in its frontmatter. |
| Gate | `tests/seo.test.mjs` | `node tests/run.mjs --type seo` |

**When to re-render the card.** Re-render it when its text or the brand changes:

```bash
node capabilities/experience/seo/og/render.mjs   # needs the headless Chromium the gates use
npm run build                                    # then commit public/og/ and dist/
```

**What the gate checks** (`seo` change type; also runs for `feature`, `pipeline` and `--all`):
- **Discovery:** robots.txt names the sitemap index. The sitemap holds exactly the home page, About and the published posts. The RSS feed lists exactly the published posts, newest first.
- **Each post:** one BlogPosting (headline, date, url, author, publisher, image); `og:type` article; `og:image` absolute and present in the build; a Twitter large card.
- **Indexable pages:** Organization JSON-LD, a canonical and the RSS link, and none of them is `noindex`.
- **Fixture build (AC-M2):** a copy of the site with one extra post and one extra draft. The post appears everywhere, and the draft appears nowhere.

A content-only change (a new post) doesn't run this gate (AC-M1). It stays correct by construction, because the build generates everything from the posts collection and the `dist` gate refuses a stale `dist/`.
