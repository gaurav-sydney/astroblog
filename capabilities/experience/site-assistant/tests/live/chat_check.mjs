// One full chat turn in a real browser: save a key setup for this tab, reload, ask, read the messages.
//   node chat_check.mjs <url> <router-base-url> <model> <question>
// The key is read from CHAT_KEY (use any string with mock_provider.mjs). Never pass a real key on the command line.
import { launch, sleep } from "./cdp.mjs";

const [, , url, router, model, question = "What has the blog published?"] = process.argv;
if (!url || !router || !model) { console.error("usage: node chat_check.mjs <url> <router> <model> [question]"); process.exit(2); }
const key = process.env.CHAT_KEY || "mock-key";
const b = await launch();
await b.send("Page.navigate", { url }); await sleep(3000);
await b.evaluate(`(async () => { const m = await import('/runtime/byok.js');
  m.saveTabByokSetup({ key: ${JSON.stringify(key)}, model: ${JSON.stringify(model)}, router: ${JSON.stringify(router)} }); })()`);
await b.send("Page.reload"); await sleep(3500);
await b.evaluate(`(() => { const i = document.querySelector('#ns-input'); i.value = ${JSON.stringify(question)};
  i.dispatchEvent(new Event('input', { bubbles: true }));
  const f = i.closest('form'); if (f) f.requestSubmit(); else document.querySelector('#ns-send, .ns-send, button[type=submit]')?.click(); })()`);
await sleep(9000);
const messages = await b.evaluate(`[...document.querySelectorAll('#ns-msgs .ns-msg')].map((m) =>
  m.className.replace('ns-msg', '').trim() + ': ' + m.innerText.slice(0, 220).replace(/\\n/g, ' | '))`);
console.log(JSON.stringify({ messages, logs: b.logs }, null, 1));
await b.close();
