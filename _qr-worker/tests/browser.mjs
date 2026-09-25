import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
const root = new URL("../../", import.meta.url),
  f = await fixture(),
  sent = [],
  errors = [];
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://local").pathname;
  if (path === "/QR-codes") {
    res.writeHead(301, { Location: "/QR-codes/" });
    res.end();
    return;
  }
  const file =
    path === "/"
      ? "index.html"
      : path === "/QR-codes/"
        ? "QR-codes/index.html"
        : path.slice(1);
  if (
    !/^(QR-codes\/[^.][\w/.-]*|index.html|postachio-style.css|theme.js|privacy.html)$/.test(
      file,
    )
  ) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const data = await readFile(new URL(file, root));
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL,
  }),
  context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1100 },
  }),
  page = await context.newPage();
const oldFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  sent.push(opts);
  return new Response('{"id":"mock-email"}');
};
let owner = false,
  failSave = false,
  failList = false,
  holdList = false,
  trackingRequests = 0;
await page.route("https://qr.devonzuegel.com/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  if (url.pathname.startsWith("/r/")) trackingRequests++;
  if (url.pathname === "/api/codes" && request.method() === "GET") {
    if (holdList) await new Promise((resolve) => setTimeout(resolve, 600));
    if (failList) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Temporary test outage"}',
      });
      return;
    }
  }
  if (
    failSave &&
    request.method() === "POST" &&
    url.pathname === "/api/codes"
  ) {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Simulated save failure"}',
    });
    return;
  }
  const r = await f.request(url.pathname + url.search, {
    owner,
    method: request.method(),
    ...(request.postData() ? { body: request.postData() } : {}),
    headers: {
      ...(request.headers()["idempotency-key"]
        ? { "Idempotency-Key": request.headers()["idempotency-key"] }
        : {}),
    },
  });
  await route
    .fulfill({
      status: r.status,
      headers: {
        ...Object.fromEntries(r.headers),
        "Access-Control-Allow-Origin": origin,
      },
      body: await r.text(),
    })
    .catch(async (err) => {
      throw err;
    });
});
// Avoid external font traffic in repeatable tests; system fallback has the same layout.
await context.route("https://fonts.gstatic.com/**", (r) => r.abort());
page.on("pageerror", (e) => errors.push(e.message));
const screenshots = fileURLToPath(
  new URL("../.build/screenshots/", import.meta.url),
);
await mkdir(screenshots, { recursive: true });
try {
  await page.goto(origin + "/QR-codes");
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "+ New QR code", exact: true }),
  ).toBeHidden();
  assert.equal(await page.getByText("owner@example.net").count(), 0);
  await page.screenshot({
    path: screenshots + "/sign-in-desktop.png",
    fullPage: true,
  });
  owner = true;
  holdList = true;
  await page.reload();
  await expect(page.getByText("Loading your codes…")).toBeVisible();
  holdList = false;
  await expect(page.getByText("Your first code starts here.")).toBeVisible();
  await page.locator("#new-code").click();
  await page.getByLabel("Destination URL").fill("example.org/library");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("example.org");
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Library flyer");
  await page.getByLabel("Placement or note").fill("Downtown library");
  failSave = true;
  await page
    .getByRole("button", { name: "Create QR code", exact: true })
    .click();
  await expect(page.getByText("Simulated save failure")).toBeVisible();
  await expect(page.getByLabel("Destination URL")).toHaveValue(
    "example.org/library",
  );
  failSave = false;
  await page
    .getByRole("button", { name: "Create QR code", exact: true })
    .dblclick();
  await expect(
    page.getByRole("button", { name: "Download PNG" }),
  ).toBeVisible();
  assert.equal(
    (await f.DB.prepare("SELECT COUNT(*) n FROM codes").first()).n,
    1,
  );
  const code = await f.DB.prepare("SELECT * FROM codes").first(),
    tracking = f.env.PUBLIC_ORIGIN + "/r/" + code.id;
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({
    path: screenshots + "/detail-desktop.png",
    fullPage: true,
  });
  const pngEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  const pngDownload = await pngEvent;
  assert.equal(pngDownload.suggestedFilename(), "Library-flyer.png");
  const png = PNG.sync.read(await readFile(await pngDownload.path()));
  assert.ok(png.width >= 1600);
  assert.equal(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height).data,
    tracking,
  );
  const svgEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svgDownload = await svgEvent;
  const svgText = await readFile(await svgDownload.path(), "utf8");
  assert.match(svgText, /fill="white"/);
  // Rasterize the exported SVG in the browser, then independently decode its pixels.
  const svgPixels = await page.evaluate(async (text) => {
    const image = new Image();
    image.src = URL.createObjectURL(
      new Blob([text], { type: "image/svg+xml" }),
    );
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 800;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, 800, 800);
    URL.revokeObjectURL(image.src);
    return Array.from(ctx.getImageData(0, 0, 800, 800).data);
  }, svgText);
  assert.equal(jsQR(new Uint8ClampedArray(svgPixels), 800, 800).data, tracking);
  await context.route("https://example.org/**", (r) =>
    r.fulfill({ body: "Destination preview" }),
  );
  const popupEvent = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Preview destination" }).click();
  await (await popupEvent).close();
  assert.equal(trackingRequests, 0);
  assert.equal(
    (await f.DB.prepare("SELECT COUNT(*) n FROM visits").first()).n,
    0,
  );
  // A mock end-to-end open of the DECODED export, intentionally tracked; no live email.
  const opened = await f.request(new URL(tracking).pathname, {
    owner: false,
    headers: { "User-Agent": "Mobile Safari" },
    cf: { city: "Asheville", region: "North Carolina", country: "US" },
  });
  assert.equal(opened.headers.get("Location"), "https://example.org/library");
  await f.drain();
  assert.equal(sent.length, 1);
  assert.match(JSON.parse(sent[0].body).text, /Asheville/);
  await page.getByLabel("Destination URL").fill("https://example.org/changed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Changes saved. The printed QR code stays the same."),
  ).toBeVisible();
  assert.equal(
    (await f.DB.prepare("SELECT id FROM codes").first()).id,
    code.id,
  );
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Disable code", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Reactivate code" }),
  ).toBeVisible();
  assert.equal(
    (await f.request(new URL(tracking).pathname, { owner: false })).status,
    410,
  );
  await page.getByRole("button", { name: "Reactivate code" }).click();
  await expect(
    page.getByRole("button", { name: "Disable code", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Library flyer (copy)", exact: true }),
  ).toBeVisible();
  assert.equal(
    (await f.DB.prepare("SELECT COUNT(*) n FROM codes").first()).n,
    2,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: screenshots + "/detail-phone.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Library flyer (copy)", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All codes", exact: false }).click();
  await page.getByRole("searchbox").fill("not found");
  await expect(page.getByText("No matching codes")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await expect(
    page.getByRole("link", { name: "Library flyer", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshots + "/list-phone.png",
    fullPage: true,
  });
  failList = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("Temporary test outage")).toBeVisible();
  failList = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Library flyer", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText("owner@example.net")).toBeVisible();
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(
    page.getByText("Test email queued for the configured recipient."),
  ).toBeVisible();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: screenshots + "/settings-dark-phone.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }),
  ).toBeVisible();
  assert.equal(await page.getByText("owner@example.net").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: private login, loading/empty/error states, failed save preservation, idempotent create, SVG + PNG independent decode, preview without tracking, mocked scan/email, edit/duplicate/disable/reactivate, search, settings, logout, refresh, phone and dark mode.",
  );
} finally {
  globalThis.fetch = oldFetch;
  await browser.close();
  await f.close();
  await new Promise((resolve) => server.close(resolve));
}
