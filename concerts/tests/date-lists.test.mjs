import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listDateError, listDateLabel, concertInRange } from "../shared/list-dates.js";
import { listMetadata } from "../shared/list-metadata.js";

const directory = await mkdtemp(join(tmpdir(), "concert-date-lists-"));
process.env.CONCERTS_DATA_DIR = directory;
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
const { saveList, readList, ownerLists, addToList, revokeList } = await import("../server/shared-lists.mjs");
const { createProfile } = await import("../server/profiles.mjs");
const { default: handler } = await import("../api/concerts.mjs");
after(() => rm(directory, { recursive: true, force: true }));
const dateRange = { from: "2026-11-25", to: "2026-11-29" };
const event = (id, date = "2026-11-27") => ({ id, title: id, date, venue: { name: "Club" }, notes: "private", music: 5 });

test("ranges use real inclusive calendar dates, including festival overlap and year boundaries", () => {
  for (const range of [{ from: "2026-02-30", to: "2026-03-01" }, { from: "2026-11-29", to: "2026-11-25" }, { from: "2026-01-01", to: "2028-01-01" }, null])
    assert.ok(listDateError(range));
  assert.equal(listDateError({ from: "2028-02-29", to: "2028-02-29" }), "");
  assert.equal(listDateError({ from: "2026-12-31", to: "2027-01-03" }), "");
  for (const day of [dateRange.from, dateRange.to]) assert.ok(concertInRange(event(day, day), dateRange));
  assert.ok(concertInRange({ ...event("festival", "2026-11-23"), endDate: "2026-11-25" }, dateRange));
  for (const day of ["2026-11-24", "2026-11-30", ""]) assert.equal(concertInRange(event(day, day), dateRange), false);
  assert.match(listDateLabel(dateRange), /^Wed, Nov 25, 2026 → Sun, Nov 29, 2026$/);
});

test("saved ranges survive empty lists, edits, owner retrieval, and public metadata without private data", async () => {
  const list = await saveList("dates-owner", { title: "Thanksgiving", dateRange: { ...dateRange, secret: "private" }, events: [] });
  assert.deepEqual((await ownerLists("dates-owner"))[0].dateRange, dateRange);
  assert.deepEqual((await readList(list.id)).dateRange, dateRange);
  const updated = await saveList("dates-owner", { id: list.id, title: "Weekend", dateRange, events: [event("Friday")] });
  assert.equal(updated.id, list.id);
  const publicList = await readList(list.id);
  assert.equal(publicList.events[0].notes, undefined);
  assert.equal(publicList.events[0].music, undefined);
  const meta = listMetadata(publicList, "https://example.com/concerts/?list=" + list.id);
  assert.equal(meta.range, listDateLabel(dateRange));
  assert.match(meta.description, /Nov 25.*Nov 29/);
  const legacyEdit = await saveList("dates-owner", { id: list.id, title: "Old client", events: [event("Friday")] });
  assert.deepEqual(legacyEdit.dateRange, dateRange);
  await assert.rejects(saveList("dates-owner", { id: list.id, title: "Bad", dateRange, events: [event("outside", "2026-11-30")] }), /within/);
  await assert.rejects(saveList("dates-owner", { title: "Bad date", dateRange: { from: "2026-02-30", to: "2026-03-01" }, events: [] }), /valid/);
  await assert.rejects(saveList("dates-owner", { title: "Empty manual", events: [] }), /between 1 and 100/);
});

test("adding to lists is atomic, idempotent, private, and respects ownership, dates, capacity and revocation", async () => {
  const list = await saveList("add-owner", { title: "Weekend", dateRange, events: [] });
  await Promise.all([addToList("add-owner", list.id, event("one")), addToList("add-owner", list.id, event("two")), addToList("add-owner", list.id, event("one"))]);
  const saved = await readList(list.id);
  assert.equal(saved.events.length, 2);
  assert.deepEqual(saved.dateRange, dateRange);
  assert.equal(saved.events[0].notes, undefined);
  await assert.rejects(addToList("stranger", list.id, event("three")), { status: 404 });
  await assert.rejects(addToList("add-owner", list.id, event("outside", "2026-11-30")), /outside/);
  const full = await saveList("add-owner", { title: "Full", events: Array.from({ length: 100 }, (_, i) => event("show" + i)) });
  assert.equal((await addToList("add-owner", full.id, event("show0"))).events.length, 100);
  await assert.rejects(addToList("add-owner", full.id, event("extra")), /100/);
  await revokeList("add-owner", list.id);
  await assert.rejects(addToList("add-owner", list.id, event("three")), { status: 404 });
});

test("add-to-list endpoint requires POST and owner authentication, and remains publicly readable", async () => {
  const profile = await createProfile("api-list-owner");
  const list = await saveList(profile.username, { title: "Weekend", dateRange, events: [] });
  async function request(method, authorized = true) {
    let payload;
    const res = { statusCode: 200, setHeader() {}, end(value) { payload = JSON.parse(value); } };
    await handler({ method, url: "/api/concerts?action=add-to-list", headers: authorized ? { "x-profile": profile.username, authorization: "Bearer " + profile.code } : {}, body: { id: list.id, event: event("api-show") }, socket: { remoteAddress: "test-date-lists" } }, res);
    return { status: res.statusCode, payload };
  }
  assert.equal((await request("GET")).status, 405);
  assert.equal((await request("POST", false)).status, 400);
  assert.equal((await readList(list.id)).events.length, 0);
  const result = await request("POST");
  assert.equal(result.status, 200);
  assert.equal(result.payload.events[0].id, "api-show");
  assert.equal((await readList(list.id)).events.length, 1);
});
