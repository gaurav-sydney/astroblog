// A static server for dist/ that behaves like the host where it matters to the assistant: .mjs and .js as
// text/javascript, no-cache on stable-name files, directory index.html, 404.html. No dependencies.
//   node tests/lib/serve.mjs [dir=dist] [port=0]      (prints the URL; port 0 picks a free one)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".hocon": "text/plain; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".woff2": "font/woff2",
};

export function serve(dir = "dist", port = 0) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      const ext = extname(file);
      res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream",
        ...(/\.(js|mjs|json|hocon|html)$/.test(ext) ? { "Cache-Control": "no-cache" } : {}) });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(await readFile(join(root, "404.html")).catch(() => "not found"));
    }
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () =>
    r({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((c) => server.close(c)) })));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = await serve(process.argv[2] || "dist", Number(process.argv[3] || 0));
  console.log(s.url);
}
