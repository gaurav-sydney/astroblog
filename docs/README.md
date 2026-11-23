# Docs

Everything about Automation Worker that doesn't live in a capability bundle.

| Doc | What it is |
| --- | --- |
| [runbooks/AGENTIFY-STATIC-SITE.md](runbooks/AGENTIFY-STATIC-SITE.md) | How to agentify, build, test, deploy and verify the site live. Use it for every release. |
| [runbooks/LAUNCH-BLOG-HANDOFF.md](runbooks/LAUNCH-BLOG-HANDOFF.md) | The original launch handoff (requirements for the blog and the subscribe form) |
| [decisions/DP-033-blog-newsletter-brevo-adapter.yaml](decisions/DP-033-blog-newsletter-brevo-adapter.yaml) | The newsletter increment: the Brevo adapter, subscribe and broadcast, and the n8n binding |
| [reviews/2026-11-19-end-to-end-review.md](reviews/2026-11-19-end-to-end-review.md) | The factory review of the path from requirements to live: what worked, what to improve, the target process |

**Copies.** The handoff and DP-033 are copies of files in FRACTEDGE-platform, taken on 20 Nov 2026. FRACTEDGE-platform keeps the source of truth:
- `docs/runbooks/launch-automation-worker-blog.md`
- `docs/decisions/proposals/DP-033-blog-newsletter-brevo-adapter.yaml`

Paths those files mention, such as `docs/runbooks/WORKING-MODEL.md`, `AGENTS.md` and `capabilities/communications/newsletter`, are in that repo. Three values were replaced because this repo is public: the n8n instance host, a personal email address and an account label.

**Not here, on purpose:**
- **Factory code** stays in FRACTEDGE-platform: the newsletter capability's reference, the Brevo vendor adapter and twin, and the Windmill thin flows. This repo binds to that code; it doesn't fork it.
- **Secrets and the hosting account id** stay out of this repo. The deploy target is in the untracked file `.hostinger/site.json` on the deploying machine.
