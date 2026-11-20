# Agentify a static site and deploy it to Hostinger (static hosting)

**Goal:** a static Astro site gets an in-page assistant. The assistant uses the `agentify-website` skill's browser
runtime, the visitor's own model key (BYOK), read tools over the site's content and one confirmed write. The site is
then deployed to Hostinger static hosting through the claude.ai Hostinger connector and checked live.
**Worked example:** automationworker.io (FE-122, FE-128). The repo is `gaurav-sydney/astroblog` and the branch is
`feat/fe-122-agentify` (PR #1). It went live on 19 Nov 2026.
**Time:** a VPS session, about one sitting for the first site; a redeploy takes about 10 minutes. The founder needs
about 5 minutes (steps 1 and 13).
**Where:** the VPS, in `~/src/<site-repo>`, unless a step says otherwise.

Who runs each step: **F** is the founder and **V** is the VPS Claude Code session.

**Since 20 Nov the pipeline runs steps 6 to 12:**
- `node tests/run.mjs` runs the gates.
- `deploy/deploy.mjs` deploys through the Hostinger API.
- `deploy/verify_live.mjs` verifies the live site.
- `deploy/ci/deliver.yml` runs all three on merge once it is moved to `.github/workflows/`.

The connector steps below remain the fallback for when the pipeline is unavailable. See `deploy/README.md`.

**Lane rule (CLAUDE.md, 16 Nov):** steps 3 and 8 to 11 use the Hostinger MCP connector. That is a fallback, and a
script is owed to replace it: `factory site deploy` (see the operations table). Until it exists, every deploy is a
recorded fallback use.

**Standing rules:**
- No key, token or email address goes into a published file. Step 6 checks this.
- Never ask the founder to paste a model key into the chat. The founder tests BYOK in their own browser (step 13).
- Short-lived upload keys from the connector go into a mode-600 file, never into a command line (step 10).

## Part 1: access (once per site)

### 1. Give the session push access and connect the host (F)

Create a fine-grained GitHub token scoped to the site repo only, with Contents and Pull requests read/write. Then sign in
to the Hostinger connector in Claude Code with `/mcp`.

```bash
install -d -m 700 ~/.config/<site-repo> && read -rsp "token: " T && printf %s "$T" > ~/.config/<site-repo>/github-token && chmod 600 ~/.config/<site-repo>/github-token; unset T
```

**Check:** `ls -l ~/.config/<site-repo>/github-token`
**Expect:** `-rw-------`, and the token is not printed.

### 2. Wire the token into the repo only (V)

```bash
cd ~/src/<site-repo>
git config credential.helper '!f() { echo username=x-access-token; echo "password=$(cat ~/.config/<site-repo>/github-token)"; }; f'
git remote set-url --push origin https://github.com/<owner>/<site-repo>.git
```

**Check:** `git push --dry-run origin HEAD`
**Expect:** no authentication error.

### 3. Find the site's hosting account (V)

Call the connector tool `hosting_websites_list` and pick the row for `<domain>`. Save the target in the repo, but
don't commit it:

```bash
printf '{"domain":"<domain>","username":"<uXXXXXXXXX>","type":"static"}\n' > .hostinger/site.json
```

**Check:** `cat .hostinger/site.json`
**Expect:** the domain, the account username, and `"type":"static"`.

## Part 2: agentify (once per site, then on change)

### 4. Scaffold from the skill (V)

Follow `skills/agentify-website/SKILL.md` from `cognizant-ai-labs/agentic-web` (pinned commit `5cf01ae` for FE-122).

| Piece | What to do |
| --- | --- |
| Runtime | Copy into `public/runtime/` and don't edit it. If you must patch it, mark the patch `LOCAL PATCH` and report it upstream. |
| Network | Write `public/<network>.hocon` and build `public/<network>.network.json` with the skill's `build_network.mjs`. |
| Discovery | Add `agent-manifest.json`, `links.json`, `.well-known/` and `bridge/` under `public/`. |
| Page object | `public/page.js` wraps the site's own functions. |
| Tools | `public/site-actions.js` registers them: reads are `read`, anything a visitor can't undo is `irreversible`. |
| Mount | `public/site.js` mounts the chat. Each irreversible action gets a `DIALOGS` entry. |
| Content | `src/pages/site-content.json.ts` gives the read tools the real content collection. |

**Check:** `grep -rn TODO public/site.js public/site-actions.js public/*.hocon`
**Expect:** no output.

### 5. Add `.htaccess` for the host (V)

`public/.htaccess` must contain these three lines, plus the CORS and CSP rules from the FE-122 example:

```apache
AddType text/javascript .js .mjs
<IfModule mod_headers.c><FilesMatch "\.(js|mjs|json|hocon|html)$">Header set Cache-Control "no-cache"</FilesMatch></IfModule>
```

**Check:** `grep -c -E "AddType text/javascript|no-cache" public/.htaccess`
**Expect:** `2`. Without them, LiteSpeed serves `.mjs` as text/plain, so the assistant never boots, and the CDN keeps
old JS for 7 days.

### 6. Build and run the agent tests (V)

```bash
npm run build && node --test "capabilities/experience/site-assistant/tests/*.test.mjs"
```

**Check:** the test summary.
**Expect:**
- `# fail 0` (10 tests for FE-122).
- The "nothing public holds a key or an email" test passes.
- The form URL is public (the live page's form `action`); it is set in `deploy/delivery.json` `build.env`, so a plain build is the release.

## Part 3: deploy (every release)

### 7. Commit and push (V)

```bash
git add -A && git commit -m "<ticket>: <what changed>" && git push origin HEAD
```

**Check:** `git status -sb`
**Expect:** the branch is up to date with origin.

### 8. Zip `dist/` (V)

There is no `zip` binary on the VPS.

```bash
rm -f site.zip && python3 -c "import zipfile,os;z=zipfile.ZipFile('site.zip','w',zipfile.ZIP_DEFLATED);[z.write(os.path.join(r,f),os.path.relpath(os.path.join(r,f),'dist')) for r,_,fs in os.walk('dist') for f in fs]"
```

**Check:** `python3 -m zipfile -l site.zip | grep -E "^(index.html|\.htaccess|runtime/)" | head -3`
**Expect:** `index.html` and `.htaccess` are at the root of the archive, not under `dist/`.

### 9. Get an upload URL (V)

Call the connector tool `hosting_files_generate-upload-url` with `username` and `domain` from `.hostinger/site.json`.

**Check:** the result.
**Expect:** a `url` ending in `/api/tus/public_html`, plus `auth_key` and `rest_auth_key`. The keys expire in a few hours.

### 10. Upload the archive with TUS (V)

Put the two keys in a mode-600 file rather than on the command line:

```bash
umask 077; printf 'A=%s\nR=%s\nU=%s\n' '<auth_key>' '<rest_auth_key>' '<url>' > ~/.config/<site-repo>/upload.env
. ~/.config/<site-repo>/upload.env; SIZE=$(stat -c%s site.zip)
curl -s -o /dev/null -w 'create %{http_code}\n' -X POST "$U/site.zip?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $R" -H 'Tus-Resumable: 1.0.0' -H "Upload-Length: $SIZE" -H 'Upload-Offset: 0'
curl -s -D - -o /dev/null -X PATCH "$U/site.zip?override=true" -H "X-Auth: $A" -H "X-Auth-Rest: $R" -H 'Tus-Resumable: 1.0.0' -H 'Content-Type: application/offset+octet-stream' -H 'Upload-Offset: 0' --data-binary @site.zip | grep -i upload-offset; echo "size $SIZE"
rm ~/.config/<site-repo>/upload.env
```

**Check:** the output.
**Expect:** `create 201`, and an `upload-offset` equal to `size`.

### 11. Deploy and clear the cache (V)

1. Call `hosting_websites_deploy-static-site-archive` with `archive_path: site.zip`.
2. Call `hosting_cache_clear` with scope `all`.

**Check:** the deploy result, then `hosting_files_list` on the root.
**Expect:** the deploy succeeded, and `site.zip` is no longer in the site root.

## Part 4: verify live

### 12. Check the headers and the content (V)

```bash
D=https://<domain>
curl -sI "$D/runtime/langchain-runner.mjs" "$D/site.js" | grep -i -E "^(content-type|cache-control)"
curl -s "$D/site-content.json" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['posts']),'posts')"
curl -s "$D/" | grep -c 'id="assistant"'
```

**Check:** the output.
**Expect:**
- `text/javascript` and `no-cache` for both files.
- The post count equals the number of files in `src/content/posts/`.
- `1`.

For a rendered check at 1280 and 390 px (setup in `tests/live/README.md`):

```bash
T=capabilities/experience/site-assistant/tests/live
node $T/site_check.mjs https://<domain>/ /tmp/live 1280 900 && node $T/site_check.mjs https://<domain>/ /tmp/live-m 390 844
```

**Check:** the exit code and the screenshots.
**Expect:** `0` for both widths; the assistant booted and a `search_posts` read `succeeded`.

### 13. Run the BYOK and phone checks (F)

1. Open `<domain>` in a private window, in Safari and in Chrome, and on a phone.
2. Add your key in ⚙ AI model settings.
3. Ask one of the suggested questions, then ask to subscribe, and decline the dialog.

**Check:** what the chat shows.
**Expect:**
- An answer drawn from the posts.
- A provider error is shown in the chat, never as a silent blank.
- The subscribe dialog names your email, and declining it sends nothing.

## Redo, rollback, troubleshooting

**Redo (new posts or a style change):** run steps 6 to 12. Visitors who loaded the site before the no-cache headers
went live hard-reload once.

**Rollback:** check out the last good commit, then run steps 6, 8, 9, 10 and 11. The deploy replaces the whole site.

| Symptom | Cause | Fix |
| --- | --- | --- |
| No chat and no settings; the console shows "Failed to fetch dynamically imported module" | `.mjs` is served as text/plain | Step 5 `AddType`, redeploy |
| A deploy "didn't change anything" | CDN or browser cache of stable-name JS | Step 5 no-cache, `hosting_cache_clear`, fresh browser profile |
| A headless check still shows old JS after a clean deploy | A leftover headless browser on the same debug port | Kill it by PID (`ss -ltnp`), not with `pkill -f` |
| The message sends but no reply ever comes (seen with OpenRouter free models) | The provider sent an in-stream `error` chunk in an HTTP 200 stream; the runtime dropped the empty answer | `LOCAL PATCH` in `runtime/llm.js` and `ui.js` (FE-122, 92ecee8); report it upstream |
| The hero is clipped at 390 px | An SVG `width` sets the grid column's width | `minmax(0, …)` columns; style child components with `:global()` |
| Push is denied | The VPS deploy key is for FRACTEDGE-platform only | Steps 1 and 2 |

## Operations in this runbook

| Step | Operation | Class | Lives in | State |
| --- | --- | --- | --- | --- |
| 1 | Create a repo-scoped token and connect the host | Founder action | GitHub settings, `/mcp` | Proven 19 Nov |
| 2 | Wire a repo-local push credential | SKILL | git config | Proven 19 Nov |
| 3 | Resolve a domain to its hosting account | NATIVE | Hostinger connector `hosting_websites_list` | Proven 19 Nov |
| 4 | Agentify a site from the skill | SKILL | `agentify-website` (cognizant-ai-labs/agentic-web) | Proven 19 Nov |
| 5, 12 | Host-correct MIME and cache headers, verified by read-back | CUSTOM GAP | `.htaccess` today; a `factory site check` candidate | Proven 19 Nov |
| 6 | Agent contract tests on the build | SKILL | `capabilities/experience/site-assistant/tests/` (from the skill templates) | Proven 19 Nov |
| 8 to 11 | Zip, upload, deploy and purge a static site | CUSTOM GAP (connector fallback) | Four connector calls plus curl today; script owed: `factory site deploy` on the Hostinger API | Proven 19 Nov (three deploys), script not built |
| 12 | Rendered live check at two viewports | CUSTOM GAP | `capabilities/experience/site-assistant/tests/live/` in astroblog | Proven 19 Nov |
| 13 | BYOK check in the founder's browser | Founder action | The founder's browsers and phone | Open (FE-125) |
