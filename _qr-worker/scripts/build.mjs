import { build } from "esbuild";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
await mkdir("../QR-codes/vendor", { recursive: true });
await build({
  entryPoints: ["node_modules/qr/index.js"],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: "../QR-codes/vendor/qr.js",
  legalComments: "inline",
});
await copyFile(
  "node_modules/qr/LICENSE-MIT",
  "../QR-codes/vendor/LICENSE-qr.txt",
);
await mkdir(".build", { recursive: true });
await build({
  entryPoints: ["src/index.ts", "src/core.ts", "src/outbox.ts"],
  outdir: ".build",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  format: "esm",
  platform: "neutral",
});
const html = await readFile("../QR-codes/index.html", "utf8");
if (!html.includes("/QR-codes/app.js"))
  throw new Error("Missing static entrypoint");
console.log(
  "Built local QR renderer and Worker test modules. GitHub Pages serves the checked-in static files directly.",
);
