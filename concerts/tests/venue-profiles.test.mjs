import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichVenue,
  enrichEventVenue,
  venueProfiles,
} from "../shared/venue-profiles.js";

test("matches Ticketmaster aliases and punctuation without crossing metros", () => {
  assert.equal(
    enrichVenue({ name: "Brick & Mortar Music Hall" }, "sf").capacity.max,
    250,
  );
  assert.equal(
    enrichVenue({ name: "The Fillmore" }, "miami").capacity,
    undefined,
  );
  assert.equal(enrichVenue({ name: "Audio" }, "sf").capacity.max, 400);
});
test("keeps room-specific capacities and never copies full-building occupancy to a room", () => {
  const capacity = { min: 100, max: 100 };
  assert.equal(
    enrichVenue({ name: "Public Works", room: "Loft", capacity }, "sf")
      .capacity,
    capacity,
  );
  assert.equal(
    enrichVenue({ name: "Public Works", room: "Loft" }, "sf").capacity,
    null,
  );
  assert.equal(enrichVenue({ name: "620 Jones Terrace" }, "sf").capacity, null);
});
test("enriches snapshots without modifying stored event data", () => {
  const event = {
    id: "tm-example",
    metro: "sf",
    venue: { name: "August Hall", capacity: null },
  };
  const result = enrichEventVenue(event);
  assert.equal(result.venue.capacity.max, 951);
  assert.equal(event.venue.capacity, null);
  assert.match(result.venue.description, /Historic/);
  assert.equal(result.id, event.id);
});
test("researched numerical capacities have sources and valid bounds", () => {
  for (const p of venueProfiles) {
    assert.ok(p.description && p.source.startsWith("https://"));
    if (p.capacity) {
      assert.ok(p.capacity.min > 0 && p.capacity.max >= p.capacity.min);
      assert.ok(
        p.capacity.source && p.capacity.configuration && p.capacity.verifiedAt,
      );
    }
  }
});
