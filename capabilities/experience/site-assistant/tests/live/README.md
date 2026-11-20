# Live and rendered checks (FE-122)

These scripts check the built or deployed site in a real browser engine. They complement `../agentified.test.mjs`, which tests the contract with stubs.

| Script | What it checks |
| --- | --- |
| `site_check.mjs <url> [out] [width] [height]` | That the assistant boots, the page doesn't scroll sideways, the suggestion chips show, and one `search_posts` read through the live engine works. It also takes screenshots. The exit code is not 0 on failure. |
| `chat_check.mjs <url> <router> <model> [question]` | One full chat turn. The key comes from `CHAT_KEY`. |
| `mock_provider.mjs [port] [ok\|error\|empty]` | A stand-in OpenAI-compatible provider, so chat checks need no real key. `error` is the OpenRouter in-stream error that caused the silent chat. |
| `cdp.mjs` | Shared launcher. Each run gets a free port and a fresh profile. |

## Setup (once per machine)

```bash
npx playwright install chromium-headless-shell
```

If Chromium fails with missing libraries such as `libnspr4.so` and you have no root, unpack them:

```bash
mkdir -p ~/.local/chromium-libs && cd ~/.local/chromium-libs
apt-get download libnspr4 libnss3 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libxdamage1 libxres1
for f in *.deb; do dpkg -x "$f" root; done
export LD_LIBRARY_PATH=$HOME/.local/chromium-libs/root/usr/lib/x86_64-linux-gnu
```

## Typical runs

```bash
T=capabilities/experience/site-assistant/tests/live
node $T/site_check.mjs https://automationworker.io/ /tmp/live 1280 900
node $T/site_check.mjs https://automationworker.io/ /tmp/live-m 390 844
# The local build against the mock provider: every mode must show something in the chat.
node <agentic-web>/skills/agentify-website/scripts/serve_site.mjs dist --port 8080 &
for m in ok error empty; do node $T/mock_provider.mjs 8096 $m & sleep 1
  node $T/chat_check.mjs http://127.0.0.1:8080/ http://127.0.0.1:8096/v1 mock-model; kill %2; done
```

**Expect:**
- `site_check` exits 0.
- `chat_check` shows a grounded answer in `ok` mode, "LLM error from the provider: …" in `error` mode, and a notice in `empty` mode, never a blank.
