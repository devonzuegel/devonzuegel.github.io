import test from "node:test";
import assert from "node:assert/strict";
import { syncLink, parseSyncLink } from "../shared/qr-sync.js";
import qrcode from "../vendor/qrcode.mjs";
test("QR credentials stay in the fragment and unrelated event parameters are removed", () => {
  const code = "a".repeat(24),
    url = new URL(
      syncLink("https://example.com/concerts/?concert=test#old", "devon", code),
    );
  assert.equal(url.search, "");
  assert.equal(url.pathname, "/concerts/");
  assert.deepEqual(parseSyncLink(url.hash), { username: "devon", code });
  const qr = qrcode(0, "M");
  qr.addData(url.href);
  qr.make();
  assert.match(qr.createSvgTag(), /^<svg/);
});
test("malformed sync payloads are rejected", () => {
  assert.equal(parseSyncLink("#sync=1&username=devon&code=bad"), null);
  assert.equal(parseSyncLink("#other"), null);
  assert.equal(
    parseSyncLink("#sync=1&username=%3Cscript%3E&code=" + "a".repeat(24)),
    null,
  );
});
