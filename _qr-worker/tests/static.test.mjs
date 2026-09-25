import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { matrix, svg, filename } from "../../QR-codes/qr.js";
import jsQR from "jsqr";
const url = "https://qr.devonzuegel.com/r/1234567890abcdefghijkl";
test("locally bundled QR has four white modules, correction Q, decodes to permanent link", () => {
  const grid = matrix(url),
    n = grid.length,
    scale = 12;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (x < 4 || y < 4 || x >= n - 4 || y >= n - 4)
        assert.equal(grid[y][x], false);
  const data = new Uint8ClampedArray(n * n * scale * scale * 4).fill(255);
  for (let y = 0; y < n * scale; y++)
    for (let x = 0; x < n * scale; x++) {
      const i = (y * n * scale + x) * 4;
      data[i] =
        data[i + 1] =
        data[i + 2] =
          grid[Math.floor(y / scale)][Math.floor(x / scale)] ? 0 : 255;
    }
  const result = jsQR(data, n * scale, n * scale);
  assert.equal(result.data, url);
  assert.match(svg(url), /fill="white"/);
  assert.match(svg(url), /fill="black"/);
  assert.equal(filename("Library / Flyer?"), "Library-Flyer");
});
test("static entry uses rooted local assets and contains no analytics, recipient or server credentials", async () => {
  const dir = new URL("../../QR-codes/", import.meta.url),
    html = await readFile(new URL("index.html", dir), "utf8");
  for (const name of [
    "app.js",
    "styles.css",
    "config.js",
    "qr.js",
    "vendor/qr.js",
  ])
    await readFile(new URL(name, dir));
  assert.match(html, /src="\/QR-codes\/app.js"/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(
    html,
    /owner@example.net|RESEND_API_KEY|GITHUB_CLIENT_SECRET/,
  );
  const files = await readdir(dir);
  assert.equal(
    files.some((x) => x.startsWith(".env") || x.includes("wrangler")),
    false,
  );
  const base = await readFile(new URL("../../CNAME", import.meta.url), "utf8");
  assert.equal(base.trim(), "devonzuegel.com");
  const source = await readFile(
    new URL("../src/index.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /status:\s*30[18]/);
});
