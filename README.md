# Automation Worker (automationworker.io)

Gaurav's own publication, and everything that runs it: the blog, its in-page assistant and its newsletter binding.
This repo uses the FRACTEDGE-platform delivery layout. Its root is `delivery/automation-worker/`: `business.yaml`
names the domains, each domain lists its capabilities, and each capability is a bundle
(`capabilities/<domain>/<capability>/`) with its manifest, features, integrations, tests and evidence. The Astro app
stays at the root, because Astro needs `src/` and `public/` there; bundles point to its files.

## Map

| Path | What it holds | State |
| --- | --- | --- |
| `business.yaml` | The business manifest (domains: communications, content, experience) | |
| `capabilities/content/blog/` | The blog product: launch and posts features, Hostinger integration, live evidence | Live |
| `capabilities/experience/site-assistant/` | The agentic-web assistant (FE-122): feature, runtime map, contract tests, live checks, evidence | Live; FE-125 open |
| `capabilities/communications/newsletter/` | The newsletter binding (DP-033): the live Brevo form, and the n8n subscribe and broadcast workflows with contracts, fixtures and tests | Form live; n8n deployed inactive |
| `docs/` | The runbook, the launch handoff, DP-033 and the end-to-end review ([docs/README.md](docs/README.md)) | |
| `src/`, `public/` | The Astro site and the assistant files it serves | |
| `dist/` | **The release artifact**, committed. It's what is live, and what a rollback redeploys. The `dist` gate keeps it equal to the source. | Equals live |
| `tests/` | Verification: `node tests/run.mjs` picks gates by change type (content, brand, feature, newsletter, pipeline) ([tests/README.md](tests/README.md)) | |
| `deploy/` | Delivery config, the Hostinger API deploy, live verification, rollback ([deploy/README.md](deploy/README.md)) | API deploy awaits a token |
| `.github/workflows/deliver.yml` (staged at `deploy/ci/deliver.yml` until FE-130's Workflows permission) | CD: verify PRs; on `main` verify, deploy, verify live, auto-rollback ([go-live runbook](docs/runbooks/CI-CD-GO-LIVE.md)) | Deploys only after go-live (`AUTO_DEPLOY`) and with the secrets set |

Factory code (the newsletter capability, the Brevo adapter and twin, the Windmill flows) stays in FRACTEDGE-platform.
`capabilities/communications/newsletter/tests/` runs against a checkout of it:
`FRACTEDGE_PLATFORM=~/fractedge pytest capabilities/communications/newsletter/tests`.

## Delivering a change

1. Branch, change the source, then `npm run build` and commit `dist/` with it.
2. `node tests/run.mjs --changed origin/main` locally. CI runs the same on the PR into `main`.
3. Review the PR's screenshots artifact, then merge. The pipeline deploys, verifies live and rolls back on failure.

## Site

Astro static site. Palette charcoal `#15171C` / off-white `#F5F3EE` / teal `#10B5A6` / orange `#EA6B2E`;
Space Grotesk + Inter + JetBrains Mono; connected-node motif (`src/components/NodeMotif.astro`).

    npm ci
    npm run build      # → dist/ (public build values come from deploy/delivery.json)

- Posts: `src/content/posts/*.md` (frontmatter: title, excerpt, date, issue, tags, draft).
- Subscribe: Brevo's native form (double opt-in, list 2, redirect `/subscribed`), posted as plain HTML so it works
  with no script. Without `PUBLIC_BREVO_FORM_ACTION` (set in `deploy/delivery.json`) the form falls back to a mailto link.
- Deploy: [`docs/runbooks/AGENTIFY-STATIC-SITE.md`](docs/runbooks/AGENTIFY-STATIC-SITE.md) (zip `dist/`, including `.htaccess`, upload, deploy, purge, check live).
- Broadcast-on-publish (DP-033) is not wired yet and stays off until enabled.

## On-page assistant (open agentic website, FE-122)

The home page carries an assistant built with the `agentify-website` skill of
[cognizant-ai-labs/agentic-web](https://github.com/cognizant-ai-labs/agentic-web) (runtime copied from `5cf01ae`).
It runs in the visitor's browser on **their own LLM key** (default hosted Otari, `alibaba/qwen3.8-flash`; OpenRouter
sign-in and other providers in **⚙ AI model settings**). The assistant sends the visitor's messages, and the posts it
reads, to the provider the visitor picks. Nothing runs on our server: the site stays static.

- Network URL: `https://automationworker.io/automation_worker_assistant` (one agent, `automation_worker_guide`).
- Tools: `website_list_posts`, `website_read_post`, `website_search_posts` (read, from `/site-content.json`, built
  from the `posts` collection) and `website_subscribe` (irreversible: a confirmation dialog first, then the same
  Brevo form the page uses, posted into a hidden frame; Brevo runs double opt-in). Without
  `PUBLIC_BREVO_FORM_ACTION` the action refuses and points to the contact address, like the form.
- Other agent sites that call this network get no site tools; their assistant points to this site's page.
- Files the skill adds under `public/`: `runtime/` (unchanged copy), `page.js` (page object shared by the form and the
  assistant), `site-actions.js`, `site.js`, `automation_worker_assistant.hocon` (source) →
  `automation_worker_assistant.network.json`, `agent-manifest.json`, `links.json`, `agent-mcp.json`, `.well-known/`,
  `bridge/`. `.htaccess` adds CORS on the public agent files and the sandbox worker's CSP. Plus
  `src/pages/site-content.json.ts`, `src/styles/assistant.css` and the mount section in `src/pages/index.astro`.
- Rebuild the network after editing the `.hocon` or the manifest (never edit generated files), then test:

      node <agentic-web>/skills/agentify-website/scripts/build_network.mjs public/automation_worker_assistant.hocon --manifest public/agent-manifest.json
      npm run build && node --test "capabilities/experience/site-assistant/tests/*.test.mjs"

- Try it locally: `node <agentic-web>/skills/agentify-website/scripts/serve_site.mjs dist --port 8080`, open
  http://127.0.0.1:8080/, add a low-limit key, and afterwards **Delete setup** and close the tab.

### Local runtime patch (FE-122, 19 Nov 2026)

`public/runtime/` is the skill's runtime with **two marked local patches** (search for `LOCAL PATCH`); report them
upstream to cognizant-ai-labs/agentic-web and drop them when the runtime fixes it:

- `llm.js`: an `error` object inside a streamed (HTTP 200) response, as OpenRouter sends for free-model rate limits,
  now fails the call with the provider's message. Before, it was ignored and the turn ended with nothing on screen.
- `ui.js`: a turn that ends with no text and no presentation now says so instead of showing nothing.
