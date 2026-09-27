import test from "node:test";
import assert from "node:assert/strict";
import { artistFacts, matchArtist } from "../server/artist-context.mjs";
const claim = (value) => ({ mainsnak: { datavalue: { value } } });
test("artist matching rejects ambiguous or non-musical names", () => {
  assert.equal(
    matchArtist("Phoenix", [
      { label: "Phoenix", description: "city in Arizona" },
    ]),
    null,
  );
  assert.equal(
    matchArtist("Phoenix", [
      { label: "Phoenix", description: "French band" },
      { label: "Phoenix", description: "Romanian band" },
    ]),
    null,
  );
  assert.equal(
    matchArtist("Phoenix", [
      { label: "Phoenix", description: "French band" },
      { label: "Phoenix album", description: "music album" },
    ]).description,
    "French band",
  );
});
test("age accounts for birthday and avoids estimating from a year-only birth date", () => {
  const person = {
    claims: { P569: [claim({ time: "+1986-11-18T00:00:00Z", precision: 11 })] },
  };
  assert.deepEqual(artistFacts(person, {}, new Date("2026-09-27")).facts, [
    "Age 39",
  ]);
  assert.deepEqual(artistFacts(person, {}, new Date("2026-11-18")).facts, [
    "Age 40",
  ]);
  person.claims.P569[0].mainsnak.datavalue.value.precision = 9;
  assert.deepEqual(artistFacts(person, {}, new Date("2026-09-27")).facts, [
    "Born 1986",
  ]);
  person.claims.P570 = [claim({ time: "+2020-01-01T00:00:00Z" })];
  assert.deepEqual(artistFacts(person, {}).facts, []);
});
test("bands use formation and origin facts, not a fictional age", () => {
  const entity = {
    claims: {
      P571: [claim({ time: "+1992-00-00T00:00:00Z", precision: 9 })],
      P740: [claim({ id: "Q1" })],
      P136: [claim({ id: "Q2" })],
    },
  };
  assert.deepEqual(
    artistFacts(entity, {
      Q1: { labels: { en: { value: "Boston" } } },
      Q2: { labels: { en: { value: "funk" } } },
    }),
    { facts: ["From Boston", "Formed 1992"], genres: ["funk"] },
  );
});
