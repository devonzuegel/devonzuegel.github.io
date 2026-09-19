import { mkdir, cp } from "node:fs/promises";
await mkdir("public/concerts", { recursive: true });
for (const name of [
  "index.html",
  "app.js",
  "styles.css",
  "config.js",
  "favicon.svg",
  "shared",
  "vendor",
  "data",
])
  await cp(name, "public/concerts/" + name, { recursive: true });
