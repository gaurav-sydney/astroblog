# End-to-end review: from requirements to a live agentic blog (FE-122, FE-128, DP-033), 19 Nov 2026

**Path taken:**
1. **Requirements:** the launch handoff, DP-033 (a typed proposal), FE-122 (Linear, scope B) and FE-128 (content).
2. **Build:** in this repo, using the upstream `agentify-website` skill.
3. **Tests:** 10 contract tests against a scripted model.
4. **Deploy:** through the Hostinger connector.
5. **Fixes after going live:** the `.mjs` MIME type, the hero at 390 px, settings that couldn't be found, the "Safari" silence, the restyle and the CDN cache.

That is about six rounds after deploy, most of them found by the founder's screenshots.

## What worked

- **Typed spec before code (DP-033).** The adapter, twin, thin flows and bundle came from one validated file, and were tested on the twin before anything live.
- **Contract tests from the upstream skill.** They were cheap, they caught real issues, and they keep keys and emails out of public files.
- **Founder actions as separate Linear issues (FE-123 to FE-128).** Blockers stayed visible, and work went on around them.
- **Safety by design.** The one irreversible action (subscribe) is confirmed in a dialog and posts the page's own Brevo form, so the page and the chat share one set of rules.
- **Root-cause discipline.** The "Safari" bug was reproduced in Chromium with a mock provider. The real cause was OpenRouter's error inside an HTTP 200 stream.
- **Live read-back** at 1280 and 390 px before "done".

## What needs to improve

| # | Problem | Evidence | Where the fix goes |
| --- | --- | --- | --- |
| 1 | "Done" meant the tests passed, not that it worked on the host. The stubbed tests passed while the live assistant never booted. This repeats the V9 lesson of 6 Nov. | `.mjs` served as text/plain; the 7-day CDN cache | A live gate in INCREMENT-PATH; `tests/live/site_check.mjs` |
| 2 | The host, access and environment weren't known before the build started. | The hosting account found mid-flight (FE-123), push denied, a password reset | A readiness step in the spec, checked by script |
| 3 | There were no UX acceptance criteria, so the founder was the visual QA. | Three or more screenshot rounds (hero, gutter, settings, style) | Viewports, brand and a screenshot review in the spec |
| 4 | Visitors bring their own key, but nothing tested the providers. One provider's error caused a silent failure. | OpenRouter free Gemma | `tests/live/mock_provider.mjs` modes in the local gate |
| 5 | The deploy breaks "scripts only". Every deploy, and the n8n workflows, went through connectors, and no script followed. | Three deploys | `factory site deploy` and `check` |
| 6 | The test tools were ephemeral, kept in the session scratchpad. | `cdp_*.mjs`, `mock_*.mjs` | Fixed: now in `tests/live/` |
| 7 | The live site isn't on a merged branch. It was deployed from `feat/fe-122-agentify` while PR #1 was open, and another session deployed in parallel. | PR #1 | Deploy only from a merged branch, with a deploy lock |
| 8 | The upstream runtime has drifted: two LOCAL PATCHes are unreported. | `runtime/llm.js`, `ui.js` | An upstream issue; a check that flags local patches |
| 9 | Short-lived upload keys went on curl command lines. | The TUS upload | Fixed in the runbook (mode-600 file) |
| 10 | A red base branch blocks every commit, which pushes toward per-increment `--no-verify` exceptions. | The runbook commit in FRACTEDGE-platform | Keep `claude-factory` green, or exempt docs-only commits |
| 11 | No checkpoint was taken, and learnings stayed in memory files. | No CP for FE-122 | A CP file plus INCREMENT-PATH rules |
| 12 | The work was split across two repos and partly unpushed. The DP-033 bundle existed only on the VPS. | `factory/dp-033-brevo-newsletter` | Fixed: this repo is now the business bundle (20 Nov) |

## Target process: one smooth path

The rule: judgement ends in a typed file, scripts do everything after it, and each stage has a gate that is checked by script.

0. **Intake: one typed spec** (for example `site-agentify.yaml`).
   - It covers the domain, host account, repo and branch policy, content source, tools (read or confirmed), the providers to support, viewports and brand.
   - A readiness script checks all access: a git push dry-run, the host API, the form URL.
   - The founder does every action in one batch up front.
1. **Generate:** scaffold from the pinned skill, driven by the spec.
2. **Local gate**, run by one command:
   - the build and the contract tests;
   - the provider matrix (`mock_provider.mjs` in ok, error and empty modes);
   - `site_check.mjs` at 390 and 1280 px against a local server that sends the host's headers;
   - a screenshot pack.
3. **One review:** the founder approves the screenshots before deploy.
4. **Merge, then deploy by script:** `factory site deploy` (zip, TUS, deploy, purge), from the merged branch only, with a lock.
5. **Live gate:**
   - `factory site check` reads back the MIME type, cache headers, post count and boot at both widths.
   - The founder's own-key check is the only manual step.
6. **Close:** a checkpoint, the runbook updated, learnings routed, and upstream patches reported.

**Order of work to get there:**
1. A design proposal for the spec schema, with FE-122 as the worked example.
2. ~~Move the scratchpad tools into the repo.~~ Done on 20 Nov.
3. `factory site deploy` and `check` on the Hostinger API. This needs a founder token.
4. The gates in INCREMENT-PATH.
5. Replay the path from the spec on a second static site. That run becomes the checkpoint.
