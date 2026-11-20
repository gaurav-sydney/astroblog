# Brevo n8n workflows: what runs on the FRACTEDGE n8n (DP-033 S4)

Instance: `https://<n8n-instance>`, project "Gaurav Singh" (personal, where the `Brevo account`
credential lives). Deployed 18 Nov 2026 by Claude Code through the **n8n MCP connector**: the named fallback until
DP-032's `factory/n8n/tools` exists (no n8n API key on this machine). The repo files are the source; DP-032 redeploys
them by script and removes this fallback.

| Workflow file | n8n id | State |
| --- | --- | --- |
| `automation-worker-newsletter-subscribe.workflow.json` | `QNMtby4pxe1Ncxlu` | inactive |
| `automation-worker-newsletter-broadcast.workflow.json` | `B3toqphkCZpHEnkg` | inactive |

Read back after creation: nodes, parameters, connections and the `Brevo account` (`sendInBlueApi`,
`r4izHGECKFVMFYeX`) credential on every Brevo node match the files.

**One held difference.** In the files the `Capability call` webhook uses header auth with the credential "Automation
Worker Newsletter Bridge" (`Authorization: Bearer <secret>`). That credential doesn't exist yet. The connector
auto-assigned the only header-auth credential the user owns, `[DEV] Windmill Offer Class Smoke Header`, which belongs to
another flow, so on n8n that webhook is **disabled with no auth** until the bridge credential exists. Then: set header
auth with it, enable the node, and the deployed graph equals the file.

Probe on the real instance: execution `266` (manual, `Site form`, `probe@example.com`) answered
`{"status":"failed","error":"doi_template_id is not configured"}` through `Answer refused`; no Brevo call was made.

## To activate (S4's real-Brevo probe, then S5)

1. Brevo: create the double opt-in template (redirect `https://automationworker.io/subscribed`) and confirm the
   sender address; set `doi_template_id` and `from_email` in `bindings.yaml` and in both files' `Check request` CONFIG.
2. n8n: create the header-auth credential "Automation Worker Newsletter Bridge"; bind and enable both `Capability call` webhooks.
3. Redeploy both files, probe each webhook with its fixture against a test list, record the execution ids here.
4. S5: set the Windmill resource `f/newsletter/automation-worker` = `{base_url: https://<n8n-instance>/webhook/newsletter/automation-worker, secret}`;
   point the site form at `https://<n8n-instance>/webhook/automation-worker/subscribe`
   (body `{email, website: ""}`) and the Astro deploy at the Windmill broadcast flow (`{"post": {...}}`).
