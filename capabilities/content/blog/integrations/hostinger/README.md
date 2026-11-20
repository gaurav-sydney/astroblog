# Hostinger static hosting

- **Target:** automationworker.io, static website type, `public_html`. The hosting account id is kept out of this public repo. It's in an untracked file, `.hostinger/site.json` (`{"domain", "username", "type"}`), on the machine that deploys.
- **Deploy:** [`docs/runbooks/AGENTIFY-STATIC-SITE.md`](../../../../../docs/runbooks/AGENTIFY-STATIC-SITE.md), steps 8 to 11. The archive is `dist/`, zipped, uploaded with TUS, then deployed with `hosting_websites_deploy-static-site-archive`, and the cache is purged.
- **Host config:** `public/.htaccess`:
  - HTTPS and the bare domain;
  - `.mjs` as `text/javascript`;
  - `no-cache` on the assistant's stable-name files;
  - CORS on the public agent files;
  - the sandbox worker's CSP.
- **Lane rule:** today the deploy goes through the claude.ai Hostinger connector, which is the named fallback. A script that replaces it is owed: `factory site deploy` in FRACTEDGE-platform.
