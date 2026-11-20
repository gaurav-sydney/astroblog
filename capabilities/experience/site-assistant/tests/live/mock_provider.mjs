// Stand-in OpenAI-compatible provider for checking the site's chat loop without a real key.
//   node mock_provider.mjs [port=8096] [mode=ok|error|empty] [log=-]
// ok:    streams one website_search_posts tool call, then an answer naming the top post.
// error: streams {"error": …} inside an HTTP 200 stream, as OpenRouter does for free-model rate limits.
// empty: streams a turn with no text and no tool call.
import { createServer } from "node:http";
import { appendFileSync } from "node:fs";

const [, , port = "8096", mode = "ok", log = "-"] = process.argv;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type",
               "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };

createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  if (req.url.endsWith("/models")) {
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
  }
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const tool = (body.messages || []).filter((m) => m.role === "tool").pop();
    const line = JSON.stringify({ model: body.model, auth: Boolean(req.headers.authorization),
      tools: (body.tools || []).map((t) => t.function.name), toolResult: tool ? String(tool.content).slice(0, 160) : null });
    if (log === "-") console.log(line); else appendFileSync(log, line + "\n");
    res.writeHead(200, { ...cors, "Content-Type": "text/event-stream" });
    const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
    if (mode === "empty") {
      send({ model: "mock-model", choices: [{ delta: {}, finish_reason: "stop" }] });
    } else if (mode === "error") {
      send({ error: { message: "Rate limit exceeded: free-models-per-day.", code: 429 } });
    } else if (!tool) {
      send({ model: "mock-model", choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", type: "function",
        function: { name: "website_search_posts", arguments: JSON.stringify({ query: "agents in the back office" }) } }] } }] });
      send({ choices: [{ delta: {}, finish_reason: "tool_calls" }] });
    } else {
      const title = (String(tool.content).match(/"title":"([^"]+)"/) || [])[1] || "(no title found)";
      send({ model: "mock-model", choices: [{ delta: { content: `MOCK ANSWER: the post is "${title}".` } }] });
      send({ choices: [{ delta: {}, finish_reason: "stop" }] });
    }
    res.end("data: [DONE]\n\n");
  });
}).listen(Number(port), "127.0.0.1", () => console.error(`mock provider (${mode}) on http://127.0.0.1:${port}/v1`));
