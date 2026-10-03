import test from "node:test";
import assert from "node:assert/strict";
import { ActionHistory } from "../shared/action-history.js";
test("undos actions in reverse order including grouped rating and autosave", () => {
  const h = new ActionHistory(),
    data = { saved: false, rating: null, hidden: false };
  const apply = (label, updates) => {
    h.record(
      "a",
      label,
      Object.entries(updates).map(([key, after]) => ({
        key,
        before: data[key],
        after,
      })),
    );
    Object.assign(data, updates);
  };
  apply("rating", { rating: 4, saved: true });
  apply("hide", { hidden: true });
  const undo = () =>
    h.undo(
      "a",
      (k) => data[k],
      (k, v) => (data[k] = v),
    );
  undo();
  assert.equal(data.hidden, false);
  assert.equal(data.rating, 4);
  undo();
  assert.deepEqual(data, { saved: false, rating: null, hidden: false });
  assert.equal(undo(), null);
});
test("does not undo another account or overwrite a changed value", () => {
  const h = new ActionHistory();
  h.record("a", "save", [{ key: "saved", before: false, after: true }]);
  assert.equal(
    h.undo(
      "a",
      () => false,
      () => assert.fail(),
    ).applied,
    0,
  );
  h.record("a", "save", [{ key: "saved", before: false, after: true }]);
  assert.equal(
    h.undo(
      "b",
      () => true,
      () => assert.fail(),
    ),
    null,
  );
});
test("notes entered after auto-save prevent undo from unsaving that concert", () => {
  const h = new ActionHistory();
  h.record("a", "rating", [
    {
      key: "saved",
      before: false,
      after: true,
      guard: { key: "notes", value: "" },
    },
  ]);
  assert.equal(
    h.undo(
      "a",
      (key) => (key === "notes" ? "New notes" : true),
      () => assert.fail(),
    ).applied,
    0,
  );
});
