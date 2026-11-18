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
