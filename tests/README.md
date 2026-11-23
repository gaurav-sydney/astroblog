# Verification

`tests/run.mjs` is the single entry point. It reads the change types and gates from `deploy/delivery.json`, works out the type of change from the changed files, and runs the matching gates. The baseline gates always run.

```bash
node tests/run.mjs --changed origin/main                 # what CI runs on a PR (base = the target branch)
node tests/run.mjs --type content                    # a content update
node tests/run.mjs --type brand                      # a brand refresh
node tests/run.mjs --type feature                    # a new feature
node tests/run.mjs --all                             # everything
```

It writes `reports/summary.md` and puts screenshots in `reports/screenshots/`. It exits 1 if any gate fails.

## What runs for each change type

| Change type | Paths that trigger it | Gates (on top of hygiene, dist and contract) |
| --- | --- | --- |
| content | `src/content/` | content, rendered |
| brand | `src/styles/`, `src/layouts/`, `NodeMotif`, `favicon.svg`, `capabilities/content/blog/design/` | brand, rendered |
| seo | `capabilities/experience/seo/`, `Seo.astro`, `src/lib/seo.ts`, `rss.xml.js`, `robots.txt`, `public/og/` | seo, content |
| feature | `src/pages/`, `src/components/`, `public/`, `capabilities/experience/`, the Astro config and packages | content, seo, brand, rendered, chat |
| newsletter | `capabilities/communications/` | newsletter |
| pipeline | `tests/`, `deploy/`, `.github/` | pipeline, content, seo, brand, rendered, chat |

Changes under `dist/` alone set no type: dist/ is checked by the `dist` gate.

## The gates

| Gate | File | Checks | Would have caught |
| --- | --- | --- | --- |
| hygiene | `gates/hygiene.test.mjs` | No key, token, hosting account id or personal email in any tracked file. The repo is public. | Upload keys or an account id slipping into a commit |
| dist | `gates/dist.test.mjs` | The committed `dist/` is exactly what the source builds, and it carries the `.mjs` and no-cache host rules. | A deploy that differs from the PR; the text/plain `.mjs` that stopped the assistant from booting |
| contract | `../capabilities/experience/site-assistant/tests/` | The network, manifest and tools through the real runtime, with a scripted model | A tool that stops being confirmed, or that can invent a post |
| pipeline | `gates/pipeline.test.mjs` | The change-type routing (AC-M1) is pinned; every workflow parses; the workflow triggers on `main` only, deploys a push only with `AUTO_DEPLOY`, and can roll back and drill | A staged workflow GitHub would reject; a routing change that runs too few gates |
| content | `gates/content.test.mjs` | Frontmatter is valid; issues and titles are unique; every post is built, linked from the home page and given to the assistant; no drafts are built; internal links resolve | A new post the assistant can't see; a broken link |
| seo | `../capabilities/experience/seo/tests/seo.test.mjs` | robots.txt and the sitemap list exactly home, About and the published posts; the RSS lists the posts newest first; each post has BlogPosting JSON-LD, an `og:image` present in the build and a large Twitter card; a fixture build with an extra post and a draft stays coherent | A post missing from the sitemap or feed; a broken share card; a draft leaking into the feed |
| brand | `gates/brand.test.mjs` | CSS tokens equal `capabilities/content/blog/design/brand.json`; the three fonts load; the chat uses only declared colours; contrast pairs pass | A refresh that misses a token, or that drops contrast |
| rendered | `gates/rendered.test.mjs` | Headless Chromium at every viewport: the assistant boots, no sideways scroll, a real read, screenshots. Set `SITE_URL` to check a live site. | The hero clipped at 390 px; settings missing |
| chat | `gates/chat.test.mjs` | A full chat turn against `mock_provider.mjs` in ok, error and empty modes. The visitor always sees something. | **The FE-122 silent chat:** proven 20 Nov, the gate fails on the unpatched runtime |
| newsletter | `gates/newsletter.test.mjs` | The n8n workflow files on the Brevo twin. It needs a FRACTEDGE-platform checkout, and is skipped without one (as in CI). | A workflow that drifts from the capability's reference |
| live | `../deploy/verify_live.mjs` | After deploy: headers, live files equal the release, and the rendered gate against the live URL | A CDN serving the old release; a deploy that didn't land |

**Warnings** are reported in the summary but don't fail a gate. Two exist today:
- **Content:** the issue order doesn't follow the date order (#2).
- **Brand:** the `teal-ink` link colour is 4.40 against the 4.5 minimum.

Both need a decision from Gaurav. Turn the first into a failure with `content.require_issue_order_matches_date_order: true`, and the second by removing its `waiver` in `brand.json`.

## Local setup

```bash
npm ci
npx -y playwright@1.55.0 install chromium-headless-shell   # add --with-deps where you have root
```

Without root, see `capabilities/experience/site-assistant/tests/live/README.md` for the missing-library workaround (`LD_LIBRARY_PATH`).
