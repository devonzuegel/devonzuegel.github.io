import test from "node:test";
import assert from "node:assert/strict";
import { ClientStore } from "../shared/client-store.js";
const memory = new Map();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k) => memory.get(k) || null,
    setItem: (k, v) => memory.set(k, v),
  },
  configurable: true,
});
function fresh() {
  memory.clear();
  const s = new ClientStore("/api/concerts");
  s.data.profile = "test-profile";
  s.data.code = "test-code";
  return s;
}
const stop = (s) => clearTimeout(s.timer);
test("an edit made during an in-flight save is retained and rebased on its own acknowledgement", async () => {
  const s = fresh();
  s.change("event/show/notes", "First edit");
  stop(s);
  let release;
  s.apiCall = () => new Promise((r) => (release = r));
  const syncing = s.sync();
  const sent = s.data.pending[0];
  s.change("event/show/notes", "Second edit");
  stop(s);
  release({
    fields: { "event/show/notes": { value: "First edit", rev: 5 } },
    acknowledged: [sent.id],
    conflicts: [],
  });
  await syncing;
  assert.equal(s.fields["event/show/notes"].value, "Second edit");
  assert.equal(s.data.pending.length, 1);
  assert.equal(s.data.pending[0].baseRev, 5);
});
test("offline changes survive constructing a new store and are retried without duplication", async () => {
  const s = fresh();
  s.active = "test-profile";
  s.change("event/show/saved", true);
  stop(s);
  s.apiCall = async () => {
    throw new Error("Offline");
  };
  await s.sync();
  const reopened = new ClientStore("/api/concerts");
  assert.equal(reopened.fields["event/show/saved"].value, true);
  assert.equal(reopened.data.pending.length, 1);
  reopened.apiCall = async () => ({
    fields: { "event/show/saved": { value: true, rev: 1 } },
    acknowledged: reopened.data.pending.map((o) => o.id),
    conflicts: [],
  });
  await reopened.sync();
  assert.equal(reopened.data.pending.length, 0);
});
test("editing stale visible notes keeps the revision needed for conflict detection", () => {
  const s = fresh();
  s.data.fields["event/show/notes"] = { value: "A remote edit", rev: 8 };
  s.change("event/show/notes", "My visible edit", { baseRev: 3 });
  stop(s);
  assert.equal(s.data.pending[0].baseRev, 3);
});
test("unchanged profile polling does not rerender the map or remove keyboard focus", async () => {
  const s = fresh();
  s.status = "Synced";
  s.data.spotify = null;
  s.apiCall = async () => ({ fields: {}, conflicts: [], spotify: null });
  let count = 0;
  s.addEventListener("change", () => count++);
  await s.sync();
  await s.sync();
  assert.equal(count, 0);
});
