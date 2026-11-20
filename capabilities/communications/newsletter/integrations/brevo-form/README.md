# Brevo subscription form (the live subscribe path)

- **What:** `src/components/Subscribe.astro` renders Brevo's own form. The address comes from `PUBLIC_BREVO_FORM_ACTION` at build time; the URL is public because it is the form's `action`.
- **Brevo side:** list 2 (`automation-worker-subscribers`), double opt-in on, redirect `https://automationworker.io/subscribed`. Brevo owns the list, the confirmation, consent and unsubscribe.
- **No URL at build time:** the form falls back to a mailto link, and the assistant's `website_subscribe` refuses and gives the contact address.
- **Same rule for both callers:** `public/page.js` `subscribe()` is used by the page's form and by the assistant, so there is one email check and one request shape. The contract is tested in `capabilities/experience/site-assistant/tests/agentified.test.mjs`.
- **Evidence:** not yet. A real double opt-in confirmation email from a test subscribe is still owed (launch handoff, milestone 1).
- **Upgrade (DP-033 S5):** point the form at the n8n `audience.subscribe` webhook in `../n8n/`. Both paths end at Brevo list 2 with double opt-in.
