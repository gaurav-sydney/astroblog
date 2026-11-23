# Handoff: Launch the Automation Worker blog (Astro) with a working subscribe form

Read this, then follow it. One work package, one branch. Delivery lane (16 Nov lane rule: scripts only; a
connector is a named fallback). Stop at each milestone and report; don't merge (the chat reviews and merges into
`claude-factory`; `main` waits for Gaurav).

## Context
- The publication **Automation Worker** (automationworker.io) needs its blog live: an **Astro** static site built from
  the design signed off on the Claude Design canvas — charcoal `#15171C` / warm off-white `#F5F3EE` / electric teal
  `#10B5A6` / subtle orange `#EA6B2E`, Space Grotesk + Inter + JetBrains Mono, connected-node motif. Byline: Gaurav.
  Examples are the brand-kit's anonymised framing ("a sports club website and membership workflow", etc.).
- The newsletter capability is a **separate** work package (DP-033, already handed to the VPS). **This blog must go
  live and collect subscribers without waiting for the newsletter build or for broadcasts to be switched on.**
- Brevo is ready: list_id **2** (`automation-worker-subscribers`), the sending domain authenticated + branded, double
  opt-in available. Brevo owns the list, confirmation, consent and unsubscribe.
- Hostinger: you have access. automationworker.io currently sits in the **agent** Hostinger account (Hermes was moved
  to a temporary subdomain). Touch nothing else in that account.
- Blog repo: `gaurav-sydney/astroblog` (confirmed by Gaurav, 18 Nov 2026; currently empty) — scaffold the Astro site
  there. The VPS clones/attaches astroblog to build; this handoff and the newsletter work stay in FRACTEDGE-platform.

## Read first
Section 0 of `docs/runbooks/WORKING-MODEL.md`, then `AGENTS.md`. Follow the lane rule and the §5 lean rules (only a
missing token/access, an unreachable system, or a technical error stops a run; missing content defaults with the run
output listing what was defaulted; no new test suites or gates; one package, one branch).

## The decoupling rule (why nothing here waits on the newsletter)
- **Subscribe works at launch via Brevo's own subscription form** (double opt-in on, list 2, redirect
  `automationworker.io/subscribed`) — zero backend, Brevo owns confirmation/consent/unsubscribe. This has **no
  dependency** on the newsletter factory build.
- **Broadcast-on-publish** (the factory part, DP-033) stays **off** until that capability is built and Gaurav enables
  it. Subscribers simply accumulate in Brevo; nothing is sent. This is the one item left on Gaurav, and it does **not**
  block go-live or the subscribe form.
- The factory's own `audience.subscribe` webhook (DP-033) is a later, on-model upgrade of the subscribe path — a
  one-line form swap, both ending at Brevo list 2 with DOI. Not needed for launch.

## Phase 1 — Build and deploy the blog
1. Scaffold the Astro site from the signed-off design: homepage, article template, an About page, and the agentic-web
   piece as issue #1. Reproduce the canvas's palette, type and node motif.
2. **Subscribe form = Brevo's native embed** (DOI enabled, list 2, redirect `automationworker.io/subscribed`). The page
   must still work if the embed fails to load.
3. Deploy to **automationworker.io** on Hostinger over HTTPS. Set the `hello@automationworker.io` **forwarder** →
   `the founder's inbox` (a forwarder, not a mailbox).
4. **Milestone 1 — STOP and report:** the live URL, SSL green, and a real double-opt-in confirmation email received
   from a test subscribe. Nothing below is required for the blog to be publicly live.

## Phase 2 — Wire broadcast-on-publish, dormant
1. On publish/deploy, assemble each post's `{title, url, excerpt, html}` and POST it to DP-033's broadcast webhook —
   but keep it **disabled** (feature flag off / trigger not enabled) until DP-033 is built and Gaurav enables it.
   Nothing sends.
2. **Milestone 2 — STOP and report:** the trigger wiring in place but dormant, and the exact single switch Gaurav flips
   to enable it later.

## What needs Gaurav (the one pending item — non-blocking)
Return a single block:
- **Enable broadcasts (DP-033 S5), later:** once the newsletter capability is built, run its dry run (a test DOI + a
  test broadcast to a test list), then switch on the publish trigger. **Until he does, the blog is live and the list
  grows; no email is sent.** This is the only setup pending on Gaurav and it blocks neither go-live nor the subscribe
  form.
- **(Optional, later)** move automationworker.io to his main Hostinger account — not blocking; DNS/forwarder are
  re-added after the move.

Brevo is fully set up (list + authenticated sender + DOI); the forwarder is yours to create with the Hostinger access
you already have. Nothing else requires him.
