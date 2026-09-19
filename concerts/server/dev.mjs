import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import handler from "../api/concerts.mjs";
const root = resolve(new URL("../", import.meta.url).pathname),
  port = Number(process.env.PORT) || 4317;
const allowed =
  /^(index\.html|app\.js|styles\.css|config\.js|favicon\.svg|shared\/[^/]+\.(js|mjs)|vendor\/.+|data\/(events|venues)\.json)$/;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/api/concerts") return await handler(req, res);
    if (u.pathname === "/" || u.pathname === "/concerts") {
      res.writeHead(302, { Location: "/concerts/" });
      return res.end();
    }
    const file =
      decodeURIComponent(u.pathname).replace(/^\/concerts\//, "") ||
      "index.html";
    if (!allowed.test(file)) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const path = resolve(root, file);
    if (!path.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end();
    }
    const data = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Concerts: http://127.0.0.1:${port}/concerts/`),
);
