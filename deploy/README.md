# Deploy

The site is deployed by script through the Hostinger API. No MCP connector, no zip binary and no build step are on the deploy path. The release artifact is the committed `dist/`: what a PR shows is what goes live, and a rollback redeploys an earlier commit's `dist/`.

| File | What it does |
| --- | --- |
| `delivery.json` | The single config: site, hosting, public build values, viewports, change types and gates |
| `deploy.mjs` | Zips `dist/` (at `--ref` or the working tree), gets an upload URL, uploads with TUS, deploys the archive and purges the cache. `--dry-run` builds the archive only. |
| `verify_live.mjs` | The live gate: headers, live files equal the release, and the rendered check against the live site. It retries while the CDN catches up. |
| `lib/zip.mjs` | A deterministic zip writer (the same `dist/` always gives the same archive) |
| `../.github/workflows/deliver.yml` | The pipeline: verify on PRs; on `main`, verify, and (after go-live) deploy, verify live and roll back automatically. A manual run deploys any ref, with an optional rollback target and a rollback drill. |

## Pipeline

```
PR ──► verify (change-type gates + baseline, screenshots) ──► review ──► merge
merge to main ──► verify ──► [AUTO_DEPLOY=true] deploy dist@sha ──► verify live ──┬─► done
                                                                                   └─► fail: deploy dist@previous, verify live, job fails
manual run (ref, rollback_ref, drill) ──► deploy dist@ref ──► verify live (drill: fail on purpose) ──► fail: deploy rollback_ref
```

Only one deploy runs at a time (`concurrency: deploy-production`). Every run uploads `reports/` as an artifact: the summary, screenshots, `deploy.json` (commit, archive hash) and `live.json`.

## Founder setup (once)

The full go-live, settings and drill, is in [docs/runbooks/CI-CD-GO-LIVE.md](../docs/runbooks/CI-CD-GO-LIVE.md).

1. **Hostinger API token:** hPanel → Account → API → create a token.
2. **Repo secrets:** GitHub → astroblog → Settings → Secrets and variables → Actions → New repository secret:
   - `HOSTINGER_API_TOKEN`: the token.
   - `HOSTINGER_USERNAME`: the hosting account id of automationworker.io (the `u…` id).
3. **Environment (optional):** Settings → Environments → `production`. Add yourself as a required reviewer if you want to approve each deploy.

Until both secrets exist, the deploy job is skipped with a notice. Verification still runs on every PR and push.

## By hand (from a machine with the secrets in its environment)

```bash
read -rsp "Hostinger token: " HOSTINGER_API_TOKEN; export HOSTINGER_API_TOKEN; echo
export HOSTINGER_USERNAME=<account id>
node tests/run.mjs --all                        # verify
node deploy/deploy.mjs --ref HEAD               # deploy the committed dist/
node deploy/verify_live.mjs --ref HEAD          # verify live
node deploy/deploy.mjs --ref <previous-commit>  # roll back
```

**Proof state, 20 Nov 2026:**
- **Proven locally:** the archive (a round-trip identical to `dist/`), the dry run, `verify_live.mjs` against the live site, and every gate.
- **Not yet run:** the API path in `deploy.mjs` (upload URL, deploy, cache clear), because no API token exists yet. The first pipeline deploy proves it. The endpoints are from Hostinger's API SDK docs and match the connector operations used on 19 Nov.
