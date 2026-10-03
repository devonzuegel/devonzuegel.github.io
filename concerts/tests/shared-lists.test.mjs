import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = await mkdtemp(join(tmpdir(), "concert-list-test-"));
process.env.CONCERTS_DATA_DIR = directory;
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
const { saveList, readList, ownerLists, revokeList, publicConcert } =
  await import("../server/shared-lists.mjs");
const event = {
  id: "test-1",
  title: "Concert",
  date: "2026-11-01",
  venue: { name: "Club", notes: "private" },
  notes: "secret",
  music: 5,
  listening: { secret: true },
  ticketUrl: "javascript:alert(1)",
};
test("public payload excludes private fields and unsafe links", () => {
  const e = publicConcert(event);
  assert.equal(e.notes, undefined);
  assert.equal(e.listening, undefined);
  assert.equal(e.music, undefined);
  assert.equal(e.venue.notes, undefined);
  assert.equal(e.ticketUrl, "");
});
test("owner can create, update and revoke; strangers can only read", async () => {
  try {
    const list = await saveList("owner", {
      title: "Friday ideas",
      events: [event],
    });
    assert.equal((await ownerLists("owner")).length, 1);
    assert.equal((await ownerLists("stranger")).length, 0);
    const shared = await readList(list.id);
    assert.equal(shared.owner, undefined);
    assert.equal(shared.title, "Friday ideas");
    await assert.rejects(
      saveList("stranger", { id: list.id, title: "Hijack", events: [event] }),
      /not found/,
    );
    await assert.rejects(revokeList("stranger", list.id), /not found/);
    const updated = await saveList("owner", {
      id: list.id,
      title: "New title",
      events: [event],
    });
    assert.equal(updated.id, list.id);
    assert.equal((await readList(list.id)).title, "New title");
    await revokeList("owner", list.id);
    await assert.rejects(readList(list.id), /unavailable/);
    assert.equal((await ownerLists("owner")).length, 0);
    await assert.rejects(
      saveList("owner", { id: list.id, title: "Reopen", events: [event] }),
      /not found/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
