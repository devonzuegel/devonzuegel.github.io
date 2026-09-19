import test from "node:test";
import assert from "node:assert/strict";
import {
  parseDate,
  parseVenue,
  makeEvent,
  normalizeGenres,
} from "../server/parsers.mjs";
import { responseText } from "../server/network.mjs";
import venues from "../data/venues.json" with { type: "json" };
const now = new Date("2026-09-19T12:00Z"),
  venue = venues.find((v) => v.id === "elsewhere");
test("calendar dates cross year boundaries without rolling February 30 into March", () => {
  assert.equal(parseDate("Fri Jan 8", now), "2027-01-08");
  assert.equal(parseDate("Feb 30", now), null);
  assert.equal(parseDate("2026-02-30", now), null);
  assert.equal(parseDate("20269999", now), null);
  assert.equal(parseDate("9.25", now), "2026-09-25");
});
test("room capacity follows the booked room, not the entire building", () => {
  const event = makeEvent(venue, {
    title: "Test",
    date: "2026-10-01",
    room: "Zone One",
    url: "https://example.com/event",
  });
  assert.equal(event.venue.capacity.max, 260);
  assert.notEqual(event.venue.id, venue.id);
  assert.equal(
    makeEvent(venue, {
      title: "Full venue",
      date: "2026-10-01",
      room: "Full Venue",
    }).venue.capacity,
    null,
  );
});
test("offsite performances do not inherit promoter coordinates or size", () => {
  const event = makeEvent(venue, {
    title: "Elsewhere Presents",
    date: "2026-10-01",
    venueName: "Trans-Pecos",
    address: "9-15 Wyckoff Avenue, Queens, NY",
  });
  assert.equal(event.venue.name, "Trans-Pecos");
  assert.equal(event.venue.lat, null);
  assert.equal(event.venue.capacity, null);
  assert.equal(event.sourceId, "elsewhere");
  const moved = makeEvent(
    venues.find((v) => v.id === "chapel"),
    { title: "MOVED TO THE 4 STAR THEATER: Artist", date: "2026-10-01" },
  );
  assert.equal(moved.venue.name, "4 STAR THEATER");
  assert.equal(moved.venue.lat, null);
});
test("LPR offsite shows are excluded unless the room belongs to the venue", () => {
  const html = (room) =>
    `<div class="event" dateofevent="2026-10-01"><b class="black_visible">Test artist</b><p class="spaceTitle">${room}</p><a class="eventSingleLink" href="https://lpr.com/test">Details</a></div>`;
  const v = venues.find((v) => v.id === "lpr");
  assert.equal(parseVenue(v, html("First Unitarian Church"), now).length, 0);
  assert.equal(
    parseVenue(v, html("Main Space"), now)[0].venue.capacity.max,
    700,
  );
});
test("genre normalization uses source labels; non-music categories are excluded", () => {
  assert.deepEqual(normalizeGenres(["Indie / dance-electronic"]), [
    "Indie",
    "Electronic",
  ]);
  assert.equal(
    makeEvent(venue, {
      title: "Wrestling",
      date: "2026-10-01",
      genres: ["Sports General"],
    }),
    null,
  );
});
test("an artist with a comma is not split when the source supplies an artist array", () => {
  const e = makeEvent(venue, {
    title: "Band, The Band",
    artists: ["Band, The Band"],
    date: "2026-10-01",
  });
  assert.equal(e.artists.length, 1);
});
test("legacy calendar encodings preserve artist names", async () => {
  const bytes = new Uint8Array([0x42, 0x6a, 0xf6, 0x72, 0x6b]);
  const r = new Response(bytes, {
    headers: { "content-type": "text/html; charset=iso-8859-1" },
  });
  assert.equal(await responseText(r), "Björk");
});
