import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
const dir = await mkdtemp(join(tmpdir(), "encore-tests-"));
process.env.CONCERTS_DATA_DIR = dir;
const {
  createProfile,
  authenticate,
  syncProfile,
  applyOperations,
  publicProfile,
} = await import("../server/profiles.mjs");
const { default: handler } = await import("../api/concerts.mjs");
after(() => rm(dir, { recursive: true, force: true }));
const op = (id, key, value, baseRev = 0) => ({ id, key, value, baseRev });
test("two devices preserve independent ratings and both versions of concurrent notes", () => {
  const initial = { username: "test", fields: {}, revision: 0 };
  const a = applyOperations(initial, [
    op("a", "event/show/notes", "Loved the sound"),
    op("b", "event/show/music", 5),
  ]);
  const b = applyOperations(a, [
    op("c", "event/show/notes", "Check the sightlines"),
    op("d", "event/show/visuals", 3),
  ]);
  assert.equal(b.fields["event/show/music"].value, 5);
  assert.equal(b.fields["event/show/visuals"].value, 3);
  assert.equal(b.fields["event/show/notes"].value, "Loved the sound");
  assert.equal(b.conflicts.length, 1);
  assert.equal(b.conflicts[0].incoming, "Check the sightlines");
  const retried = applyOperations(b, [
    op("c", "event/show/notes", "Check the sightlines"),
  ]);
  assert.equal(retried.conflicts.length, 1);
  assert.equal(retried.revision, b.revision);
  const resolved = applyOperations(b, [
    op(
      "e",
      "event/show/notes",
      "Both thoughts",
      a.fields["event/show/notes"].rev,
    ),
    op("f", "conflict/c", null),
  ]);
  assert.equal(resolved.conflicts.length, 0);
  assert.equal(resolved.fields["event/show/notes"].value, "Both thoughts");
});
test("a fresh device reads existing fields; an empty sync cannot erase them", async () => {
  const p = await createProfile("fresh-device");
  await syncProfile(p.username, p.code, [op("save", "event/show/saved", true)]);
  const second = await authenticate(p.username, p.code);
  assert.equal(second.fields["event/show/saved"].value, true);
  assert.equal(
    (await syncProfile(p.username, p.code, [])).fields["event/show/saved"]
      .value,
    true,
  );
  assert.ok(!publicProfile(second).codeHash);
  assert.ok(!publicProfile(second).code);
  await assert.rejects(authenticate(p.username, "wrong"), { status: 401 });
});
test("atomic local storage prevents simultaneous requests from losing updates", async () => {
  const p = await createProfile("parallel-saves");
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      syncProfile(p.username, p.code, [
        op("op" + i, `event/show-${i}/saved`, true),
      ]),
    ),
  );
  assert.equal(
    Object.keys((await authenticate(p.username, p.code)).fields).length,
    20,
  );
  const results = await Promise.allSettled([
    createProfile("same-name"),
    createProfile("same-name"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});
async function call(
  action,
  { method = "GET", body, username, code, origin } = {},
) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.url = "/api/concerts?action=" + action;
  req.method = method;
  req.headers = {
    ...(username ? { "x-profile": username } : {}),
    ...(code ? { authorization: "Bearer " + code } : {}),
    ...(origin ? { origin } : {}),
  };
  req.socket = { remoteAddress: "test" };
  const headers = {};
  let output;
  const res = {
    statusCode: 200,
    setHeader: (k, v) => (headers[k] = v),
    end: (x) => (output = x),
  };
  await handler(req, res);
  return {
    status: res.statusCode,
    body: output ? JSON.parse(output) : null,
    headers,
  };
}
test("API validates auth, methods and field values and supports cross-device save/read", async () => {
  assert.equal((await call("create-profile")).status, 405);
  const p = await call("create-profile", {
    method: "POST",
    body: { username: "api-user" },
  });
  assert.equal(p.status, 201);
  const creds = { username: p.body.username, code: p.body.code };
  assert.equal(
    (
      await call("sync", {
        ...creds,
        method: "POST",
        body: { operations: [op("invalid", "event/show/music", 6)] },
      })
    ).status,
    400,
  );
  const save = await call("sync", {
    ...creds,
    method: "POST",
    body: { operations: [op("valid", "event/show/saved", true)] },
  });
  assert.equal(save.status, 200);
  assert.equal(
    (await call("profile", creds)).body.fields["event/show/saved"].value,
    true,
  );
  assert.equal((await call("profile", { ...creds, code: "no" })).status, 401);
  assert.equal(
    (await call("status", { origin: "https://unrelated.example" })).headers[
      "Access-Control-Allow-Origin"
    ],
    undefined,
  );
});

test("hide and restore sync across devices while preserving bookmarks and notes", async () => {
  const p = await createProfile("hide-restore");
  await syncProfile(p.username, p.code, [
    op("keep", "event/show/saved", true),
    op("note", "event/show/notes", "Keep this thought"),
    op("hide", "event/show/hidden", true),
  ]);
  const second = await authenticate(p.username, p.code);
  assert.equal(second.fields["event/show/hidden"].value, true);
  await syncProfile(p.username, p.code, [
    op(
      "restore",
      "event/show/hidden",
      false,
      second.fields["event/show/hidden"].rev,
    ),
  ]);
  const first = await authenticate(p.username, p.code);
  assert.equal(first.fields["event/show/hidden"].value, false);
  assert.equal(first.fields["event/show/saved"].value, true);
  assert.equal(first.fields["event/show/notes"].value, "Keep this thought");
  await assert.rejects(
    syncProfile(p.username, p.code, [
      op("invalid", "event/show/hidden", "true"),
    ]),
    { status: 400 },
  );
});
