// Gate "chat": a full chat turn in a real browser against the stand-in provider, in each mode a real provider can
// produce. Whatever the provider does, the visitor sees something: an answer, the provider's error, or a notice.
// This is the gate that would have caught FE-122's silent chat (an error inside an HTTP 200 stream).
import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { DIST, ROOT } from "../lib/config.mjs";
import { serve } from "../lib/serve.mjs";

const run = promisify(execFile);
const LIVE = join(ROOT, "capabilities/experience/site-assistant/tests/live");
const freePort = () => new Promise((r) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => r(port)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = await serve(DIST);

const MODES = {
  ok: (msgs) => msgs.some((m) => /MOCK ANSWER: the post is "[^(]/.test(m)),
  error: (msgs) => msgs.some((m) => /LLM error from the provider/i.test(m) && /Rate limit/i.test(m)),
  empty: (msgs) => msgs.some((m) => /returned an empty answer/i.test(m)),
};

for (const [mode, sees] of Object.entries(MODES)) {
  test(`provider mode "${mode}": the visitor sees ${mode === "ok" ? "a grounded answer" : mode === "error" ? "the provider's error" : "a notice"}`, { timeout: 60000 }, async (t) => {
    const port = await freePort();
    const provider = spawn("node", [join(LIVE, "mock_provider.mjs"), String(port), mode, "-"], { stdio: ["ignore", "pipe", "ignore"] });
    let seen = ""; provider.stdout.on("data", (d) => (seen += d));
    await sleep(500);
    try {
      const { stdout } = await run("node", [join(LIVE, "chat_check.mjs"), site.url, `http://127.0.0.1:${port}/v1`, "mock-model",
        "Which post covers the back office?"], { timeout: 50000, env: { ...process.env, CHAT_KEY: "mock-key" } });
      const { messages, logs } = JSON.parse(stdout);
      t.diagnostic(JSON.stringify(messages));
      assert.ok(seen.includes("website_search_posts"), "the provider never received the site's tools");
      assert.ok(sees(messages), `mode ${mode}: the chat did not show what it should. Messages: ${JSON.stringify(messages)} Logs: ${logs.join(" | ")}`);
    } finally { provider.kill(); }
  });
}

test.after(() => site.close());
