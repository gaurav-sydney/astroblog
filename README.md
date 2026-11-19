# Automation Worker — blog (automationworker.io)

Astro static site. Palette charcoal `#15171C` / off-white `#F5F3EE` / teal `#10B5A6` / orange `#EA6B2E`;
Space Grotesk + Inter + JetBrains Mono; connected-node motif (`src/components/NodeMotif.astro`).

    npm ci
    PUBLIC_BREVO_FORM_ACTION=https://<x>.sibforms.com/serve/<id> npm run build   # → dist/

- Posts: `src/content/posts/*.md` (frontmatter: title, excerpt, date, issue, tags, draft).
- Subscribe: Brevo's native form (double opt-in, list 2, redirect `/subscribed`), posted as plain HTML so it works
  with no script. Without `PUBLIC_BREVO_FORM_ACTION` the form falls back to a mailto link.
- Deploy: upload `dist/` (including `.htaccess`, which forces HTTPS) to the site's `public_html` on Hostinger.
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
      npm run build && node --test "agent-tests/*.test.mjs"

- Try it locally: `node <agentic-web>/skills/agentify-website/scripts/serve_site.mjs dist --port 8080`, open
  http://127.0.0.1:8080/, add a low-limit key, and afterwards **Delete setup** and close the tab.
