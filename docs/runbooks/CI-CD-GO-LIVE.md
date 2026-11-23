# CI/CD go-live on `main`

**One-time.** It turns on auto-deploy for automationworker.io. Work package: FE-129 M1. Gaurav's settings: FE-130.
**The order matters.** The Hostinger API deploy has never run (no token existed before), so the first deploys are manual runs you watch. Auto-deploy on push comes last.

## 1. Settings (Gaurav, FE-130)

Never paste these values into a chat.

1. **Actions secrets:** github.com/gaurav-sydney/astroblog → Settings → Secrets and variables → Actions → New repository secret:
   - `HOSTINGER_API_TOKEN`: the token from hPanel → Account → API.
   - `HOSTINGER_USERNAME`: the hosting account id of automationworker.io (the `u…` id). It's a secret so it never shows in a log of this public repo.
2. **Workflows permission:** if the push token Claude Code uses (`astro-deploy`) lacks it, add "Workflows: Read and write" to it. Or install the Claude GitHub App (FE-129 SUB-B).
3. **Default branch:** Settings → General → Default branch → `main`.
4. **Branch protection:** Settings → Branches → Add rule → `main`:
   - Require a pull request before merging.
   - Require the status check `verify` to pass.
5. **Optional:** Settings → Environments → `production` → add yourself as a required reviewer, to approve each deploy.

Leave the repo variable `AUTO_DEPLOY` unset for now. Until it is `true`, a push to `main` only verifies.

## 2. First go-live (manual run)

1. **Note the current live release.** Run this from a checkout of `main`:

   ```bash
   node deploy/verify_live.mjs --ref origin/main --tries 1
   ```

   It should print `live: N files match the release`. Then `origin/main`'s commit is the live release: call it `LIVE`. If it doesn't match, find the commit that does before going on.
2. **Run the deploy.** Actions → deliver → Run workflow, with `ref` = `main`, `rollback_ref` = `LIVE` and `drill` unticked.
3. **Pass:** the deploy job is green, and its summary shows `deploy.json` (commit, archive hash) and `live.json` with no problems. Because the commit is the same, live before and after are identical (D-2).
4. **If it fails:** the job rolls back to `LIVE` and verifies it. Read the `Release` step's log: it names which API call failed (upload URL, TUS upload, deploy or cache purge). Fix the deploy script on a branch and PR it. Don't retry blindly.

## 3. Rollback drill (manual run)

1. Run workflow with `ref` = `main`, `rollback_ref` = `LIVE` and `drill` ticked.
2. **Expected:**
   - `Verify live` fails with `drill: live check failed on purpose`.
   - `Roll back to the previous release` deploys `LIVE` and its live check passes.
   - The job ends red, which is correct for a drill.
3. Then run `node deploy/verify_live.mjs --ref LIVE --tries 1` locally. It should match.

## 4. Turn on auto-deploy

Settings → Secrets and variables → Actions → Variables → New repository variable: `AUTO_DEPLOY` = `true`.

From then on, a merge to `main` runs: verify → deploy → verify live → roll back to the previous push on failure.

## 5. Proof of AC-M1 (the first content change after go-live)

1. Open a PR into `main` that changes one file under `src/content/posts/`, with the rebuilt `dist/` committed.
2. The `verify` summary should show change type `content` and the gates hygiene, dist, contract, content and rendered: not brand, not chat.
3. Merge it. The push run deploys and the live check passes.
4. Record the run URLs in FE-129.

## Undo

- **Stop auto-deploy:** delete `AUTO_DEPLOY`, or set it to anything else.
- **Restore any release:** run the workflow with `ref` = that commit.
