# agentic-web runtime (cognizant-ai-labs/agentic-web, `agentify-website` skill)

The runtime runs in the visitor's browser on the visitor's own model key. Nothing runs on our server. Its files sit under `public/`, which Astro needs; this bundle points to them.

| File | What it is |
| --- | --- |
| `public/runtime/` | The skill's runtime, copied from `5cf01ae`. It carries two marked `LOCAL PATCH`es (`llm.js`, `ui.js`) for provider errors inside a stream; report them upstream. |
| `public/automation_worker_assistant.hocon` | The network source, with one agent, `automation_worker_guide`. |
| `public/automation_worker_assistant.network.json` | Generated from the `.hocon` by the skill's `build_network.mjs`. Never edit it. |
| `public/agent-manifest.json`, `links.json`, `agent-mcp.json`, `.well-known/`, `bridge/` | Discovery and the bridge for other sites' agents. Peers are closed. |
| `public/page.js` | The page object shared by the page's form and the assistant. |
| `public/site-actions.js` | Tools: `list_posts`, `read_post` and `search_posts` (read), and `subscribe` (irreversible, confirmed first). |
| `public/site.js` | Mounts the chat, defines the subscribe dialog, and holds the greeting and suggestion chips. |
| `src/pages/site-content.json.ts` | The posts collection as JSON, for the read tools. |
| `src/styles/assistant.css` | The brand restyle of the chat. |
| `src/pages/index.astro` (`#assistant`) | Where the assistant is mounted on the page. |

After you change the `.hocon` or the manifest, rebuild the network:

```bash
node <agentic-web>/skills/agentify-website/scripts/build_network.mjs public/automation_worker_assistant.hocon --manifest public/agent-manifest.json
```
