// Minimal headless Chromium over the DevTools protocol, for the live checks. Each run gets a free debug port and a
// fresh profile, so it never attaches to a leftover browser or its cache (FE-122: that looked like a stale deploy).
//   CHROME=<headless_shell or chrome binary>  (default: the Playwright headless_shell under ~/.cache/ms-playwright)
//   LD_LIBRARY_PATH=<dir>                      (only where system libs such as libnspr4 are missing)
import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function defaultChrome() {
  const root = join(homedir(), ".cache/ms-playwright");
  const dir = (await readdir(root)).filter((d) => d.startsWith("chromium_headless_shell-")).sort().pop();
  if (!dir) throw new Error("No headless_shell found; set CHROME.");
  return join(root, dir, "chrome-linux/headless_shell");
}

function freePort() {
  return new Promise((resolve) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
}

export async function launch({ width = 1280, height = 900, mobile = false } = {}) {
  const port = await freePort();
  const profile = await mkdtemp(join(tmpdir(), "site-check-"));
  const chrome = spawn(process.env.CHROME || (await defaultChrome()),
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-sandbox", "--disable-gpu", "about:blank"],
    { stdio: "ignore", env: process.env });
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    try { ws = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.type === "page").webSocketDebuggerUrl; }
    catch { await sleep(200); }
  }
  if (!ws) { chrome.kill(); throw new Error("Chromium did not start (missing libs? see tests/live/README.md)."); }
  const sock = new WebSocket(ws);
  await new Promise((r) => sock.addEventListener("open", r));
  let id = 0; const waits = new Map(); const logs = [];
  sock.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && waits.has(d.id)) { waits.get(d.id)(d); waits.delete(d.id); }
    if (d.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(d.params.type))
      logs.push(d.params.type + ": " + d.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
    if (d.method === "Runtime.exceptionThrown") logs.push("exception: " + d.params.exceptionDetails.exception?.description?.slice(0, 300));
  });
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; waits.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  const close = async () => { sock.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true }); };
  return { send, evaluate, logs, close };
}
